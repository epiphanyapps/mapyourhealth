/**
 * Mock Data Barrel Export for MapYourHealth
 *
 * This file re-exports all mock data for easy importing in components and screens.
 * Import from this file to access mock data during development.
 *
 * Example usage:
 *   import { mockContaminants, getMockLocationData } from "@/data/mock"
 */

// =============================================================================
// New Contaminant-based Mock Data
// =============================================================================

// Contaminants, Thresholds, Jurisdictions
export {
  mockContaminants,
  mockThresholds,
  mockJurisdictions,
  getMockThreshold,
  getMockLocationData,
  getAvailableMockPostalCodes,
  allMockLocationData,
  mockLocationDataMap,
  beverlyHillsLocationData,
  newYorkLocationData,
  miamiBeachLocationData,
  chicagoLocationData,
  seattleLocationData,
} from "./contaminants"

// =============================================================================
// Legacy Mock Data (for backward compatibility)
// =============================================================================

// Stat definitions (legacy)
export {
  allStatDefinitions,
  waterStatDefinitions,
  airStatDefinitions,
  healthStatDefinitions,
  disasterStatDefinitions,
  getStatDefinitionById,
  getStatDefinitionsByCategory,
} from "./stat-definitions"

// Zip code data (legacy)
export {
  allZipCodeData,
  zipCodeDataMap,
  beverlyHillsData,
  newYorkData,
  miamiBeachData,
  chicagoData,
  seattleData,
  getZipCodeDataByCode,
  getAvailableZipCodes,
} from "./zip-codes"

// Hazard categories
export {
  allHazardCategories,
  waterHazards,
  airHazards,
  healthHazards,
  disasterHazards,
  generalHazards,
  getHazardCategoryById,
  getHazardCategoriesByStatCategory,
  getAllHazardCategoryIds,
} from "./hazards"

// Product recommendations
export {
  allRecommendations,
  waterRecommendations,
  airRecommendations,
  healthRecommendations,
  disasterRecommendations,
  getRecommendationById,
  getRecommendationsByHazardCategory,
  getRecommendationsForHazards,
} from "./recommendations"
