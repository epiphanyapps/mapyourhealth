/**
 * StatDefinitionsContext - Legacy compatibility layer
 *
 * @deprecated Use ContaminantsContext instead
 *
 * This file now re-exports from ContaminantsContext for backward compatibility.
 * New code should use useContaminants() from ContaminantsContext.
 */

export {
  ContaminantsProvider as StatDefinitionsProvider,
  useContaminants as useStatDefinitions,
} from "./ContaminantsContext"

// Re-export types for compatibility
export type { ContaminantsContextType as StatDefinitionsContextType } from "./ContaminantsContext"
