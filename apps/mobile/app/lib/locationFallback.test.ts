/**
 * Tests for the location-hierarchy cascading fallback util (#123).
 */

import { describeScope, fetchWithLocationFallback } from "./locationFallback"

describe("fetchWithLocationFallback", () => {
  const location = { city: "Sorel-Tracy", state: "QC", country: "CA" }

  it("returns city-scope data when the city fetcher resolves non-empty", async () => {
    const result = await fetchWithLocationFallback(location, {
      byCity: async () => [{ id: "city-row" }],
      byState: async () => [{ id: "state-row" }],
      byCountry: async () => [{ id: "country-row" }],
    })
    expect(result).toEqual({ data: [{ id: "city-row" }], scope: "city" })
  })

  it("falls back to state when the city fetcher returns empty", async () => {
    const result = await fetchWithLocationFallback(location, {
      byCity: async () => [],
      byState: async () => [{ id: "state-row" }],
      byCountry: async () => [{ id: "country-row" }],
    })
    expect(result).toEqual({ data: [{ id: "state-row" }], scope: "state" })
  })

  it("falls back to country when both city and state are empty", async () => {
    const result = await fetchWithLocationFallback(location, {
      byCity: async () => [],
      byState: async () => [],
      byCountry: async () => [{ id: "country-row" }],
    })
    expect(result).toEqual({ data: [{ id: "country-row" }], scope: "country" })
  })

  it('returns scope "none" when every level is empty', async () => {
    const result = await fetchWithLocationFallback(location, {
      byCity: async () => [],
      byState: async () => [],
      byCountry: async () => [],
    })
    expect(result).toEqual({ data: [], scope: "none" })
  })

  it("skips scopes whose location field is empty", async () => {
    const byCity = jest.fn(async () => [])
    const byState = jest.fn(async () => [])
    const byCountry = jest.fn(async () => [{ id: "country-row" }])
    const result = await fetchWithLocationFallback(
      { city: "", state: "", country: "CA" },
      { byCity, byState, byCountry },
    )
    expect(byCity).not.toHaveBeenCalled()
    expect(byState).not.toHaveBeenCalled()
    expect(byCountry).toHaveBeenCalledWith("CA")
    expect(result.scope).toBe("country")
  })

  it("skips scopes whose fetcher is omitted entirely", async () => {
    const result = await fetchWithLocationFallback(location, {
      byCountry: async () => [{ id: "country-row" }],
    })
    expect(result).toEqual({ data: [{ id: "country-row" }], scope: "country" })
  })

  it("does not call lower-precedence fetchers once a level returns data", async () => {
    const byCity = jest.fn(async () => [{ id: "city-row" }])
    const byState = jest.fn(async () => [{ id: "state-row" }])
    const byCountry = jest.fn(async () => [{ id: "country-row" }])
    await fetchWithLocationFallback(location, { byCity, byState, byCountry })
    expect(byCity).toHaveBeenCalledTimes(1)
    expect(byState).not.toHaveBeenCalled()
    expect(byCountry).not.toHaveBeenCalled()
  })

  it("propagates a fetcher error rather than swallowing it", async () => {
    await expect(
      fetchWithLocationFallback(location, {
        byCity: async () => {
          throw new Error("network down")
        },
        byState: async () => [{ id: "state-row" }],
      }),
    ).rejects.toThrow("network down")
  })
})

describe("describeScope", () => {
  it("returns null for city scope (no badge needed)", () => {
    expect(describeScope("city", { state: "QC", country: "CA" })).toBeNull()
  })

  it("returns the state label for state scope", () => {
    expect(describeScope("state", { state: "QC", country: "CA" })).toBe("Showing QC data")
  })

  it("returns the country label for country scope", () => {
    expect(describeScope("country", { state: "QC", country: "CA" })).toBe("Showing CA data")
  })

  it("returns null for none scope", () => {
    expect(describeScope("none", { state: "QC", country: "CA" })).toBeNull()
  })

  it("falls back to a generic label when state/country missing", () => {
    expect(describeScope("state", {})).toBe("Showing state-level data")
    expect(describeScope("country", {})).toBe("Showing country-level data")
  })
})
