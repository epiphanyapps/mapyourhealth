/**
 * useZipCodeData Hook
 *
 * Fetches zip code safety data from the Amplify backend with MMKV caching.
 * Includes loading/error states, offline support, and falls back to cached/mock data.
 *
 * @deprecated This hook uses the legacy data format. Consider using useLocationData for new code.
 */

import { useState, useEffect, useCallback } from "react"

import { useContaminants } from "@/context/ContaminantsContext"
import { getMockLocationData, getZipCodeMetadata } from "@/data/helpers"
import {
  type ZipCodeData,
  type ZipCodeStat,
  type StatStatus,
  StatCategory,
} from "@/data/types/safety"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { getLocationMeasurements, AmplifyLocationMeasurement } from "@/services/amplify/data"
import { getJurisdictionForPostalCode } from "@/utils/jurisdiction"
import { detectPostalCodeRegion } from "@/utils/postalCode"
import { load, save, remove } from "@/utils/storage"

/** Cache key prefix for zip code stats */
const CACHE_KEY_PREFIX = "zipcode_stats_"

/** Cache duration in milliseconds (24 hours) */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

/** Interface for cached data structure */
interface CachedZipCodeData {
  data: ZipCodeData
  cachedAt: number
}

interface UseZipCodeDataResult {
  /** The zip code data, or null if loading/error */
  zipData: ZipCodeData | null
  /** Whether data is currently being fetched */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether we're using mock data as fallback */
  isMockData: boolean
  /** Whether we're using cached data (offline) */
  isCachedData: boolean
  /** Timestamp when data was last updated (from cache or server) */
  lastUpdated: number | null
  /** Whether the device is offline */
  isOffline: boolean
  /** Refresh data from the backend */
  refresh: () => Promise<void>
}

/**
 * Canadian postal code first-letter to province mapping.
 * The first letter of a Canadian postal code indicates the province.
 */
const CANADIAN_POSTAL_PREFIX_TO_PROVINCE: Record<string, string> = {
  A: "NL", // Newfoundland and Labrador
  B: "NS", // Nova Scotia
  C: "PE", // Prince Edward Island
  E: "NB", // New Brunswick
  G: "QC", // Quebec (east)
  H: "QC", // Quebec (Montreal)
  J: "QC", // Quebec (other)
  K: "ON", // Ontario (Ottawa)
  L: "ON", // Ontario (central)
  M: "ON", // Ontario (Toronto)
  N: "ON", // Ontario (southwest)
  P: "ON", // Ontario (north)
  R: "MB", // Manitoba
  S: "SK", // Saskatchewan
  T: "AB", // Alberta
  V: "BC", // British Columbia
  X: "NT", // Northwest Territories / Nunavut
  Y: "YT", // Yukon
}

/**
 * Look up city/state from bundled metadata or mock data as fallback.
 * Uses bundled zip code metadata for instant lookup without API calls.
 * Also handles Canadian postal codes by extracting province from the postal code prefix.
 */
function getCityStateForZipCode(zipCode: string): { cityName: string; state: string } {
  const normalized = zipCode.trim().toUpperCase()

  // First try bundled metadata (covers US zip codes)
  const metadata = getZipCodeMetadata(zipCode)
  if (metadata) {
    return { cityName: metadata.city, state: metadata.state }
  }

  // Fall back to mock data for any zip codes not in bundled metadata
  const mockData = getMockLocationData(zipCode)
  if (mockData) {
    return { cityName: mockData.cityName, state: mockData.state }
  }

  // For Canadian postal codes, extract province from first letter
  // Canadian format: A1A 1A1 or A1A1A1 (letter-digit-letter digit-letter-digit)
  const canadianPattern = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/
  if (canadianPattern.test(normalized)) {
    const firstLetter = normalized.charAt(0).toUpperCase()
    const province = CANADIAN_POSTAL_PREFIX_TO_PROVINCE[firstLetter]
    if (province) {
      return { cityName: "", state: province }
    }
  }

  // Return generic placeholders for truly unknown zip codes
  // This handles zip codes gracefully by showing just the zip code
  return { cityName: "", state: "" }
}

/**
 * Get cached data for a zip code from MMKV storage.
 * Returns null if no cache exists or cache is expired.
 */
