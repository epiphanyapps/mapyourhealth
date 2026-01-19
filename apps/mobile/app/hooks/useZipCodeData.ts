/**
 * useZipCodeData Hook
 *
 * Fetches zip code safety data from the Amplify backend with MMKV caching.
 * Includes loading/error states, offline support, and falls back to cached/mock data.
 */

import { useState, useEffect, useCallback } from "react"

import { getZipCodeStats, ZipCodeStat as AmplifyZipCodeStat } from "@/services/amplify/data"
import { getZipCodeData as getMockZipCodeData, getZipCodeMetadata } from "@/data/helpers"
import { useStatDefinitions } from "@/context/StatDefinitionsContext"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { load, save, remove } from "@/utils/storage"
import type { ZipCodeData, ZipCodeStat, StatStatus, StatCategory, StatDefinition } from "@/data/types/safety"

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
 * Maps Amplify ZipCodeStat to the frontend ZipCodeStat type
 */
function mapAmplifyStatToFrontend(amplifyStat: AmplifyZipCodeStat): ZipCodeStat {
  return {
    statId: amplifyStat.statId,
    value: amplifyStat.value,
    status: (amplifyStat.status ?? "safe") as StatStatus,
    lastUpdated: amplifyStat.lastUpdated ?? new Date().toISOString(),
  }
}

/**
 * Look up city/state from bundled metadata or mock data as fallback.
 * Uses bundled zip code metadata for instant lookup without API calls.
 */
function getCityStateForZipCode(zipCode: string): { cityName: string; state: string } {
  // First try bundled metadata (covers most US zip codes)
  const metadata = getZipCodeMetadata(zipCode)
  if (metadata) {
    return { cityName: metadata.city, state: metadata.state }
  }

  // Fall back to mock data for any zip codes not in bundled metadata
  const mockData = getMockZipCodeData(zipCode)
  if (mockData) {
    return { cityName: mockData.cityName, state: mockData.state }
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
  const { statDefinitions, isLoading: defsLoading } = useStatDefinitions()
  const { isOffline, isReady: networkReady } = useNetworkStatus()

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!zipCode) {
      setZipData(null)
      setIsLoading(false)
      return
    }

    // Wait for stat definitions to be loaded
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
      const mockData = getMockZipCodeData(zipCode)
      if (mockData) {
        setZipData(mockData)
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
      const amplifyStats = await getZipCodeStats(zipCode)

      if (amplifyStats.length > 0) {
        // Map Amplify stats to frontend format
        const stats = amplifyStats.map(mapAmplifyStatToFrontend)
        const { cityName, state } = getCityStateForZipCode(zipCode)

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
          const mockData = getMockZipCodeData(zipCode)
          if (mockData) {
            setZipData(mockData)
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
        const mockData = getMockZipCodeData(zipCode)
        if (mockData) {
          setZipData(mockData)
          setIsMockData(true)
          setIsCachedData(false)
          setLastUpdated(null)
          setError("Using local data - could not reach server")
        } else {
          setZipData(null)
          setError("Failed to load data for this zip code")
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [zipCode, defsLoading, isOffline])

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
 */
export function getWorstStatusForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
  statDefinitions: { id: string; category: StatCategory }[],
): StatStatus {
  // Get stat IDs that belong to this category
  const categoryStatIds = new Set(
    statDefinitions.filter((def) => def.category === category).map((def) => def.id),
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
 * Helper to get stats for a specific category with their definitions
 */
export function getStatsForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
  statDefinitions: StatDefinition[],
): Array<{ stat: ZipCodeStat; definition: StatDefinition }> {
  // Get stat definitions for this category
  const categoryDefs = statDefinitions.filter((def) => def.category === category)
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
 */
export function getAlertStats(
  zipData: ZipCodeData,
  statDefinitions: StatDefinition[],
): Array<{ stat: ZipCodeStat; definition: StatDefinition }> {
  const defMap = new Map(statDefinitions.map((def) => [def.id, def]))

  return zipData.stats
    .filter((stat) => stat.status === "danger" || stat.status === "warning")
    .map((stat) => ({
      stat,
      definition: defMap.get(stat.statId)!,
    }))
    .filter((item) => item.definition) // Filter out any without matching definition
}
