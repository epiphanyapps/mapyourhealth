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

/**
 * Cache key prefix for location stats.
 *
 * History:
 * - `_v2_`: bumped alongside the EPI-17 / EPI-18 cascade-bleed fix so any
 *   MMKV entries written under the original `location_stats_` prefix —
 *   which may contain leaked sibling-city data from the pre-fix cascade —
 *   are orphaned rather than served to offline users for up to 24 hours
 *   after the fix deploys.
 * - `_v3_`: bumped alongside #319 (EPI-18 sub-bug B / dual status pills).
 *   `_v2_` entries lack the new `whoStatus` / `localStatus` fields on
 *   `CityStat`. Without a bump, those entries deserialize cleanly (the
 *   new fields are optional) but the table renders both pills via the
 *   `stat.status` fallback — which is the worst-of-(WHO, local) and
 *   therefore "danger" for almost every Boucherville row. Verified on
 *   staging post-deploy: every WHO pill read "danger" until the cache
 *   was cleared. Bumping the prefix orphans `_v2_` entries so users see
 *   the correct WHO=safe / QC=danger split immediately on next fetch.
 *
 * Old entries remain in storage until MMKV evicts them naturally; the
 * cost is negligible (each entry is a few KB).
 */
const CACHE_KEY_PREFIX = "location_stats_v3_"

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
 * Build the MMKV cache key. Includes state/country alongside city
 * because the cascading hook resolves data based on all three (#123) —
 * keying on city alone would alias same-named cities in different
 * states, or serve a stale result when state/country change.
 */
function locationCacheKey(city: string, state: string, country: string): string {
  return `${CACHE_KEY_PREFIX}${city}|${state}|${country}`
}

/**
 * Get cached data for a city from MMKV storage.
 */
function getCachedData(city: string, state: string, country: string): CachedLocationData | null {
  const cacheKey = locationCacheKey(city, state, country)
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
function setCachedData(
  city: string,
  state: string,
  country: string,
  data: CityData,
  scope: LocationScope,
): void {
  save(locationCacheKey(city, state, country), { data, cachedAt: Date.now(), scope })
}

/**
 * Clear cached data for a specific city. Accepts the legacy single-arg
 * form (clears every state/country variant for that city) or the full
 * triple. The single-arg form is retained for callers that don't yet
 * thread state/country through.
 */
export function clearCachedLocationData(city: string, state?: string, country?: string): void {
  if (state !== undefined && country !== undefined) {
    remove(locationCacheKey(city, state, country))
    return
  }
  // No state/country supplied — fall back to the legacy bare-city key.
  remove(`${CACHE_KEY_PREFIX}${city}`)
}

/**
 * Compute a SafetyStatus from a measured value and a single threshold.
 * Returns "safe" when the threshold is missing or has no limit (no
 * comparison possible).
 */
function computeStatusForThreshold(
  value: number,
  threshold: { limitValue?: number | null; warningRatio?: number | null } | undefined,
  higherIsBad: boolean,
): StatStatus {
  if (!threshold || threshold.limitValue == null) return "safe"
  const limit = threshold.limitValue
  const warningThreshold = limit * (threshold.warningRatio ?? 0.8)
  if (higherIsBad) {
    if (value >= limit) return "danger"
    if (value >= warningThreshold) return "warning"
    return "safe"
  }
  if (value <= limit) return "danger"
  if (value <= warningThreshold) return "warning"
  return "safe"
}

const STATUS_SEVERITY: Record<StatStatus, number> = { safe: 0, warning: 1, danger: 2 }

/** Returns the more-severe of two statuses (danger > warning > safe). */
function worstStatus(a: StatStatus, b: StatStatus): StatStatus {
  return STATUS_SEVERITY[a] >= STATUS_SEVERITY[b] ? a : b
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
    getWHOThreshold,
    getJurisdictionForLocation,
    isLoading: defsLoading,
  } = useContaminants()
  const { isOffline, isReady: networkReady } = useNetworkStatus()
  const qc = useQueryClient()

  /**
   * Maps new LocationMeasurement to legacy CityStat format.
   *
   * Computes status against both the WHO and local-jurisdiction thresholds
   * (EPI-18 sub-bug B). For QC, the local limits are tighter than WHO for
   * many contaminants — a row that is safe vs WHO can read as danger vs QC.
   * Carrying both in `whoStatus` / `localStatus` lets the table render a
   * pill per column instead of a single row-level badge that hid the
   * distinction.
   *
   * `status` is the worst of the two so callers that have not migrated
   * (DashboardScreen summary, calculateCategoryStatus) keep behaving the
   * same way.
   */
  const mapMeasurementToLegacyStat = useCallback(
    (measurement: AmplifyLocationMeasurement, jurisdictionCode: string): CityStat => {
      const contaminant = contaminants.find((c) => c.id === measurement.contaminantId)
      const higherIsBad = contaminant?.higherIsBad ?? true

      const whoStatus = computeStatusForThreshold(
        measurement.value,
        getWHOThreshold(measurement.contaminantId),
        higherIsBad,
      )
      const localThreshold =
        jurisdictionCode === "WHO"
          ? undefined
          : getThreshold(measurement.contaminantId, jurisdictionCode)
      const localStatus = localThreshold
        ? computeStatusForThreshold(measurement.value, localThreshold, higherIsBad)
        : whoStatus

      return {
        statId: measurement.contaminantId,
        value: measurement.value,
        status: worstStatus(whoStatus, localStatus),
        whoStatus,
        localStatus,
        lastUpdated: measurement.measuredAt ?? new Date().toISOString(),
      }
    },
    [contaminants, getThreshold, getWHOThreshold],
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
      const cached = getCachedData(city, state, country)
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
    // getRowAnchor restricts state/country fallback to anchored rows so a
    // by-state fetch for QC does not leak Sorel-Tracy-keyed measurements
    // onto a Montreal user's screen (EPI-17 / EPI-18 cross-city bleed).
    const { data: measurements, scope } = await fetchWithLocationFallback(
      { city, state, country },
      {
        byCity: getLocationMeasurements,
        byState: getLocationMeasurementsByState,
        byCountry: getLocationMeasurementsByCountry,
        getRowAnchor: (m) => ({ city: m.city, state: m.state }),
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
      setCachedData(city, state, country, newData, scope)
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
    const cached = getCachedData(city, state, country)
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
    queryKey: queryKeys.measurements.byLocation(city, state, country),
    queryFn,
    enabled: !!city && !defsLoading,
    staleTime: 5 * 60 * 1000,
    // Use MMKV cached data as initialData if available
    initialData: () => {
      if (!city) return undefined
      const cached = getCachedData(city, state, country)
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

  // Invalidate every measurements query so sibling cities sharing the
  // same state/country cascade source also refetch (#123). The per-city
  // byLocation key alone wouldn't reach them.
  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.measurements.all })
  }, [qc])

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

/**
 * Filter a stats array to a single sub-category (Fertilizers, Pesticides,
 * Heavy Metals & Inorganics, etc.) by matching the contaminant's own
 * `category` field against the sub-category id from the route.
 *
 * Used when CategoryDetailScreen is opened from a sub-category tap on the
 * dashboard so that "Fertilizers" surfaces only fertilizer contaminants
 * instead of every water contaminant. EPI-18 sub-bug A.
 *
 * `subCategoryId` is the value carried in the route param — lowercased and
 * singular, matching the storage shape of `Contaminant.category` (e.g.
 * "fertilizer", "pesticide", "radioactive", "inorganic", "organic",
 * "disinfectant", "microbiological").
 */
export function filterStatsBySubCategory<T extends { definition: { category?: string | null } }>(
  stats: T[],
  subCategoryId: string | undefined,
): T[] {
  if (!subCategoryId) return stats
  return stats.filter(({ definition }) => definition.category === subCategoryId)
}
