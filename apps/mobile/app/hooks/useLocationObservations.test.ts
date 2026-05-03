/**
 * Tests for useLocationObservations hook
 *
 * Covers the location-hierarchy cascade (#123): city → state → country
 * fallback, scope flag, dedup of higher-scope fan-out by propertyId, and
 * backward-compat for the deprecated `isStateLevelFallback` field.
 */

import { createElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react-native"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetLocationObservations = jest.fn()
const mockGetLocationObservationsByState = jest.fn()
const mockGetLocationObservationsByCountry = jest.fn()
const mockGetObservedProperties = jest.fn()
const mockGetPropertyThresholdsForJurisdiction = jest.fn()

jest.mock("../services/amplify/data", () => ({
  getLocationObservations: (...args: unknown[]) => mockGetLocationObservations(...args),
  getLocationObservationsByState: (...args: unknown[]) =>
    mockGetLocationObservationsByState(...args),
  getLocationObservationsByCountry: (...args: unknown[]) =>
    mockGetLocationObservationsByCountry(...args),
  getObservedProperties: (...args: unknown[]) => mockGetObservedProperties(...args),
  getPropertyThresholdsForJurisdiction: (...args: unknown[]) =>
    mockGetPropertyThresholdsForJurisdiction(...args),
}))

jest.mock("./useNetworkStatus", () => ({
  useNetworkStatus: () => ({
    isOffline: false,
    isReady: true,
  }),
}))

// `calculateObservationStatus` is a pure helper; mock it to a deterministic
// value so the test focuses on the cascade/scope plumbing rather than the
// status-derivation logic (covered elsewhere).
jest.mock("../data/types/safety", () => {
  const actual = jest.requireActual("../data/types/safety")
  return {
    ...actual,
    calculateObservationStatus: jest.fn(() => "safe"),
  }
})

// eslint-disable-next-line import/first
import { useLocationObservations } from "./useLocationObservations"

// ── Test data ────────────────────────────────────────────────────────────────

const radonProperty = {
  propertyId: "radon",
  name: "Radon",
  category: "radiation",
  observationType: "numeric",
  unit: "Bq/m³",
  higherIsBad: true,
}

const lymeProperty = {
  propertyId: "lyme",
  name: "Lyme",
  category: "disease",
  observationType: "endemic",
  higherIsBad: true,
}

const cityRadon = {
  city: "Sorel-Tracy",
  state: "QC",
  country: "CA",
  propertyId: "radon",
  numericValue: 120,
  observedAt: "2026-04-01T00:00:00Z",
}

const stateRadon = {
  // state-anchored record — null city
  city: null,
  state: "QC",
  country: "CA",
  propertyId: "radon",
  numericValue: 200,
  observedAt: "2026-04-01T00:00:00Z",
}

const stateLyme = {
  city: null,
  state: "QC",
  country: "CA",
  propertyId: "lyme",
  endemicValue: true,
  observedAt: "2026-04-01T00:00:00Z",
}

const countryRadon = {
  city: null,
  state: null,
  country: "CA",
  propertyId: "radon",
  numericValue: 90,
  observedAt: "2026-04-01T00:00:00Z",
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let queryClient: QueryClient

function createWrapper() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const baseParams = {
  city: "Sorel-Tracy",
  state: "QC",
  country: "CA",
  jurisdictionCode: "CA-QC",
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useLocationObservations cascade fallback (#123)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetObservedProperties.mockResolvedValue([radonProperty, lymeProperty])
    mockGetPropertyThresholdsForJurisdiction.mockResolvedValue([])
    // Default cascading fetchers to empty so individual tests opt in to
    // the scope they want to exercise.
    mockGetLocationObservations.mockResolvedValue([])
    mockGetLocationObservationsByState.mockResolvedValue([])
    mockGetLocationObservationsByCountry.mockResolvedValue([])
  })

  afterEach(() => {
    queryClient.clear()
  })

  it("reports city scope when city-level data exists and skips state/country fetchers", async () => {
    mockGetLocationObservations.mockResolvedValue([cityRadon])

    const { result } = renderHook(() => useLocationObservations(baseParams), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.observations.length).toBeGreaterThan(0))

    expect(result.current.scope).toBe("city")
    expect(result.current.isStateLevelFallback).toBe(false)
    expect(result.current.observations).toHaveLength(1)
    expect(mockGetLocationObservationsByState).not.toHaveBeenCalled()
    expect(mockGetLocationObservationsByCountry).not.toHaveBeenCalled()
  })

  it("falls back to state and reports scope=state when city has no data", async () => {
    mockGetLocationObservationsByState.mockResolvedValue([stateRadon])

    const { result } = renderHook(() => useLocationObservations(baseParams), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.observations.length).toBeGreaterThan(0))

    expect(result.current.scope).toBe("state")
    expect(result.current.isStateLevelFallback).toBe(true) // legacy field still works
    expect(mockGetLocationObservationsByState).toHaveBeenCalledWith("QC")
    expect(mockGetLocationObservationsByCountry).not.toHaveBeenCalled()
  })

  it("falls back to country when city and state are both empty", async () => {
    mockGetLocationObservationsByCountry.mockResolvedValue([countryRadon])

    const { result } = renderHook(() => useLocationObservations(baseParams), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.observations.length).toBeGreaterThan(0))

    expect(result.current.scope).toBe("country")
    expect(result.current.isStateLevelFallback).toBe(false)
    expect(mockGetLocationObservationsByCountry).toHaveBeenCalledWith("CA")
  })

  it('reports scope "none" when every level is empty', async () => {
    const { result } = renderHook(() => useLocationObservations(baseParams), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.scope).toBe("none")
    expect(result.current.isStateLevelFallback).toBe(false)
    expect(result.current.observations).toEqual([])
  })

  it("dedupes by propertyId for state-scope fan-out (multiple cities reporting same property)", async () => {
    // Two state-scope rows for the SAME property — the cascade dedup
    // should collapse them so only one card surfaces per property.
    const stateRadonAlt = { ...stateRadon, numericValue: 250 }
    mockGetLocationObservationsByState.mockResolvedValue([stateRadon, stateRadonAlt, stateLyme])

    const { result } = renderHook(() => useLocationObservations(baseParams), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.observations.length).toBeGreaterThan(0))

    expect(result.current.scope).toBe("state")
    // Two unique properties (radon + lyme), one card each.
    const propertyIds = result.current.observations.map((o) => o.propertyId).sort()
    expect(propertyIds).toEqual(["lyme", "radon"])
  })

  it("still resolves when state is empty: city → country (state level skipped)", async () => {
    // I2 fix: the hook is enabled whenever any cascade level has a value,
    // so a missing state must NOT silently disable the country fallback.
    // The shared util skips the state level internally.
    mockGetLocationObservations.mockResolvedValue([])
    mockGetLocationObservationsByCountry.mockResolvedValue([countryRadon])

    const { result } = renderHook(() => useLocationObservations({ ...baseParams, state: "" }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.observations.length).toBeGreaterThan(0))
    // City fetcher ran (city is set), state fetcher was skipped (state empty),
    // country fetcher ran on the empty city result and resolved the cascade.
    expect(mockGetLocationObservations).toHaveBeenCalledWith("Sorel-Tracy")
    expect(mockGetLocationObservationsByState).not.toHaveBeenCalled()
    expect(mockGetLocationObservationsByCountry).toHaveBeenCalledWith("CA")
    expect(result.current.scope).toBe("country")
  })

  it("hook is fully disabled only when city, state, AND country are all empty", async () => {
    const { result } = renderHook(
      () => useLocationObservations({ ...baseParams, city: "", state: "", country: "" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockGetLocationObservations).not.toHaveBeenCalled()
    expect(mockGetLocationObservationsByState).not.toHaveBeenCalled()
    expect(mockGetLocationObservationsByCountry).not.toHaveBeenCalled()
    expect(result.current.scope).toBe("none")
  })
})
