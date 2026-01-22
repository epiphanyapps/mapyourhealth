/**
 * useLocation Hook
 *
 * A reusable hook for getting zip code from device GPS location.
 * Handles permissions, position fetching, and reverse geocoding.
 */

import { useState, useCallback } from "react"
import { Alert } from "react-native"
import * as Location from "expo-location"

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
    setError("")
    setIsLocating(true)

    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please enable location access in your device settings to use this feature.",
          [{ text: "OK" }],
        )
        return null
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      // Reverse geocode to get address/zip code
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })

      if (address?.postalCode) {
        return address.postalCode
      } else {
        setError("Could not determine zip code from your location")
        return null
      }
    } catch (err) {
      console.error("Location error:", err)
      setError("Failed to get your location. Please try again.")
      return null
    } finally {
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
