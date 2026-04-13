/**
 * Tests for usePollutionSources hook
 *
 * Verifies city-level fetching, state-level fallback, disabled state,
 * and error handling.
 */

import { createElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react-native"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetPollutionSourcesByCity = jest.fn()
const mockGetPollutionSourcesByState = jest.fn()

jest.mock("../services/amplify/data", () => ({
  getPollutionSourcesByCity: (...args: unknown[]) => mockGetPollutionSourcesByCity(...args),
  getPollutionSourcesByState: (...args: unknown[]) => mockGetPollutionSourcesByState(...args),
}))

let mockIsOffline = false
jest.mock("./useNetworkStatus", () => ({
  useNetworkStatus: () => ({
    isOffline: mockIsOffline,
    isReady: true,
  }),
}))

// eslint-disable-next-line import/first
import { usePollutionSources } from "./usePollutionSources"

// ── Test data ────────────────────────────────────────────────────────────────

const citySource = {
  id: "src-1",
  name: "Grain Silo Port",
  sourceType: "industrial",
  city: "Sorel-Tracy",
  state: "QC",
  country: "CA",
  latitude: 46.04,
  longitude: -73.12,
  impactRadius: 5000,
  severity: "moderate",
  status: "active",
}

const stateSource = {
  id: "src-2",
  name: "Provincial Landfill",
  sourceType: "waste_site",
  city: "Trois-Rivières",
  state: "QC",
  country: "CA",
  latitude: 46.35,
  longitude: -72.54,
  impactRadius: 3000,
  severity: "high",
  status: "monitored",
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let queryClient: QueryClient

function createWrapper() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("usePollutionSources", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsOffline = false
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe("city-level fetch", () => {
    it("returns pollution sources for the given city", async () => {
      mockGetPollutionSourcesByCity.mockResolvedValue([citySource])

      const { result } = renderHook(
        () => usePollutionSources({ city: "Sorel-Tracy", state: "QC" }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.sources).toHaveLength(1)
      })

      expect(mockGetPollutionSourcesByCity).toHaveBeenCalledWith("Sorel-Tracy")
      expect(result.current.sources[0].name).toBe("Grain Silo Port")
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe("state-level fallback", () => {
    it("falls back to state-level sources when city has none", async () => {
      mockGetPollutionSourcesByCity.mockResolvedValue([])
      mockGetPollutionSourcesByState.mockResolvedValue([stateSource])

      const { result } = renderHook(
        () => usePollutionSources({ city: "Sorel-Tracy", state: "QC" }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.sources).toHaveLength(1)
      })

      expect(mockGetPollutionSourcesByCity).toHaveBeenCalledWith("Sorel-Tracy")
      expect(mockGetPollutionSourcesByState).toHaveBeenCalledWith("QC")
      expect(result.current.sources[0].name).toBe("Provincial Landfill")
    })

    it("does not call state fallback when city sources exist", async () => {
      mockGetPollutionSourcesByCity.mockResolvedValue([citySource])

      const { result } = renderHook(
        () => usePollutionSources({ city: "Sorel-Tracy", state: "QC" }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.sources).toHaveLength(1)
      })

      expect(mockGetPollutionSourcesByState).not.toHaveBeenCalled()
    })
  })

  describe("disabled state", () => {
    it("returns empty sources when city is empty", () => {
      const { result } = renderHook(() => usePollutionSources({ city: "", state: "QC" }), {
        wrapper: createWrapper(),
      })

      expect(result.current.sources).toEqual([])
      expect(mockGetPollutionSourcesByCity).not.toHaveBeenCalled()
    })

    it("returns empty sources when state is empty", () => {
      const { result } = renderHook(() => usePollutionSources({ city: "Sorel-Tracy", state: "" }), {
        wrapper: createWrapper(),
      })

      expect(result.current.sources).toEqual([])
      expect(mockGetPollutionSourcesByCity).not.toHaveBeenCalled()
    })
  })

  describe("empty results", () => {
    it("returns empty array when no sources exist at city or state level", async () => {
      mockGetPollutionSourcesByCity.mockResolvedValue([])
      mockGetPollutionSourcesByState.mockResolvedValue([])

      const { result } = renderHook(
        () => usePollutionSources({ city: "Sorel-Tracy", state: "QC" }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.sources).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  describe("error handling", () => {
    it("surfaces fetch errors", async () => {
      mockGetPollutionSourcesByCity.mockRejectedValue(
        new Error("Failed to fetch pollution sources"),
      )

      const { result } = renderHook(
        () => usePollutionSources({ city: "Sorel-Tracy", state: "QC" }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error).toBe("Failed to fetch pollution sources")
      expect(result.current.sources).toEqual([])
    })
  })

  describe("offline state", () => {
    it("reports offline status", () => {
      mockIsOffline = true

      const { result } = renderHook(
        () => usePollutionSources({ city: "Sorel-Tracy", state: "QC" }),
        { wrapper: createWrapper() },
      )

      expect(result.current.isOffline).toBe(true)
    })
  })
})
