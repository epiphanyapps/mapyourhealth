/**
 * usePollutionSources Hook
 *
 * Fetches pollution sources for a location, cascading city → state → country
 * per #123 via the shared `fetchWithLocationFallback` util.
 */

import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { fetchWithLocationFallback, type LocationScope } from "@/lib/locationFallback"
import { queryKeys } from "@/lib/queryKeys"
import {
  getPollutionSourcesByCity,
  getPollutionSourcesByCountry,
  getPollutionSourcesByState,
  type AmplifyPollutionSource,
} from "@/services/amplify/data"

interface UsePollutionSourcesResult {
  /** Pollution sources for the location */
  sources: AmplifyPollutionSource[]
  /** Whether data is loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether offline */
  isOffline: boolean
  /** Which level of the location hierarchy resolved the data (#123). */
  scope: LocationScope
  /** Refresh data */
  refresh: () => Promise<void>
}

interface LocationParams {
  city: string
  state: string
  /** Country anchor for country-level cascade fallback (#123). Optional for backward compat. */
  country?: string
}

/**
 * Hook to fetch pollution sources for a location.
 *
 * Cascades city → state → country (#123). Returns a `scope` flag so the
 * caller can render provenance ("Showing QC data") rather than letting the
 * user think a city has its own row when in fact data was inherited.
 */
export function usePollutionSources(params: LocationParams): UsePollutionSourcesResult {
  const { city, state, country = "" } = params
  const { isOffline } = useNetworkStatus()
  const qc = useQueryClient()

  // Cascade city → state → country (#123). Enabled whenever any cascade
  // level has a value so the country-only path remains reachable; the
  // shared util internally skips levels with empty input.
  const sourcesQuery = useQuery({
    queryKey: queryKeys.pollutionSources.byCity(city),
    queryFn: async () =>
      fetchWithLocationFallback(
        { city, state, country },
        {
          byCity: getPollutionSourcesByCity,
          byState: getPollutionSourcesByState,
          byCountry: getPollutionSourcesByCountry,
        },
      ),
    enabled: !!(city || state || country),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const refresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.pollutionSources.byCity(city) }),
      qc.invalidateQueries({ queryKey: queryKeys.pollutionSources.byState(state) }),
      qc.invalidateQueries({ queryKey: queryKeys.pollutionSources.byCountry(country) }),
    ])
  }, [qc, city, state, country])

  return {
    sources: sourcesQuery.data?.data ?? [],
    isLoading: sourcesQuery.isLoading,
    error: sourcesQuery.error?.message ?? null,
    isOffline,
    scope: sourcesQuery.data?.scope ?? "none",
    refresh,
  }
}
