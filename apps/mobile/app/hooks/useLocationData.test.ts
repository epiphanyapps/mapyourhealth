/**
 * Tests for useLocationData hook
 *
 * Verifies measurement fetching, jurisdiction resolution, threshold mapping,
 * offline caching, and edge cases (empty data, no city).
 */

import { createElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react-native"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetLocationMeasurements = jest.fn()

jest.mock("../services/amplify/data", () => ({
  getLocationMeasurements: (...args) => mockGetLocationMeasurements(...args),
}))

const mockGetThreshold = jest.fn()
const mockGetJurisdictionForLocation = jest.fn()

jest.mock("../context/ContaminantsContext", () => ({
  useContaminants: () => ({
    contaminants: mockContaminants,
    isLoading: false,
    getThreshold: mockGetThreshold,
    getJurisdictionForLocation: mockGetJurisdictionForLocation,
  }),
}))

let mockIsOffline = false
jest.mock("./useNetworkStatus", () => ({
  useNetworkStatus: () => ({
    isOffline: mockIsOffline,
    isReady: true,
  }),
}))

const mockLoad = jest.fn()
const mockSave = jest.fn()
const mockRemove = jest.fn()
jest.mock("../utils/storage", () => ({
  load: (...args) => mockLoad(...args),
  save: (...args) => mockSave(...args),
  remove: (...args) => mockRemove(...args),
}))

// eslint-disable-next-line import/first
import { useLocationData } from "./useLocationData"

// ── Test data ────────────────────────────────────────────────────────────────

const mockContaminants = [
  {
    id: "chlorite",
    name: "Chlorite",
    unit: "ug/L",
    category: "disinfectant",
    higherIsBad: true,
  },
]

const montrealMeasurement = {
  city: "Montreal",
  state: "QC",
  country: "CA",
  contaminantId: "chlorite",
  value: 800,
  measuredAt: "2026-03-21T00:00:00Z",
}

const newYorkMeasurement = {
  city: "New York",
  state: "NY",
  country: "US",
  contaminantId: "chlorite",
  value: 1000,
  measuredAt: "2026-03-21T00:00:00Z",
}

const caQcThreshold = {
  contaminantId: "chlorite",
  jurisdictionCode: "CA-QC",
  limitValue: 800,
  warningRatio: 0.8,
  status: "regulated",
}

const whoThreshold = {
  contaminantId: "chlorite",
  jurisdictionCode: "WHO",
  limitValue: 700,
  warningRatio: 0.8,
  status: "regulated",
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let queryClient

function createWrapper() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useLocationData", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsOffline = false
    mockLoad.mockReturnValue(null)
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe("initial state", () => {
    it("returns null cityData when no city provided", async () => {
      const { result } = renderHook(() => useLocationData(""), {
        wrapper: createWrapper(),
      })

      // Query is disabled when city is empty, so cityData stays null
      expect(result.current.cityData).toBeNull()
      expect(result.current.isMockData).toBe(false)
      expect(result.current.isCachedData).toBe(false)
    })
  })

  describe("jurisdiction resolution", () => {
    it("extracts state/country from first measurement and resolves jurisdiction", async () => {
      mockGetLocationMeasurements.mockResolvedValue([montrealMeasurement])
      mockGetJurisdictionForLocation.mockReturnValue({ code: "CA-QC" })
      mockGetThreshold.mockReturnValue(caQcThreshold)

      const { result } = renderHook(() => useLocationData("Montreal"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.cityData).not.toBeNull()
      })

      expect(mockGetJurisdictionForLocation).toHaveBeenCalledWith("QC", "CA")
      expect(result.current.cityData!.state).toBe("QC")
      expect(result.current.cityData!.country).toBe("CA")
      expect(result.current.cityData!.cityName).toBe("Montreal")
    })

    it("falls back to WHO when jurisdiction not found", async () => {
      mockGetLocationMeasurements.mockResolvedValue([newYorkMeasurement])
      mockGetJurisdictionForLocation.mockReturnValue(undefined)
      mockGetThreshold.mockImplementation((_contId, jCode) => {
        if (jCode === "WHO") return whoThreshold
        return null
      })

      const { result } = renderHook(() => useLocationData("New York"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.cityData).not.toBeNull()
      })

      // getThreshold should have been called with WHO fallback
      expect(mockGetThreshold).toHaveBeenCalledWith("chlorite", "WHO")
    })
  })

  describe("measurement to stat mapping", () => {
    it("maps measurement to danger status when value >= limit", async () => {
      mockGetLocationMeasurements.mockResolvedValue([montrealMeasurement])
      mockGetJurisdictionForLocation.mockReturnValue({ code: "CA-QC" })
      mockGetThreshold.mockReturnValue(caQcThreshold)

      const { result } = renderHook(() => useLocationData("Montreal"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.cityData).not.toBeNull()
      })

      const stat = result.current.cityData!.stats[0]
      expect(stat.statId).toBe("chlorite")
      expect(stat.value).toBe(800)
      // value (800) >= limit (800) => danger
      expect(stat.status).toBe("danger")
      expect(stat.lastUpdated).toBe("2026-03-21T00:00:00Z")
    })

    it("maps measurement to warning status when value >= warningThreshold but < limit", async () => {
      const warningMeasurement = {
        ...montrealMeasurement,
        value: 650, // 650 >= 800 * 0.8 (640) but < 800
      }
      mockGetLocationMeasurements.mockResolvedValue([warningMeasurement])
      mockGetJurisdictionForLocation.mockReturnValue({ code: "CA-QC" })
      mockGetThreshold.mockReturnValue(caQcThreshold)

      const { result } = renderHook(() => useLocationData("Montreal"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.cityData).not.toBeNull()
      })

      expect(result.current.cityData!.stats[0].status).toBe("warning")
    })

    it("maps measurement to safe status when value < warningThreshold", async () => {
      const safeMeasurement = {
        ...montrealMeasurement,
        value: 500, // 500 < 800 * 0.8 (640)
      }
      mockGetLocationMeasurements.mockResolvedValue([safeMeasurement])
      mockGetJurisdictionForLocation.mockReturnValue({ code: "CA-QC" })
      mockGetThreshold.mockReturnValue(caQcThreshold)

      const { result } = renderHook(() => useLocationData("Montreal"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.cityData).not.toBeNull()
      })

      expect(result.current.cityData!.stats[0].status).toBe("safe")
    })

    it("defaults to safe when no threshold is available", async () => {
      mockGetLocationMeasurements.mockResolvedValue([montrealMeasurement])
      mockGetJurisdictionForLocation.mockReturnValue({ code: "CA-QC" })
      mockGetThreshold.mockReturnValue(null)

      const { result } = renderHook(() => useLocationData("Montreal"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.cityData).not.toBeNull()
      })

      expect(result.current.cityData!.stats[0].status).toBe("safe")
    })
  })

  describe("caching behavior", () => {
    it("returns cached data when online API returns empty measurements", async () => {
      const cachedData = {
        data: {
          city: "Montreal",
          cityName: "Montreal",
          state: "QC",
          country: "CA",
          stats: [{ statId: "chlorite", value: 800, status: "danger", lastUpdated: "2026-03-21" }],
        },
        cachedAt: Date.now(),
      }
      mockLoad.mockReturnValue(cachedData)
      mockGetLocationMeasurements.mockResolvedValue([])

      const { result } = renderHook(() => useLocationData("Montreal"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.cityData).not.toBeNull()
      })

      expect(result.current.isCachedData).toBe(true)
      expect(result.current.cityData!.cityName).toBe("Montreal")
    })

    it("saves fetched data to cache", async () => {
      mockGetLocationMeasurements.mockResolvedValue([montrealMeasurement])
      mockGetJurisdictionForLocation.mockReturnValue({ code: "CA-QC" })
      mockGetThreshold.mockReturnValue(caQcThreshold)

      const { result } = renderHook(() => useLocationData("Montreal"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.cityData).not.toBeNull()
      })

      expect(mockSave).toHaveBeenCalledWith(
        "location_stats_Montreal",
        expect.objectContaining({
          data: expect.objectContaining({ cityName: "Montreal" }),
          cachedAt: expect.any(Number),
        }),
      )
    })
  })

  describe("offline behavior", () => {
    it("returns cached data when offline and cache is available", async () => {
      mockIsOffline = true
      const cachedData = {
        data: {
          city: "Montreal",
          cityName: "Montreal",
          state: "QC",
          country: "CA",
          stats: [{ statId: "chlorite", value: 800, status: "danger", lastUpdated: "2026-03-21" }],
        },
        cachedAt: Date.now(),
      }
      mockLoad.mockReturnValue(cachedData)

      const { result } = renderHook(() => useLocationData("Montreal"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.cityData).not.toBeNull()
      })

      expect(result.current.isCachedData).toBe(true)
      expect(result.current.isOffline).toBe(true)
      expect(mockGetLocationMeasurements).not.toHaveBeenCalled()
    })

    it("returns error when offline and no cache available", async () => {
      mockIsOffline = true
      mockLoad.mockReturnValue(null)

      const { result } = renderHook(() => useLocationData("Montreal"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error).toContain("offline")
      expect(result.current.cityData).toBeNull()
    })
  })

  describe("empty measurements", () => {
    it("returns null cityData when API returns empty array and no cache", async () => {
      mockGetLocationMeasurements.mockResolvedValue([])
      mockLoad.mockReturnValue(null)

      const { result } = renderHook(() => useLocationData("UnknownCity"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.cityData).toBeNull()
      expect(result.current.isMockData).toBe(false)
    })
  })
})
