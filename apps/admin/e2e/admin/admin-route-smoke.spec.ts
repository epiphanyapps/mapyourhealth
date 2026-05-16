/**
 * E2E Smoke: Admin routes restored in #354
 *
 * Asserts that the Measurements, Hazard Reports and Contaminants admin
 * routes resolve to their pages (not Next.js 404). Regression guard for
 * the situation Rayane reported: sidebar links exist but the route
 * directories were never committed, so each link landed on 404.
 */

import { test, expect } from "@playwright/test";
import { testUrls, adminCredentials } from "../fixtures/test-data";

const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

const routes: { path: string; heading: RegExp }[] = [
  { path: "/measurements", heading: /location measurements/i },
  { path: "/hazard-reports", heading: /hazard reports/i },
  { path: "/contaminants", heading: /contaminants/i },
];

test.describe("Admin route smoke (#354)", () => {
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

  for (const { path, heading } of routes) {
    test(`${path} renders its heading (not 404)`, async ({ page }) => {
      const response = await page.goto(`${testUrls.admin}${path}`);
      expect(response?.status(), `${path} should not be 404`).toBeLessThan(400);

      await page.waitForLoadState("networkidle");

      await expect(
        page.getByRole("heading", { name: heading }),
        `${path} should render its primary heading`,
      ).toBeVisible();

      await expect(
        page.getByText(/this page could not be found/i),
      ).toHaveCount(0);
    });
  }
});
