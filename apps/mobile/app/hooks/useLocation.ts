/**
 * useLocation Hook
 *
 * A reusable hook for getting zip code from device GPS location.
 * Handles permissions, position fetching, and reverse geocoding.
 */

import { useState, useCallback } from "react"
import { Alert } from "react-native"
import * as Location from "expo-location"

import { normalizePostalCode } from "@/utils/postalCode"

export interface UseLocationResult {
  /**
   * Async function to get zip code from current GPS location
   * Returns the zip code string, or null if failed
   */
  getLocationZipCode: () => Promise<string | null>
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

/**
 * Hook for getting zip code from device GPS location.
 *
 * @example
 * const { getLocationZipCode, isLocating, error } = useLocation()
 *
 * const handleLocationPress = async () => {
 *   const zipCode = await getLocationZipCode()
 *   if (zipCode) {
 *     setCurrentZipCode(zipCode)
 *   }
 * }
 */
export function useLocation(): UseLocationResult {
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState("")

  const clearError = useCallback(() => {
    setError("")
  }, [])

  const getLocationZipCode = useCallback(async (): Promise<string | null> => {
    console.log("=== useLocation: Starting getLocationZipCode ===")
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

      // Get current location
      console.log("useLocation: Getting current position...")
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      console.log("useLocation: Got position:", location.coords.latitude, location.coords.longitude)

      // Reverse geocode to get address/zip code
      console.log("useLocation: Reverse geocoding...")
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
      console.log("useLocation: Geocode result:", JSON.stringify(address, null, 2))

      if (address?.postalCode) {
        const normalized = normalizePostalCode(address.postalCode)
        console.log("useLocation: Found postal code:", address.postalCode, "-> normalized:", normalized)
        return normalized
      } else {
        // No postal code - common in ~40 countries (Ireland pre-2015, many African nations, etc.)
        console.log("useLocation: No postal code in address")
        const locationDesc = [address?.city, address?.region, address?.country]
          .filter(Boolean)
          .join(", ")

        if (locationDesc) {
          // Show helpful message with detected location
          Alert.alert(
            "Postal Code Not Available",
            `We detected you're in ${locationDesc}, but couldn't find a postal code for this area.\n\nPlease enter a postal code manually to search.`,
            [{ text: "OK" }],
          )
        } else {
          setError("Could not determine postal code from your location")
        }
        return null
      }
    } catch (err) {
      console.error("useLocation: Error:", err)
      setError("Failed to get your location. Please try again.")
      return null
    } finally {
      console.log("=== useLocation: Finished ===")
      setIsLocating(false)
    }
  }, [])

  return {
    getLocationZipCode,
    isLocating,
    error,
    clearError,
  }
}
