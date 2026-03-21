/**
 * useLocationSearch Hook
 *
 * Provides location search with autocomplete suggestions powered by Google Places API.
 * All queries are routed through the backend proxy to keep API keys secure.
 * When a location is selected, it is resolved via the resolveLocation mutation which:
 * - Extracts city/state/country from Google Places address_components
 * - Auto-assigns jurisdiction from the Jurisdiction table
 * - Caches the location in DynamoDB
 * - Checks data availability
 */

import { useState, useCallback, useRef, useEffect } from "react"

import { SearchSuggestion } from "@/data/types/safety"
import {
  getPlacesAutocomplete,
  resolveLocationByPlaceId,
  ResolveLocationResponse,
} from "@/services/amplify/data"

/** Debounce delay for search in milliseconds */
const SEARCH_DEBOUNCE_MS = 300

/** Minimum query length to trigger search */
const MIN_QUERY_LENGTH = 2

/** Maximum number of suggestions to show */
const MAX_SUGGESTIONS = 10

/** Timeout for network requests in milliseconds */
const FETCH_TIMEOUT_MS = 10000

/** Generate a unique session token for Google Places API billing optimization */
function generateSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export interface ResolvedLocation {
  city: string
  state: string
  country: string
  county?: string | null
  jurisdictionCode: string
  hasData: boolean
  isNew: boolean
}

interface UseLocationSearchResult {
  /** Current search suggestions */
  suggestions: SearchSuggestion[]
  /** Whether a search is in progress */
  isSearching: boolean
  /** Whether locations are still loading (kept for backward compat, always false) */
  isLoading: boolean
  /** Error message if search failed */
  error: string | null
  /** Trigger a search with the given query */
  search: (query: string) => void
  /** Clear all suggestions */
  clearSuggestions: () => void
  /** Resolve a Google Places placeId to a location with jurisdiction and data availability */
  resolvePlace: (placeId: string) => Promise<ResolvedLocation | null>
  /**
   * @deprecated No longer supported — Google Places is the primary search.
   * Returns empty array for backward compatibility.
   */
  getCitiesForState: (stateCode: string) => SearchSuggestion[]
  /**
   * @deprecated Use resolvePlace instead.
   * Kept for backward compatibility — delegates to resolvePlace internally.
   */
  resolveAddressToNearestCity: (placeId: string) => Promise<{
    city: string
    state: string
    country: string
    county?: string
    distanceKm: number
    actualCity?: string
    actualState?: string
    actualCountry?: string
  } | null>
}

/**
 * Hook to search locations with Google Places autocomplete
 *
 * @returns Search state and functions
 *
 * @example
 * const { suggestions, isSearching, search, clearSuggestions, resolvePlace } = useLocationSearch()
 *
 * // On text change
 * search(text)
 *
 * // On selection
 * const resolved = await resolvePlace(suggestion.placeId)
 */
export function useLocationSearch(): UseLocationSearchResult {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionTokenRef = useRef<string>(generateSessionToken())
  // Track request ID to ignore stale errors from previous searches
  const searchRequestIdRef = useRef<number>(0)

  // Fetch Google Places autocomplete suggestions via backend proxy
  const fetchPlacesSuggestions = useCallback(
    async (query: string, requestId: number): Promise<SearchSuggestion[]> => {
      console.log("[Places] Fetching via backend proxy, requestId:", requestId)

      try {
        const data = await Promise.race([
          getPlacesAutocomplete(query, sessionTokenRef.current),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), FETCH_TIMEOUT_MS),
          ),
        ])
        console.log(
          "[Places] Response status:",
          data.status,
          "predictions:",
          data.predictions?.length,
          "cached:",
          data.cached,
        )

        if (data.status !== "OK" || !data.predictions) return []

        return data.predictions.slice(0, MAX_SUGGESTIONS).map((prediction) => ({
          type: "address" as const,
          displayText: prediction.main_text || prediction.description,
          secondaryText: prediction.secondary_text || "",
          placeId: prediction.place_id,
        }))
      } catch (err) {
        console.error("[Places] Error:", err)
        if (err instanceof Error && err.message === "timeout") {
          if (requestId === searchRequestIdRef.current) {
            setSearchError("Search is taking too long. Please try again.")
          }
        }
        return []
      }
    },
    [],
  )

  // Perform the search — Google Places is the primary (and only) search mechanism
  const performSearch = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim()

      // Clear suggestions for empty or too short queries
      if (trimmedQuery.length < MIN_QUERY_LENGTH) {
        setSuggestions([])
        setIsSearching(false)
        return
      }

      // Increment request ID to track stale requests
      searchRequestIdRef.current += 1
      const currentRequestId = searchRequestIdRef.current

      setIsSearching(true)
      setSearchError(null)

      try {
        const results = await fetchPlacesSuggestions(trimmedQuery, currentRequestId)

        // Only update if this is still the current request
        if (currentRequestId === searchRequestIdRef.current) {
          setSuggestions(results)
        }
      } finally {
        if (currentRequestId === searchRequestIdRef.current) {
          setIsSearching(false)
        }
      }
    },
    [fetchPlacesSuggestions],
  )

  // Debounced search function
  const search = useCallback(
    (query: string) => {
      // Clear any pending search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // If query is empty, clear immediately
      if (!query.trim()) {
        setSuggestions([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      // Debounce the actual search
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query)
      }, SEARCH_DEBOUNCE_MS)
    },
    [performSearch],
  )

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setIsSearching(false)
    setSearchError(null)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // Resolve a Google Places placeId via the resolveLocation mutation
  const resolvePlace = useCallback(async (placeId: string): Promise<ResolvedLocation | null> => {
    try {
      const result: ResolveLocationResponse = await resolveLocationByPlaceId(
        placeId,
        sessionTokenRef.current,
      )

      // Regenerate session token after completing a search session
      sessionTokenRef.current = generateSessionToken()

      if (result.error || !result.city || !result.state || !result.country) {
        console.error("[Places] Error resolving location:", result.error)
        return null
      }

      return {
        city: result.city,
        state: result.state,
        country: result.country,
        county: result.county,
        jurisdictionCode: result.jurisdictionCode,
        hasData: result.hasData,
        isNew: result.isNew,
      }
    } catch (error) {
      console.error("[Places] Error resolving place:", error)
      return null
    }
  }, [])

  // Backward-compatible wrapper: delegates to resolvePlace
  const resolveAddressToNearestCity = useCallback(
    async (placeId: string) => {
      const resolved = await resolvePlace(placeId)
      if (!resolved) return null

      return {
        city: resolved.city,
        state: resolved.state,
        country: resolved.country,
        county: resolved.county ?? undefined,
        distanceKm: 0,
        actualCity: resolved.city,
        actualState: resolved.state,
        actualCountry: resolved.country,
      }
    },
    [resolvePlace],
  )

  // Deprecated: no longer have a static list to drill into
  const getCitiesForState = useCallback((): SearchSuggestion[] => {
    return []
  }, [])

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return {
    suggestions,
    isSearching,
    isLoading: false,
    error: searchError,
    search,
    clearSuggestions,
    resolvePlace,
    resolveAddressToNearestCity,
    getCitiesForState,
  }
}
