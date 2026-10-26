import { afterEach, describe, expect, it } from "vitest";
import { getServerEnv } from "./env";

const KEYS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_APP_URL",
] as const;

describe("getServerEnv", () => {
  const previous = new Map<string, string | undefined>();

  afterEach(() => {
    for (const key of KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    previous.clear();
  });

  it("treats blank optional values as unset", () => {
    for (const key of KEYS) {
      previous.set(key, process.env[key]);
    }
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.UPSTASH_REDIS_REST_TOKEN = "   ";
    process.env.NEXT_PUBLIC_APP_URL = "";

    const env = getServerEnv();

    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined();
    expect(env.NEXT_PUBLIC_APP_URL).toBeUndefined();
  });
});
