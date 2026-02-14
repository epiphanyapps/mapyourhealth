/**
 * ContaminantsContext - Caches contaminants and thresholds from Amplify backend.
 *
 * This context fetches contaminants, thresholds, and jurisdictions on app startup
 * using React Query and caches them for use throughout the app.
 * Falls back to mock data if API fails.
 */

import { createContext, FC, PropsWithChildren, useCallback, useContext, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { mockContaminants, mockThresholds, mockJurisdictions } from "@/data/mock"
import type {
  Contaminant,
  ContaminantCategory,
  ContaminantThreshold,
  Jurisdiction,
  SafetyStatus,
} from "@/data/types/safety"
import { queryKeys } from "@/lib/queryKeys"
import {
  getContaminants as fetchContaminants,
  getContaminantThresholds as fetchThresholds,
  getJurisdictions as fetchJurisdictions,
  AmplifyContaminant,
  AmplifyContaminantThreshold,
  AmplifyJurisdiction,
} from "@/services/amplify/data"

interface ContaminantsContextType {
  /** All contaminants */
  contaminants: Contaminant[]
  /** @deprecated Use contaminants instead */
  statDefinitions: Contaminant[]
  /** Map of contaminant ID to contaminant for quick lookup */
  contaminantMap: Map<string, Contaminant>
  /** @deprecated Use contaminantMap instead */
  statDefinitionMap: Map<string, Contaminant>
  /** All thresholds */
  thresholds: ContaminantThreshold[]
  /** All jurisdictions */
  jurisdictions: Jurisdiction[]
  /** Map of jurisdiction code to jurisdiction */
  jurisdictionMap: Map<string, Jurisdiction>
  /** Whether data is still loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether we're using mock data as fallback */
  isMockData: boolean
  /** Refresh data from the backend */
  refresh: () => Promise<void>
  /** Get contaminants by category */
  getByCategory: (category: ContaminantCategory) => Contaminant[]
  /** Get a single contaminant by ID */
  getById: (id: string) => Contaminant | undefined
  /** Get threshold for a contaminant and jurisdiction */
  getThreshold: (
    contaminantId: string,
    jurisdictionCode: string,
  ) => ContaminantThreshold | undefined
  /** Get WHO threshold for a contaminant */
  getWHOThreshold: (contaminantId: string) => ContaminantThreshold | undefined
  /** Calculate status for a measurement value */
  calculateMeasurementStatus: (
    value: number,
    contaminantId: string,
    jurisdictionCode: string,
  ) => SafetyStatus
  /** Get jurisdiction for a state/country */
  getJurisdictionForLocation: (state: string, country: string) => Jurisdiction | undefined
}

const ContaminantsContext = createContext<ContaminantsContextType | null>(null)

export type { ContaminantsContextType }

/**
 * Maps Amplify Contaminant to frontend Contaminant type
 */
function mapAmplifyContaminant(amplify: AmplifyContaminant): Contaminant {
  return {
    id: amplify.contaminantId,
    name: amplify.name,
    nameFr: amplify.nameFr ?? undefined,
    category: (amplify.category ?? "inorganic") as ContaminantCategory,
    unit: amplify.unit,
    description: amplify.description ?? undefined,
    descriptionFr: amplify.descriptionFr ?? undefined,
    studies: amplify.studies ?? undefined,
    higherIsBad: amplify.higherIsBad ?? true,
  }
}

/**
 * Maps Amplify ContaminantThreshold to frontend type
 */
function mapAmplifyThreshold(amplify: AmplifyContaminantThreshold): ContaminantThreshold {
  return {
    contaminantId: amplify.contaminantId,
    jurisdictionCode: amplify.jurisdictionCode,
    limitValue: amplify.limitValue ?? null,
    warningRatio: amplify.warningRatio ?? 0.8,
    status: (amplify.status ?? "regulated") as ContaminantThreshold["status"],
  }
}

/**
 * Maps Amplify Jurisdiction to frontend type
 */
function mapAmplifyJurisdiction(amplify: AmplifyJurisdiction): Jurisdiction {
  return {
    code: amplify.code,
    name: amplify.name,
    nameFr: amplify.nameFr ?? undefined,
    country: amplify.country,
    region: amplify.region ?? undefined,
    parentCode: amplify.parentCode ?? undefined,
    isDefault: amplify.isDefault ?? false,
  }
}

/**
 * Fetches contaminants from API; returns mock data on failure or empty result.
 */
async function fetchContaminantsWithFallback(): Promise<{
  contaminants: Contaminant[]
  isMock: boolean
}> {
  try {
    const amplifyContaminants = await fetchContaminants()
    if (amplifyContaminants.length > 0) {
      return { contaminants: amplifyContaminants.map(mapAmplifyContaminant), isMock: false }
    }
  } catch (err) {
    console.error("Failed to fetch contaminants:", err)
  }
  return { contaminants: mockContaminants, isMock: true }
}

async function fetchThresholdsWithFallback(): Promise<{
  thresholds: ContaminantThreshold[]
  isMock: boolean
}> {
  try {
    const amplifyThresholds = await fetchThresholds()
    if (amplifyThresholds.length > 0) {
      return { thresholds: amplifyThresholds.map(mapAmplifyThreshold), isMock: false }
    }
  } catch (err) {
    console.error("Failed to fetch thresholds:", err)
  }
  return { thresholds: mockThresholds, isMock: true }
}

async function fetchJurisdictionsWithFallback(): Promise<{
  jurisdictions: Jurisdiction[]
  isMock: boolean
}> {
  try {
    const amplifyJurisdictions = await fetchJurisdictions()
    if (amplifyJurisdictions.length > 0) {
      return { jurisdictions: amplifyJurisdictions.map(mapAmplifyJurisdiction), isMock: false }
    }
  } catch (err) {
    console.error("Failed to fetch jurisdictions:", err)
  }
  return { jurisdictions: mockJurisdictions, isMock: true }
}

export const ContaminantsProvider: FC<PropsWithChildren> = ({ children }) => {
  const queryClientInstance = useQueryClient()

  const {
    data: contaminantsResult,
    isLoading: contaminantsLoading,
    error: contaminantsError,
  } = useQuery({
    queryKey: queryKeys.contaminants.definitions(),
    queryFn: fetchContaminantsWithFallback,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
  })

  const {
    data: thresholdsResult,
    isLoading: thresholdsLoading,
    error: thresholdsError,
  } = useQuery({
    queryKey: queryKeys.contaminants.thresholds(),
    queryFn: fetchThresholdsWithFallback,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const {
    data: jurisdictionsResult,
    isLoading: jurisdictionsLoading,
    error: jurisdictionsError,
  } = useQuery({
    queryKey: queryKeys.contaminants.jurisdictions(),
    queryFn: fetchJurisdictionsWithFallback,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const contaminants = useMemo(() => contaminantsResult?.contaminants ?? [], [contaminantsResult])
  const thresholds = useMemo(() => thresholdsResult?.thresholds ?? [], [thresholdsResult])
  const jurisdictions = useMemo(
    () => jurisdictionsResult?.jurisdictions ?? [],
    [jurisdictionsResult],
  )
  const isLoading = contaminantsLoading || thresholdsLoading || jurisdictionsLoading
  const isMockData =
    (contaminantsResult?.isMock ?? true) ||
    (thresholdsResult?.isMock ?? true) ||
    (jurisdictionsResult?.isMock ?? true)

  const error =
    contaminantsError || thresholdsError || jurisdictionsError
      ? "Failed to load contaminant data from server. Using local data."
      : null

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.contaminants.definitions() }),
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.contaminants.thresholds() }),
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.contaminants.jurisdictions() }),
    ])
  }, [queryClientInstance])

  // Create maps for quick lookup
  const contaminantMap = useMemo(() => new Map(contaminants.map((c) => [c.id, c])), [contaminants])

  const jurisdictionMap = useMemo(
    () => new Map(jurisdictions.map((j) => [j.code, j])),
    [jurisdictions],
  )

  // Create threshold lookup: `${contaminantId}:${jurisdictionCode}` -> threshold
  const thresholdMap = useMemo(
    () => new Map(thresholds.map((t) => [`${t.contaminantId}:${t.jurisdictionCode}`, t])),
    [thresholds],
  )

  // Get contaminants by category
  const getByCategory = useCallback(
    (category: ContaminantCategory): Contaminant[] => {
      return contaminants.filter((c) => c.category === category)
    },
    [contaminants],
  )

  // Get a single contaminant by ID
  const getById = useCallback(
    (id: string): Contaminant | undefined => {
      return contaminantMap.get(id)
    },
    [contaminantMap],
  )

  // Get threshold for a contaminant and jurisdiction
  const getThreshold = useCallback(
    (contaminantId: string, jurisdictionCode: string): ContaminantThreshold | undefined => {
      // First try exact match
      const exact = thresholdMap.get(`${contaminantId}:${jurisdictionCode}`)
      if (exact) return exact

      // Try parent jurisdiction (e.g., US-NY -> US)
      const jurisdiction = jurisdictionMap.get(jurisdictionCode)
      if (jurisdiction?.parentCode) {
        const parent = thresholdMap.get(`${contaminantId}:${jurisdiction.parentCode}`)
        if (parent) return parent
      }

      // Fall back to WHO
      return thresholdMap.get(`${contaminantId}:WHO`)
    },
    [thresholdMap, jurisdictionMap],
  )

  // Get WHO threshold for a contaminant
  const getWHOThreshold = useCallback(
    (contaminantId: string): ContaminantThreshold | undefined => {
      return thresholdMap.get(`${contaminantId}:WHO`)
    },
    [thresholdMap],
  )

  // Calculate status for a measurement
  const calculateMeasurementStatus = useCallback(
    (value: number, contaminantId: string, jurisdictionCode: string): SafetyStatus => {
      const threshold = getThreshold(contaminantId, jurisdictionCode)
      const contaminant = getById(contaminantId)
      const higherIsBad = contaminant?.higherIsBad ?? true

      // If no threshold or banned/not controlled
      if (!threshold || threshold.status === "banned") {
        return "danger" // Presence of banned substance is danger
      }
      if (threshold.status === "not_controlled" || threshold.limitValue === null) {
        return "safe" // Can't evaluate without a limit
      }

      const limit = threshold.limitValue
      const warningRatio = threshold.warningRatio ?? 0.8
      const warningThreshold = limit * warningRatio

      if (higherIsBad) {
        // Special case: limit of 0 means "must be absent"
        // If value is also 0 (none detected), that's safe, not danger
        if (limit === 0 && value === 0) return "safe"
        if (value >= limit) return "danger"
        if (value >= warningThreshold) return "warning"
        return "safe"
      } else {
        if (value <= limit) return "danger"
        if (value <= warningThreshold) return "warning"
        return "safe"
      }
    },
    [getThreshold, getById],
  )

  // Get jurisdiction for a location (state + country)
  const getJurisdictionForLocation = useCallback(
    (state: string, country: string): Jurisdiction | undefined => {
      // Try state-specific jurisdiction first (e.g., "US-NY")
      const stateCode = `${country}-${state}`
      const stateJurisdiction = jurisdictionMap.get(stateCode)
      if (stateJurisdiction) return stateJurisdiction

      // Fall back to country-level jurisdiction (e.g., "US")
      const countryJurisdiction = jurisdictionMap.get(country)
      if (countryJurisdiction) return countryJurisdiction

      // Default to WHO
      return jurisdictionMap.get("WHO")
    },
    [jurisdictionMap],
  )

  const value: ContaminantsContextType = {
    contaminants,
    statDefinitions: contaminants, // @deprecated - use contaminants instead
    contaminantMap,
    statDefinitionMap: contaminantMap, // @deprecated - use contaminantMap instead
    thresholds,
    jurisdictions,
    jurisdictionMap,
    isLoading,
    error,
    isMockData,
    refresh,
    getByCategory,
    getById,
    getThreshold,
    getWHOThreshold,
    calculateMeasurementStatus,
    getJurisdictionForLocation,
  }

  return <ContaminantsContext.Provider value={value}>{children}</ContaminantsContext.Provider>
}

/**
 * Hook to access contaminants data from context
 */
export function useContaminants(): ContaminantsContextType {
  const context = useContext(ContaminantsContext)
  if (!context) {
    throw new Error("useContaminants must be used within a ContaminantsProvider")
  }
  return context
}

// =============================================================================
// Legacy Exports (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use useContaminants instead
 */
export const useStatDefinitions = useContaminants

/**
 * @deprecated Use ContaminantsProvider instead
 */
export const StatDefinitionsProvider = ContaminantsProvider
