/**
 * usePollutionSources — cascade-aware fetcher for the PollutionSource model.
 *
 * Mirrors the shape of useLocationData but for a different table:
 *   - Cascade walks city → state → country and returns the first non-empty
 *     scope. The `getRowAnchor` extractor restricts state-fallback results
 *     to rows with no city (state-anchored sources) and country-fallback
 *     results to rows with no city AND no state, so a Montreal user never
 *     sees Sorel-Tracy-pinned sources via a QC fallback (the same EPI-17 /
 *     EPI-18 cross-city bleed fix the canonical hook applies).
 *   - React Query is keyed on the full (city, state, country) triple so
 *     cascades sharing a state/country don't collide.
 *   - No MMKV offline cache: PollutionSource data is admin-curated, low
 *     volume, and not time-critical. Fetch-on-demand is fine.
 *
 * Returns the matched sources, a scope label for the LocationScopeBadge
 * provenance UI, and a `refresh` that invalidates every PollutionSource
 * query so sibling cities sharing the same state/country source also
 * refetch (mirrors useLocationData's invalidation strategy).
 */

import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchWithLocationFallback, type LocationScope } from "@/lib/locationFallback"
import { queryKeys } from "@/lib/queryKeys"
import {
  getPollutionSourcesByCity,
  getPollutionSourcesByState,
  getPollutionSourcesByCountry,
  type AmplifyPollutionSource,
} from "@/services/amplify/data"

export interface UsePollutionSourcesResult {
  /** Sources resolved by cascade (may be empty if every scope was empty). */
  sources: AmplifyPollutionSource[]
  /** Whether the query is still resolving. */
  isLoading: boolean
  /** Error message if the cascade failed (any single fetcher throwing aborts). */
  error: string | null
  /** Which level of the hierarchy resolved the data. "none" = no rows anywhere. */
  scope: LocationScope
  /** Invalidate every PollutionSource query so cross-city caches refetch. */
  refresh: () => Promise<void>
}

export function usePollutionSources(
  city: string,
  state: string,
  country: string,
): UsePollutionSourcesResult {
  const qc = useQueryClient()

  const queryFn = useCallback(async () => {
    const { data, scope } = await fetchWithLocationFallback(
      { city, state, country },
      {
        byCity: getPollutionSourcesByCity,
        byState: getPollutionSourcesByState,
        byCountry: getPollutionSourcesByCountry,
        getRowAnchor: (s) => ({ city: s.city, state: s.state }),
      },
    )
    return { sources: data, scope }
  }, [city, state, country])

  const query = useQuery({
    queryKey: queryKeys.pollutionSources.byLocation(city, state, country),
    queryFn,
    // Gated on country — a search with no country isn't worth firing.
    enabled: !!country,
    staleTime: 5 * 60 * 1000,
  })

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.pollutionSources.all })
  }, [qc])

  return {
    sources: query.data?.sources ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    scope: query.data?.scope ?? "none",
    refresh,
  }
}