function getCachedData(zipCode: string): CachedZipCodeData | null {
  const cacheKey = `${CACHE_KEY_PREFIX}${zipCode}`
  const cached = load<CachedZipCodeData>(cacheKey)

  if (!cached) {
    return null
  }

  // Check if cache is expired (older than 24 hours)
  const now = Date.now()
  if (now - cached.cachedAt > CACHE_DURATION_MS) {
    // Cache expired, remove it
    remove(cacheKey)
    return null
  }

  return cached
}

/**
 * Save zip code data to MMKV cache with timestamp.
 */
function setCachedData(zipCode: string, data: ZipCodeData): void {
  const cacheKey = `${CACHE_KEY_PREFIX}${zipCode}`
  const cached: CachedZipCodeData = {
    data,
    cachedAt: Date.now(),
  }
  save(cacheKey, cached)
}

/**
 * Clear cached data for a specific zip code.
 */
export function clearCachedZipCodeData(zipCode: string): void {
  const cacheKey = `${CACHE_KEY_PREFIX}${zipCode}`
  remove(cacheKey)
}

/**
 * Hook to fetch zip code safety data with caching support
 *
 * @param zipCode - The zip code to fetch data for
 * @returns Object with zipData, loading state, error, cache status, and refresh function
 *
 * @example
 * const { zipData, isLoading, error, isCachedData, isOffline, refresh } = useZipCodeData("90210")
 *
 * if (isLoading) return <LoadingState />
 * if (isOffline && isCachedData) return <OfflineBanner lastUpdated={lastUpdated} />
 * if (error) return <ErrorState message={error} onRetry={refresh} />
 * if (!zipData) return <EmptyState />
 */
