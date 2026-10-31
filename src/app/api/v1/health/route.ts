import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const env = getServerEnv();
  const checks = {
    geminiConfigured: Boolean(env.GEMINI_API_KEY),
    supabaseConfigured: Boolean(
      env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    upstashConfigured: Boolean(
      env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
    ),
  };

  let dbOk = false;
  if (checks.supabaseConfigured) {
    try {
      const service = createServiceClient();
      const { error } = await service.from("businesses").select("id").limit(1);
      dbOk = !error;
    } catch {
      dbOk = false;
    }
  }

  // At minimum, AI and DB (when keys provided) must be reachable
  const isHealthy =
    checks.geminiConfigured && (!checks.supabaseConfigured || dbOk);

  return NextResponse.json(
    {
      ok: isHealthy,
      service: "ventry",
      phase: "phase-6-prod-hardening",
      checks: {
        ...checks,
        databaseReachable: dbOk,
      },
      locks: {
        geminiOnly: true,
        noOpenAI: true,
        noStripeCheckout: true,
        noReviewGating: true,
      },
    },
    { status: isHealthy ? 200 : 503 },
  );
}
