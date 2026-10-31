import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countSavedDrafts,
  DraftLimitError,
  loadSessionContextForDraft,
  MAX_DRAFTS_PER_SESSION,
} from "./index";

function createMockSupabase(params: {
  sessionStatus?: string;
  draftCount?: number;
  sessionExists?: boolean;
}) {
  const {
    sessionStatus = "completed",
    draftCount = 0,
    sessionExists = true,
  } = params;

  const mockFrom = vi.fn((table: string) => {
    if (table === "feedback_sessions") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: sessionExists
            ? {
                id: "11111111-1111-1111-1111-111111111111",
                business_id: "22222222-2222-2222-2222-222222222222",
                qr_code_id: "33333333-3333-3333-3333-333333333333",
                status: sessionStatus,
                comment: "Great experience",
              }
            : null,
          error: null,
        }),
      };
    }

    if (table === "businesses") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            name: "Test Business",
            category: "Restaurant",
            location: "Austin, TX",
          },
          error: null,
        }),
      };
    }

    if (table === "feedback_ratings") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              rating: 5,
              attribute_id: "attr-1",
              rating_attributes: { label: "Food Quality" },
            },
          ],
          error: null,
        }),
      };
    }

    if (table === "feedback_field_answers") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ label: "Favorite dish", value: "Tacos" }],
          error: null,
        }),
      };
    }

    if (table === "review_drafts") {
      return {
        select: vi.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) {
            return {
              eq: vi.fn().mockResolvedValue({
                count: draftCount,
                data: null,
                error: null,
              }),
            };
          }
          return {
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }),
      };
    }

    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
  });

  return { from: mockFrom } as unknown as SupabaseClient;
}

describe("Draft pre-generation limit guard", () => {
  it("counts existing saved drafts accurately", async () => {
    const supabase = createMockSupabase({ draftCount: 1 });
    const count = await countSavedDrafts(supabase, "11111111-1111-1111-1111-111111111111");
    expect(count).toBe(1);
  });

  it("allows draft generation context load when drafts are below MAX_DRAFTS_PER_SESSION", async () => {
    const supabase = createMockSupabase({ draftCount: MAX_DRAFTS_PER_SESSION - 1 });
    const ctx = await loadSessionContextForDraft(supabase, "11111111-1111-1111-1111-111111111111");
    expect(ctx.businessName).toBe("Test Business");
    expect(ctx.ratings).toHaveLength(1);
  });

  it("throws DraftLimitError BEFORE Gemini is invoked when draft count reaches MAX_DRAFTS_PER_SESSION", async () => {
    const supabase = createMockSupabase({ draftCount: MAX_DRAFTS_PER_SESSION });
    await expect(
      loadSessionContextForDraft(supabase, "11111111-1111-1111-1111-111111111111"),
    ).rejects.toThrow(DraftLimitError);
  });

  it("throws DraftLimitError when draft count exceeds MAX_DRAFTS_PER_SESSION", async () => {
    const supabase = createMockSupabase({ draftCount: MAX_DRAFTS_PER_SESSION + 1 });
    await expect(
      loadSessionContextForDraft(supabase, "11111111-1111-1111-1111-111111111111"),
    ).rejects.toThrow(DraftLimitError);
  });

  it("throws SESSION_NOT_READY if session status is started", async () => {
    const supabase = createMockSupabase({ sessionStatus: "started" });
    await expect(
      loadSessionContextForDraft(supabase, "11111111-1111-1111-1111-111111111111"),
    ).rejects.toThrow("SESSION_NOT_READY");
  });
});
