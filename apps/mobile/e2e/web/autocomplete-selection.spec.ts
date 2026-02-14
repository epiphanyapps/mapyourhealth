import { test, expect } from "@playwright/test"

test.describe("Autocomplete Selection", () => {
  test("should select autocomplete suggestion on click", async ({ page }) => {
    await page.goto("/")

    // Wait for the app to fully load (locations data is fetched on mount)
    await page.waitForLoadState("networkidle")

    // Type in search box
    const searchInput = page.getByPlaceholder("Search city or location...")
    await searchInput.fill("new y")

    // Wait for suggestions dropdown - look for the pressable button with accessibility label
    const suggestion = page.getByRole("button", { name: /Select New York/i })
    await expect(suggestion).toBeVisible({ timeout: 10000 })

    // Click the suggestion
    await suggestion.click()

    // Verify selection worked - "New York" should appear in the content area
    await expect(page.getByText("New York")).toBeVisible({ timeout: 10000 })

    // Input should be cleared after selection
    await expect(searchInput).toHaveValue("")
  })
})