export function useZipCodeData(zipCode: string): UseZipCodeDataResult {
  const [zipData, setZipData] = useState<ZipCodeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMockData, setIsMockData] = useState(false)
  const [isCachedData, setIsCachedData] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const { contaminants, getThreshold, isLoading: defsLoading } = useContaminants()
  const { isOffline, isReady: networkReady } = useNetworkStatus()

  /**
   * Maps new LocationMeasurement to legacy ZipCodeStat format
   *
   * @param measurement - The measurement from Amplify backend
   * @param jurisdictionCode - The jurisdiction code to use for threshold lookup
   *                          (determined from zip code location)
   */
  const mapMeasurementToLegacyStat = useCallback(
    (measurement: AmplifyLocationMeasurement, jurisdictionCode: string): ZipCodeStat => {
      // Compute status based on threshold for the user's jurisdiction
      const contaminant = contaminants.find((c) => c.id === measurement.contaminantId)
      const threshold = getThreshold(measurement.contaminantId, jurisdictionCode)
      const higherIsBad = contaminant?.higherIsBad ?? true

      let status: StatStatus = "safe"
      if (threshold && threshold.limitValue !== null) {
        const limit = threshold.limitValue
        const warningRatio = threshold.warningRatio ?? 0.8
        const warningThreshold = limit * warningRatio

        if (higherIsBad) {
          if (measurement.value >= limit) status = "danger"
          else if (measurement.value >= warningThreshold) status = "warning"
        } else {
          if (measurement.value <= limit) status = "danger"
          else if (measurement.value <= warningThreshold) status = "warning"
        }
      }

      return {
        statId: measurement.contaminantId,
        value: measurement.value,
        status,
        lastUpdated: measurement.measuredAt ?? new Date().toISOString(),
      }
    },
    [contaminants, getThreshold],
  )

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!zipCode) {
        setZipData(null)
        setIsLoading(false)
        return
      }

      // Wait for contaminants to be loaded
      if (defsLoading) {
        return
      }

      setIsLoading(true)
      setError(null)

      // If offline or not forcing refresh, try to use cached data first
      if (!forceRefresh) {
        const cached = getCachedData(zipCode)
        if (cached) {
          setZipData(cached.data)
          setIsCachedData(true)
          setIsMockData(false)
          setLastUpdated(cached.cachedAt)

          // If offline, just use cached data and stop
          if (isOffline) {
            setIsLoading(false)
            return
          }
          // If online but have cache, continue to fetch fresh data in background
        }
      }

      // If offline and no cache, try mock data
      if (isOffline) {
        const cached = getCachedData(zipCode)
        if (cached) {
          setZipData(cached.data)
          setIsCachedData(true)
          setIsMockData(false)
          setLastUpdated(cached.cachedAt)
          setIsLoading(false)
          return
        }

        // No cache, try mock data
        const mockData = getMockLocationData(zipCode)
        if (mockData) {
          // Convert LocationData to ZipCodeData format
          const legacyData: ZipCodeData = {
            zipCode: mockData.postalCode,
            cityName: mockData.cityName,
            state: mockData.state,
            stats: mockData.measurements.map((m) => ({
              statId: m.contaminantId,
              value: m.value,
              status: m.status,
              lastUpdated: m.measuredAt,
            })),
          }
          setZipData(legacyData)
          setIsMockData(true)
          setIsCachedData(false)
          setLastUpdated(null)
          setError("You're offline - showing sample data")
        } else {
          setZipData(null)
          setError("You're offline and no cached data is available")
        }
        setIsLoading(false)
        return
      }

      try {
        const measurements = await getLocationMeasurements(zipCode)

        if (measurements.length > 0) {
          // Get location info and determine jurisdiction
          const { cityName, state } = getCityStateForZipCode(zipCode)
          const country = detectPostalCodeRegion(zipCode) || "US"
          const jurisdictionCode = getJurisdictionForPostalCode(zipCode, state, country)

          // Map measurements to legacy format using the correct jurisdiction
          const stats = measurements.map((m) => mapMeasurementToLegacyStat(m, jurisdictionCode))

          const newData: ZipCodeData = {
            zipCode,
            cityName,
            state,
            stats,
          }

          setZipData(newData)
          setIsMockData(false)
          setIsCachedData(false)
          setLastUpdated(Date.now())

          // Cache the fresh data
          setCachedData(zipCode, newData)
        } else {
          // No data in backend for this zip code
          // Try to fall back to cached data first
          const cached = getCachedData(zipCode)
          if (cached) {
            setZipData(cached.data)
            setIsCachedData(true)
            setIsMockData(false)
            setLastUpdated(cached.cachedAt)
          } else {
            // Try mock data as last resort
            const mockData = getMockLocationData(zipCode)
            if (mockData) {
              const legacyData: ZipCodeData = {
                zipCode: mockData.postalCode,
                cityName: mockData.cityName,
                state: mockData.state,
                stats: mockData.measurements.map((m) => ({
                  statId: m.contaminantId,
                  value: m.value,
                  status: m.status,
                  lastUpdated: m.measuredAt,
                })),
              }
              setZipData(legacyData)
              setIsMockData(true)
              setIsCachedData(false)
              setLastUpdated(null)
            } else {
              // No data available at all
              setZipData(null)
              setError(null) // Not an error, just no data
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch zip code data:", err)

        // Try cached data first
        const cached = getCachedData(zipCode)
        if (cached) {
          setZipData(cached.data)
          setIsCachedData(true)
          setIsMockData(false)
          setLastUpdated(cached.cachedAt)
          setError("Using cached data - could not reach server")
        } else {
          // Fall back to mock data
          const mockData = getMockLocationData(zipCode)
          if (mockData) {
            const legacyData: ZipCodeData = {
              zipCode: mockData.postalCode,
              cityName: mockData.cityName,
              state: mockData.state,
              stats: mockData.measurements.map((m) => ({
                statId: m.contaminantId,
                value: m.value,
                status: m.status,
                lastUpdated: m.measuredAt,
              })),
            }
            setZipData(legacyData)
            setIsMockData(true)
            setIsCachedData(false)
            setLastUpdated(null)
            setError("Using local data - could not reach server")
          } else {
            // Check if this might be a "not found" vs actual error
            const errorMessage = err instanceof Error ? err.message : String(err)
            const isNotFoundError =
              errorMessage.includes("not found") ||
              errorMessage.includes("404") ||
              errorMessage.includes("No data")

            setZipData(null)
            // Only set error for actual network/server errors, not "no data" cases
            setError(
              isNotFoundError ? null : "Unable to connect. Check your connection and try again.",
            )
          }
        }
      } finally {
        setIsLoading(false)
      }
    },
    [zipCode, defsLoading, isOffline, mapMeasurementToLegacyStat],
  )

  // Re-fetch when zip code changes or definitions finish loading
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Create refresh function that forces a refresh
  const refresh = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  return {
    zipData,
    isLoading: isLoading || defsLoading || !networkReady,
    error,
    isMockData,
    isCachedData,
    lastUpdated,
    isOffline,
    refresh,
  }
}

