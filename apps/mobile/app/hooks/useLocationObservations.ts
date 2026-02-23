/**
 * useLocationObservations Hook
 *
 * Fetches O&M observations for a location and enriches them with
 * property definitions and calculated safety status.
 */

import { useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  type ObservationWithStatus,
  type ObservedPropertyCategory,
  calculateObservationStatus,
} from "@/data/types/safety"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { queryKeys } from "@/lib/queryKeys"
import {
  getLocationObservations,
  getLocationObservationsByState,
  getObservedProperties,
  getPropertyThresholdsForJurisdiction,
  type AmplifyLocationObservation,
  type AmplifyObservedProperty,
  type AmplifyPropertyThreshold,
} from "@/services/amplify/data"

interface UseLocationObservationsResult {
  /** Observations with status and property info */
  observations: ObservationWithStatus[]
  /** Whether data is loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether offline */
  isOffline: boolean
  /** Refresh data */
  refresh: () => Promise<void>
  /** Get observations by category */
  getByCategory: (category: ObservedPropertyCategory) => ObservationWithStatus[]
  /** Get the worst status across all observations */
  worstStatus: "danger" | "warning" | "safe"
  /** Count of danger/warning observations */
  alertCount: number
}

interface LocationParams {
  city: string
  state: string
  jurisdictionCode: string
}

/**
 * Converts Amplify types to local types for observation processing
 */
function mapAmplifyObservation(obs: AmplifyLocationObservation): {
  city: string
  state: string
  country: string
  county?: string
  propertyId: string
  numericValue?: number
  zoneValue?: string
  endemicValue?: boolean
  incidenceValue?: number
  binaryValue?: boolean
  observedAt: string
  validUntil?: string
  source?: string
  sourceUrl?: string
  notes?: string
} {
  return {
    city: obs.city,
    state: obs.state,
    country: obs.country,
    county: obs.county ?? undefined,
    propertyId: obs.propertyId,
    numericValue: obs.numericValue ?? undefined,
    zoneValue: obs.zoneValue ?? undefined,
    endemicValue: obs.endemicValue ?? undefined,
    incidenceValue: obs.incidenceValue ?? undefined,
    binaryValue: obs.binaryValue ?? undefined,
    observedAt: obs.observedAt,
    validUntil: obs.validUntil ?? undefined,
    source: obs.source ?? undefined,
    sourceUrl: obs.sourceUrl ?? undefined,
    notes: obs.notes ?? undefined,
  }
}

/**
 * Converts Amplify property to local ObservedProperty type
 */
function mapAmplifyProperty(prop: AmplifyObservedProperty): {
  id: string
  name: string
  nameFr?: string
  category: ObservedPropertyCategory
  observationType: "numeric" | "zone" | "endemic" | "incidence" | "binary"
  unit?: string
  description?: string
  descriptionFr?: string
  higherIsBad: boolean
} {
  return {
    id: prop.propertyId,
    name: prop.name,
    nameFr: prop.nameFr ?? undefined,
    category: prop.category as ObservedPropertyCategory,
    observationType: prop.observationType as
      | "numeric"
      | "zone"
      | "endemic"
      | "incidence"
      | "binary",
    unit: prop.unit ?? undefined,
    description: prop.description ?? undefined,
    descriptionFr: prop.descriptionFr ?? undefined,
    higherIsBad: prop.higherIsBad ?? true,
  }
}

/**
 * Converts Amplify threshold to local PropertyThreshold type
 */
function mapAmplifyThreshold(threshold: AmplifyPropertyThreshold): {
  propertyId: string
  jurisdictionCode: string
  limitValue?: number
  warningValue?: number
  zoneMapping?: Record<string, "danger" | "warning" | "safe">
  endemicIsDanger?: boolean
  incidenceWarningThreshold?: number
  incidenceDangerThreshold?: number
  status: "active" | "historical" | "not_applicable"
} {
  let zoneMapping: Record<string, "danger" | "warning" | "safe"> | undefined
  if (threshold.zoneMapping) {
    try {
      zoneMapping =
        typeof threshold.zoneMapping === "string"
          ? JSON.parse(threshold.zoneMapping)
          : threshold.zoneMapping
    } catch {
      zoneMapping = undefined
    }
  }

  return {
    propertyId: threshold.propertyId,
    jurisdictionCode: threshold.jurisdictionCode,
    limitValue: threshold.limitValue ?? undefined,
    warningValue: threshold.warningValue ?? undefined,
    zoneMapping,
    endemicIsDanger: threshold.endemicIsDanger ?? undefined,
    incidenceWarningThreshold: threshold.incidenceWarningThreshold ?? undefined,
    incidenceDangerThreshold: threshold.incidenceDangerThreshold ?? undefined,
    status: (threshold.status as "active" | "historical" | "not_applicable") ?? "active",
  }
}

