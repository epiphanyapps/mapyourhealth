/**
 * Mock Data Barrel Export for MapYourHealth
 *
 * This file re-exports mock data for easy importing in components and screens.
 * Contaminant definitions, thresholds, and jurisdictions serve as offline fallback
 * when the backend is unreachable.
 */

// =============================================================================
// Categories (Dynamic)
// =============================================================================

export {
  mockCategories,
  mockSubCategories,
  getMockCategoryById,
  getMockSubCategoriesByCategoryId,
  getMockSubCategoryById,
} from "./categories"

// =============================================================================
// Contaminants, Thresholds, Jurisdictions (offline fallback)
// =============================================================================

export {
  mockContaminants,
  mockThresholds,
  mockJurisdictions,
  getMockThreshold,
} from "./contaminants"

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
