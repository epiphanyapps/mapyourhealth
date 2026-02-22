/**
 * Safety Data Types for MapYourHealth
 *
 * These types define the data structures for contaminants,
 * jurisdictions, measurements, and related entities.
 */

// =============================================================================
// Contaminant Categories
// =============================================================================

/**
 * Categories for water contaminants
 */
export type ContaminantCategory =
  | "fertilizer"
  | "pesticide"
  | "radioactive"
  | "disinfectant"
  | "inorganic"
  | "organic"
  | "microbiological"

/**
 * Legacy categories (for backward compatibility during migration)
 * @deprecated Use Category interface instead
 */
export enum StatCategory {
  water = "water",
  air = "air",
  health = "health",
  disaster = "disaster",
}

// =============================================================================
// Dynamic Categories (backend-driven)
// =============================================================================

/**
 * Link to external resource
 */
export interface CategoryLink {
  label: string
  url: string
}

/**
 * Top-level category (water, air, health, disaster)
 * Replaces hardcoded StatCategory enum
 */
export interface Category {
  /** Unique identifier (e.g., "water", "air") */
  categoryId: string
  /** Display name in English */
  name: string
  /** Display name in French */
  nameFr?: string
  /** Description (supports markdown) */
  description?: string
  /** Description in French */
  descriptionFr?: string
  /** MaterialCommunityIcons name */
  icon: string
  /** Hex color code (e.g., "#3B82F6") */
  color: string
  /** Sort order for display */
  sortOrder: number
  /** Whether this category is active */
  isActive: boolean
  /** External resource links */
  links?: CategoryLink[]
  /** Whether to show standards comparison table */
  showStandardsTable?: boolean
}

/**
 * Sub-category under a main category
 * Maps to ContaminantCategory values (fertilizer, pesticide, etc.)
 */
export interface SubCategory {
  /** Unique identifier (e.g., "fertilizer", "radon") */
  subCategoryId: string
  /** Parent category ID */
  categoryId: string
  /** Display name in English */
  name: string
  /** Display name in French */
  nameFr?: string
  /** Description (supports markdown) */
  description?: string
  /** Description in French */
  descriptionFr?: string
  /** Icon name (optional, inherits from parent) */
  icon?: string
  /** Color (optional, inherits from parent) */
  color?: string
  /** Sort order for display */
  sortOrder: number
  /** Whether this sub-category is active */
  isActive: boolean
  /** External resource links */
  links?: CategoryLink[]
}

// =============================================================================
// Status Types
// =============================================================================

/**
 * Status levels indicating safety severity
 */
export type SafetyStatus = "danger" | "warning" | "safe"

/**
 * Threshold status from jurisdiction
 */
export type ThresholdStatus = "regulated" | "banned" | "not_approved" | "not_controlled"

/**
 * @deprecated Use SafetyStatus instead
 */
export type StatStatus = SafetyStatus

// =============================================================================
// Contaminant Definitions
// =============================================================================

/**
 * Definition of a water contaminant (metadata)
 */
export interface Contaminant {
  /** Unique identifier for the contaminant (e.g., "nitrate", "lead") */
  id: string
  /** Display name of the contaminant */
  name: string
  /** French name (optional) */
  nameFr?: string
  /** Category this contaminant belongs to */
  category: ContaminantCategory
  /** Unit of measurement (e.g., "μg/L", "Bq/L") */
  unit: string
  /** Description of health concerns (English) */
  description?: string
  /** Description of health concerns (French) */
  descriptionFr?: string
  /** Scientific study references */
  studies?: string
  /** Whether higher values are worse (true) or better (false) */
  higherIsBad: boolean
}

/**
 * Jurisdiction-specific threshold for a contaminant
 */
export interface ContaminantThreshold {
  /** Contaminant ID this threshold applies to */
  contaminantId: string
  /** Jurisdiction code (e.g., "WHO", "US-NY", "CA-QC") */
  jurisdictionCode: string
  /** Limit value (null if banned or not controlled) */
  limitValue: number | null
  /** Warning ratio (e.g., 0.8 means warning at 80% of limit) */
  warningRatio: number | null
  /** Regulatory status */
  status: ThresholdStatus
}

