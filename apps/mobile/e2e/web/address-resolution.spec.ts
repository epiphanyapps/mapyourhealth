import { test, expect } from "@playwright/test"

test.describe("Address Resolution", () => {
  test("should resolve street address to nearest city", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Search for a specific street address
    const searchInput = page.getByPlaceholder("Search city or location...")
    await searchInput.fill("350 5th Avenue, New York")

    // Wait for autocomplete suggestions
    const suggestion = page.getByRole("button", { name: /Select 350 5th Ave/i })
    await expect(suggestion).toBeVisible({ timeout: 10000 })

    // Select the address
    await suggestion.click()

    // Verify it resolves to New York, NY
    await expect(page.getByText(/New York.*NY/)).toBeVisible({ timeout: 15000 })

    // Verify the "nearest city" banner is shown
    await expect(page.getByText(/Showing data for nearest city to:/)).toBeVisible({
      timeout: 10000,
    })

    // Verify data is displayed
    await expect(page.getByText("Tap Water Quality")).toBeVisible({ timeout: 15000 })
  })
})
