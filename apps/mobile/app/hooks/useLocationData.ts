/**
 * useLocationData Hook
 *
 * Fetches zip code safety data from the Amplify backend via React Query.
 * Includes loading/error states, offline support, and falls back to cached/mock data.
 *
 * @deprecated This hook uses the legacy data format. Consider using useLocationData for new code.
 */

import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useContaminants } from "@/context/ContaminantsContext"
import {
  type ZipCodeData,
  type ZipCodeStat,
  type StatStatus,
  StatCategory,
} from "@/data/types/safety"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { queryKeys } from "@/lib/queryKeys"
import { getLocationMeasurements, AmplifyLocationMeasurement } from "@/services/amplify/data"
import { load, save, remove } from "@/utils/storage"

/** Cache key prefix for location stats */
const CACHE_KEY_PREFIX = "location_stats_"

/** Cache duration in milliseconds (24 hours) */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

/** Interface for cached data structure */
interface CachedLocationData {
  data: ZipCodeData
  cachedAt: number
}

interface UseLocationDataResult {
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
 * Get cached data for a zip code from MMKV storage.
 */
function getCachedData(zipCode: string): CachedLocationData | null {
  const cacheKey = `${CACHE_KEY_PREFIX}${zipCode}`
  const cached = load<CachedLocationData>(cacheKey)

  if (!cached) return null

  if (Date.now() - cached.cachedAt > CACHE_DURATION_MS) {
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
  save(cacheKey, { data, cachedAt: Date.now() })
}

/**
 * Clear cached data for a specific zip code.
 */
export function clearCachedLocationData(zipCode: string): void {
  remove(`${CACHE_KEY_PREFIX}${zipCode}`)
}

/**
 * Hook to fetch zip code safety data with caching support
 */
export function useLocationData(zipCode: string): UseLocationDataResult {
  const {
    contaminants,
    getThreshold,
    getJurisdictionForLocation,
    isLoading: defsLoading,
  } = useContaminants()
  const { isOffline, isReady: networkReady } = useNetworkStatus()
  const qc = useQueryClient()

  /**
   * Maps new LocationMeasurement to legacy ZipCodeStat format
   */
  const mapMeasurementToLegacyStat = useCallback(
    (measurement: AmplifyLocationMeasurement, jurisdictionCode: string): ZipCodeStat => {
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

  /**
   * Core query function that fetches measurements and builds ZipCodeData
   */
  const queryFn = useCallback(async (): Promise<{
    zipData: ZipCodeData | null
    isMockData: boolean
    isCachedData: boolean
    lastUpdated: number | null
    warning: string | null
  }> => {
    if (!zipCode) {
      return {
        zipData: null,
        isMockData: false,
        isCachedData: false,
        lastUpdated: null,
        warning: null,
      }
    }

    // If offline, use MMKV cache
    if (isOffline) {
      const cached = getCachedData(zipCode)
      if (cached) {
        return {
          zipData: cached.data,
          isMockData: false,
          isCachedData: true,
          lastUpdated: cached.cachedAt,
          warning: null,
        }
      }
      throw new Error("You're offline and no cached data is available")
    }

    // Online: fetch from API
    const measurements = await getLocationMeasurements(zipCode)

    if (measurements.length > 0) {
      // Extract state/country from API response (measurements have full location data)
      const firstMeasurement = measurements[0]
      const cityName = firstMeasurement.city ?? zipCode
      const state = firstMeasurement.state ?? ""
      const country = firstMeasurement.country ?? ""
      const jurisdictionCode = getJurisdictionForLocation(state, country)?.code || "WHO"
      const stats = measurements.map((m) => mapMeasurementToLegacyStat(m, jurisdictionCode))
      const newData: ZipCodeData = { zipCode, cityName, state, country, stats }
      setCachedData(zipCode, newData)
      return {
        zipData: newData,
        isMockData: false,
        isCachedData: false,
        lastUpdated: Date.now(),
        warning: null,
      }
    }

    // No data from backend - keep cache as fallback for offline use
    const cached = getCachedData(zipCode)
    if (cached) {
      return {
        zipData: cached.data,
        isMockData: false,
        isCachedData: true,
        lastUpdated: cached.cachedAt,
        warning: null,
      }
    }

    return {
      zipData: null,
      isMockData: false,
      isCachedData: false,
      lastUpdated: null,
      warning: null,
    }
  }, [zipCode, isOffline, mapMeasurementToLegacyStat, getJurisdictionForLocation])

  const query = useQuery({
    queryKey: queryKeys.measurements.byLocation(zipCode),
    queryFn,
    enabled: !!zipCode && !defsLoading,
    staleTime: 5 * 60 * 1000,
    // Use MMKV cached data as initialData if available
    initialData: () => {
      if (!zipCode) return undefined
      const cached = getCachedData(zipCode)
      if (cached) {
        return {
          zipData: cached.data,
          isMockData: false,
          isCachedData: true,
          lastUpdated: cached.cachedAt,
          warning: null,
        }
      }
      return undefined
    },
    meta: { offlineFirst: true },
  })

  const result = query.data

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.measurements.byLocation(zipCode) })
  }, [qc, zipCode])

