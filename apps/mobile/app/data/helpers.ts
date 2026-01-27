/**
 * Data Helper Functions for MapYourHealth
 *
 * Utility functions for accessing and manipulating safety data.
 * These functions provide a clean API for components to interact with
 * mock data during development and will work with real data from Amplify
 * once the backend is connected.
 */

import {
  StatCategory,
  StatStatus,
  ZipCodeData,
  ZipCodeStat,
  StatDefinition,
  LocationData,
} from "./types/safety"
import {
  getZipCodeDataByCode,
  getStatDefinitionsByCategory,
  allStatDefinitions,
  getMockLocationData as getMockLocationDataFromMock,
} from "./mock"
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
 * Get zip code data by zip code string.
 *
 * Returns the full ZipCodeData object for a given zip code,
 * or undefined if the zip code is not found.
 *
 * @param zipCode - The zip code to look up (e.g., "90210")
 * @returns ZipCodeData object or undefined if not found
 *
 * @example
 * const data = getZipCodeData("90210")
 * if (data) {
 *   console.log(data.cityName) // "Beverly Hills"
 * }
 */
export function getZipCodeData(zipCode: string): ZipCodeData | undefined {
  return getZipCodeDataByCode(zipCode)
}

/**
 * Get stat definitions by category.
 *
 * Returns all stat definitions that belong to the specified category.
 *
 * @param category - The StatCategory to filter by
 * @returns Array of StatDefinition objects for that category
 *
 * @example
 * const waterStats = getStatsByCategory(StatCategory.water)
 * // Returns: Lead Levels, Nitrate Levels, Bacteria Count definitions
 */
export function getStatsByCategory(category: StatCategory): StatDefinition[] {
  return getStatDefinitionsByCategory(category)
}

/**
 * Determines the worst (most severe) status for a given category in zip code data.
 *
 * Analyzes all stats within a category and returns the most severe status.
 * Severity order: "danger" > "warning" > "safe"
 *
 * Returns "safe" if no stats are found for the category.
 *
 * @param zipData - The ZipCodeData object containing stats
 * @param category - The StatCategory to analyze
 * @returns The worst StatStatus found ("danger", "warning", or "safe")
 *
 * @example
 * const data = getZipCodeData("60601") // Chicago
 * const worstWater = getWorstStatusForCategory(data, StatCategory.water)
 * // Returns "danger" (due to high lead levels)
 */
export function getWorstStatusForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
): StatStatus {
  // Get the stat IDs that belong to this category
  const categoryStatIds = new Set(
    allStatDefinitions
      .filter((def) => def.category === category)
      .map((def) => def.id),
  )

  // Filter zip code stats to only those in this category
  const categoryStats = zipData.stats.filter((stat) =>
    categoryStatIds.has(stat.statId),
  )

  // If no stats found for this category, return safe
  if (categoryStats.length === 0) {
    return "safe"
  }

  // Check for danger first (most severe)
  if (categoryStats.some((stat) => stat.status === "danger")) {
    return "danger"
  }

  // Check for warning next
  if (categoryStats.some((stat) => stat.status === "warning")) {
    return "warning"
  }

  // All stats are safe
  return "safe"
}

/**
 * Get stats for a specific category from zip code data.
 *
 * Returns an array of ZipCodeStat objects for the specified category,
 * with their corresponding stat definitions attached.
 *
 * @param zipData - The ZipCodeData object containing stats
 * @param category - The StatCategory to filter by
 * @returns Array of objects containing both stat value and definition
 *
 * @example
 * const data = getZipCodeData("90210")
 * const waterStats = getStatsForCategory(data, StatCategory.water)
 * // Returns stats for Lead Levels, Nitrate Levels, Bacteria Count
 */
export function getStatsForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
): Array<{ stat: ZipCodeStat; definition: StatDefinition }> {
  // Get stat definitions for this category
  const categoryDefs = allStatDefinitions.filter(
    (def) => def.category === category,
  )
  const categoryStatIds = new Set(categoryDefs.map((def) => def.id))

  // Filter and map stats with their definitions
  return zipData.stats
    .filter((stat) => categoryStatIds.has(stat.statId))
    .map((stat) => ({
      stat,
      definition: categoryDefs.find((def) => def.id === stat.statId)!,
    }))
}

/**
 * Get all danger and warning stats from zip code data.
 *
 * Returns stats that have either "danger" or "warning" status,
 * useful for displaying alerts and recommendations.
 *
 * @param zipData - The ZipCodeData object containing stats
 * @returns Array of objects containing both stat value and definition
 *
 * @example
 * const data = getZipCodeData("60601") // Chicago
 * const alerts = getAlertStats(data)
 * // Returns stats for lead (danger), bacteria (warning), etc.
 */
export function getAlertStats(
  zipData: ZipCodeData,
): Array<{ stat: ZipCodeStat; definition: StatDefinition }> {
  const defMap = new Map(allStatDefinitions.map((def) => [def.id, def]))

  return zipData.stats
    .filter((stat) => stat.status === "danger" || stat.status === "warning")
    .map((stat) => ({
      stat,
      definition: defMap.get(stat.statId)!,
    }))
    .filter((item) => item.definition)
}

/**
 * Get the overall worst status across all categories for a zip code.
 *
 * @param zipData - The ZipCodeData object containing stats
 * @returns The worst StatStatus found across all stats
 *
 * @example
 * const data = getZipCodeData("60601") // Chicago
 * const overall = getOverallStatus(data)
 * // Returns "danger" (due to lead levels)
 */
export function getOverallStatus(zipData: ZipCodeData): StatStatus {
  if (zipData.stats.some((stat) => stat.status === "danger")) {
    return "danger"
  }
  if (zipData.stats.some((stat) => stat.status === "warning")) {
    return "warning"
  }
  return "safe"
}

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

/**
 * Get mock location data for a postal code.
 *
 * Returns the full LocationData object for a given postal code,
 * using the new data model with contaminants and measurements.
 *
 * @param postalCode - The postal/zip code to look up (e.g., "90210")
 * @returns LocationData object or undefined if not found
 *
 * @example
 * const data = getMockLocationData("90210")
 * if (data) {
 *   console.log(data.cityName) // "Beverly Hills"
 *   console.log(data.measurements) // Array of measurements with status
 * }
 */
export function getMockLocationData(postalCode: string): LocationData | undefined {
  return getMockLocationDataFromMock(postalCode)
}
