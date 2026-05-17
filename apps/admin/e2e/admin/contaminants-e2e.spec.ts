/**
 * E2E: /contaminants
 *
 * Read-only coverage. Validates the page heading, "Add Contaminant" CTA,
 * and that the Create dialog opens with the required fields rendered.
 * The dialog is cancelled at the end of each test so no row is written
 * to staging.
 *
 * Full create/edit/delete coverage is deferred until there's a per-test
 * cleanup story (currently the list is shared across all admins).
 *
 * Follow-up to #354 / #359.
 */

import { test, expect } from "@playwright/test";
import { testUrls, adminCredentials } from "../fixtures/test-data";

const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

test.describe("/contaminants — read-only", () => {
  test.skip(
    !hasRealCredentials,
    "Skipping — requires ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD env vars",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto(`${testUrls.admin}/login`);
    await page.fill("input#email", adminCredentials.email);
    await page.fill("input#password", adminCredentials.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(`${testUrls.admin}/`, { timeout: 30000 });
  });

  test("renders heading + Add Contaminant button", async ({ page }) => {
    await page.goto(`${testUrls.admin}/contaminants`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /contaminants/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /add contaminant/i }),
    ).toBeVisible();
  });

  test("Add Contaminant dialog opens with required fields", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/contaminants`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /add contaminant/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /create contaminant/i }),
    ).toBeVisible();

    // Required field labels are the canonical contract — these must
    // exist or the form is unusable.
    for (const label of [
      /contaminant id/i,
      /category/i,
      /name \(english\)/i,
      /unit/i,
    ]) {
      await expect(dialog.getByText(label).first()).toBeVisible();
    }

    // Close without saving — no write to the shared list.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
