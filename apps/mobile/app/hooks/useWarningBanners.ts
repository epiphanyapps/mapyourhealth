import { useCallback, useEffect, useMemo, useState } from "react"

import type { AmplifyWarningBanner } from "@/services/amplify/data"
import { getWarningBanners } from "@/services/amplify/data"

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
 * Filters by:
 * - isActive === true
 * - startsAt <= now
 * - expiresAt is null OR expiresAt > now
 * - Location match: banners with null location fields (global) + banners matching user's city/state/country
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
      const data = await getWarningBanners()
      setAllBanners(data)
    } catch (err) {
      console.error("Error fetching warning banners:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch warning banners")
    } finally {
      setIsLoading(false)
    }
  }, [])

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
      const countryMatch = !banner.country || banner.country.toLowerCase() === country?.toLowerCase()

      return cityMatch && stateMatch && countryMatch
    })
  }, [allBanners, city, state, country])

  return { banners, isLoading, error, refresh: fetchBanners }
}
