/**
 * Tests for useLocation hook
 *
 * Tests GPS location fetching with platform-aware reverse geocoding.
 * Native uses expo-location's reverseGeocodeAsync, web falls back to backend.
 */

// Mock expo-location
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}))

// Mock the data service
jest.mock("../services/amplify/data", () => ({
  resolveLocationByCoords: jest.fn(),
}))

// eslint-disable-next-line import/first
import { Alert, Platform } from "react-native"
// eslint-disable-next-line import/first
import * as Location from "expo-location"
// eslint-disable-next-line import/first
import { act, renderHook, waitFor } from "@testing-library/react-native"

// eslint-disable-next-line import/first
import { useLocation } from "./useLocation"
// eslint-disable-next-line import/first
import { resolveLocationByCoords } from "../services/amplify/data"

// Mock Alert
jest.spyOn(Alert, "alert").mockImplementation(() => {})

const mockRequestPermissions = Location.requestForegroundPermissionsAsync as jest.MockedFunction<
  typeof Location.requestForegroundPermissionsAsync
>
const mockGetPosition = Location.getCurrentPositionAsync as jest.MockedFunction<
  typeof Location.getCurrentPositionAsync
>
const mockReverseGeocode = Location.reverseGeocodeAsync as jest.MockedFunction<
  typeof Location.reverseGeocodeAsync
>
const mockResolveByCoords = resolveLocationByCoords as jest.MockedFunction<
  typeof resolveLocationByCoords
>

const MOCK_COORDS = { latitude: 45.5017, longitude: -73.5673 }
const MOCK_POSITION = {
  coords: { ...MOCK_COORDS, altitude: 0, accuracy: 10, heading: 0, speed: 0, altitudeAccuracy: 0 },
  timestamp: Date.now(),
} as Location.LocationObject

