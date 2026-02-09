/**
 * ContaminantsContext - Caches contaminants and thresholds from Amplify backend.
 *
 * This context fetches contaminants, thresholds, and jurisdictions on app startup
 * and caches them for use throughout the app. Falls back to mock data if API fails.
 */

import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { mockContaminants, mockThresholds, mockJurisdictions } from "@/data/mock"
import type {
  Contaminant,
  ContaminantCategory,
  ContaminantThreshold,
  Jurisdiction,
  SafetyStatus,
} from "@/data/types/safety"
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

export const ContaminantsProvider: FC<PropsWithChildren> = ({ children }) => {
  const [contaminants, setContaminants] = useState<Contaminant[]>([])
  const [thresholds, setThresholds] = useState<ContaminantThreshold[]>([])
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMockData, setIsMockData] = useState(false)

  /**
   * Fetch all data from Amplify, falling back to mock data on error
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [amplifyContaminants, amplifyThresholds, amplifyJurisdictions] = await Promise.all([
        fetchContaminants(),
        fetchThresholds(),
        fetchJurisdictions(),
      ])

      if (amplifyContaminants.length > 0) {
        setContaminants(amplifyContaminants.map(mapAmplifyContaminant))
        setThresholds(amplifyThresholds.map(mapAmplifyThreshold))
        setJurisdictions(amplifyJurisdictions.map(mapAmplifyJurisdiction))
        setIsMockData(false)
      } else {
        // No data in backend, use mock data
        console.log("No contaminants in backend, using mock data")
        setContaminants(mockContaminants)
        setThresholds(mockThresholds)
        setJurisdictions(mockJurisdictions)
        setIsMockData(true)
      }
    } catch (err) {
      console.error("Failed to fetch contaminant data:", err)
      // Fall back to mock data
      setContaminants(mockContaminants)
      setThresholds(mockThresholds)
      setJurisdictions(mockJurisdictions)
      setIsMockData(true)
      setError("Failed to load contaminant data from server. Using local data.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

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
    refresh: fetchData,
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
