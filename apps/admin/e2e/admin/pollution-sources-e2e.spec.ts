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

  // #357 — the Sources card used to overflow its column because
  // CardContent had no height constraint and the inner scroll used
  // max-h-full. These tests pin the fixed layout: the card must stay
  // inside the left column at common viewport widths, and CardContent
  // must remain a bounded overflow-clipped box so the inner list scrolls
  // instead of escaping.
  test.describe("Sources card layout (#357)", () => {
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

    const sourcesCardLocator = (page: import("@playwright/test").Page) =>
      page
        .locator('[data-slot="card"]')
        .filter({
          has: page.locator('[data-slot="card-title"]', {
            hasText: /^sources$/i,
          }),
        })
        .first();

    for (const vp of [
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      test(`Sources card stays inside the left column at ${vp.width}×${vp.height}`, async ({
        page,
      }) => {
        await page.setViewportSize(vp);
        await page.goto(`${testUrls.admin}/pollution-sources`);
        await page.waitForLoadState("networkidle");

        const sourcesCard = sourcesCardLocator(page);
        await expect(sourcesCard).toBeVisible();

        // Left panel is the only w-80 column on this page; ancestor walk
        // would be safer but this selector is stable enough for now.
        const leftColumn = page.locator("div.w-80").first();
        await expect(leftColumn).toBeVisible();

        const [cardBox, colBox] = await Promise.all([
          sourcesCard.boundingBox(),
          leftColumn.boundingBox(),
        ]);
        expect(cardBox).not.toBeNull();
        expect(colBox).not.toBeNull();

        // 1px tolerance for sub-pixel rounding. Card must not extend
        // below or to the right of its parent column.
        const cardBottom = cardBox!.y + cardBox!.height;
        const colBottom = colBox!.y + colBox!.height;
        const cardRight = cardBox!.x + cardBox!.width;
        const colRight = colBox!.x + colBox!.width;

        expect(
          cardBottom,
          `Sources card bottom (${cardBottom}) must not exceed left column bottom (${colBottom})`,
        ).toBeLessThanOrEqual(colBottom + 1);
        expect(
          cardRight,
          `Sources card right edge (${cardRight}) must not exceed left column right edge (${colRight})`,
        ).toBeLessThanOrEqual(colRight + 1);
      });
    }

    test("CardContent stays a bounded box so the list scrolls inside it", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${testUrls.admin}/pollution-sources`);
      await page.waitForLoadState("networkidle");

      const sourcesCard = sourcesCardLocator(page);
      const content = sourcesCard.locator('[data-slot="card-content"]');
      await expect(content).toBeVisible();

      // The #357 fix sets overflow-hidden on CardContent so the inner
      // h-full overflow-y-auto scroller has a real parent height to size
      // against. If someone reverts the override (or removes the
      // flex chain), this assertion fails.
      const overflow = await content.evaluate(
        (el) => getComputedStyle(el).overflowY,
      );
      expect(["hidden", "clip", "auto", "scroll"]).toContain(overflow);
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
