/**
 * useZipCodeData Hook
 *
 * Fetches zip code safety data from the Amplify backend via React Query.
 * Includes loading/error states, offline support, and falls back to cached/mock data.
 *
 * @deprecated This hook uses the legacy data format. Consider using useLocationData for new code.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"

import { useContaminants } from "@/context/ContaminantsContext"
import { getMockLocationData, getZipCodeMetadata } from "@/data/helpers"
import {
  type ZipCodeData,
  type ZipCodeStat,
  type StatStatus,
  StatCategory,
} from "@/data/types/safety"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { queryKeys } from "@/lib/queryKeys"
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
 */
const CANADIAN_POSTAL_PREFIX_TO_PROVINCE: Record<string, string> = {
  A: "NL", B: "NS", C: "PE", E: "NB", G: "QC", H: "QC", J: "QC",
  K: "ON", L: "ON", M: "ON", N: "ON", P: "ON", R: "MB", S: "SK",
  T: "AB", V: "BC", X: "NT", Y: "YT",
}

/**
 * Look up city/state from bundled metadata or mock data as fallback.
 */
function getCityStateForZipCode(zipCode: string): { cityName: string; state: string } {
  const normalized = zipCode.trim().toUpperCase()

  const metadata = getZipCodeMetadata(zipCode)
  if (metadata) return { cityName: metadata.city, state: metadata.state }

  const mockData = getMockLocationData(zipCode)
  if (mockData) return { cityName: mockData.city, state: mockData.state }

  const canadianPattern = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/
  if (canadianPattern.test(normalized)) {
    const firstLetter = normalized.charAt(0).toUpperCase()
    const province = CANADIAN_POSTAL_PREFIX_TO_PROVINCE[firstLetter]
    if (province) return { cityName: "", state: province }
  }

  return { cityName: "", state: "" }
}

/**
 * Get cached data for a zip code from MMKV storage.
 */
function getCachedData(zipCode: string): CachedZipCodeData | null {
  const cacheKey = `${CACHE_KEY_PREFIX}${zipCode}`
  const cached = load<CachedZipCodeData>(cacheKey)

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
export function clearCachedZipCodeData(zipCode: string): void {
  remove(`${CACHE_KEY_PREFIX}${zipCode}`)
}

/**
 * Hook to fetch zip code safety data with caching support
 */
export function useZipCodeData(zipCode: string): UseZipCodeDataResult {
  const { contaminants, getThreshold, isLoading: defsLoading } = useContaminants()
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
      return { zipData: null, isMockData: false, isCachedData: false, lastUpdated: null, warning: null }
    }

    // If offline, use MMKV cache or mock data
    if (isOffline) {
      const cached = getCachedData(zipCode)
      if (cached) {
        return { zipData: cached.data, isMockData: false, isCachedData: true, lastUpdated: cached.cachedAt, warning: null }
      }
      const mockData = getMockLocationData(zipCode)
      if (mockData) {
        const legacyData: ZipCodeData = {
          zipCode: mockData.city,
          cityName: mockData.city,
          state: mockData.state,
          stats: mockData.measurements.map((m) => ({
            statId: m.contaminantId, value: m.value, status: m.status, lastUpdated: m.measuredAt,
          })),
        }
        return { zipData: legacyData, isMockData: true, isCachedData: false, lastUpdated: null, warning: "You're offline - showing sample data" }
      }
      throw new Error("You're offline and no cached data is available")
    }

    // Online: fetch from API
    const measurements = await getLocationMeasurements(zipCode)

    if (measurements.length > 0) {
      const { cityName, state } = getCityStateForZipCode(zipCode)
      const country = detectPostalCodeRegion(zipCode) || "US"
      const jurisdictionCode = getJurisdictionForPostalCode(zipCode, state, country)
      const stats = measurements.map((m) => mapMeasurementToLegacyStat(m, jurisdictionCode))
      const newData: ZipCodeData = { zipCode, cityName, state, stats }
      setCachedData(zipCode, newData)
      return { zipData: newData, isMockData: false, isCachedData: false, lastUpdated: Date.now(), warning: null }
    }

    // No data from backend - try cache, then mock
    const cached = getCachedData(zipCode)
    if (cached) {
      return { zipData: cached.data, isMockData: false, isCachedData: true, lastUpdated: cached.cachedAt, warning: null }
    }

    const mockData = getMockLocationData(zipCode)
    if (mockData) {
      const legacyData: ZipCodeData = {
        zipCode: mockData.city,
        cityName: mockData.city,
        state: mockData.state,
        stats: mockData.measurements.map((m) => ({
          statId: m.contaminantId, value: m.value, status: m.status, lastUpdated: m.measuredAt,
        })),
      }
      return { zipData: legacyData, isMockData: true, isCachedData: false, lastUpdated: null, warning: null }
    }

    return { zipData: null, isMockData: false, isCachedData: false, lastUpdated: null, warning: null }
  }, [zipCode, isOffline, mapMeasurementToLegacyStat])

  const query = useQuery({
    queryKey: queryKeys.measurements.byPostalCode(zipCode),
    queryFn,
    enabled: !!zipCode && !defsLoading,
    staleTime: 5 * 60 * 1000,
    // Use MMKV cached data as initialData if available
    initialData: () => {
      if (!zipCode) return undefined
      const cached = getCachedData(zipCode)
      if (cached) {
        return { zipData: cached.data, isMockData: false, isCachedData: true, lastUpdated: cached.cachedAt, warning: null }
      }
      return undefined
    },
    meta: { offlineFirst: true },
  })

  const result = query.data

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.measurements.byPostalCode(zipCode) })
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
            "fertilizer", "pesticide", "radioactive", "disinfectant",
            "inorganic", "organic", "microbiological",
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
    "fertilizer", "pesticide", "radioactive", "disinfectant",
    "inorganic", "organic", "microbiological",
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
