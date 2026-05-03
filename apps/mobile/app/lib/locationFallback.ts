/**
 * Location-hierarchy cascading fallback (#123).
 *
 * Resolves data city → state → country, returning the first non-empty result
 * along with a `scope` label so callers can render provenance ("Showing
 * Quebec province data" rather than pretending Sorel-Tracy has its own row).
 *
 * Used by every location-scoped hook that supports cascading:
 *   - useLocationData (LocationMeasurement)
 *   - usePollutionSources (PollutionSource)
 *   - useLocationObservations (LocationObservation)
 *
 * Convention: a fetcher returning [] means "no data at this scope"; the
 * util walks down to the next level. A fetcher rejecting bubbles up — we
 * do not silently swallow errors mid-cascade.
 */

/** Which level of the hierarchy resolved the data. */
export type LocationScope = "city" | "state" | "country" | "none"

export interface LocationFallbackResult<T> {
  /** Records returned from whichever scope had data. */
  data: T[]
  /** Where the data came from. "none" when every scope was empty. */
  scope: LocationScope
}

export interface LocationFallbackInput {
  city: string
  state: string
  country: string
}

export interface LocationFallbackFetchers<T> {
  /** Optional city-scope fetcher. Skipped when omitted or city is empty. */
  byCity?: (city: string) => Promise<T[]>
  /** Optional state-scope fetcher. Skipped when omitted or state is empty. */
  byState?: (state: string) => Promise<T[]>
  /** Optional country-scope fetcher. Skipped when omitted or country is empty. */
  byCountry?: (country: string) => Promise<T[]>
}

/**
 * Cascade through the location hierarchy until a fetcher returns non-empty.
 *
 * Returns `scope: "none"` and `data: []` when every level is empty (or every
 * level is skipped because the input/fetcher is missing). Errors are not
 * swallowed — a thrown fetcher aborts the cascade.
 */
export async function fetchWithLocationFallback<T>(
  location: LocationFallbackInput,
  fetchers: LocationFallbackFetchers<T>,
): Promise<LocationFallbackResult<T>> {
  const { city, state, country } = location

  if (city && fetchers.byCity) {
    const cityData = await fetchers.byCity(city)
    if (cityData.length > 0) {
      return { data: cityData, scope: "city" }
    }
  }

  if (state && fetchers.byState) {
    const stateData = await fetchers.byState(state)
    if (stateData.length > 0) {
      return { data: stateData, scope: "state" }
    }
  }

  if (country && fetchers.byCountry) {
    const countryData = await fetchers.byCountry(country)
    if (countryData.length > 0) {
      return { data: countryData, scope: "country" }
    }
  }

  return { data: [], scope: "none" }
}

/** Human-readable label for a scope. Used by provenance UI. */
export function describeScope(
  scope: LocationScope,
  location: { state?: string; country?: string },
): string | null {
  switch (scope) {
    case "city":
      return null // Default — no badge needed.
    case "state":
      return location.state ? `Showing ${location.state} data` : "Showing state-level data"
    case "country":
      return location.country ? `Showing ${location.country} data` : "Showing country-level data"
    case "none":
      return null
  }
}