  // Determine error: use query error or warning from the result
  const error = query.error?.message ?? result?.warning ?? null

  return {
    zipData: result?.zipData ?? null,
    isLoading: query.isLoading || defsLoading || !networkReady,
    error,
    isMockData: result?.isMockData ?? false,
    isCachedData: result?.isCachedData ?? false,
    lastUpdated: result?.lastUpdated ?? null,
    isOffline,
    refresh,
  }
}

// ── Pure helper functions (unchanged) ────────────────────────────────────────

/**
 * Helper to get the worst status for a category from zip code data
 */
export function getWorstStatusForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
  statDefinitions: { id: string; category: string }[],
): StatStatus {
  const isWaterCategory = category === StatCategory.water

  const categoryStatIds = new Set(
    statDefinitions
      .filter((def) => {
        if (def.category === category) return true
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

  const categoryStats = zipData.stats.filter((stat) => categoryStatIds.has(stat.statId))

  if (categoryStats.length === 0) return "safe"
  if (categoryStats.some((stat) => stat.status === "danger")) return "danger"
  if (categoryStats.some((stat) => stat.status === "warning")) return "warning"
  return "safe"
}

interface GenericDefinition {
  id: string
  name: string
  unit: string
  description?: string
  category: string
  higherIsBad?: boolean
  thresholds?: { danger: number; warning: number; higherIsBad: boolean }
}

/**
 * Helper to get stats for a specific category with their definitions
 */
export function getStatsForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
  statDefinitions: GenericDefinition[],
): Array<{ stat: ZipCodeStat; definition: GenericDefinition }> {
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

  const categoryDefs = statDefinitions.filter((def) => {
    if (def.category === category) return true
    if (isWaterCategory && contaminantCategories.includes(def.category)) return true
    return false
  })
  const categoryStatIds = new Set(categoryDefs.map((def) => def.id))

  return zipData.stats
    .filter((stat) => categoryStatIds.has(stat.statId))
    .map((stat) => ({
      stat,
      definition: categoryDefs.find((def) => def.id === stat.statId)!,
    }))
    .filter((item) => item.definition)
}

/**
 * Helper to get all danger and warning stats from zip code data
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
    .filter((item) => item.definition)
}

/**
 * Helper to get only risk stats (danger/warning) for a specific category.
 */
export function getRiskStatsForCategory(
  zipData: ZipCodeData,
  category: StatCategory,
  statDefinitions: GenericDefinition[],
): Array<{ stat: ZipCodeStat; definition: GenericDefinition }> {
  return getStatsForCategory(zipData, category, statDefinitions).filter(
    ({ stat }) => stat.status === "danger" || stat.status === "warning",
  )
}