/**
 * Hook to fetch and process location observations
 */
export function useLocationObservations(params: LocationParams): UseLocationObservationsResult {
  const { city, state, jurisdictionCode } = params
  const { isOffline } = useNetworkStatus()
  const qc = useQueryClient()

  // Fetch observations for the city (fallback to state if no city data)
  const observationsQuery = useQuery({
    queryKey: queryKeys.observations.byCity(city),
    queryFn: async () => {
      const cityObs = await getLocationObservations(city)
      if (cityObs.length > 0) return cityObs

      // Fallback to state-level observations
      const stateObs = await getLocationObservationsByState(state)
      return stateObs
    },
    enabled: !!city && !!state,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch all observed properties (for property definitions)
  const propertiesQuery = useQuery({
    queryKey: queryKeys.observedProperties.list(),
    queryFn: getObservedProperties,
    staleTime: 30 * 60 * 1000, // 30 minutes (rarely changes)
  })

  // Fetch thresholds for the jurisdiction
  const thresholdsQuery = useQuery({
    queryKey: queryKeys.propertyThresholds.byJurisdiction(jurisdictionCode),
    queryFn: () => getPropertyThresholdsForJurisdiction(jurisdictionCode),
    enabled: !!jurisdictionCode,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })

  // Build enriched observations with status
  const observations = useMemo<ObservationWithStatus[]>(() => {
    if (!observationsQuery.data || !propertiesQuery.data) {
      return []
    }

    const propertyMap = new Map(propertiesQuery.data.map((p) => [p.propertyId, p]))

    const thresholdMap = new Map(
      (thresholdsQuery.data ?? []).map((t) => [`${t.propertyId}:${t.jurisdictionCode}`, t]),
    )

    return observationsQuery.data
      .map((obs) => {
        const amplifyProp = propertyMap.get(obs.propertyId)
        if (!amplifyProp) return null

        const property = mapAmplifyProperty(amplifyProp)
        const observation = mapAmplifyObservation(obs)

        const amplifyThreshold = thresholdMap.get(`${obs.propertyId}:${jurisdictionCode}`)
        const threshold = amplifyThreshold ? mapAmplifyThreshold(amplifyThreshold) : undefined

        const status = calculateObservationStatus(observation, property, threshold)

        return {
          ...observation,
          status,
          property,
          threshold,
        } as ObservationWithStatus
      })
      .filter((obs): obs is ObservationWithStatus => obs !== null)
  }, [observationsQuery.data, propertiesQuery.data, thresholdsQuery.data, jurisdictionCode])

  // Filter by category
  const getByCategory = useCallback(
    (category: ObservedPropertyCategory): ObservationWithStatus[] => {
      return observations.filter((obs) => obs.property?.category === category)
    },
    [observations],
  )

  // Calculate worst status
  const worstStatus = useMemo<"danger" | "warning" | "safe">(() => {
    if (observations.some((obs) => obs.status === "danger")) return "danger"
    if (observations.some((obs) => obs.status === "warning")) return "warning"
    return "safe"
  }, [observations])

  // Count alerts
  const alertCount = useMemo(() => {
    return observations.filter((obs) => obs.status === "danger" || obs.status === "warning").length
  }, [observations])

  // Refresh function - invalidate both city and state queries since we may have fallen back to state data
  const refresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.observations.byCity(city) }),
      qc.invalidateQueries({ queryKey: queryKeys.observations.byState(state) }),
      qc.invalidateQueries({ queryKey: queryKeys.observedProperties.list() }),
      qc.invalidateQueries({
        queryKey: queryKeys.propertyThresholds.byJurisdiction(jurisdictionCode),
      }),
    ])
  }, [qc, city, state, jurisdictionCode])

  // Combine loading states
  const isLoading =
    observationsQuery.isLoading || propertiesQuery.isLoading || thresholdsQuery.isLoading

  // Combine errors
  const error =
    observationsQuery.error?.message ||
    propertiesQuery.error?.message ||
    thresholdsQuery.error?.message ||
    null

  return {
    observations,
    isLoading,
    error,
    isOffline,
    refresh,
    getByCategory,
    worstStatus,
    alertCount,
  }
}