/**
 * Helper to get the worst status for a category from zip code data
 *
 * This is a pure function that works with both Amplify and mock data.
 * Supports both legacy StatCategory and new ContaminantCategory types.
 */
export function getWorstStatusForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
  statDefinitions: { id: string; category: string }[],
): StatStatus {
  // For the new ContaminantCategory (fertilizer, pesticide, etc.), all are water-related
  // So if checking StatCategory.water, include all contaminant categories
  const isWaterCategory = category === StatCategory.water

  // Get stat IDs that belong to this category
  const categoryStatIds = new Set(
    statDefinitions
      .filter((def) => {
        // Legacy stat definitions have StatCategory directly
        if (def.category === category) return true
        // New contaminants are all water-related
        if (isWaterCategory) {
          const contaminantCategories = [
            "fertilizer",
            "pesticide",
            "radioactive",
            "disinfectant",
            "inorganic",
            "organic",
            "microbiological",
          ]
          return contaminantCategories.includes(def.category)
        }
        return false
      })
      .map((def) => def.id),
  )

  // Filter zip code stats to only those in this category
  const categoryStats = zipData.stats.filter((stat) => categoryStatIds.has(stat.statId))

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
 * Definition type that can be either legacy StatDefinition or new Contaminant
 */
interface GenericDefinition {
  id: string
  name: string
  unit: string
  description?: string
  category: string
  /** Whether higher values are worse (new Contaminant type) */
  higherIsBad?: boolean
  /** Legacy thresholds (StatDefinition type) */
  thresholds?: {
    danger: number
    warning: number
    higherIsBad: boolean
  }
}

/**
 * Helper to get stats for a specific category with their definitions
 * Supports both legacy StatDefinition and new Contaminant types.
 */
export function getStatsForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
  statDefinitions: GenericDefinition[],
): Array<{ stat: ZipCodeStat; definition: GenericDefinition }> {
  // For the new ContaminantCategory, all are water-related
  const isWaterCategory = category === StatCategory.water
  const contaminantCategories = [
    "fertilizer",
    "pesticide",
    "radioactive",
    "disinfectant",
    "inorganic",
    "organic",
    "microbiological",
  ]

  // Get stat definitions for this category
  const categoryDefs = statDefinitions.filter((def) => {
    if (def.category === category) return true
    if (isWaterCategory && contaminantCategories.includes(def.category)) return true
    return false
  })
  const categoryStatIds = new Set(categoryDefs.map((def) => def.id))

  // Filter and map stats with their definitions
  return zipData.stats
    .filter((stat) => categoryStatIds.has(stat.statId))
    .map((stat) => ({
      stat,
      definition: categoryDefs.find((def) => def.id === stat.statId)!,
    }))
    .filter((item) => item.definition) // Filter out any without matching definition
}

/**
 * Helper to get all danger and warning stats from zip code data
 * Supports both legacy StatDefinition and new Contaminant types.
 */
export function getAlertStats(
  zipData: ZipCodeData,
  statDefinitions: GenericDefinition[],
): Array<{ stat: ZipCodeStat; definition: GenericDefinition }> {
  const defMap = new Map(statDefinitions.map((def) => [def.id, def]))

  return zipData.stats
    .filter((stat) => stat.status === "danger" || stat.status === "warning")
    .map((stat) => ({
      stat,
      definition: defMap.get(stat.statId)!,
    }))
    .filter((item) => item.definition) // Filter out any without matching definition
}

/**
 * Helper to get only risk stats (danger/warning) for a specific category.
 * This is used for the risk-only display mode where safe stats are hidden.
 */
export function getRiskStatsForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
  statDefinitions: GenericDefinition[],
): Array<{ stat: ZipCodeStat; definition: GenericDefinition }> {
  // Get all stats for the category, then filter to only risks
  return getStatsForCategory(zipData, category, statDefinitions).filter(
    ({ stat }) => stat.status === "danger" || stat.status === "warning",
  )
}