// =============================================================================
// Jurisdiction
// =============================================================================

/**
 * Regulatory jurisdiction (e.g., WHO, US-NY, CA-QC)
 */
export interface Jurisdiction {
  /** Unique code (e.g., "US-NY", "CA-QC") */
  code: string
  /** Display name */
  name: string
  /** French name (optional) */
  nameFr?: string
  /** Country code (e.g., "US", "CA", "INTL") */
  country: string
  /** Region/state code (e.g., "NY", "QC") */
  region?: string
  /** Parent jurisdiction code for fallback (e.g., "US" for "US-NY") */
  parentCode?: string
  /** Whether this is the default (WHO) */
  isDefault: boolean
}

// =============================================================================
// Location and Measurements
// =============================================================================

/**
 * Location metadata (maps city to jurisdiction)
 * Granularity: Country → State/Province → County/Region → City
 */
export interface Location {
  /** City name */
  city: string
  /** County or region name */
  county?: string
  /** State/province code */
  state: string
  /** Country code */
  country: string
  /** Applicable jurisdiction code */
  jurisdictionCode: string
  /** Latitude */
  latitude?: number
  /** Longitude */
  longitude?: number
}

/**
 * A single contaminant measurement for a location
 */
export interface LocationMeasurement {
  /** City name */
  city: string
  /** State/province code */
  state: string
  /** Country code */
  country: string
  /** Contaminant ID (references Contaminant.id) */
  contaminantId: string
  /** The measured value */
  value: number
  /** When this measurement was taken */
  measuredAt: string
  /** Data source (e.g., "EPA", "MELCC") */
  source?: string
  /** Link to source data */
  sourceUrl?: string
  /** Additional notes */
  notes?: string
}

/**
 * Measurement with computed status based on jurisdiction threshold
 */
export interface MeasurementWithStatus extends LocationMeasurement {
  /** Computed status based on threshold */
  status: SafetyStatus
  /** The threshold used for comparison */
  threshold?: ContaminantThreshold
  /** The WHO threshold for comparison */
  whoThreshold?: ContaminantThreshold
}

/**
 * Complete safety data for a location (city-level granularity)
 */
export interface LocationData {
  /** City name */
  city: string
  /** County or region name */
  county?: string
  /** State/province */
  state: string
  /** Country */
  country: string
  /** Applicable jurisdiction */
  jurisdictionCode: string
  /** Array of measurements with computed status */
  measurements: MeasurementWithStatus[]
}

// =============================================================================
// User Subscription
// =============================================================================

/**
 * User subscription to a location for notifications (city-level)
 */
export interface UserSubscription {
  /** Unique identifier */
  id: string
  /** City name */
  city: string
  /** State/province */
  state: string
  /** Country */
  country: string
  /** County/region (optional) */
  county?: string
  /** Enable push notifications */
  enablePush: boolean
  /** Enable email notifications */
  enableEmail: boolean
  /** Alert on danger status */
  alertOnDanger: boolean
  /** Alert on warning status */
  alertOnWarning: boolean
  /** Alert on any change */
  alertOnAnyChange: boolean
  /** Specific contaminants to watch (null = all) */
  watchContaminants?: string[]
  /** Notify when data becomes available */
  notifyWhenDataAvailable: boolean
  /** Creation timestamp */
  createdAt?: string
  /** Owner ID */
  owner?: string
}

// =============================================================================
// Hazard Reports
// =============================================================================

/**
 * Hazard category for reporting
 */
export interface HazardCategory {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Description of this hazard type */
  description: string
  /** Associated categories (can be legacy or contaminant categories) */
  relatedCategories: (ContaminantCategory | StatCategory)[]
}

/**
 * Product recommendation for hazard mitigation
 */
export interface ProductRecommendation {
  /** Unique identifier */
  id: string
  /** Product name */
  name: string
  /** Product description */
  description: string
  /** URL for more information */
  url: string
  /** Hazard category IDs this product helps with */
  hazardCategoryIds: string[]
}

/**
 * User-submitted hazard report
 */
