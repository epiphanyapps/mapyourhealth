/**
 * useLocation Hook
 *
 * A reusable hook for getting city/state/country from device GPS location.
 * Handles permissions, position fetching, and reverse geocoding.
 *
 * On native: uses expo-location's reverseGeocodeAsync
 * On web: falls back to backend reverse geocoding (expo-location doesn't support it on web)
 */

import { useState, useCallback } from "react"
import { Alert, Platform } from "react-native"
import * as Location from "expo-location"

import { resolveLocationByCoords } from "@/services/amplify/data"

export interface LocationResult {
  city: string
  state: string
  country: string
}

export interface UseLocationResult {
  /**
   * Async function to get city/state/country from current GPS location
   * Returns the location result, or null if failed
   */
  getLocationFromGPS: () => Promise<LocationResult | null>
  /**
   * Whether location is currently being fetched
   */
  isLocating: boolean
  /**
   * Error message if location fetch failed
   */
  error: string
  /**
   * Clear the current error
   */
  clearError: () => void
}

const LOCATION_TIMEOUT_MS = 15000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    }),
  ])
}

/**
 * Hook for getting city/state/country from device GPS location.
 *
 * @example
 * const { getLocationFromGPS, isLocating, error } = useLocation()
 *
 * const handleLocationPress = async () => {
 *   const location = await getLocationFromGPS()
 *   if (location) {
 *     navigateTo(location.city, location.state, location.country)
 *   }
 * }
 */
export function useLocation(): UseLocationResult {
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState("")

  const clearError = useCallback(() => {
    setError("")
  }, [])

  const getLocationFromGPS = useCallback(async (): Promise<LocationResult | null> => {
    console.log("=== useLocation: Starting getLocationFromGPS ===")
    setError("")
    setIsLocating(true)

    try {
      // Request permission
      console.log("useLocation: Requesting permission...")
      const { status } = await Location.requestForegroundPermissionsAsync()
      console.log("useLocation: Permission status:", status)
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please enable location access in your device settings to use this feature.",
          [{ text: "OK" }],
        )
        return null
      }

      // Get current location with timeout
      console.log("useLocation: Getting current position...")
      const location = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        LOCATION_TIMEOUT_MS,
        "Getting GPS position",
      )
      console.log("useLocation: Got position:", location.coords.latitude, location.coords.longitude)

      const { latitude, longitude } = location.coords

      // Try native reverse geocoding first (works on iOS/Android, throws on web)
      if (Platform.OS !== "web") {
        try {
          console.log("useLocation: Reverse geocoding (native)...")
          const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
          console.log("useLocation: Geocode result:", JSON.stringify(address, null, 2))

          if (address?.city && address?.region && address?.isoCountryCode) {
            return {
              city: address.city,
              state: address.region,
              country: address.isoCountryCode,
            }
          }
        } catch (geocodeErr) {
          console.warn("useLocation: Native reverse geocode failed:", geocodeErr)
        }
      }

      // Fallback: use backend reverse geocoding (required on web, fallback on native)
      console.log("useLocation: Using backend reverse geocoding...")
      const resolved = await resolveLocationByCoords(latitude, longitude)

      if (resolved.error || !resolved.city) {
        Alert.alert(
          "Location Not Found",
          "We could not determine your city from your GPS location. Please search for your city manually.",
          [{ text: "OK" }],
        )
        return null
      }

      return {
        city: resolved.city,
        state: resolved.state,
        country: resolved.country,
      }
    } catch (err) {
      console.error("useLocation: Error:", err)
      const message = err instanceof Error ? err.message : "Unknown error"
      if (message.includes("timed out")) {
        setError("Location request timed out. Please try again.")
      } else {
        setError("Failed to get your location. Please try again.")
      }
      return null
    } finally {
      console.log("=== useLocation: Finished ===")
      setIsLocating(false)
    }
  }, [])

  return {
    getLocationFromGPS,
    isLocating,
    error,
    clearError,
  }
}
