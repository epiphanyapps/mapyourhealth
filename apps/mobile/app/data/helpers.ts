/**
 * Data Helper Functions for MapYourHealth
 *
 * Utility functions for accessing zip code metadata.
 */

import zipCodesMetadata from "./zip-codes-metadata.json"

/**
 * Metadata for a US zip code including city, state, and coordinates.
 */
export interface ZipCodeMetadata {
  /** The zip code */
  zipCode: string
  /** City name */
  city: string
  /** Two-letter state abbreviation */
  state: string
  /** Latitude coordinate */
  latitude: number
  /** Longitude coordinate */
  longitude: number
}

/**
 * Type for the raw metadata JSON structure
 */
type ZipCodeMetadataRecord = {
  city: string
  state: string
  lat: number
  lng: number
}

/**
 * Typed metadata lookup
 */
const metadataMap = zipCodesMetadata as Record<string, ZipCodeMetadataRecord>

/**
 * Get metadata (city, state, coordinates) for a US zip code.
 *
 * Uses bundled metadata for instant lookup without API calls.
 * Returns null for unknown zip codes.
 *
 * @param zipCode - The 5-digit zip code to look up
 * @returns ZipCodeMetadata object or null if not found
 *
 * @example
 * const metadata = getZipCodeMetadata("90210")
 * if (metadata) {
 *   console.log(metadata.city) // "Beverly Hills"
 *   console.log(metadata.state) // "CA"
 * }
 */
export function getZipCodeMetadata(zipCode: string): ZipCodeMetadata | null {
  const record = metadataMap[zipCode]
  if (!record) {
    return null
  }

  return {
    zipCode,
    city: record.city,
    state: record.state,
    latitude: record.lat,
    longitude: record.lng,
  }
}
