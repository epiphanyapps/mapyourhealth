/**
 * Tests for useLocationSearch hook
 */

import { act, renderHook, waitFor } from "@testing-library/react-native"

// Mock the data service
jest.mock("../services/amplify/data", () => ({
  getAllLocations: jest.fn(),
  getPlacesAutocomplete: jest.fn(),
  getPlaceDetails: jest.fn(),
}))

// Mock React Query
const mockUseQuery = jest.fn()
jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}))

// eslint-disable-next-line import/first
import { useLocationSearch } from "./useLocationSearch"
// eslint-disable-next-line import/first
import { getPlacesAutocomplete, getPlaceDetails } from "../services/amplify/data"

const mockGetPlacesAutocomplete = getPlacesAutocomplete as jest.MockedFunction<
  typeof getPlacesAutocomplete
>
const mockGetPlaceDetails = getPlaceDetails as jest.MockedFunction<typeof getPlaceDetails>

// Sample location data for tests
const mockLocations = [
  {
    id: "1",
    city: "New York",
    state: "NY",
    country: "US",
    county: "New York County",
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    id: "2",
    city: "Newark",
    state: "NJ",
    country: "US",
    county: "Essex County",
    latitude: 40.7357,
    longitude: -74.1724,
  },
  {
    id: "3",
    city: "Newport Beach",
    state: "CA",
    country: "US",
    county: "Orange County",
    latitude: 33.6189,
    longitude: -117.9289,
  },
  { id: "4", city: "Toronto", state: "ON", country: "CA", latitude: 43.6532, longitude: -79.3832 },
  { id: "5", city: "Montreal", state: "QC", country: "CA", latitude: 45.5017, longitude: -73.5673 },
]

