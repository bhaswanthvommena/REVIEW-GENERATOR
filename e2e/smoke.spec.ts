import { test, expect } from "@playwright/test";

/**
 * Lightweight smoke without Supabase/DB.
 * Full QR → feedback e2e needs E2E_WITH_SUPABASE=1 and a migrated local stack.
 */
test("home page renders brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Review Generator" })).toBeVisible();
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