describe("useLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(Alert.alert as jest.Mock).mockClear()

    // Default: permission granted
    mockRequestPermissions.mockResolvedValue({
      status: "granted" as Location.PermissionStatus,
      granted: true,
      canAskAgain: true,
      expires: "never",
    })

    // Default: position resolved
    mockGetPosition.mockResolvedValue(MOCK_POSITION)
  })

  it("returns initial state", () => {
    const { result } = renderHook(() => useLocation())

    expect(result.current.isLocating).toBe(false)
    expect(result.current.error).toBe("")
    expect(result.current.getLocationFromGPS).toBeInstanceOf(Function)
    expect(result.current.clearError).toBeInstanceOf(Function)
  })

  it("returns null and shows alert when permission denied", async () => {
    mockRequestPermissions.mockResolvedValue({
      status: "denied" as Location.PermissionStatus,
      granted: false,
      canAskAgain: true,
      expires: "never",
    })

    const { result } = renderHook(() => useLocation())

    let location: unknown
    await act(async () => {
      location = await result.current.getLocationFromGPS()
    })

    expect(location).toBeNull()
    expect(Alert.alert).toHaveBeenCalledWith(
      "Location Permission Required",
      expect.any(String),
      expect.any(Array),
    )
  })

  describe("native platform (iOS/Android)", () => {
    beforeEach(() => {
      Platform.OS = "ios"
    })

    it("returns city/state/country from native reverse geocoding", async () => {
      mockReverseGeocode.mockResolvedValue([
        {
          city: "Montreal",
          region: "QC",
          isoCountryCode: "CA",
          country: "Canada",
          street: null,
          streetNumber: null,
          district: null,
          subregion: null,
          postalCode: "H2X",
          name: null,
          timezone: null,
          formattedAddress: null,
        },
      ])

      const { result } = renderHook(() => useLocation())

      let location: unknown
      await act(async () => {
        location = await result.current.getLocationFromGPS()
      })

      expect(location).toEqual({ city: "Montreal", state: "QC", country: "CA" })
      expect(mockReverseGeocode).toHaveBeenCalledWith(MOCK_COORDS)
      expect(mockResolveByCoords).not.toHaveBeenCalled()
    })

    it("falls back to backend when native geocoding returns incomplete data", async () => {
      // Native returns address without city
      mockReverseGeocode.mockResolvedValue([
        {
          city: null,
          region: "QC",
          isoCountryCode: "CA",
          country: "Canada",
          street: null,
          streetNumber: null,
          district: null,
          subregion: null,
          postalCode: null,
          name: null,
          timezone: null,
          formattedAddress: null,
        },
      ])

      mockResolveByCoords.mockResolvedValue({
        city: "Montreal",
        state: "QC",
        country: "CA",
        jurisdictionCode: "CA-QC",
        hasData: true,
        isNew: false,
      })

      const { result } = renderHook(() => useLocation())

      let location: unknown
      await act(async () => {
        location = await result.current.getLocationFromGPS()
      })

      expect(location).toEqual({ city: "Montreal", state: "QC", country: "CA" })
      expect(mockResolveByCoords).toHaveBeenCalledWith(MOCK_COORDS.latitude, MOCK_COORDS.longitude)
    })

    it("falls back to backend when native geocoding throws", async () => {
      mockReverseGeocode.mockRejectedValue(new Error("Not supported"))

      mockResolveByCoords.mockResolvedValue({
        city: "Montreal",
        state: "QC",
        country: "CA",
        jurisdictionCode: "CA-QC",
        hasData: true,
        isNew: false,
      })

      const { result } = renderHook(() => useLocation())

      let location: unknown
      await act(async () => {
        location = await result.current.getLocationFromGPS()
      })

      expect(location).toEqual({ city: "Montreal", state: "QC", country: "CA" })
      expect(mockResolveByCoords).toHaveBeenCalled()
    })
  })

  describe("web platform", () => {
    beforeEach(() => {
      Platform.OS = "web"
    })

    afterAll(() => {
      Platform.OS = "ios"
    })

    it("skips native geocoding and uses backend directly", async () => {
      mockResolveByCoords.mockResolvedValue({
        city: "Montreal",
        state: "QC",
        country: "CA",
        jurisdictionCode: "CA-QC",
        hasData: true,
        isNew: false,
      })

      const { result } = renderHook(() => useLocation())

      let location: unknown
      await act(async () => {
        location = await result.current.getLocationFromGPS()
      })

      expect(location).toEqual({ city: "Montreal", state: "QC", country: "CA" })
      expect(mockReverseGeocode).not.toHaveBeenCalled()
      expect(mockResolveByCoords).toHaveBeenCalledWith(MOCK_COORDS.latitude, MOCK_COORDS.longitude)
    })

    it("returns null and shows alert when backend returns error", async () => {
      mockResolveByCoords.mockResolvedValue({
        city: "",
        state: "",
        country: "",
        jurisdictionCode: "WHO",
        hasData: false,
        isNew: false,
        error: "Could not resolve",
      })

      const { result } = renderHook(() => useLocation())

      let location: unknown
      await act(async () => {
        location = await result.current.getLocationFromGPS()
      })

      expect(location).toBeNull()
      expect(Alert.alert).toHaveBeenCalledWith(
        "Location Not Found",
        expect.any(String),
        expect.any(Array),
      )
    })
  })

  describe("error handling", () => {
    it("sets timeout error when GPS position times out", async () => {
      mockGetPosition.mockRejectedValue(new Error("Getting GPS position timed out after 15000ms"))

      const { result } = renderHook(() => useLocation())

      await act(async () => {
        await result.current.getLocationFromGPS()
      })

      expect(result.current.error).toBe("Location request timed out. Please try again.")
    })

    it("sets generic error on unknown failure", async () => {
      mockGetPosition.mockRejectedValue(new Error("Network failure"))

      const { result } = renderHook(() => useLocation())

      await act(async () => {
        await result.current.getLocationFromGPS()
      })

      expect(result.current.error).toBe("Failed to get your location. Please try again.")
    })

    it("clears error with clearError", async () => {
      mockGetPosition.mockRejectedValue(new Error("fail"))

      const { result } = renderHook(() => useLocation())

      await act(async () => {
        await result.current.getLocationFromGPS()
      })
      expect(result.current.error).not.toBe("")

      act(() => {
        result.current.clearError()
      })
      expect(result.current.error).toBe("")
    })
  })

  describe("isLocating state", () => {
    it("is true during fetch and false after success", async () => {
      Platform.OS = "web"
      mockResolveByCoords.mockResolvedValue({
        city: "Montreal",
        state: "QC",
        country: "CA",
        jurisdictionCode: "CA-QC",
        hasData: true,
        isNew: false,
      })

      const { result } = renderHook(() => useLocation())

      expect(result.current.isLocating).toBe(false)

      await act(async () => {
        await result.current.getLocationFromGPS()
      })

      await waitFor(() => {
        expect(result.current.isLocating).toBe(false)
      })
    })

    it("is false after error", async () => {
      mockGetPosition.mockRejectedValue(new Error("fail"))

      const { result } = renderHook(() => useLocation())

      await act(async () => {
        await result.current.getLocationFromGPS()
      })

      expect(result.current.isLocating).toBe(false)
    })
  })
})
