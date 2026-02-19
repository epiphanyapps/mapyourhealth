/**
 * useLocationSearch Hook
 *
 * Provides city/state/county search with autocomplete suggestions.
 * Uses React Query to fetch all locations once on mount, then performs client-side filtering.
 * Google Places autocomplete is proxied through the backend to keep API keys secure.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

import { SearchSuggestion } from "@/data/types/safety"
import { queryKeys } from "@/lib/queryKeys"
import {
  getAllLocations,
  AmplifyLocation,
  getPlacesAutocomplete,
  getPlaceDetails,
} from "@/services/amplify/data"

/** Debounce delay for search in milliseconds */
const SEARCH_DEBOUNCE_MS = 300

/** Minimum query length to trigger search */
const MIN_QUERY_LENGTH = 2

/** Maximum number of suggestions to show */
const MAX_SUGGESTIONS = 10

/** Timeout for network requests in milliseconds */
const FETCH_TIMEOUT_MS = 10000

/** Haversine distance in km between two lat/lng points */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** Check if a query looks like an address (contains numbers or is long-ish) */
function looksLikeAddress(query: string): boolean {
  return /\d/.test(query) || query.length > 20
}

/** Generate a unique session token for Google Places API billing optimization */
function generateSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

interface GroupedLocation {
  city: string
  state: string
  country: string
  county?: string
}

interface NearestCityResult {
  city: string
  state: string
  country: string
  county?: string
  distanceKm: number
}

interface UseLocationSearchResult {
  /** Current search suggestions */
  suggestions: SearchSuggestion[]
  /** Whether a search is in progress */
  isSearching: boolean
  /** Whether locations are still loading */
  isLoading: boolean
  /** Error message if locations failed to load */
  error: string | null
  /** Trigger a search with the given query */
  search: (query: string) => void
  /** Clear all suggestions */
  clearSuggestions: () => void
  /** Resolve a Google Places suggestion to the nearest city in our database */
  resolveAddressToNearestCity: (placeId: string) => Promise<NearestCityResult | null>
}

/**
 * Hook to search locations with autocomplete
 *
 * @returns Search state and functions
 *
 * @example
 * const { suggestions, isSearching, search, clearSuggestions } = useLocationSearch()
 *
 * // On text change
 * search(text)
 *
 * // On selection
 * clearSuggestions()
 */
