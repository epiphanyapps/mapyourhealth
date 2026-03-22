import { test, expect } from "@playwright/test"

test.describe("City Data Display", () => {
  test("should search Montreal and display water quality data", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Find and fill search input
    const searchInput = page.getByRole("textbox", { name: /search/i })
    await searchInput.fill("Montreal")

    // Wait for and select Montreal, QC, Canada suggestion
    const suggestion = page.getByRole("button", { name: /Select Montreal, QC, Canada/i })
    await expect(suggestion).toBeVisible({ timeout: 15000 })
    await suggestion.click()

    // Verify Montreal, QC heading
    await expect(page.getByRole("heading", { name: /Montreal/i })).toBeVisible({ timeout: 15000 })

    // Verify URL contains location params
    await page.waitForURL(/city=Montreal/i, { timeout: 10000 })
    expect(page.url()).toMatch(/state=QC/i)
    expect(page.url()).toMatch(/country=CA/i)

    // Verify Water Quality section is visible
    await expect(page.getByText("Water Quality")).toBeVisible({ timeout: 15000 })

    // Click on Water Quality to expand
    await page.getByRole("button", { name: /Water Quality/i }).first().click()

    // Verify subcategories appear
    await expect(page.getByText("Disinfection Byproducts")).toBeVisible({ timeout: 10000 })
  })

  test("should search New York and display dashboard", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const searchInput = page.getByRole("textbox", { name: /search/i })
    await searchInput.fill("New York")

    // Select the city result specifically (not state, hotel, or university)
    const suggestion = page.getByRole("button", { name: /Select New York, NY, USA$/i })
    await expect(suggestion).toBeVisible({ timeout: 15000 })
    await suggestion.click()

    // Verify New York heading
    await expect(page.getByRole("heading", { name: /New York/i })).toBeVisible({ timeout: 15000 })

    // Verify Water Quality section
    await expect(page.getByText("Water Quality")).toBeVisible({ timeout: 15000 })
  })
})
