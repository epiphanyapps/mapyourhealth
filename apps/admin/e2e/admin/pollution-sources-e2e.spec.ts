/**
 * E2E Test: Pollution Sources
 *
 * Tests the full flow:
 * 1. Admin creates a pollution source
 * 2. Mobile web displays it on the Pollution Sources screen
 * 3. Cleanup: delete the test source
 */

import { test, expect } from "@playwright/test";
import { testUrls, adminCredentials } from "../fixtures/test-data";

const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

test.describe("Pollution Sources E2E", () => {
  test.describe("Admin page loads correctly", () => {
    test.skip(
      !hasRealCredentials,
      "Skipping - requires ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD env vars",
    );

    test.beforeEach(async ({ page }) => {
      await page.goto(`${testUrls.admin}/login`);
      await page.fill("input#email", adminCredentials.email);
      await page.fill("input#password", adminCredentials.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(`${testUrls.admin}/`, { timeout: 30000 });
    });

    test("pollution sources page loads with correct heading", async ({
      page,
    }) => {
      await page.goto(`${testUrls.admin}/pollution-sources`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByRole("heading", { name: /pollution sources/i }),
      ).toBeVisible();
    });

    test("sidebar contains pollution sources link", async ({ page }) => {
      const link = page.getByRole("link", { name: /pollution sources/i });
      await expect(link).toBeVisible();
    });

    test("add pollution source button is visible", async ({ page }) => {
      await page.goto(`${testUrls.admin}/pollution-sources`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByRole("button", { name: /add pollution source/i }),
      ).toBeVisible();
    });

    test("filter controls are present", async ({ page }) => {
      await page.goto(`${testUrls.admin}/pollution-sources`);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText("Filters")).toBeVisible();
      await expect(page.getByText("Source Type")).toBeVisible();
      await expect(page.getByText("Severity")).toBeVisible();
      await expect(page.getByText("Status")).toBeVisible();
    });
  });

  test.describe("Admin create → Mobile verify", () => {
    test.skip(
      !hasRealCredentials,
      "Skipping - requires ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD env vars",
    );

    const testSourceName = `E2E Test Source ${Date.now()}`;
    const testCity = "Montreal";
    const testState = "QC";
    const testCountry = "CA";

    test("create source in admin and verify in mobile web", async ({
      page,
      context,
    }) => {
      // ── PART 1: Admin – Create pollution source via API ──

      // Login to admin
      await page.goto(`${testUrls.admin}/login`);
      await page.fill("input#email", adminCredentials.email);
      await page.fill("input#password", adminCredentials.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL(`${testUrls.admin}/`, { timeout: 30000 });

      // Navigate to pollution sources
      await page.goto(`${testUrls.admin}/pollution-sources`);
      await page.waitForLoadState("networkidle");

      // Click Add button to enter placement mode
      await page.getByRole("button", { name: /add pollution source/i }).click();

      // Wait for "Click map to place..." text indicating placement mode
      await expect(
        page.getByRole("button", { name: /click map to place/i }),
      ).toBeVisible({ timeout: 5000 });

      // Click on the map container to place the source
      const mapContainer = page.locator(".w-full.h-full.rounded-lg");
      if (await mapContainer.isVisible()) {
        const box = await mapContainer.boundingBox();
        if (box) {
          // Click center of map
          await page.mouse.click(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
        }
      }

      // Wait for the edit sheet to open
      await expect(
        page
          .getByText("New Pollution Source")
          .or(page.getByText("Edit Pollution Source")),
      ).toBeVisible({ timeout: 10000 });

      // Fill in the form
      const nameInput = page.locator('input[id="name"]');
      await nameInput.clear();
      await nameInput.fill(testSourceName);

      const cityInput = page.locator('input[id="city"]');
      await cityInput.clear();
      await cityInput.fill(testCity);

      const stateInput = page.locator('input[id="state"]');
      await stateInput.clear();
      await stateInput.fill(testState);

      const countryInput = page.locator('input[id="country"]');
      await countryInput.clear();
      await countryInput.fill(testCountry);

      const jurisdictionInput = page.locator('input[id="jurisdictionCode"]');
      await jurisdictionInput.clear();
      await jurisdictionInput.fill("CA-QC");

      // Submit the form
      await page.getByRole("button", { name: /create/i }).click();

      // Wait for success
      await expect(
        page.getByText(/created successfully|saved successfully/i),
      ).toBeVisible({ timeout: 10000 });

      // ── PART 2: Mobile web – Verify source appears ──

      const mobilePage = await context.newPage();

      // Navigate directly to the pollution sources screen via deep link
      const encodedCity = encodeURIComponent(testCity);
      const encodedState = encodeURIComponent(testState);
      const encodedCountry = encodeURIComponent(testCountry);
      await mobilePage.goto(
        `${testUrls.mobileWeb}/location/${encodedCity}/${encodedState}/${encodedCountry}/pollution-sources`,
      );

      // Wait for the screen to load and verify the source appears
      await expect(mobilePage.getByText(testSourceName)).toBeVisible({
        timeout: 30000,
      });

      // Verify key details are present
      await expect(mobilePage.getByText("Pollution Sources")).toBeVisible();
      await expect(
        mobilePage.getByText(new RegExp(`${testCity}`)),
      ).toBeVisible();

      await mobilePage.close();

      // ── PART 3: Cleanup – Delete the test source ──

      await page.bringToFront();
      await page.goto(`${testUrls.admin}/pollution-sources`);
      await page.waitForLoadState("networkidle");

      // Click on the test source in the list
      const sourceItem = page.getByText(testSourceName);
      if (await sourceItem.isVisible({ timeout: 5000 })) {
        await sourceItem.click();

        // Handle the delete confirmation dialog
        page.on("dialog", (dialog) => dialog.accept());

        // Click delete button
        const deleteButton = page.getByRole("button", { name: /delete/i });
        if (await deleteButton.isVisible({ timeout: 5000 })) {
          await deleteButton.click();
          await expect(
            page.getByText(/deleted successfully/i),
          ).toBeVisible({ timeout: 10000 });
        }
      }
    });
  });
});
