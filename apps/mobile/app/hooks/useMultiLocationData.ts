/**
 * useMultiLocationData Hook
 *
 * Fetches and aggregates water quality data for multiple postal codes.
 * Takes the worst-case value for each contaminant across all locations.
 */

import { useState, useEffect, useCallback } from "react"

import {
  getLocationMeasurements,
  AmplifyLocationMeasurement,
} from "@/services/amplify/data"
import { useContaminants } from "@/context/ContaminantsContext"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import {
  type ZipCodeData,
  type ZipCodeStat,
  type StatStatus,
} from "@/data/types/safety"
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
 * Hook to fetch and aggregate safety data for multiple postal codes
 *
 * @param selectedCity - The selected city with its postal codes, or null
 * @returns Object with aggregated zipData, loading state, error, and refresh function
 *
 * @example
 * const { zipData, isLoading, error, refresh } = useMultiLocationData({
 *   city: "Montreal",
 *   state: "QC",
 *   postalCodes: ["H2X1Y6", "H3B2Y5"]
 * })
 */
export function useMultiLocationData(
  selectedCity: SelectedCity | null
): UseMultiLocationDataResult {
  const [zipData, setZipData] = useState<ZipCodeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { contaminants, getThreshold, isLoading: defsLoading } = useContaminants()
  const { isOffline, isReady: networkReady } = useNetworkStatus()

  /**
   * Calculate status based on value and threshold
   */
  const calculateStatus = useCallback(
    (
      value: number,
      contaminantId: string,
      jurisdictionCode: string
    ): StatStatus => {
      const contaminant = contaminants.find((c) => c.id === contaminantId)
      const threshold = getThreshold(contaminantId, jurisdictionCode)
      const higherIsBad = contaminant?.higherIsBad ?? true

      if (!threshold || threshold.limitValue === null) {
        return "safe"
      }

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
    [contaminants, getThreshold]
  )

  /**
   * Get the worse status between two
   */
  const getWorseStatus = (a: StatStatus, b: StatStatus): StatStatus => {
    const priority = { danger: 3, warning: 2, safe: 1 }
    return priority[a] >= priority[b] ? a : b
  }

  /**
   * Aggregate measurements from multiple locations
   * Takes the worst value for each contaminant
   */
  const aggregateMeasurements = useCallback(
    (
      allMeasurements: { postalCode: string; measurements: AmplifyLocationMeasurement[] }[],
      jurisdictionCode: string
    ): ZipCodeStat[] => {
      // Group by contaminant ID
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
            // Take the worse value (higher if higherIsBad, lower otherwise)
            const shouldReplace = higherIsBad
              ? m.value > existing.value
              : m.value < existing.value

            if (shouldReplace) {
              byContaminant.set(m.contaminantId, {
                value: m.value,
                measuredAt: m.measuredAt ?? new Date().toISOString(),
                status,
              })
            } else {
              // Keep existing value but take worse status
              existing.status = getWorseStatus(existing.status, status)
            }
          }
        }
      }

      // Convert to ZipCodeStat array
      return Array.from(byContaminant.entries()).map(([contaminantId, data]) => ({
        statId: contaminantId,
        value: data.value,
        status: data.status,
        lastUpdated: data.measuredAt,
      }))
    },
    [contaminants, calculateStatus]
  )

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!selectedCity || selectedCity.postalCodes.length === 0) {
        setZipData(null)
        setIsLoading(false)
        return
      }

      // Wait for contaminants to be loaded
      if (defsLoading) {
        return
      }

      // Can't fetch when offline
      if (isOffline) {
        setError("You're offline - cannot fetch city data")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Fetch measurements for all postal codes in parallel
        const measurementPromises = selectedCity.postalCodes.map(async (postalCode) => {
          const measurements = await getLocationMeasurements(postalCode)
          return { postalCode, measurements }
        })

        const allMeasurements = await Promise.all(measurementPromises)

        // Check if we have any data
        const totalMeasurements = allMeasurements.reduce(
          (sum, { measurements }) => sum + measurements.length,
          0
        )

        if (totalMeasurements === 0) {
          // No data for any postal code in this city
          setZipData(null)
          setError(null)
          setIsLoading(false)
          return
        }

        // Determine jurisdiction from the first postal code
        const firstPostalCode = selectedCity.postalCodes[0]
        const country = detectPostalCodeRegion(firstPostalCode) || "US"
        const jurisdictionCode = getJurisdictionForPostalCode(
          firstPostalCode,
          selectedCity.state,
          country
        )

        // Aggregate measurements
        const aggregatedStats = aggregateMeasurements(allMeasurements, jurisdictionCode)

        // Create the aggregated ZipCodeData
        const newData: ZipCodeData = {
          zipCode: selectedCity.postalCodes.join(", "), // Show all postal codes
          cityName: selectedCity.city,
          state: selectedCity.state,
          stats: aggregatedStats,
        }

        setZipData(newData)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch multi-location data:", err)
        setError("Unable to fetch city data. Please try again.")
        setZipData(null)
      } finally {
        setIsLoading(false)
      }
    },
    [selectedCity, defsLoading, isOffline, aggregateMeasurements]
  )

  // Re-fetch when selected city changes or definitions finish loading
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Create refresh function that forces a refresh
  const refresh = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  return {
    zipData,
    isLoading: isLoading || defsLoading || !networkReady,
    error,
    isOffline,
    refresh,
  }
}
