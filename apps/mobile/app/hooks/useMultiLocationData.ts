/**
 * useMultiLocationData Hook
 *
 * Fetches and aggregates water quality data for multiple postal codes via React Query.
 * Takes the worst-case value for each contaminant across all locations.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { useContaminants } from "@/context/ContaminantsContext"
import { type ZipCodeData, type ZipCodeStat, type StatStatus } from "@/data/types/safety"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { queryKeys } from "@/lib/queryKeys"
import { getLocationMeasurements, AmplifyLocationMeasurement } from "@/services/amplify/data"
import { getJurisdictionForPostalCode } from "@/utils/jurisdiction"
import { detectPostalCodeRegion } from "@/utils/postalCode"

interface UseMultiLocationDataResult {
  /** The aggregated zip code data, or null if loading/error */
  zipData: ZipCodeData | null
  /** Whether data is currently being fetched */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether the device is offline */
  isOffline: boolean
  /** Refresh data from the backend */
  refresh: () => Promise<void>
}

interface SelectedCity {
  city: string
  state: string
  postalCodes: string[]
}

/**
 * Get the worse status between two
 */
function getWorseStatus(a: StatStatus, b: StatStatus): StatStatus {
  const priority = { danger: 3, warning: 2, safe: 1 }
  return priority[a] >= priority[b] ? a : b
}

/**
 * Hook to fetch and aggregate safety data for multiple postal codes
 */
export function useMultiLocationData(
  selectedCity: SelectedCity | null,
): UseMultiLocationDataResult {
  const { contaminants, getThreshold, isLoading: defsLoading } = useContaminants()
  const { isOffline, isReady: networkReady } = useNetworkStatus()
  const qc = useQueryClient()

  const calculateStatus = useCallback(
    (value: number, contaminantId: string, jurisdictionCode: string): StatStatus => {
      const contaminant = contaminants.find((c) => c.id === contaminantId)
      const threshold = getThreshold(contaminantId, jurisdictionCode)
      const higherIsBad = contaminant?.higherIsBad ?? true

      if (!threshold || threshold.limitValue === null) return "safe"

      const limit = threshold.limitValue
      const warningRatio = threshold.warningRatio ?? 0.8
      const warningThreshold = limit * warningRatio

      if (higherIsBad) {
        if (value >= limit) return "danger"
        if (value >= warningThreshold) return "warning"
      } else {
        if (value <= limit) return "danger"
        if (value <= warningThreshold) return "warning"
      }
      return "safe"
    },
    [contaminants, getThreshold],
  )

  const aggregateMeasurements = useCallback(
    (
      allMeasurements: { postalCode: string; measurements: AmplifyLocationMeasurement[] }[],
      jurisdictionCode: string,
    ): ZipCodeStat[] => {
      const byContaminant = new Map<
        string,
        { value: number; measuredAt: string; status: StatStatus }
      >()

      for (const { measurements } of allMeasurements) {
        for (const m of measurements) {
          const contaminant = contaminants.find((c) => c.id === m.contaminantId)
          const higherIsBad = contaminant?.higherIsBad ?? true
          const status = calculateStatus(m.value, m.contaminantId, jurisdictionCode)

          const existing = byContaminant.get(m.contaminantId)

          if (!existing) {
            byContaminant.set(m.contaminantId, {
              value: m.value,
              measuredAt: m.measuredAt ?? new Date().toISOString(),
              status,
            })
          } else {
            const shouldReplace = higherIsBad ? m.value > existing.value : m.value < existing.value

            if (shouldReplace) {
              byContaminant.set(m.contaminantId, {
                value: m.value,
                measuredAt: m.measuredAt ?? new Date().toISOString(),
                status,
              })
            } else {
              existing.status = getWorseStatus(existing.status, status)
            }
          }
        }
      }

      return Array.from(byContaminant.entries()).map(([contaminantId, data]) => ({
        statId: contaminantId,
        value: data.value,
        status: data.status,
        lastUpdated: data.measuredAt,
      }))
    },
    [contaminants, calculateStatus],
  )

  const postalCodes = selectedCity?.postalCodes ?? []

  const query = useQuery({
    queryKey: queryKeys.measurements.multiLocation(postalCodes),
    queryFn: async (): Promise<ZipCodeData | null> => {
      if (!selectedCity || postalCodes.length === 0) return null

      if (isOffline) {
        throw new Error("You're offline - cannot fetch city data")
      }

      // Fetch measurements for all postal codes in parallel
      const allMeasurements = await Promise.all(
        postalCodes.map(async (postalCode) => {
          const measurements = await getLocationMeasurements(postalCode)
          return { postalCode, measurements }
        }),
      )

      const totalMeasurements = allMeasurements.reduce(
        (sum, { measurements }) => sum + measurements.length,
        0,
      )

      if (totalMeasurements === 0) return null

      const firstPostalCode = postalCodes[0]
      const country = detectPostalCodeRegion(firstPostalCode) || "US"
      const jurisdictionCode = getJurisdictionForPostalCode(
        firstPostalCode,
        selectedCity.state,
        country,
      )

      const aggregatedStats = aggregateMeasurements(allMeasurements, jurisdictionCode)

      return {
        zipCode: postalCodes.join(", "),
        cityName: selectedCity.city,
        state: selectedCity.state,
        stats: aggregatedStats,
      }
    },
    enabled: !!selectedCity && postalCodes.length > 0 && !defsLoading && !isOffline,
  })

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.measurements.multiLocation(postalCodes) })
  }, [qc, postalCodes])

  return {
    zipData: query.data ?? null,
    isLoading: query.isLoading || defsLoading || !networkReady,
    error: query.error?.message ?? null,
    isOffline,
    refresh,
  }
}
