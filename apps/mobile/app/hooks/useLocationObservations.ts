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
import { fetchWithLocationFallback, type LocationScope } from "@/lib/locationFallback"
import { queryKeys } from "@/lib/queryKeys"
import {
  getLocationObservations,
  getLocationObservationsByCountry,
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
  /**
   * Which level of the location hierarchy resolved the data (#123).
   * "city" = city-specific record exists; "state"/"country" = inherited.
   */
  scope: LocationScope
  /**
   * @deprecated Prefer `scope === "state"`. Retained for callers that
   * haven't migrated to the unified scope flag.
   */
  isStateLevelFallback: boolean
}

interface LocationParams {
  city: string
  state: string
  jurisdictionCode: string
  /** Country anchor for country-level cascade fallback (#123). Optional for backward compat. */
  country?: string
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
    // city/state may be null on state-/country-anchored records (#123).
    city: obs.city ?? "",
    state: obs.state ?? "",
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

const STATUS_PRIORITY: Record<string, number> = { danger: 2, warning: 1, safe: 0 }

/**
 * Deduplicate observations by propertyId, keeping the worst status per property.
 * Used when showing state-level fallback data to avoid duplicate cards.
 */
function deduplicateByWorstStatus(observations: ObservationWithStatus[]): ObservationWithStatus[] {
  const byProperty = new Map<string, ObservationWithStatus>()
  for (const obs of observations) {
    const existing = byProperty.get(obs.propertyId)
    if (!existing || STATUS_PRIORITY[obs.status] > STATUS_PRIORITY[existing.status]) {
      byProperty.set(obs.propertyId, obs)
    }
  }
  return Array.from(byProperty.values())
}

/**
 * Hook to fetch and process location observations.
 *
 * Cascades city → state → country (#123) via the shared
 * `fetchWithLocationFallback` util and exposes the resolved `scope` so
 * callers can render provenance.
 */
export function useLocationObservations(params: LocationParams): UseLocationObservationsResult {
  const { city, state, jurisdictionCode, country = "" } = params
  const { isOffline } = useNetworkStatus()
  const qc = useQueryClient()

  // Fetch observations cascading city → state → country.
  const observationsQuery = useQuery({
    queryKey: queryKeys.observations.byCity(city),
    queryFn: async () =>
      fetchWithLocationFallback(
        { city, state, country },
        {
          byCity: getLocationObservations,
          byState: getLocationObservationsByState,
          byCountry: getLocationObservationsByCountry,
        },
      ),
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
    if (!observationsQuery.data?.data || !propertiesQuery.data) {
      return []
    }

    const propertyMap = new Map(propertiesQuery.data.map((p) => [p.propertyId, p]))

    const thresholdMap = new Map(
      (thresholdsQuery.data ?? []).map((t) => [`${t.propertyId}:${t.jurisdictionCode}`, t]),
    )

    const enriched = observationsQuery.data.data
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

    // Deduplicate fallback data (state or country scope) by propertyId,
    // keeping worst status. City-scoped data is one row per property by
    // construction so dedup is unnecessary.
    if (observationsQuery.data.scope === "state" || observationsQuery.data.scope === "country") {
      return deduplicateByWorstStatus(enriched)
    }

    return enriched
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

  // Refresh function — invalidate every cascade level since the fallback
  // may have resolved at any of them.
  const refresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.observations.byCity(city) }),
      qc.invalidateQueries({ queryKey: queryKeys.observations.byState(state) }),
      qc.invalidateQueries({ queryKey: queryKeys.observations.byCountry(country) }),
      qc.invalidateQueries({ queryKey: queryKeys.observedProperties.list() }),
      qc.invalidateQueries({
        queryKey: queryKeys.propertyThresholds.byJurisdiction(jurisdictionCode),
      }),
    ])
  }, [qc, city, state, country, jurisdictionCode])

  const scope = observationsQuery.data?.scope ?? "none"
  const isStateLevelFallback = scope === "state"

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
    scope,
    isStateLevelFallback,
  }
}
