import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveBusinessForOwner } from "./active";
import type { Business } from "./types";

const mockBusinesses: Business[] = [
  {
    id: "biz-1",
    owner_id: "user-1",
    name: "Alpha Cafe",
    slug: null,
    category: "Coffee",
    location: "Austin, TX",
    description: null,
    google_review_url: "https://maps.app.goo.gl/abc",
    plan: "free",
    stripe_customer_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "biz-2",
    owner_id: "user-1",
    name: "Beta Bistro",
    slug: null,
    category: "Restaurant",
    location: "Austin, TX",
    description: null,
    google_review_url: "https://maps.app.goo.gl/xyz",
    plan: "free",
    stripe_customer_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("getActiveBusinessForOwner", () => {
  it("returns null when owner has no businesses", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    };
    const result = await getActiveBusinessForOwner(
      fakeClient as unknown as SupabaseClient,
      "user-1",
    );
    expect(result.active).toBeNull();
    expect(result.businesses).toEqual([]);
  });

  it("selects business matching the cookieBusinessId", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockBusinesses, error: null }),
          }),
        }),
      }),
    };
    const result = await getActiveBusinessForOwner(
      fakeClient as unknown as SupabaseClient,
      "user-1",
      "biz-2",
    );
    expect(result.active?.id).toBe("biz-2");
    expect(result.active?.name).toBe("Beta Bistro");
  });

  it("falls back to first business if cookieBusinessId is not found", async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockBusinesses, error: null }),
          }),
        }),
      }),
    };
    const result = await getActiveBusinessForOwner(
      fakeClient as unknown as SupabaseClient,
      "user-1",
      "non-existent-biz",
    );
    expect(result.active?.id).toBe("biz-1");
    expect(result.active?.name).toBe("Alpha Cafe");
  });
});
