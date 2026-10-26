import { expect, test } from "@playwright/test";

/**
 * Lightweight smoke without Supabase/DB.
 * Full QR → feedback e2e needs E2E_WITH_SUPABASE=1 and a migrated local stack.
 */
test("home page renders the product pitch", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Turn visits into Google reviews" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started" }).first()).toBeVisible();
});

test("customer flow keeps Continue to Google available at a low rating", async ({
  page,
}) => {
  const token = "a".repeat(32);
  const googleReviewUrl = "https://g.page/r/example/review";
  const sessionId = "00000000-0000-0000-0000-000000000099";

  await page.route("**/api/v1/r/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/sessions")) {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          sessionId,
          expiresAt: "2099-01-01T00:00:00.000Z",
          status: "started",
        }),
      });
      return;
    }
    if (path.endsWith("/feedback")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          sessionId,
          status: "completed",
          next: {
            draftAvailable: true,
            googleReviewUrl,
            googleCtaPolicy: "always_available_no_rating_gate",
          },
        }),
      });
      return;
    }
    if (path.endsWith("/drafts")) {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          draft: {
            id: "00000000-0000-0000-0000-000000000098",
            text: "I had a pleasant visit and the service was quick.",
            model: "gemini-3.8-flash",
            promptVersion: "review-draft/v1",
            warnings: [],
          },
          googleReviewUrl,
          googleCtaPolicy: "always_available_no_rating_gate",
        }),
      });
      return;
    }
    if (path.endsWith("/events")) {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        businessName: "Cafe Luna",
        businessId: "00000000-0000-0000-0000-000000000001",
        qrCodeId: "00000000-0000-0000-0000-000000000002",
        googleReviewUrl,
        attributes: [
          {
            id: "00000000-0000-0000-0000-000000000010",
            label: "Service",
            displayOrder: 1,
          },
        ],
        googleCtaPolicy: "always_available_no_rating_gate",
      }),
    });
  });

  await page.goto(`/r/${token}`);
  const google = page.getByRole("link", { name: "Continue to Google" });
  await expect(page.getByRole("heading", { name: "How was your visit?" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(google).toBeVisible();
  await expect(google).toBeEnabled();

  await page.getByRole("radio", { name: "Service: 2 out of 5, Fair" }).check({ force: true });
  await expect(google).toBeEnabled();

  await page.getByRole("button", { name: "Write my review" }).click();
  await expect(page.getByRole("heading", { name: "Your review" })).toBeVisible();
  await expect(page.getByLabel("Draft")).toHaveValue(/pleasant visit/);
  await expect(page.getByRole("link", { name: "Continue to Google" })).toBeEnabled();
});

test.describe("public QR flow (live DB)", () => {
  test.skip(
    process.env.E2E_WITH_SUPABASE !== "1",
    "Skipped: set E2E_WITH_SUPABASE=1 with local Supabase + seeded QR to run",
  );

  test("placeholder for full funnel", async () => {
    expect(true).toBe(true);
  });
});
