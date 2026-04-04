/**
 * usePollutionSources Hook
 *
 * Fetches pollution sources for a location (by city, with state fallback).
 */

import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { queryKeys } from "@/lib/queryKeys"
import {
  getPollutionSourcesByCity,
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
  /** Refresh data */
  refresh: () => Promise<void>
}

interface LocationParams {
  city: string
  state: string
}

/**
 * Hook to fetch pollution sources for a location
 */
export function usePollutionSources(params: LocationParams): UsePollutionSourcesResult {
  const { city, state } = params
  const { isOffline } = useNetworkStatus()
  const qc = useQueryClient()

  const sourcesQuery = useQuery({
    queryKey: queryKeys.pollutionSources.byCity(city),
    queryFn: async () => {
      const citySources = await getPollutionSourcesByCity(city)
      if (citySources.length > 0) return citySources

      // Fallback to state-level sources
      const stateSources = await getPollutionSourcesByState(state)
      return stateSources
    },
    enabled: !!city && !!state,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const refresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.pollutionSources.byCity(city) }),
      qc.invalidateQueries({ queryKey: queryKeys.pollutionSources.byState(state) }),
    ])
  }, [qc, city, state])

  return {
    sources: sourcesQuery.data ?? [],
    isLoading: sourcesQuery.isLoading,
    error: sourcesQuery.error?.message ?? null,
    isOffline,
    refresh,
  }
}
