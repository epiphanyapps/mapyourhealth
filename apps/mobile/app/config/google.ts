/**
 * Google API Configuration
 *
 * DEPRECATED: Google Places API is now proxied through the backend for security.
 * The API key is stored server-side and never exposed to the client.
 *
 * This file is kept for backward compatibility during the migration period.
 * @see packages/backend/amplify/functions/places-autocomplete
 */

/**
 * @deprecated Google Places API is now handled by the backend.
 * Use the `getPlacesAutocomplete` function from `@/services/amplify/data` instead.
 */
export const getGooglePlacesApiKey = (): string => {
  console.warn(
    "[DEPRECATED] getGooglePlacesApiKey is deprecated. " +
      "Google Places API is now proxied through the backend.",
  )
  return ""
}

/**
 * @deprecated Google Places API is now handled by the backend.
 * The backend-based autocomplete is always available (no client-side API key needed).
 */
export const isGooglePlacesEnabled = (): boolean => {
  // Always return true since the backend handles Places API
  return true
}

/**
 * Google Places API configuration (used by backend)
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