export function useLocationSearch(): UseLocationSearchResult {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionTokenRef = useRef<string>(generateSessionToken())

  // Fetch all locations with React Query (cached globally)
  const {
    data: locations = [],
    isLoading,
    error: queryError,
  } = useQuery<AmplifyLocation[], Error>({
    queryKey: queryKeys.locations.list(),
    queryFn: getAllLocations,
    staleTime: 60 * 60 * 1000, // 1 hour - locations rarely change
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24h
  })

  const error = searchError ?? (queryError ? "Failed to load search data" : null)

  // Group locations by city and state for efficient lookup
  const groupedByCityState = useMemo(() => {
    const groups = new Map<string, GroupedLocation>()

    for (const loc of locations) {
      if (!loc.city || !loc.state) continue

      const key = `${loc.city.toLowerCase()}|${loc.state.toLowerCase()}`
      if (!groups.has(key)) {
        groups.set(key, {
          city: loc.city,
          state: loc.state,
          country: loc.country || "US",
          county: (loc as any).county ?? undefined,
        })
      }
    }

    return Array.from(groups.values())
  }, [locations])

  // Group locations by state only
  const groupedByState = useMemo(() => {
    const groups = new Map<string, { state: string; country: string }>()

    for (const loc of locations) {
      if (!loc.state) continue

      const key = loc.state.toLowerCase()
      if (!groups.has(key)) {
        groups.set(key, {
          state: loc.state,
          country: loc.country || "US",
        })
      }
    }

    return Array.from(groups.values())
  }, [locations])

  // Find the nearest city in our database to a given lat/lng
  const findNearestCity = useCallback(
    (lat: number, lng: number): NearestCityResult | null => {
      let nearest: GroupedLocation | null = null
      let nearestDist = Infinity

      for (const loc of groupedByCityState) {
        // We need locations with coordinates from the raw data
        const rawLoc = locations.find(
          (l) =>
            l.city?.toLowerCase() === loc.city.toLowerCase() &&
            l.state?.toLowerCase() === loc.state.toLowerCase(),
        )
        const locLat = rawLoc?.latitude ?? (rawLoc as any)?.lat
        const locLng = rawLoc?.longitude ?? (rawLoc as any)?.lng
        if (locLat == null || locLng == null) continue

        const dist = haversineDistance(lat, lng, locLat, locLng)
        if (dist < nearestDist) {
          nearestDist = dist
          nearest = loc
        }
      }

      if (!nearest) return null
      return {
        city: nearest.city,
        state: nearest.state,
        country: nearest.country,
        county: nearest.county,
        distanceKm: nearestDist,
      }
    },
    [groupedByCityState, locations],
  )

  // Fetch Google Places autocomplete suggestions via backend proxy
  const fetchPlacesSuggestions = useCallback(async (query: string): Promise<SearchSuggestion[]> => {
    console.log("[Places] Fetching via backend proxy")

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

      return data.predictions.slice(0, 5).map((prediction) => ({
        type: "address" as const,
        displayText: prediction.main_text || prediction.description,
        secondaryText: prediction.secondary_text || "Google Places result",
        placeId: prediction.place_id,
      }))
    } catch (err) {
      console.error("[Places] Error:", err)
      if (err instanceof Error && err.message === "timeout") {
        setSearchError("Search is taking too long. Please try again.")
      }
      return []
    }
  }, [])

  // Resolve a Google Places placeId to the nearest city in our database via backend proxy
  const resolveAddressToNearestCity = useCallback(
    async (placeId: string): Promise<NearestCityResult | null> => {
      try {
        console.log("[Places] Fetching place details via backend proxy")
        const location = await getPlaceDetails(placeId, sessionTokenRef.current)

        if (!location) return null

        const { lat, lng } = location
        const nearest = findNearestCity(lat, lng)

        // Regenerate session token after completing a search session
        sessionTokenRef.current = generateSessionToken()

        return nearest
      } catch (error) {
        console.error("[Places] Error resolving address:", error)
        return null
      }
    },
    [findNearestCity],
  )

  // Perform the actual search (local + optional Google Places fallback)
  const performSearch = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim()

      // Clear suggestions for empty or too short queries
      if (trimmedQuery.length < MIN_QUERY_LENGTH) {
        setSuggestions([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      setSearchError(null)

      try {

      const results: SearchSuggestion[] = []
      const queryLower = trimmedQuery.toLowerCase()

      // Search cities (partial match at start of city name)
      const matchingCities = groupedByCityState.filter((group) =>
        group.city.toLowerCase().startsWith(queryLower),
      )

      // Sort by relevance (exact matches first, then alphabetically)
      matchingCities.sort((a, b) => {
        const aExact = a.city.toLowerCase() === queryLower
        const bExact = b.city.toLowerCase() === queryLower
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return a.city.localeCompare(b.city)
      })

      for (const city of matchingCities.slice(0, MAX_SUGGESTIONS)) {
        results.push({
          type: "city",
          displayText: `${city.city}, ${city.state}`,
          secondaryText: city.county
            ? `${city.county}, ${city.country === "CA" ? "Canada" : "United States"}`
            : city.country === "CA"
              ? "Canada"
              : "United States",
          city: city.city,
          state: city.state,
          country: city.country,
          county: city.county,
        })
      }

      // Search states (if we have room for more suggestions)
      if (results.length < MAX_SUGGESTIONS) {
        const matchingStates = groupedByState.filter(
          (group) =>
            group.state.toLowerCase().startsWith(queryLower) ||
            group.state.toLowerCase() === queryLower,
        )

        matchingStates.sort((a, b) => {
          const aExact = a.state.toLowerCase() === queryLower
          const bExact = b.state.toLowerCase() === queryLower
          if (aExact && !bExact) return -1
          if (!aExact && bExact) return 1
          return a.state.localeCompare(b.state)
        })

        for (const state of matchingStates.slice(0, MAX_SUGGESTIONS - results.length)) {
          const alreadyHasStateCity = results.some(
            (r) => r.type === "city" && r.state === state.state,
          )
          if (alreadyHasStateCity) continue

          results.push({
            type: "state",
            displayText: state.state,
            secondaryText: state.country === "CA" ? "Canada" : "United States",
            state: state.state,
            country: state.country,
          })
        }
      }

      // If few local results and query looks like an address, try Google Places
      console.log(
        "[Search] results:",
        results.length,
        "looksLikeAddress:",
        looksLikeAddress(trimmedQuery),
      )
      if (results.length < 3 && looksLikeAddress(trimmedQuery)) {
        console.log("[Search] Triggering Google Places search for:", trimmedQuery)
        const placesResults = await fetchPlacesSuggestions(trimmedQuery)
        const remaining = MAX_SUGGESTIONS - results.length
        results.push(...placesResults.slice(0, remaining))
      }

      setSuggestions(results.slice(0, MAX_SUGGESTIONS))

      } finally {
        setIsSearching(false)
      }
    },
    [groupedByCityState, groupedByState, fetchPlacesSuggestions],
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
    isLoading,
    error,
    search,
    clearSuggestions,
    resolveAddressToNearestCity,
  }
}