describe("useLocationSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Default mock for useQuery - return locations
    mockUseQuery.mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("initial state", () => {
    it("returns empty suggestions initially", () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.suggestions).toEqual([])
      expect(result.current.isSearching).toBe(false)
    })

    it("returns isLoading from React Query", () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      })

      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.isLoading).toBe(true)
    })

    it("returns error when query fails", () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error("Network error"),
      })

      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.error).toBe("Failed to load search data")
    })
  })

  describe("search function", () => {
    it("does not search with query less than 2 characters", () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("N")
      })

      // Advance past debounce
      act(() => {
        jest.advanceTimersByTime(400)
      })

      expect(result.current.suggestions).toEqual([])
    })

    it("clears suggestions for empty query", () => {
      const { result } = renderHook(() => useLocationSearch())

      // First search to populate suggestions
      act(() => {
        result.current.search("New")
      })
      act(() => {
        jest.advanceTimersByTime(400)
      })

      // Then clear with empty query
      act(() => {
        result.current.search("")
      })

      expect(result.current.suggestions).toEqual([])
      expect(result.current.isSearching).toBe(false)
    })

    it("sets isSearching to true immediately when search starts", () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("New")
      })

      expect(result.current.isSearching).toBe(true)
    })

    it("debounces search by 300ms", async () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("New")
      })

      // Before debounce completes
      act(() => {
        jest.advanceTimersByTime(200)
      })

      // Still searching (debounced)
      expect(result.current.isSearching).toBe(true)

      // After debounce completes
      act(() => {
        jest.advanceTimersByTime(200)
      })

      // Search should have completed
      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      })
    })

    it("returns matching city suggestions", async () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("New")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      })

      // Should match "New York", "Newark", "Newport Beach"
      const cityNames = result.current.suggestions.map((s) => s.displayText)
      expect(cityNames.some((name) => name.includes("New York"))).toBe(true)
      expect(cityNames.some((name) => name.includes("Newark"))).toBe(true)
      expect(cityNames.some((name) => name.includes("Newport"))).toBe(true)
    })

    it("sorts exact matches first", async () => {
      // Add an exact match city
      mockUseQuery.mockReturnValue({
        data: [
          ...mockLocations,
          {
            id: "6",
            city: "New",
            state: "TX",
            country: "US",
            latitude: 30.0,
            longitude: -95.0,
          },
        ],
        isLoading: false,
        error: null,
      })

      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("New")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      })

      // Exact match "New" should be first
      expect(result.current.suggestions[0].city).toBe("New")
    })

    it("includes state suggestions when room available", async () => {
      mockUseQuery.mockReturnValue({
        data: [
          { id: "1", city: "Dallas", state: "Texas", country: "US" },
          { id: "2", city: "Houston", state: "Texas", country: "US" },
        ],
        isLoading: false,
        error: null,
      })

      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("Tex")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      })

      // Should include state-level suggestion for Texas
      const stateMatch = result.current.suggestions.find((s) => s.type === "state")
      expect(stateMatch).toBeDefined()
      expect(stateMatch?.state).toBe("Texas")
    })
  })

  describe("Google Places fallback", () => {
    it("triggers Places API when few local results and query looks like address", async () => {
      mockUseQuery.mockReturnValue({
        data: mockLocations,
        isLoading: false,
        error: null,
      })

      mockGetPlacesAutocomplete.mockResolvedValue({
        status: "OK",
        predictions: [
          {
            place_id: "place123",
            description: "123 Main St, Springfield",
            main_text: "123 Main St",
            secondary_text: "Springfield, IL",
          },
        ],
      })

      const { result } = renderHook(() => useLocationSearch())

      // Address-like query (contains numbers)
      act(() => {
        result.current.search("123 Main")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(mockGetPlacesAutocomplete).toHaveBeenCalledWith(
          "123 Main",
          expect.any(String), // session token
        )
      })
    })

    it("does not trigger Places API when enough local results", async () => {
      mockUseQuery.mockReturnValue({
        data: mockLocations,
        isLoading: false,
        error: null,
      })

      const { result } = renderHook(() => useLocationSearch())

      // Query that matches multiple local results
      act(() => {
        result.current.search("New")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThanOrEqual(3)
      })

      // Should not call Places API since we have enough local results
      expect(mockGetPlacesAutocomplete).not.toHaveBeenCalled()
    })
  })

  describe("clearSuggestions", () => {
    it("clears all suggestions", async () => {
      const { result } = renderHook(() => useLocationSearch())

      // Search first
      act(() => {
        result.current.search("New")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      })

      // Then clear
      act(() => {
        result.current.clearSuggestions()
      })

      expect(result.current.suggestions).toEqual([])
      expect(result.current.isSearching).toBe(false)
    })

    it("cancels pending search", () => {
      const { result } = renderHook(() => useLocationSearch())

      // Start search
      act(() => {
        result.current.search("New")
      })

      // Clear before debounce completes
      act(() => {
        jest.advanceTimersByTime(100)
        result.current.clearSuggestions()
      })

      // Advance past original debounce
      act(() => {
        jest.advanceTimersByTime(400)
      })

      // Should still be empty
      expect(result.current.suggestions).toEqual([])
    })
  })

  describe("resolveAddressToNearestCity", () => {
    it("returns nearest city from place details", async () => {
      mockGetPlaceDetails.mockResolvedValue({
        lat: 40.72,
        lng: -74.0,
      })

      const { result } = renderHook(() => useLocationSearch())

      let nearestCity: Awaited<ReturnType<typeof result.current.resolveAddressToNearestCity>>
      await act(async () => {
        nearestCity = await result.current.resolveAddressToNearestCity("place123")
      })

      expect(nearestCity).not.toBeNull()
      expect(nearestCity?.city).toBe("New York")
      expect(nearestCity?.state).toBe("NY")
      expect(nearestCity?.country).toBe("US")
    })

    it("returns null when place details fail", async () => {
      mockGetPlaceDetails.mockResolvedValue(null)

      const { result } = renderHook(() => useLocationSearch())

      let nearestCity: Awaited<ReturnType<typeof result.current.resolveAddressToNearestCity>>
      await act(async () => {
        nearestCity = await result.current.resolveAddressToNearestCity("invalid-place")
      })

      expect(nearestCity).toBeNull()
    })

    it("calculates correct distance to nearest city", async () => {
      // Point closer to Toronto than other cities
      mockGetPlaceDetails.mockResolvedValue({
        lat: 43.65,
        lng: -79.38,
      })

      const { result } = renderHook(() => useLocationSearch())

      let nearestCity: Awaited<ReturnType<typeof result.current.resolveAddressToNearestCity>>
      await act(async () => {
        nearestCity = await result.current.resolveAddressToNearestCity("place-near-toronto")
      })

      expect(nearestCity).not.toBeNull()
      expect(nearestCity?.city).toBe("Toronto")
      expect(nearestCity?.distanceKm).toBeLessThan(1) // Should be very close
    })
  })

  describe("suggestion types", () => {
    it("returns city type suggestions with correct data", async () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("New York")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      })

      const nySuggestion = result.current.suggestions.find((s) => s.city === "New York")
      expect(nySuggestion).toBeDefined()
      expect(nySuggestion?.type).toBe("city")
      expect(nySuggestion?.state).toBe("NY")
      expect(nySuggestion?.country).toBe("US")
      expect(nySuggestion?.displayText).toBe("New York, NY")
    })

    it("includes county in secondary text for US cities", async () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("New York")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      })

      const nySuggestion = result.current.suggestions.find((s) => s.city === "New York")
      expect(nySuggestion?.secondaryText).toContain("New York County")
      expect(nySuggestion?.secondaryText).toContain("United States")
    })

    it("shows Canada for Canadian cities", async () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("Toronto")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0)
      })

      const torontoSuggestion = result.current.suggestions.find((s) => s.city === "Toronto")
      expect(torontoSuggestion?.secondaryText).toContain("Canada")
    })
  })
})
