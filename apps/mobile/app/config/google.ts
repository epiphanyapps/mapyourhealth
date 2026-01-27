/**
 * Google API Configuration
 *
 * Configuration for Google Places API used for location autocomplete.
 * The API key should be set via environment variable for security.
 */
import Constants from "expo-constants"

/**
 * Get the Google Places API key from environment/config
 * The key should be set via EXPO_PUBLIC_GOOGLE_PLACES_API_KEY environment variable
 * Falls back to empty string if not configured (autocomplete will be disabled)
 */
export const getGooglePlacesApiKey = (): string => {
  // Try to get from Expo constants (set in app.config.ts from env var)
  // Use type assertion since expo-constants types don't include extra
  const expoConfig = Constants.expoConfig as { extra?: { googlePlacesApiKey?: string } } | null
  const manifest = Constants.manifest as { extra?: { googlePlacesApiKey?: string } } | null

  const apiKey =
    expoConfig?.extra?.googlePlacesApiKey ||
    manifest?.extra?.googlePlacesApiKey ||
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    ""

  return apiKey
}

/**
 * Check if Google Places API is configured and available
 */
export const isGooglePlacesEnabled = (): boolean => {
  const apiKey = getGooglePlacesApiKey()
  return apiKey.length > 0
}

/**
 * Google Places API configuration
 */
export const GooglePlacesConfig = {
  /**
   * Restrict results to US and Canada
   */
  countries: ["us", "ca"],

  /**
   * Types of places to include in autocomplete
   * - (regions) includes cities, neighborhoods, zip codes
   * - postal_code specifically targets postal codes
   */
  types: ["(regions)"],

  /**
   * Language for results
   */
  language: "en",
}
