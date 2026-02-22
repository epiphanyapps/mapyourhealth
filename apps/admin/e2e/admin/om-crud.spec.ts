import { test, expect } from "@playwright/test";
import { testUrls, adminCredentials } from "../fixtures/test-data";

/**
 * E2E Tests: O&M (Observations & Measurements) Admin Pages
 *
 * Tests for the admin O&M CRUD pages (Issue #127).
 * Verifies that each page loads correctly and CRUD operations work.
 *
 * These tests require admin credentials to be set via environment variables:
 * - ADMIN_TEST_EMAIL
 * - ADMIN_TEST_PASSWORD
 */

// Check if real credentials are configured
const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

test.describe("O&M Admin Pages - Properties", () => {
  test.skip(
    !hasRealCredentials,
    "Skipping - requires ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD env vars",
  );

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${testUrls.admin}/login`);
    await page.fill("input#email", adminCredentials.email);
    await page.fill("input#password", adminCredentials.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(`${testUrls.admin}/`, { timeout: 30000 });
  });

  test("properties page loads with correct heading", async ({ page }) => {
    await page.goto(`${testUrls.admin}/properties`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /observed properties/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/manage what can be measured or observed/i),
    ).toBeVisible();
  });

  test("properties page has Add Property button", async ({ page }) => {
    await page.goto(`${testUrls.admin}/properties`);
    await page.waitForLoadState("networkidle");

    const addButton = page.getByRole("button", { name: /add property/i });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test("properties page shows filter dropdowns", async ({ page }) => {
    await page.goto(`${testUrls.admin}/properties`);
    await page.waitForLoadState("networkidle");

    // Verify filters card exists
    await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();

    // Verify Category filter
    await expect(page.getByText("Category")).toBeVisible();

    // Verify Observation Type filter
    await expect(page.getByText("Observation Type")).toBeVisible();
  });

  test("Add Property dialog opens with correct fields", async ({ page }) => {
    await page.goto(`${testUrls.admin}/properties`);
    await page.waitForLoadState("networkidle");

    // Click Add Property button
    await page.getByRole("button", { name: /add property/i }).click();

    // Verify dialog opened
    await expect(
      page.getByRole("heading", { name: "Create Property" }),
    ).toBeVisible();

    // Verify required fields
    await expect(page.getByLabel(/property id/i)).toBeVisible();
    await expect(page.getByLabel(/name.*english/i)).toBeVisible();
    await expect(page.getByText(/category/i).first()).toBeVisible();
    await expect(page.getByText(/observation type/i).first()).toBeVisible();

    // Verify optional fields
    await expect(page.getByLabel(/unit/i)).toBeVisible();
    await expect(page.getByLabel(/description.*english/i)).toBeVisible();
    await expect(page.getByText(/higher values are worse/i)).toBeVisible();

    // Close dialog
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", { name: "Create Property" }),
    ).not.toBeVisible();
  });

  test("properties table shows correct columns", async ({ page }) => {
    await page.goto(`${testUrls.admin}/properties`);
    await page.waitForLoadState("networkidle");

    // Check table headers
    await expect(page.getByRole("columnheader", { name: /property id/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /name/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /category/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /type/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /unit/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /actions/i })).toBeVisible();
  });
});

test.describe("O&M Admin Pages - Property Thresholds", () => {
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

  test("property thresholds page loads with correct heading", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/property-thresholds`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /property thresholds/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/manage jurisdiction-specific thresholds/i),
    ).toBeVisible();
  });

  test("property thresholds page has Add Threshold button", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/property-thresholds`);
    await page.waitForLoadState("networkidle");

    const addButton = page.getByRole("button", { name: /add threshold/i });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test("property thresholds page shows filter dropdowns", async ({ page }) => {
    await page.goto(`${testUrls.admin}/property-thresholds`);
    await page.waitForLoadState("networkidle");

    // Verify filters card exists
    await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();

    // Verify Property filter
    await expect(page.getByText("Property").first()).toBeVisible();

    // Verify Jurisdiction filter
    await expect(page.getByText("Jurisdiction")).toBeVisible();
  });

  test("Add Threshold dialog opens with correct fields", async ({ page }) => {
    await page.goto(`${testUrls.admin}/property-thresholds`);
    await page.waitForLoadState("networkidle");

    // Click Add Threshold button
    await page.getByRole("button", { name: /add threshold/i }).click();

    // Verify dialog opened
    await expect(
      page.getByRole("heading", { name: "Create Threshold" }),
    ).toBeVisible();

    // Verify required fields
    await expect(page.getByText("Property *")).toBeVisible();
    await expect(page.getByText("Jurisdiction *")).toBeVisible();
    await expect(page.getByText("Status *")).toBeVisible();

    // Verify threshold fields (numeric type fields shown by default)
    await expect(page.getByLabel(/warning value/i)).toBeVisible();
    await expect(page.getByLabel(/danger.*limit value/i)).toBeVisible();

    // Zone mapping should also be visible (default form shows all fields)
    await expect(page.getByLabel(/zone mapping/i)).toBeVisible();

    // Close dialog
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("thresholds table shows correct columns", async ({ page }) => {
    await page.goto(`${testUrls.admin}/property-thresholds`);
    await page.waitForLoadState("networkidle");

    // Check table headers
    await expect(page.getByRole("columnheader", { name: /property/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /jurisdiction/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /warning/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /limit.*danger/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /actions/i })).toBeVisible();
  });
});

test.describe("O&M Admin Pages - Location Observations", () => {
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

  test("observations page loads with correct heading", async ({ page }) => {
    await page.goto(`${testUrls.admin}/observations`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /location observations/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/manage observed data at specific locations/i),
    ).toBeVisible();
  });

  test("observations page has Add Observation button", async ({ page }) => {
    await page.goto(`${testUrls.admin}/observations`);
    await page.waitForLoadState("networkidle");

    const addButton = page.getByRole("button", { name: /add observation/i });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test("observations page shows filter dropdowns", async ({ page }) => {
    await page.goto(`${testUrls.admin}/observations`);
    await page.waitForLoadState("networkidle");

    // Verify filters card exists
    await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();

    // Verify Property filter
    await expect(page.getByText("Property").first()).toBeVisible();

    // Verify Country filter
    await expect(page.getByText("Country")).toBeVisible();

    // Verify State/Province filter
    await expect(page.getByText("State/Province")).toBeVisible();
  });

  test("Add Observation dialog opens with correct fields", async ({ page }) => {
    await page.goto(`${testUrls.admin}/observations`);
    await page.waitForLoadState("networkidle");

    // Click Add Observation button
    await page.getByRole("button", { name: /add observation/i }).click();

    // Verify dialog opened
    await expect(
      page.getByRole("heading", { name: "Create Observation" }),
    ).toBeVisible();

    // Verify location fields
    await expect(page.getByLabel(/city/i)).toBeVisible();
    await expect(page.getByLabel(/state.*province/i)).toBeVisible();
    await expect(page.getByLabel(/country/i)).toBeVisible();

    // Verify property selector
    await expect(page.getByText("Property *")).toBeVisible();

    // Verify date fields
    await expect(page.getByLabel(/observed at/i)).toBeVisible();
    await expect(page.getByLabel(/valid until/i)).toBeVisible();

    // Verify source fields
    await expect(page.getByLabel(/source$/i)).toBeVisible();
    await expect(page.getByLabel(/source url/i)).toBeVisible();

    // Close dialog
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("observations table shows correct columns", async ({ page }) => {
    await page.goto(`${testUrls.admin}/observations`);
    await page.waitForLoadState("networkidle");

    // Check table headers
    await expect(page.getByRole("columnheader", { name: /location/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /property/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /value/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /observed/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /source/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /actions/i })).toBeVisible();
  });
});

test.describe("O&M Admin Pages - Navigation", () => {
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

  test("sidebar shows O&M navigation links", async ({ page }) => {
    await page.goto(`${testUrls.admin}/`);
    await page.waitForLoadState("networkidle");

    // Check for O&M section in sidebar
    await expect(page.getByRole("link", { name: /properties/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /thresholds/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /observations/i })).toBeVisible();
  });

  test("clicking Properties link navigates to properties page", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /properties/i }).click();
    await expect(page).toHaveURL(/.*properties$/);
  });

  test("clicking Thresholds link navigates to thresholds page", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /thresholds/i }).click();
    await expect(page).toHaveURL(/.*property-thresholds$/);
  });

  test("clicking Observations link navigates to observations page", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /observations/i }).click();
    await expect(page).toHaveURL(/.*observations$/);
  });
});

test.describe("O&M Admin Pages - No Auth", () => {
  test("redirects to login when not authenticated - properties", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/properties`);
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });

  test("redirects to login when not authenticated - thresholds", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/property-thresholds`);
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });

  test("redirects to login when not authenticated - observations", async ({
    page,
  }) => {
    await page.goto(`${testUrls.admin}/observations`);
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });
});
