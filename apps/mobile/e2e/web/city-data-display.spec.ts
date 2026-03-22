import { test, expect } from "@playwright/test"

test.describe("City Data Display", () => {
  test("should search Montreal and display water quality data", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Type in search box
    const searchInput = page.getByPlaceholder("Search city or location...")
    await searchInput.fill("Montreal")

    // Wait for autocomplete suggestions
    const suggestion = page.getByRole("button", { name: /Select Montreal/i })
    await expect(suggestion).toBeVisible({ timeout: 10000 })

    // Select Montreal
    await suggestion.click()

    // Verify Montreal, QC heading
    await expect(page.getByText(/Montreal.*QC/)).toBeVisible({ timeout: 15000 })

    // Verify URL contains location params
    await page.waitForURL(/city=Montreal/i, { timeout: 10000 })
    expect(page.url()).toMatch(/state=QC/i)
    expect(page.url()).toMatch(/country=CA/i)

    // Verify Water Quality section is visible
    await expect(page.getByText("Tap Water Quality")).toBeVisible({ timeout: 15000 })

    // Click on Water Quality to expand
    await page.getByText("Tap Water Quality").click()

    // Verify contaminant data table/subcategories appear
    await expect(page.getByText("Disinfection Byproducts")).toBeVisible({ timeout: 10000 })
  })

  test("should search New York and display dashboard", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const searchInput = page.getByPlaceholder("Search city or location...")
    await searchInput.fill("New York")

    const suggestion = page.getByRole("button", { name: /Select New York/i })
    await expect(suggestion).toBeVisible({ timeout: 10000 })

    await suggestion.click()

    // Verify New York, NY heading
    await expect(page.getByText(/New York.*NY/)).toBeVisible({ timeout: 15000 })

    // Verify Water Quality section
    await expect(page.getByText("Tap Water Quality")).toBeVisible({ timeout: 15000 })
  })
})
