/**
 * useLocationData Hook
 *
 * Fetches city safety data from the Amplify backend via React Query.
 * Includes loading/error states, offline support, and falls back to cached data.
 */

import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useContaminants } from "@/context/ContaminantsContext"
import { type CityData, type CityStat, type StatStatus, StatCategory } from "@/data/types/safety"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { fetchWithLocationFallback, type LocationScope } from "@/lib/locationFallback"
import { queryKeys } from "@/lib/queryKeys"
import {
  getLocationMeasurements,
  getLocationMeasurementsByCountry,
  getLocationMeasurementsByState,
  AmplifyLocationMeasurement,
} from "@/services/amplify/data"
import { load, save, remove } from "@/utils/storage"

/** Cache key prefix for location stats */
const CACHE_KEY_PREFIX = "location_stats_"

/** Cache duration in milliseconds (24 hours) */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

/** Interface for cached data structure */
interface CachedLocationData {
  data: CityData
  cachedAt: number
  /** Scope this data resolved at, for provenance display after rehydration. */
  scope?: LocationScope
}

interface UseLocationDataResult {
  /** The city data, or null if loading/error */
  cityData: CityData | null
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
  /**
   * Which level of the location hierarchy resolved the data (#123).
   * "city" = city-specific record exists; "state"/"country" = inherited;
   * "none" = no data at any level.
   */
  scope: LocationScope
  /** Refresh data from the backend */
  refresh: () => Promise<void>
}

/**
 * Get cached data for a city from MMKV storage.
 */
function getCachedData(city: string): CachedLocationData | null {
  const cacheKey = `${CACHE_KEY_PREFIX}${city}`
  const cached = load<CachedLocationData>(cacheKey)

  if (!cached) return null

  if (Date.now() - cached.cachedAt > CACHE_DURATION_MS) {
    remove(cacheKey)
    return null
  }

  return cached
}

/**
 * Save city data to MMKV cache with timestamp + cascade scope.
 */
function setCachedData(city: string, data: CityData, scope: LocationScope): void {
  const cacheKey = `${CACHE_KEY_PREFIX}${city}`
  save(cacheKey, { data, cachedAt: Date.now(), scope })
}

/**
 * Clear cached data for a specific city.
 */
export function clearCachedLocationData(city: string): void {
  remove(`${CACHE_KEY_PREFIX}${city}`)
}

/**
 * Hook to fetch city safety data with caching support.
 *
 * Cascades through the location hierarchy (#123): if no city-specific
 * measurements exist, falls back to state-level, then country-level.
 * `state` and `country` are optional for backward compatibility but
 * required to actually cascade past the city level.
 */
