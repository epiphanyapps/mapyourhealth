import { test, expect } from "@playwright/test"

test.describe("Address Resolution", () => {
  test("should resolve street address to nearest city", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Search for a specific street address
    const searchInput = page.getByRole("textbox", { name: /search/i })
    await searchInput.fill("350 5th Avenue, New York")

    // Wait for autocomplete suggestion (may show full address or abbreviated)
    const suggestion = page.getByRole("button", {
      name: "Select 350 5th Avenue, New York, NY, USA",
    })
    await expect(suggestion).toBeVisible({ timeout: 15000 })

    // Select the address
    await suggestion.click()

    // Verify it resolves to New York, NY
    await expect(page.getByRole("heading", { name: /New York/i })).toBeVisible({ timeout: 15000 })

    // Verify the "nearest city" banner is shown
    await expect(page.getByText(/Showing data for nearest city to/i)).toBeVisible({
      timeout: 10000,
    })

    // Verify data is displayed
    await expect(page.getByText("Water Quality")).toBeVisible({ timeout: 15000 })
  })
})
