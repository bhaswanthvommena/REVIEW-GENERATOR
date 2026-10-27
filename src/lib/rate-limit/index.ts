import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";
import { apiError } from "@/lib/api/errors";
import { getServerEnv } from "@/lib/env";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  skipped: boolean;
};

function createRedis(): Redis | null {
  const env = getServerEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

let draftIpLimiter: Ratelimit | null | undefined;
let draftTokenLimiter: Ratelimit | null | undefined;
let draftBusinessLimiter: Ratelimit | null | undefined;

function getLimiters() {
  if (draftIpLimiter !== undefined) {
    return {
      ip: draftIpLimiter,
      token: draftTokenLimiter,
      business: draftBusinessLimiter,
    };
  }

  const redis = createRedis();
  if (!redis) {
    draftIpLimiter = null;
    draftTokenLimiter = null;
    draftBusinessLimiter = null;
    return { ip: null, token: null, business: null };
  }

  draftIpLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    prefix: "rl:draft:ip",
  });
  draftTokenLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 h"),
    prefix: "rl:draft:token",
  });
  draftBusinessLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, "1 h"),
    prefix: "rl:draft:business",
  });

  return {
    ip: draftIpLimiter,
    token: draftTokenLimiter,
    business: draftBusinessLimiter,
  };
}

async function checkOne(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      skipped: true,
    };
  }
  const result = await limiter.limit(key);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    skipped: false,
  };
}

/** Enforce draft:ip + draft:token + draft:business limits. Skips when Upstash unset. */
export async function enforceDraftRateLimits(input: {
  ip: string;
  token: string;
  businessId: string;
}): Promise<RateLimitResult> {
  const { ip, token, business } = getLimiters();
  const results = await Promise.all([
    checkOne(ip ?? null, input.ip),
    checkOne(token ?? null, hashKey(input.token)),
    checkOne(business ?? null, input.businessId),
  ]);

  const blocked = results.find((r) => !r.success);
  if (blocked) {
    return blocked;
  }

  const active = results.filter((r) => !r.skipped);
  if (active.length === 0) {
    return results[0]!;
  }

  return active.reduce((acc, r) =>
    r.remaining < acc.remaining ? r : acc,
  );
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Never put the raw QR token (a password-equivalent) in Redis keys. */
function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

const publicLimiters = new Map<string, Ratelimit | null>();

const PUBLIC_LIMITS = {
  session: { n: 20, window: "10 m" },
  feedback: { n: 20, window: "10 m" },
  event: { n: 60, window: "10 m" },
  scan: { n: 60, window: "10 m" },
} as const;

export type PublicScope = keyof typeof PUBLIC_LIMITS;

/** Per-IP and per-token limit for unauthenticated customer endpoints. */
export async function enforcePublicRateLimit(input: {
  scope: PublicScope;
  ip: string;
  token: string;
}): Promise<RateLimitResult> {
  let limiter = publicLimiters.get(input.scope);
  if (limiter === undefined) {
    const redis = createRedis();
    const cfg = PUBLIC_LIMITS[input.scope];
    limiter = redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(cfg.n, cfg.window),
          prefix: `rl:public:${input.scope}`,
        })
      : null;
    publicLimiters.set(input.scope, limiter);
  }
  const results = await Promise.all([
    checkOne(limiter, `ip:${input.ip}`),
    checkOne(limiter, `tok:${hashKey(input.token)}`),
  ]);
  return results.find((r) => !r.success) ?? results[0]!;
}

export function rateLimitedResponse(rate: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000));
  const response = apiError(429, "rate_limited", "Too many requests. Try again shortly.", {
    retryAfter,
  });
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}