export function useLocationData(
  city: string,
  state: string = "",
  country: string = "",
): UseLocationDataResult {
  const {
    contaminants,
    getThreshold,
    getJurisdictionForLocation,
    isLoading: defsLoading,
  } = useContaminants()
  const { isOffline, isReady: networkReady } = useNetworkStatus()
  const qc = useQueryClient()

  /**
   * Maps new LocationMeasurement to legacy CityStat format
   */
  const mapMeasurementToLegacyStat = useCallback(
    (measurement: AmplifyLocationMeasurement, jurisdictionCode: string): CityStat => {
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
   * Core query function that fetches measurements (with location-hierarchy
   * cascading per #123) and builds CityData.
   */
  const queryFn = useCallback(async (): Promise<{
    cityData: CityData | null
    isMockData: boolean
    isCachedData: boolean
    lastUpdated: number | null
    scope: LocationScope
    warning: string | null
  }> => {
    if (!city) {
      return {
        cityData: null,
        isMockData: false,
        isCachedData: false,
        lastUpdated: null,
        scope: "none",
        warning: null,
      }
    }

    // If offline, use MMKV cache
    if (isOffline) {
      const cached = getCachedData(city)
      if (cached) {
        return {
          cityData: cached.data,
          isMockData: false,
          isCachedData: true,
          lastUpdated: cached.cachedAt,
          scope: cached.scope ?? "city",
          warning: null,
        }
      }
      throw new Error("You're offline and no cached data is available")
    }

    // Online: cascade city → state → country via the shared util.
    const { data: measurements, scope } = await fetchWithLocationFallback(
      { city, state, country },
      {
        byCity: getLocationMeasurements,
        byState: getLocationMeasurementsByState,
        byCountry: getLocationMeasurementsByCountry,
      },
    )

    if (measurements.length > 0) {
      // Prefer the caller's state/country (drives cascading + jurisdiction).
      // For city-scope hits without a caller-provided state/country (legacy
      // call sites + tests), fall back to the record's own state/country so
      // jurisdiction resolution still works. State-/country-scope rows may
      // have null city/state on the record, so the caller's input is the
      // only reliable source there.
      const firstMeasurement = measurements[0]
      const effectiveState = state || firstMeasurement.state || ""
      const effectiveCountry = country || firstMeasurement.country || ""
      const cityName = scope === "city" ? (firstMeasurement.city ?? city) : city
      const jurisdictionCode =
        getJurisdictionForLocation(effectiveState, effectiveCountry)?.code || "WHO"
      const stats = measurements.map((m) => mapMeasurementToLegacyStat(m, jurisdictionCode))
      const newData: CityData = {
        city,
        cityName,
        state: effectiveState,
        country: effectiveCountry,
        stats,
      }
      setCachedData(city, newData, scope)
      return {
        cityData: newData,
        isMockData: false,
        isCachedData: false,
        lastUpdated: Date.now(),
        scope,
        warning: null,
      }
    }

    // No data from backend - keep cache as fallback for offline use
    const cached = getCachedData(city)
    if (cached) {
      return {
        cityData: cached.data,
        isMockData: false,
        isCachedData: true,
        lastUpdated: cached.cachedAt,
        scope: cached.scope ?? "none",
        warning: null,
      }
    }

    return {
      cityData: null,
      isMockData: false,
      isCachedData: false,
      lastUpdated: null,
      scope: "none",
      warning: null,
    }
  }, [city, state, country, isOffline, mapMeasurementToLegacyStat, getJurisdictionForLocation])

  const query = useQuery({
    queryKey: queryKeys.measurements.byLocation(city),
    queryFn,
    enabled: !!city && !defsLoading,
    staleTime: 5 * 60 * 1000,
    // Use MMKV cached data as initialData if available
    initialData: () => {
      if (!city) return undefined
      const cached = getCachedData(city)
      if (cached) {
        return {
          cityData: cached.data,
          isMockData: false,
          isCachedData: true,
          lastUpdated: cached.cachedAt,
          scope: cached.scope ?? "city",
          warning: null,
        }
      }
      return undefined
    },
    meta: { offlineFirst: true },
  })

  const result = query.data

  const refresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.measurements.byLocation(city) }),
      qc.invalidateQueries({ queryKey: queryKeys.measurements.byState(state) }),
      qc.invalidateQueries({ queryKey: queryKeys.measurements.byCountry(country) }),
    ])
  }, [qc, city, state, country])

  // Determine error: use query error or warning from the result
  const error = query.error?.message ?? result?.warning ?? null

  return {
    cityData: result?.cityData ?? null,
    isLoading: query.isLoading || defsLoading || !networkReady,
    error,
    isMockData: result?.isMockData ?? false,
    isCachedData: result?.isCachedData ?? false,
    lastUpdated: result?.lastUpdated ?? null,
    isOffline,
    scope: result?.scope ?? "none",
    refresh,
  }
}

// ── Pure helper functions (unchanged) ────────────────────────────────────────

/**
 * Helper to get the worst status for a category from city data
 */
export function getWorstStatusForCategory(
  cityData: CityData,
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

  const categoryStats = cityData.stats.filter((stat) => categoryStatIds.has(stat.statId))

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
  cityData: CityData,
  category: StatCategory,
  statDefinitions: GenericDefinition[],
): Array<{ stat: CityStat; definition: GenericDefinition }> {
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

  return cityData.stats
    .filter((stat) => categoryStatIds.has(stat.statId))
    .map((stat) => ({
      stat,
      definition: categoryDefs.find((def) => def.id === stat.statId)!,
    }))
    .filter((item) => item.definition)
}

/**
 * Helper to get all danger and warning stats from city data
 */
export function getAlertStats(
  cityData: CityData,
  statDefinitions: GenericDefinition[],
): Array<{ stat: CityStat; definition: GenericDefinition }> {
  const defMap = new Map(statDefinitions.map((def) => [def.id, def]))

  return cityData.stats
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
  cityData: CityData,
  category: StatCategory,
  statDefinitions: GenericDefinition[],
): Array<{ stat: CityStat; definition: GenericDefinition }> {
  return getStatsForCategory(cityData, category, statDefinitions).filter(
    ({ stat }) => stat.status === "danger" || stat.status === "warning",
  )
}
