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
 *
 * Anchor-only fallback (EPI-17 / EPI-18): the by-state and by-country
 * AppSync GSIs return every row matching the partition key, regardless of
 * whether other location fields are populated. Without filtering, a
 * by-state fallback for QC returns Sorel-Tracy-anchored rows for any QC
 * sibling city — so a Montreal user sees Sorel-Tracy data. The util now
 * accepts a `getRowAnchor` extractor that, when provided, restricts
 * by-state results to rows with `city == null` and by-country results to
 * rows with `city == null && state == null`. Callers that do not pass an
 * extractor keep the legacy unfiltered behavior (used by tests that mock
 * rows without anchor fields).
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

/** Anchor fields used to decide whether a row should pass through a
 *  state- or country-level cascade fallback. A row is "state-anchored"
 *  when its city is null/empty; "country-anchored" when both city and
 *  state are null/empty. */
export interface RowAnchor {
  city?: string | null
  state?: string | null
}

export interface LocationFallbackFetchers<T> {
  /** Optional city-scope fetcher. Skipped when omitted or city is empty. */
  byCity?: (city: string) => Promise<T[]>
  /** Optional state-scope fetcher. Skipped when omitted or state is empty. */
  byState?: (state: string) => Promise<T[]>
  /** Optional country-scope fetcher. Skipped when omitted or country is empty. */
  byCountry?: (country: string) => Promise<T[]>
  /** Extracts {city, state} from a row. When provided, by-state results
   *  are filtered to rows with no city (state-anchored) and by-country
   *  results to rows with no city and no state (country-anchored).
   *  Required to fix EPI-17 / EPI-18 cross-city bleed; optional to
   *  preserve back-compat with tests that mock rows without anchor
   *  fields. */
  getRowAnchor?: (row: T) => RowAnchor
}

/** Whether a row is anchored at the state level (no city set). */
function isStateAnchored<T>(row: T, getRowAnchor: (row: T) => RowAnchor): boolean {
  const anchor = getRowAnchor(row)
  return !anchor.city
}

/** Whether a row is anchored at the country level (no city, no state). */
function isCountryAnchored<T>(row: T, getRowAnchor: (row: T) => RowAnchor): boolean {
  const anchor = getRowAnchor(row)
  return !anchor.city && !anchor.state
}

/**
 * Cascade through the location hierarchy until a fetcher returns non-empty
 * **anchored** rows.
 *
 * Returns `scope: "none"` and `data: []` when every level is empty (or every
 * level is skipped because the input/fetcher is missing). Errors are not
 * swallowed — a thrown fetcher aborts the cascade.
 *
 * When `getRowAnchor` is provided, by-state results are filtered to rows
 * with no `city` (state-anchored) and by-country results to rows with no
 * `city` and no `state` (country-anchored). If a level returns rows but
 * all of them are bound to a more-specific location (i.e. another sibling
 * city's data leaking through the GSI), the cascade falls through to the
 * next level rather than surfacing those leaked rows.
 */
export async function fetchWithLocationFallback<T>(
  location: LocationFallbackInput,
  fetchers: LocationFallbackFetchers<T>,
): Promise<LocationFallbackResult<T>> {
  const { city, state, country } = location
  const { byCity, byState, byCountry, getRowAnchor } = fetchers

  if (city && byCity) {
    const cityData = await byCity(city)
    if (cityData.length > 0) {
      return { data: cityData, scope: "city" }
    }
  }

  if (state && byState) {
    const stateData = await byState(state)
    const anchored = getRowAnchor
      ? stateData.filter((row) => isStateAnchored(row, getRowAnchor))
      : stateData
    if (anchored.length > 0) {
      return { data: anchored, scope: "state" }
    }
  }

  if (country && byCountry) {
    const countryData = await byCountry(country)
    const anchored = getRowAnchor
      ? countryData.filter((row) => isCountryAnchored(row, getRowAnchor))
      : countryData
    if (anchored.length > 0) {
      return { data: anchored, scope: "country" }
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
