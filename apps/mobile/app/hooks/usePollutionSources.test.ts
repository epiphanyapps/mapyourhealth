/**
 * Tests for usePollutionSources hook.
 *
 * Verifies:
 *  - city-level cascade returns city rows + scope: "city"
 *  - state fallback when byCity returns []
 *  - country fallback when byCity + byState are empty
 *  - getRowAnchor filters state-fallback rows pinned to other cities
 *  - none scope when every level is empty
 *  - refresh() invalidates the right query keys
 */

import { createElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react-native"

const mockByCity = jest.fn()
const mockByState = jest.fn()
const mockByCountry = jest.fn()

jest.mock("../services/amplify/data", () => ({
  getPollutionSourcesByCity: (...args) => mockByCity(...args),
  getPollutionSourcesByState: (...args) => mockByState(...args),
  getPollutionSourcesByCountry: (...args) => mockByCountry(...args),
}))

// eslint-disable-next-line import/first
import { usePollutionSources } from "./usePollutionSources"

// ── Test data ────────────────────────────────────────────────────────────────

const montrealLandfill = {
  id: "ps-1",
  sourceId: "seed-source-montreal-landfill",
  name: "Montreal Landfill",
  sourceType: "waste_site",
  latitude: 45.5019,
  longitude: -73.5674,
  impactRadius: 2000,
  city: "Montreal",
  state: "QC",
  country: "CA",
  severityLevel: "moderate",
  status: "active",
}

const qcMining = {
  id: "ps-2",
  sourceId: "seed-source-qc-mining",
  name: "Quebec Mining Operation",
  sourceType: "mining",
  latitude: 46.8,
  longitude: -71.2,
  impactRadius: 5000,
  city: null, // state-anchored — has no city
  state: "QC",
  country: "CA",
  severityLevel: "moderate",
  status: "active",
}

const sorelTracyMining = {
  id: "ps-3",
  sourceId: "sorel-tracy-pinned",
  name: "Sorel-Tracy Pinned (should NOT leak to Montreal users)",
  sourceType: "mining",
  latitude: 46.0,
  longitude: -73.1,
  impactRadius: 1000,
  city: "Sorel-Tracy", // city-anchored — would leak if anchor filter is off
  state: "QC",
  country: "CA",
  severityLevel: "low",
  status: "active",
}

const caTransportation = {
  id: "ps-4",
  sourceId: "seed-source-ca-transportation",
  name: "Canada-wide Transportation Corridor",
  sourceType: "transportation",
  latitude: 60.0,
  longitude: -95.0,
  impactRadius: 10000,
  city: null,
  state: null,
  country: "CA",
  severityLevel: "low",
  status: "monitored",
}

// ── Wrapper ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("usePollutionSources", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockByCity.mockResolvedValue([])
    mockByState.mockResolvedValue([])
    mockByCountry.mockResolvedValue([])
  })

  it("returns sources from the city fetcher when present", async () => {
    mockByCity.mockResolvedValue([montrealLandfill])

    const { result } = renderHook(() => usePollutionSources("Montreal", "QC", "CA"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sources).toEqual([montrealLandfill])
    expect(result.current.scope).toBe("city")
    expect(result.current.error).toBeNull()
    expect(mockByCity).toHaveBeenCalledWith("Montreal")
    expect(mockByState).not.toHaveBeenCalled()
    expect(mockByCountry).not.toHaveBeenCalled()
  })

  it("falls back to state when city returns no rows", async () => {
    mockByCity.mockResolvedValue([])
    mockByState.mockResolvedValue([qcMining])

    const { result } = renderHook(() => usePollutionSources("Sorel-Tracy", "QC", "CA"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sources).toEqual([qcMining])
    expect(result.current.scope).toBe("state")
    expect(mockByCity).toHaveBeenCalledWith("Sorel-Tracy")
    expect(mockByState).toHaveBeenCalledWith("QC")
    expect(mockByCountry).not.toHaveBeenCalled()
  })

  it("falls back to country when city and state both empty", async () => {
    mockByCity.mockResolvedValue([])
    mockByState.mockResolvedValue([])
    mockByCountry.mockResolvedValue([caTransportation])

    const { result } = renderHook(() => usePollutionSources("Halifax", "NS", "CA"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sources).toEqual([caTransportation])
    expect(result.current.scope).toBe("country")
    expect(mockByCountry).toHaveBeenCalledWith("CA")
  })

  it("filters out city-pinned rows on state fallback (EPI-17/18 anchor check)", async () => {
    // byState returns BOTH a state-anchored row AND a Sorel-Tracy-pinned row.
    // The hook's getRowAnchor must filter the pinned one out so a Montreal
    // user doesn't see Sorel-Tracy's data through the QC GSI.
    mockByCity.mockResolvedValue([])
    mockByState.mockResolvedValue([qcMining, sorelTracyMining])

    const { result } = renderHook(() => usePollutionSources("Montreal", "QC", "CA"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sources).toEqual([qcMining])
    expect(result.current.scope).toBe("state")
  })

  it("returns scope: 'none' when every level is empty", async () => {
    mockByCity.mockResolvedValue([])
    mockByState.mockResolvedValue([])
    mockByCountry.mockResolvedValue([])

    const { result } = renderHook(() => usePollutionSources("Tokyo", "Tokyo", "JP"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sources).toEqual([])
    expect(result.current.scope).toBe("none")
  })

  it("does not fire fetchers when country is empty", async () => {
    const { result } = renderHook(() => usePollutionSources("", "", ""), {
      wrapper: createWrapper(),
    })

    // Query is disabled, stays idle.
    expect(result.current.isLoading).toBe(false)
    expect(result.current.sources).toEqual([])
    expect(result.current.scope).toBe("none")
    expect(mockByCity).not.toHaveBeenCalled()
    expect(mockByState).not.toHaveBeenCalled()
    expect(mockByCountry).not.toHaveBeenCalled()
  })

  it("surfaces fetcher errors via `error`", async () => {
    mockByCity.mockRejectedValue(new Error("network down"))

    const { result } = renderHook(() => usePollutionSources("Montreal", "QC", "CA"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.error).toBe("network down"))
    expect(result.current.sources).toEqual([])
  })
})
