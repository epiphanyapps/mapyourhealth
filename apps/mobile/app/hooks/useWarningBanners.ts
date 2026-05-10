import { useCallback, useEffect, useMemo, useState } from "react"

import type { AmplifyWarningBanner } from "@/services/amplify/data"
import {
  getWarningBanners,
  getWarningBannersByCity,
  getWarningBannersByCountry,
  getWarningBannersByState,
} from "@/services/amplify/data"

interface UseWarningBannersOptions {
  /** City to filter banners for */
  city?: string
  /** State/province to filter banners for */
  state?: string
  /** Country to filter banners for */
  country?: string
}

interface UseWarningBannersResult {
  /** Filtered active banners for the given location */
  banners: AmplifyWarningBanner[]
  /** Whether banners are currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Refresh banners */
  refresh: () => Promise<void>
}

/**
 * Hook to fetch and filter active warning banners for a user's location.
 *
 * Fan-out fetch (EPI-22): runs up to four parallel queries — by city, by
 * state, by country (each via the byCity/byState/byCountry GSI), plus a
 * list scan that picks up globally-scoped banners (no GSI yet exists for
 * the all-null scope). Results are unioned by `id`, then a JS filter
 * enforces isActive, time-window, and case-insensitive cross-field
 * consistency: a banner with non-null city must match the user's city,
 * non-null state must match the user's state, etc.
 *
 * The GSI lookups are case-sensitive against DDB. If admin-entered data
 * has inconsistent casing, banners can be missed by the GSI and only
 * recovered via the bounded list scan — normalize at the admin layer
 * when this matters at scale.
 */
export function useWarningBanners(options: UseWarningBannersOptions): UseWarningBannersResult {
  const { city, state, country } = options
  const [allBanners, setAllBanners] = useState<AmplifyWarningBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBanners = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const empty: AmplifyWarningBanner[] = []
      const [cityRows, stateRows, countryRows, scanRows] = await Promise.all([
        city ? getWarningBannersByCity(city) : Promise.resolve(empty),
        state ? getWarningBannersByState(state) : Promise.resolve(empty),
        country ? getWarningBannersByCountry(country) : Promise.resolve(empty),
        getWarningBanners(),
      ])
      const byId = new Map<string, AmplifyWarningBanner>()
      for (const banner of [...cityRows, ...stateRows, ...countryRows, ...scanRows]) {
        byId.set(banner.id, banner)
      }
      setAllBanners(Array.from(byId.values()))
    } catch (err) {
      console.error("Error fetching warning banners:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch warning banners")
    } finally {
      setIsLoading(false)
    }
  }, [city, state, country])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  const banners = useMemo(() => {
    const now = new Date()

    return allBanners.filter((banner) => {
      // Must be active
      if (!banner.isActive) return false

      // Must have started
      if (new Date(banner.startsAt) > now) return false

      // Must not have expired
      if (banner.expiresAt && new Date(banner.expiresAt) <= now) return false

      // Location matching: global banners (no location fields) always show
      const isGlobal = !banner.city && !banner.state && !banner.country
      if (isGlobal) return true

      // Check location match
      const cityMatch = !banner.city || banner.city.toLowerCase() === city?.toLowerCase()
      const stateMatch = !banner.state || banner.state.toLowerCase() === state?.toLowerCase()
      const countryMatch =
        !banner.country || banner.country.toLowerCase() === country?.toLowerCase()

      return cityMatch && stateMatch && countryMatch
    })
  }, [allBanners, city, state, country])

  return { banners, isLoading, error, refresh: fetchBanners }
}
