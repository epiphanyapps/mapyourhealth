import { test, expect } from "@playwright/test";
import { testUrls, adminCredentials } from "../fixtures/test-data";

/**
 * E2E Tests: Admin Thresholds Page
 *
 * Read-only UI assertions for /thresholds — the page where jurisdiction-
 * specific contaminant limits are managed. The mobile contaminant table's
 * WHO and LOCAL columns derive from this data, so silent bugs here surface
 * as wrong threshold limits in production.
 *
 * Scope (first pass): heading, Add Threshold button, filter card, Create
 * Threshold dialog fields, table headers, dialog cancel. No real
 * CREATE/UPDATE/DELETE against DynamoDB yet — that's the next spec, and
 * it needs a test-jurisdiction prefix strategy before it can run against
 * staging without polluting real data.
 *
 * Modeled on om-crud.spec.ts (the established CRUD-page template).
 *
 * Requires admin credentials via env (provided by playwright-tests.yml in
 * CI; locally: ADMIN_TEST_EMAIL=seed@mapyourhealth.info
 * ADMIN_TEST_PASSWORD=SeedAdmin2026!).
 */

const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

test.describe("Admin Thresholds Page", () => {
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

  test("thresholds page loads with correct heading", async ({ page }) => {
    await page.goto(`${testUrls.admin}/thresholds`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Thresholds", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/manage jurisdiction-specific contaminant limits/i),
    ).toBeVisible();
  });

  test("thresholds page has Add Threshold button", async ({ page }) => {
    await page.goto(`${testUrls.admin}/thresholds`);
    await page.waitForLoadState("networkidle");

    const addButton = page.getByRole("button", { name: /add threshold/i });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test("thresholds page shows filter dropdowns", async ({ page }) => {
    await page.goto(`${testUrls.admin}/thresholds`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
    // Filter labels — both filter card and create dialog use "Contaminant" /
    // "Jurisdiction", so disambiguate by scoping to the filter card.
    const filtersCard = page
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: "Filters" }) })
      .first();
    await expect(filtersCard.getByText("Contaminant", { exact: true })).toBeVisible();
    await expect(filtersCard.getByText("Jurisdiction", { exact: true })).toBeVisible();
  });

  test("Create Threshold dialog opens with required fields", async ({ page }) => {
    await page.goto(`${testUrls.admin}/thresholds`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /add threshold/i }).click();

    await expect(
      page.getByRole("heading", { name: "Create Threshold" }),
    ).toBeVisible();
    await expect(
      page.getByText(/add a new jurisdiction-specific threshold/i),
    ).toBeVisible();

    // All 5 form fields — names match labels in apps/admin/src/app/(admin)/thresholds/page.tsx
    await expect(page.getByText(/contaminant \*/i)).toBeVisible();
    await expect(page.getByText(/jurisdiction \*/i)).toBeVisible();
    await expect(page.getByLabel(/limit value/i)).toBeVisible();
    await expect(page.getByLabel(/warning ratio/i)).toBeVisible();
    await expect(page.getByText(/status \*/i)).toBeVisible();

    // Footer actions
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  });

  test("thresholds table shows correct columns", async ({ page }) => {
    await page.goto(`${testUrls.admin}/thresholds`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("columnheader", { name: /contaminant/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /jurisdiction/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /limit value/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /warning ratio/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /status/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /actions/i }),
    ).toBeVisible();
  });

  test("cancel from Create Threshold dialog returns to list", async ({ page }) => {
    await page.goto(`${testUrls.admin}/thresholds`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /add threshold/i }).click();
    await expect(
      page.getByRole("heading", { name: "Create Threshold" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByRole("heading", { name: "Create Threshold" }),
    ).not.toBeVisible();
    // List card is still rendered
    await expect(
      page.getByRole("heading", { name: "Thresholds", exact: true }),
    ).toBeVisible();
  });
});
