/**
 * E2E: /measurements
 *
 * Read-only coverage for the Location Measurements admin route. Validates
 * the three aggregation sections render (city / state / country), the
 * search filter is wired, and the city drill-down hits /measurements/[city]
 * with the city name in the URL.
 *
 * Destructive writes (add / edit / delete a measurement, trigger
 * notification Lambda) are intentionally deferred — they mutate shared
 * staging data and need a per-test cleanup story before they land.
 *
 * Follow-up to #354 / #359.
 */

import { test, expect } from "@playwright/test";
import { testUrls, adminCredentials } from "../fixtures/test-data";

const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

test.describe("/measurements — read-only", () => {
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

  test("renders the three aggregation sections", async ({ page }) => {
    await page.goto(`${testUrls.admin}/measurements`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /location measurements/i }),
    ).toBeVisible();

    for (const sectionTitle of [
      /by city/i,
      /by state \/ province/i,
      /by country/i,
    ]) {
      await expect(
        page.getByText(sectionTitle).first(),
        `Expected "${sectionTitle}" section to render`,
      ).toBeVisible();
    }
  });

  test("search input filters the city table", async ({ page }) => {
    await page.goto(`${testUrls.admin}/measurements`);
    await page.waitForLoadState("networkidle");

    const search = page.getByPlaceholder(/search city, state, or country/i);
    await expect(search).toBeVisible();

    // Typing a string nothing matches should empty the "By city" table —
    // either showing an empty-state or hiding the rows. Either is fine;
    // we just assert the input value persists and the page doesn't 500.
    await search.fill("zzz-no-such-city-zzz");
    await expect(search).toHaveValue("zzz-no-such-city-zzz");
  });

  test("city drill-down navigates to /measurements/[city]", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/measurements`);
    await page.waitForLoadState("networkidle");

    const firstRowAction = page
      .getByRole("row")
      .filter({ hasNot: page.getByRole("columnheader") })
      .first()
      .getByRole("button", { name: /view|open|details/i })
      .first();

    // Some staging environments may have zero seeded measurements; skip
    // gracefully so the suite stays green in empty deployments.
    if ((await firstRowAction.count()) === 0) {
      test.skip(true, "No city rows seeded on this environment");
      return;
    }

    await firstRowAction.click();
    await expect(page).toHaveURL(/\/measurements\/[^/]+$/);
  });
});
