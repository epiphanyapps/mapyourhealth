/**
 * StatDefinitionsContext - Caches stat definitions from Amplify backend.
 *
 * This context fetches stat definitions once on app startup and caches them
 * for use throughout the app. Falls back to mock data if the API call fails.
 */

import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import { getStatDefinitions as getAmplifyStatDefinitions } from "@/services/amplify/data"
import { allStatDefinitions as mockStatDefinitions } from "@/data/mock"
import type { StatCategory, StatDefinition } from "@/data/types/safety"

interface StatDefinitionsContextType {
  /** All stat definitions */
  statDefinitions: StatDefinition[]
  /** Map of stat ID to definition for quick lookup */
  statDefinitionMap: Map<string, StatDefinition>
  /** Whether definitions are still loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether we're using mock data as fallback */
  isMockData: boolean
  /** Refresh definitions from the backend */
  refresh: () => Promise<void>
  /** Get definitions by category */
  getByCategory: (category: StatCategory) => StatDefinition[]
  /** Get a single definition by ID */
  getById: (id: string) => StatDefinition | undefined
}

const StatDefinitionsContext = createContext<StatDefinitionsContextType | null>(null)

import type { StatDefinition as AmplifyStatDefinition } from "@/services/amplify/data"

/**
 * Maps Amplify StatDefinition to the frontend StatDefinition type
 */
function mapAmplifyToFrontend(amplifyStat: AmplifyStatDefinition): StatDefinition {
  return {
    id: amplifyStat.statId,
    name: amplifyStat.name,
    unit: amplifyStat.unit,
    description: amplifyStat.description ?? "",
    category: (amplifyStat.category ?? "health") as StatCategory,
    thresholds: {
      danger: amplifyStat.dangerThreshold,
      warning: amplifyStat.warningThreshold,
      higherIsBad: amplifyStat.higherIsBad ?? true,
    },
  }
}

export const StatDefinitionsProvider: FC<PropsWithChildren> = ({ children }) => {
  const [statDefinitions, setStatDefinitions] = useState<StatDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMockData, setIsMockData] = useState(false)

  /**
   * Fetch stat definitions from Amplify, falling back to mock data on error
   */
  const fetchDefinitions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const amplifyDefs = await getAmplifyStatDefinitions()

      if (amplifyDefs.length > 0) {
        // Map Amplify definitions to frontend format
        const mappedDefs = amplifyDefs.map(mapAmplifyToFrontend)
        setStatDefinitions(mappedDefs)
        setIsMockData(false)
      } else {
        // No data in backend, use mock data
        console.log("No stat definitions in backend, using mock data")
        setStatDefinitions(mockStatDefinitions)
        setIsMockData(true)
      }
    } catch (err) {
      console.error("Failed to fetch stat definitions:", err)
      // Fall back to mock data
      setStatDefinitions(mockStatDefinitions)
      setIsMockData(true)
      setError("Failed to load stat definitions from server. Using local data.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchDefinitions()
  }, [fetchDefinitions])

  // Create a map for quick lookup by ID
  const statDefinitionMap = new Map(statDefinitions.map((def) => [def.id, def]))

  // Get definitions by category
  const getByCategory = useCallback(
    (category: StatCategory): StatDefinition[] => {
      return statDefinitions.filter((def) => def.category === category)
    },
    [statDefinitions],
  )

  // Get a single definition by ID
  const getById = useCallback(
    (id: string): StatDefinition | undefined => {
      return statDefinitionMap.get(id)
    },
    [statDefinitionMap],
  )

  const value: StatDefinitionsContextType = {
    statDefinitions,
    statDefinitionMap,
    isLoading,
    error,
    isMockData,
    refresh: fetchDefinitions,
    getByCategory,
    getById,
  }

  return (
    <StatDefinitionsContext.Provider value={value}>{children}</StatDefinitionsContext.Provider>
  )
}

/**
 * Hook to access stat definitions from context
 */
export function useStatDefinitions(): StatDefinitionsContextType {
  const context = useContext(StatDefinitionsContext)
  if (!context) {
    throw new Error("useStatDefinitions must be used within a StatDefinitionsProvider")
  }
  return context
}
