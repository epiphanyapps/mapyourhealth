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

  describe("getRowAnchor (EPI-17 / EPI-18 anchored fallback)", () => {
    type Row = { id: string; city: string | null; state: string | null }
    const sorelTracy: Row = { id: "sorel-1", city: "Sorel-Tracy", state: "QC" }
    const stateAnchored: Row = { id: "qc-state", city: null, state: "QC" }
    const countryAnchored: Row = { id: "ca-country", city: null, state: null }

    it("filters by-state results to rows with no city when getRowAnchor is provided", async () => {
      // GSI-style fetch: returns every row in QC including a sibling city's rows.
      const result = await fetchWithLocationFallback<Row>(
        { city: "Montreal", state: "QC", country: "CA" },
        {
          byCity: async () => [],
          byState: async () => [sorelTracy, stateAnchored],
          getRowAnchor: (row) => ({ city: row.city, state: row.state }),
        },
      )
      expect(result).toEqual({ data: [stateAnchored], scope: "state" })
    })

    it("falls through to country when by-state returns only non-anchored rows", async () => {
      // QC fetch returns only Sorel-Tracy data (no state-anchored rows). The
      // user is in Montreal, so the cascade must skip the leaked rows and
      // try country-level next.
      const byCountry = jest.fn(async () => [countryAnchored])
      const result = await fetchWithLocationFallback<Row>(
        { city: "Montreal", state: "QC", country: "CA" },
        {
          byCity: async () => [],
          byState: async () => [sorelTracy],
          byCountry,
          getRowAnchor: (row) => ({ city: row.city, state: row.state }),
        },
      )
      expect(byCountry).toHaveBeenCalledWith("CA")
      expect(result).toEqual({ data: [countryAnchored], scope: "country" })
    })

    it("filters by-country results to rows with no city and no state", async () => {
      const result = await fetchWithLocationFallback<Row>(
        { city: "", state: "", country: "CA" },
        {
          byCountry: async () => [stateAnchored, countryAnchored, sorelTracy],
          getRowAnchor: (row) => ({ city: row.city, state: row.state }),
        },
      )
      expect(result).toEqual({ data: [countryAnchored], scope: "country" })
    })

    it("returns scope none when state and country fetchers only have leaked rows", async () => {
      const result = await fetchWithLocationFallback<Row>(
        { city: "Montreal", state: "QC", country: "CA" },
        {
          byCity: async () => [],
          byState: async () => [sorelTracy],
          byCountry: async () => [stateAnchored],
          getRowAnchor: (row) => ({ city: row.city, state: row.state }),
        },
      )
      expect(result).toEqual({ data: [], scope: "none" })
    })

    it("preserves legacy unfiltered behavior when getRowAnchor is omitted", async () => {
      const result = await fetchWithLocationFallback<Row>(
        { city: "Montreal", state: "QC", country: "CA" },
        {
          byCity: async () => [],
          byState: async () => [sorelTracy],
        },
      )
      expect(result).toEqual({ data: [sorelTracy], scope: "state" })
    })
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
