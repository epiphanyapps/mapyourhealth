import { test, expect } from "@playwright/test";
import { testUrls, adminCredentials } from "../fixtures/test-data";

/**
 * E2E-123: Location-hierarchy cascade — admin import validation
 *
 * Verifies the admin import page accepts the new state- and country-
 * scoped CSV rows introduced by PR #278:
 *   - city + state + country → city-scoped (legacy behavior)
 *   - state + country (no city) → state-scoped (new)
 *   - country only (no city/state) → country-scoped (new)
 *   - city without state → still rejected as ambiguous
 *
 * The page-level validation runs entirely client-side, so this spec
 * doesn't need a seeded backend — it parses the uploaded CSV and
 * surfaces row-level errors in the preview table. The Import button
 * isn't clicked: actually inserting rows would touch DynamoDB and
 * isn't the validation we're verifying here.
 *
 * Requires admin credentials via env vars:
 *   - ADMIN_TEST_EMAIL
 *   - ADMIN_TEST_PASSWORD
 */

const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

// Build a tiny in-memory CSV with one valid row of each scope plus
// one deliberately-broken row.
function buildCascadeCsv(): { name: string; mimeType: string; buffer: Buffer } {
  const csv = [
    "city,state,country,contaminantId,value,source",
    // City-scoped (legacy)
    "Beverly Hills,CA,US,nitrate,8500,EPA",
    // State-scoped — no city, just state + country
    ",QC,CA,radon,3.0,Health Canada",
    // Country-scoped — no city, no state, just country
    ",,CA,radon,2.5,Federal Average",
    // Invalid: city without state must still be rejected as ambiguous
    "Springfield,,US,lead,4.2,Local Lab",
  ].join("\n");
  return {
    name: "cascade-test.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf-8"),
  };
}

test.describe("E2E-123: Cascade import validation (#123)", () => {
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
    await page.goto(`${testUrls.admin}/import`);
    await page.waitForLoadState("networkidle");
  });

  test("CSV format hint advertises the new optional city/state semantics", async ({
    page,
  }) => {
    // Water Quality tab is the default; the hint should mention that
    // city + state can be left blank for state-/country-level rows.
    await page.getByRole("tab", { name: /water quality/i }).click();

    // The import page renders the field hints joined with commas inside
    // CardDescription. Use a regex on the visible text rather than
    // exact match so a copy tweak doesn't break the test.
    await expect(
      page.getByText(/city.*optional.*leave blank.*state.*country.*level/i),
    ).toBeVisible();
    await expect(
      page.getByText(/state.*optional if city blank/i),
    ).toBeVisible();
    await expect(page.getByText(/country.*required/i)).toBeVisible();
  });

  test("CSV example shows state- and country-scoped rows in the Air Pollution template", async ({
    page,
  }) => {
    // The Air template is where the cascade rows are most useful
    // (radon is the canonical multi-scope contaminant) — confirm the
    // example actually demonstrates the new cascade form rather than
    // just describing it.
    await page.getByRole("tab", { name: /air pollution/i }).click();

    // The example block contains a state-scoped row ",QC,CA,radon,..."
    // and a country-scoped row ",,CA,radon,...". Use a forgiving
    // substring match because <pre> whitespace varies.
    const examplePre = page.locator("pre", {
      hasText: /radon/i,
    });
    await expect(examplePre.first()).toContainText(",QC,CA,radon");
    await expect(examplePre.first()).toContainText(",,CA,radon");
  });

  test("uploading a CSV with mixed scopes accepts state/country rows and rejects city-without-state", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /water quality/i }).click();

    const fileInput = page.locator('input[type="file"]');
    const csv = buildCascadeCsv();
    await fileInput.setInputFiles({
      name: csv.name,
      mimeType: csv.mimeType,
      buffer: csv.buffer,
    });

    // The preview table should render. Wait for it to appear instead
    // of hard-coding a delay — the file parser is async.
    await expect(page.getByText(/Preview/)).toBeVisible({ timeout: 10000 });

    // Three of the four rows are valid (city, state, country scopes);
    // one is invalid (city without state).
    await expect(page.getByText(/3 valid/i)).toBeVisible();
    await expect(page.getByText(/1 invalid/i)).toBeVisible();

    // The invalid row's error column should specifically call out the
    // city-without-state rule we kept after relaxing the schema.
    await expect(
      page.getByText(/state is required when city is provided/i),
    ).toBeVisible();
  });

  test("Silent import toggle is present in the preview header", async ({
    page,
  }) => {
    // Bulk imports flagged as silent must NOT trigger notification fan-
    // out, especially now that state/country-scoped rows can blast
    // every subscriber in a country.
    await page.getByRole("tab", { name: /water quality/i }).click();

    const fileInput = page.locator('input[type="file"]');
    const csv = buildCascadeCsv();
    await fileInput.setInputFiles({
      name: csv.name,
      mimeType: csv.mimeType,
      buffer: csv.buffer,
    });

    await expect(page.getByText(/Preview/)).toBeVisible({ timeout: 10000 });

    // The toggle is rendered as a labelled switch — assert by label
    // text and the implicit role.
    await expect(page.getByLabel(/silent import/i)).toBeVisible();
  });
});
