import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deactivateQrCode,
  listQrCodesForBusiness,
  QrInactiveError,
  QrNotFoundError,
  resolveActiveQrByToken,
} from "./service";

describe("QR Code lifecycle and resolution", () => {
  it("resolves active QR code with business details, attributes, and fields", async () => {
    const mockService = {
      from: vi.fn((table: string) => {
        if (table === "qr_codes") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "qr-1",
                business_id: "biz-1",
                is_active: true,
                revoked_at: null,
              },
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
                id: "biz-1",
                name: "Coffee Shop",
                google_review_url: "https://maps.app.goo.gl/xyz",
              },
              error: null,
            }),
          };
        }
        if (table === "rating_attributes") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: "attr-1", label: "Quality", display_order: 1 }],
              error: null,
            }),
          };
        }
        if (table === "feedback_fields") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn((cb) =>
              Promise.resolve(
                cb({
                  data: [
                    {
                      id: "field-1",
                      label: "Comments",
                      input_type: "long",
                      is_required: false,
                      display_order: 1,
                    },
                  ],
                  error: null,
                }),
              ),
            ),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      }),
    } as unknown as SupabaseClient;

    const result = await resolveActiveQrByToken(mockService, "valid_token_32_chars_long_entropy_ok");
    expect(result.businessName).toBe("Coffee Shop");
    expect(result.attributes).toHaveLength(1);
    expect(result.fields).toHaveLength(1);
  });

  it("throws QrNotFoundError when token does not exist in database", async () => {
    const mockService = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as unknown as SupabaseClient;

    await expect(
      resolveActiveQrByToken(mockService, "missing_token_32_chars_long_entropy"),
    ).rejects.toThrow(QrNotFoundError);
  });

  it("throws QrInactiveError when QR code has been revoked", async () => {
    const mockService = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "qr-1",
            business_id: "biz-1",
            is_active: false,
            revoked_at: "2026-10-31T00:00:00Z",
          },
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    await expect(
      resolveActiveQrByToken(mockService, "revoked_token_32_chars_long_entropy"),
    ).rejects.toThrow(QrInactiveError);
  });

  it("lists QR codes for a business in descending order", async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: "qr-2", is_active: true, created_at: "2026-10-31" },
            { id: "qr-1", is_active: false, created_at: "2026-10-30" },
          ],
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    const list = await listQrCodesForBusiness(mockSupabase, "biz-1");
    expect(list).toHaveLength(2);
    expect(list[0]?.is_active).toBe(true);
  });

  it("deactivates a specific QR code by ID and business ID", async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "qr-1", business_id: "biz-1", is_active: false },
          error: null,
        }),
      })),
    } as unknown as SupabaseClient;

    const deactivated = await deactivateQrCode(mockSupabase, "qr-1", "biz-1");
    expect(deactivated.is_active).toBe(false);
  });
});
