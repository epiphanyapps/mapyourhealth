/**
 * Tests for useLocationSearch hook
 *
 * The hook uses Google Places API as the primary search mechanism.
 * All queries are routed through the backend proxy.
 */

import { act, renderHook, waitFor } from "@testing-library/react-native"

// Mock the data service
jest.mock("../services/amplify/data", () => ({
  getPlacesAutocomplete: jest.fn(),
  resolveLocationByPlaceId: jest.fn(),
}))

// eslint-disable-next-line import/first
import { useLocationSearch } from "./useLocationSearch"
// eslint-disable-next-line import/first
import { getPlacesAutocomplete, resolveLocationByPlaceId } from "../services/amplify/data"

const mockGetPlacesAutocomplete = getPlacesAutocomplete as jest.MockedFunction<
  typeof getPlacesAutocomplete
>
const mockResolveLocationByPlaceId = resolveLocationByPlaceId as jest.MockedFunction<
  typeof resolveLocationByPlaceId
>

describe("useLocationSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Default mock for Places autocomplete
    mockGetPlacesAutocomplete.mockResolvedValue({
      status: "OK",
      predictions: [
        {
          place_id: "place-ny",
          description: "New York, NY, USA",
          main_text: "New York",
          secondary_text: "NY, USA",
        },
        {
          place_id: "place-newark",
          description: "Newark, NJ, USA",
          main_text: "Newark",
          secondary_text: "NJ, USA",
        },
      ],
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

    it("isLoading is always false (no client-side data loading)", () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.isLoading).toBe(false)
    })

    it("error is null initially", () => {
      const { result } = renderHook(() => useLocationSearch())

      expect(result.current.error).toBeNull()
    })
  })

  describe("search function", () => {
    it("does not search with query less than 2 characters", async () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("N")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      expect(result.current.suggestions).toEqual([])
      expect(mockGetPlacesAutocomplete).not.toHaveBeenCalled()
    })

    it("clears suggestions for empty query", () => {
      const { result } = renderHook(() => useLocationSearch())

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

      // Before debounce completes — should not call API yet
      act(() => {
        jest.advanceTimersByTime(200)
      })

      expect(mockGetPlacesAutocomplete).not.toHaveBeenCalled()
      expect(result.current.isSearching).toBe(true)

      // After debounce completes
      act(() => {
        jest.advanceTimersByTime(200)
      })

      await waitFor(() => {
        expect(mockGetPlacesAutocomplete).toHaveBeenCalledWith("New", expect.any(String))
      })
    })

    it("returns Google Places suggestions as address type", async () => {
      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("New")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBe(2)
      })

      expect(result.current.suggestions[0]).toEqual({
        type: "address",
        displayText: "New York",
        secondaryText: "NY, USA",
        placeId: "place-ny",
      })

      expect(result.current.suggestions[1]).toEqual({
        type: "address",
        displayText: "Newark",
        secondaryText: "NJ, USA",
        placeId: "place-newark",
      })
    })

    it("handles API returning no results", async () => {
      mockGetPlacesAutocomplete.mockResolvedValue({
        status: "ZERO_RESULTS",
      })

      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("xyznonexistent")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      expect(result.current.suggestions).toEqual([])
    })

    it("limits suggestions to MAX_SUGGESTIONS (10)", async () => {
      mockGetPlacesAutocomplete.mockResolvedValue({
        status: "OK",
        predictions: Array.from({ length: 15 }, (_, i) => ({
          place_id: `place-${i}`,
          description: `City ${i}, State, USA`,
          main_text: `City ${i}`,
          secondary_text: "State, USA",
        })),
      })

      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("City")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.suggestions.length).toBe(10)
      })
    })
  })

  describe("clearSuggestions", () => {
    it("clears all suggestions", async () => {
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

      act(() => {
        result.current.clearSuggestions()
      })

      expect(result.current.suggestions).toEqual([])
      expect(result.current.isSearching).toBe(false)
    })

    it("cancels pending search", () => {
      const { result } = renderHook(() => useLocationSearch())

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

      expect(result.current.suggestions).toEqual([])
      expect(mockGetPlacesAutocomplete).not.toHaveBeenCalled()
    })
  })

  describe("resolvePlace", () => {
    it("resolves a placeId to location data", async () => {
      mockResolveLocationByPlaceId.mockResolvedValue({
        city: "New York",
        state: "NY",
        country: "US",
        county: "New York County",
        jurisdictionCode: "US-NY",
        latitude: 40.7128,
        longitude: -74.006,
        hasData: true,
        isNew: false,
      })

      const { result } = renderHook(() => useLocationSearch())

      let resolved: Awaited<ReturnType<typeof result.current.resolvePlace>>
      await act(async () => {
        resolved = await result.current.resolvePlace("place-ny")
      })

      expect(resolved!).not.toBeNull()
      expect(resolved!.city).toBe("New York")
      expect(resolved!.state).toBe("NY")
      expect(resolved!.country).toBe("US")
      expect(resolved!.jurisdictionCode).toBe("US-NY")
      expect(resolved!.hasData).toBe(true)
      expect(resolved!.isNew).toBe(false)
    })

    it("returns null when resolve fails with error", async () => {
      mockResolveLocationByPlaceId.mockResolvedValue({
        city: "",
        state: "",
        country: "",
        jurisdictionCode: "WHO",
        hasData: false,
        isNew: false,
        error: "Could not resolve location",
      })

      const { result } = renderHook(() => useLocationSearch())

      let resolved: Awaited<ReturnType<typeof result.current.resolvePlace>>
      await act(async () => {
        resolved = await result.current.resolvePlace("invalid-place")
      })

      expect(resolved).toBeNull()
    })

    it("returns null when resolve throws", async () => {
      mockResolveLocationByPlaceId.mockRejectedValue(new Error("Network error"))

      const { result } = renderHook(() => useLocationSearch())

      let resolved: Awaited<ReturnType<typeof result.current.resolvePlace>>
      await act(async () => {
        resolved = await result.current.resolvePlace("place-error")
      })

      expect(resolved).toBeNull()
    })

    it("includes county when available", async () => {
      mockResolveLocationByPlaceId.mockResolvedValue({
        city: "Newark",
        state: "NJ",
        country: "US",
        county: "Essex County",
        jurisdictionCode: "US",
        latitude: 40.7357,
        longitude: -74.1724,
        hasData: false,
        isNew: true,
      })

      const { result } = renderHook(() => useLocationSearch())

      let resolved: Awaited<ReturnType<typeof result.current.resolvePlace>>
      await act(async () => {
        resolved = await result.current.resolvePlace("place-newark")
      })

      expect(resolved!.county).toBe("Essex County")
      expect(resolved!.isNew).toBe(true)
      expect(resolved!.hasData).toBe(false)
    })
  })

  describe("resolveAddressToNearestCity (backward compat)", () => {
    it("delegates to resolvePlace and returns legacy format", async () => {
      mockResolveLocationByPlaceId.mockResolvedValue({
        city: "Toronto",
        state: "ON",
        country: "CA",
        jurisdictionCode: "CA-ON",
        latitude: 43.6532,
        longitude: -79.3832,
        hasData: true,
        isNew: false,
      })

      const { result } = renderHook(() => useLocationSearch())

      let nearest: Awaited<ReturnType<typeof result.current.resolveAddressToNearestCity>>
      await act(async () => {
        nearest = await result.current.resolveAddressToNearestCity("place-toronto")
      })

      expect(nearest).not.toBeNull()
      expect(nearest!.city).toBe("Toronto")
      expect(nearest!.state).toBe("ON")
      expect(nearest!.country).toBe("CA")
      expect(nearest!.distanceKm).toBe(0)
      expect(nearest!.actualCity).toBe("Toronto")
      expect(nearest!.actualState).toBe("ON")
      expect(nearest!.actualCountry).toBe("CA")
    })
  })

  describe("getCitiesForState (deprecated)", () => {
    it("returns empty array", () => {
      const { result } = renderHook(() => useLocationSearch())

      const cities = result.current.getCitiesForState("NY")

      expect(cities).toEqual([])
    })
  })

  describe("error handling", () => {
    it("sets timeout error when search takes too long", async () => {
      mockGetPlacesAutocomplete.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 100)),
      )

      const { result } = renderHook(() => useLocationSearch())

      act(() => {
        result.current.search("New")
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(result.current.error).toBe("Search is taking too long. Please try again.")
      })
    })
  })
})
