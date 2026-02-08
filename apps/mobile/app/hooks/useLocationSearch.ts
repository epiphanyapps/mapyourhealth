/**
 * useLocationSearch Hook
 *
 * Provides city/state/postal code search with autocomplete suggestions.
 * Fetches all locations once on mount and performs client-side filtering.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react"

import { SearchSuggestion } from "@/data/types/safety"
import { getAllLocations, AmplifyLocation } from "@/services/amplify/data"
import { isValidPostalCode, normalizePostalCode } from "@/utils/postalCode"

/** Debounce delay for search in milliseconds */
const SEARCH_DEBOUNCE_MS = 300

/** Minimum query length to trigger search */
const MIN_QUERY_LENGTH = 2

/** Maximum number of suggestions to show */
const MAX_SUGGESTIONS = 10

interface GroupedLocation {
  city: string
  state: string
  country: string
  postalCodes: string[]
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
  const [locations, setLocations] = useState<AmplifyLocation[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load all locations on mount
  useEffect(() => {
    let mounted = true

    async function loadLocations() {
      try {
        setIsLoading(true)
        setError(null)
        const allLocations = await getAllLocations()
        if (mounted) {
          setLocations(allLocations)
        }
      } catch (err) {
        console.error("Failed to load locations for search:", err)
        if (mounted) {
          setError("Failed to load search data")
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadLocations()

    return () => {
      mounted = false
    }
  }, [])

  // Group locations by city and state for efficient lookup
  const groupedByCityState = useMemo(() => {
    const groups = new Map<string, GroupedLocation>()

    for (const loc of locations) {
      if (!loc.city || !loc.state) continue

      const key = `${loc.city.toLowerCase()}|${loc.state.toLowerCase()}`
      const existing = groups.get(key)

      if (existing) {
        existing.postalCodes.push(loc.postalCode)
      } else {
        groups.set(key, {
          city: loc.city,
          state: loc.state,
          country: loc.country || "US",
          postalCodes: [loc.postalCode],
        })
      }
    }

    return Array.from(groups.values())
  }, [locations])

  // Group locations by state only
  const groupedByState = useMemo(() => {
    const groups = new Map<string, { state: string; country: string; postalCodes: string[] }>()

    for (const loc of locations) {
      if (!loc.state) continue

      const key = loc.state.toLowerCase()
      const existing = groups.get(key)

      if (existing) {
        existing.postalCodes.push(loc.postalCode)
      } else {
        groups.set(key, {
          state: loc.state,
          country: loc.country || "US",
          postalCodes: [loc.postalCode],
        })
      }
    }

    return Array.from(groups.values())
  }, [locations])

  // Perform the actual search
  const performSearch = useCallback(
    (query: string) => {
      const trimmedQuery = query.trim()

      // Clear suggestions for empty or too short queries
      if (trimmedQuery.length < MIN_QUERY_LENGTH) {
        setSuggestions([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      const results: SearchSuggestion[] = []
      const queryLower = trimmedQuery.toLowerCase()

      // Check if query is a valid postal code
      if (isValidPostalCode(trimmedQuery)) {
        const normalized = normalizePostalCode(trimmedQuery)
        const matchingLocation = locations.find(
          (loc) => loc.postalCode.toUpperCase() === normalized.toUpperCase(),
        )

        if (matchingLocation) {
          results.push({
            type: "postalCode",
            displayText:
              matchingLocation.city && matchingLocation.state
                ? `${matchingLocation.postalCode} - ${matchingLocation.city}, ${matchingLocation.state}`
                : matchingLocation.postalCode,
            secondaryText: "Postal code",
            postalCodes: [matchingLocation.postalCode],
            city: matchingLocation.city ?? undefined,
            state: matchingLocation.state ?? undefined,
            country: matchingLocation.country ?? "US",
          })
        } else {
          // Even if not in our DB, still suggest as a postal code search
          results.push({
            type: "postalCode",
            displayText: normalized,
            secondaryText: "Search postal code",
            postalCodes: [normalized],
          })
        }
      }

      // Search cities (partial match at start of city name)
      const matchingCities = groupedByCityState.filter((group) =>
        group.city.toLowerCase().startsWith(queryLower),
      )

      // Sort by relevance (exact matches first, then by location count)
      matchingCities.sort((a, b) => {
        const aExact = a.city.toLowerCase() === queryLower
        const bExact = b.city.toLowerCase() === queryLower
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return b.postalCodes.length - a.postalCodes.length
      })

      for (const city of matchingCities.slice(0, MAX_SUGGESTIONS - results.length)) {
        const locationCount = city.postalCodes.length
        results.push({
          type: "city",
          displayText: `${city.city}, ${city.state}`,
          secondaryText: locationCount === 1 ? "1 location" : `${locationCount} locations`,
          postalCodes: city.postalCodes,
          city: city.city,
          state: city.state,
          country: city.country,
        })
      }

      // Search states (if we have room for more suggestions)
      if (results.length < MAX_SUGGESTIONS) {
        const matchingStates = groupedByState.filter(
          (group) =>
            group.state.toLowerCase().startsWith(queryLower) ||
            group.state.toLowerCase() === queryLower,
        )

        // Sort by exact match first, then by location count
        matchingStates.sort((a, b) => {
          const aExact = a.state.toLowerCase() === queryLower
          const bExact = b.state.toLowerCase() === queryLower
          if (aExact && !bExact) return -1
          if (!aExact && bExact) return 1
          return b.postalCodes.length - a.postalCodes.length
        })

        for (const state of matchingStates.slice(0, MAX_SUGGESTIONS - results.length)) {
          // Skip if we already have a city suggestion from this state
          const alreadyHasStateCity = results.some(
            (r) => r.type === "city" && r.state === state.state,
          )
          if (alreadyHasStateCity) continue

          const locationCount = state.postalCodes.length
          results.push({
            type: "state",
            displayText: state.state,
            secondaryText: locationCount === 1 ? "1 location" : `${locationCount} locations`,
            postalCodes: state.postalCodes,
            state: state.state,
            country: state.country,
          })
        }
      }

      setSuggestions(results.slice(0, MAX_SUGGESTIONS))
      setIsSearching(false)
    },
    [locations, groupedByCityState, groupedByState],
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
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // Cleanup timeout on unmount
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
  }
}