export interface HazardReport {
  /** Unique identifier */
  id: string
  /** User ID who submitted */
  userId: string
  /** Hazard category ID */
  hazardCategoryId: string
  /** Description of the hazard */
  description: string
  /** Location description */
  location: string
  /** City where hazard was observed */
  city?: string
  /** State/province */
  state?: string
  /** Country */
  country?: string
  /** Submission timestamp */
  createdAt: string
  /** Report status */
  status: "pending" | "reviewed" | "resolved" | "dismissed"
}

// =============================================================================
// Legacy Types (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use ContaminantThreshold with specific jurisdiction
 */
export interface StatThresholds {
  danger: number
  warning: number
  higherIsBad: boolean
}

/**
 * @deprecated Use Contaminant instead
 */
export interface StatDefinition {
  id: string
  name: string
  unit: string
  description: string
  category: StatCategory
  thresholds: StatThresholds
}

/**
 * @deprecated Use LocationMeasurement instead
 */
export interface ZipCodeStat {
  statId: string
  value: number
  status: StatStatus
  lastUpdated: string
  history?: StatHistoryEntry[]
}

/**
 * @deprecated Use MeasurementWithStatus.history instead
 */
export interface StatHistoryEntry {
  value: number
  status: StatStatus
  recordedAt: string
}

/**
 * @deprecated Use LocationData instead
 */
export interface ZipCodeData {
  zipCode: string
  cityName: string
  state: string
  stats: ZipCodeStat[]
}

/**
 * Trend direction for a measurement
 */
export type TrendDirection = "improving" | "worsening" | "stable"

// =============================================================================
// Search Types
// =============================================================================

/**
 * Represents a search suggestion for city/state/postal code autocomplete
 */
export interface SearchSuggestion {
  /** Type of search result */
  type: "city" | "county" | "state" | "country" | "address"
  /** Primary display text (e.g., "Montreal, QC") */
  displayText: string
  /** Secondary text (e.g., "Quebec, Canada") */
  secondaryText: string
  /** City name */
  city?: string
  /** County/region name */
  county?: string
  /** State/province code */
  state?: string
  /** Country code */
  country?: string
}

/**
 * @deprecated Use UserSubscription instead
 */
export interface Subscription {
  id: string
  userId: string
  city: string
  state: string
  country: string
  pushToken?: string
  createdAt: string
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate safety status based on measurement value and threshold
 */
export function calculateStatus(
  value: number,
  threshold: ContaminantThreshold | undefined,
  higherIsBad: boolean = true,
): SafetyStatus {
  // If no threshold or banned/not controlled, we can't determine status
  if (!threshold || threshold.status === "banned") {
    return "danger" // Presence of banned substance is always danger
  }
  if (threshold.status === "not_controlled" || threshold.limitValue === null) {
    return "safe" // Can't evaluate without a limit
  }

  const limit = threshold.limitValue
  const warningRatio = threshold.warningRatio ?? 0.8
  const warningThreshold = limit * warningRatio

  if (higherIsBad) {
    if (value >= limit) return "danger"
    if (value >= warningThreshold) return "warning"
    return "safe"
  } else {
    if (value <= limit) return "danger"
    if (value <= warningThreshold) return "warning"
    return "safe"
  }
}

/**
 * Get the category display name
 */
export function getCategoryDisplayName(category: ContaminantCategory): string {
  const names: Record<ContaminantCategory, string> = {
    fertilizer: "Fertilizers",
    pesticide: "Pesticides",
    radioactive: "Radioactive",
    disinfectant: "Disinfection Byproducts",
    inorganic: "Heavy Metals & Inorganics",
    organic: "Organic Compounds",
    microbiological: "Microbiological",
  }
  return names[category] || category
}

/**
 * Get the category display name in French
 */
export function getCategoryDisplayNameFr(category: ContaminantCategory): string {
  const names: Record<ContaminantCategory, string> = {
    fertilizer: "Engrais",
    pesticide: "Pesticides",
    radioactive: "Radioactifs",
    disinfectant: "Sous-produits de désinfection",
    inorganic: "Métaux lourds et inorganiques",
    organic: "Composés organiques",
    microbiological: "Microbiologiques",
  }
  return names[category] || category
}
