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
 * @deprecated Use ContaminantCategory instead
 */
export enum StatCategory {
  water = "water",
  air = "air",
  health = "health",
  disaster = "disaster",
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

// =============================================================================
// O&M (Observations & Measurements) Types
// =============================================================================

/**
 * Categories for observed properties
 */
export type ObservedPropertyCategory =
  | "water_quality"
  | "air_quality"
  | "disease"
  | "radiation"
  | "soil"
  | "noise"
  | "climate"
  | "infrastructure"

/**
 * Types of observations
 */
export type ObservationType = "numeric" | "zone" | "endemic" | "incidence" | "binary"

/**
 * Property threshold status
 */
export type PropertyThresholdStatus = "active" | "historical" | "not_applicable"

/**
 * Definition of an observed property (what can be measured/observed)
 */
export interface ObservedProperty {
  /** Unique identifier (e.g., "air_quality_index", "lyme_disease") */
  id: string
  /** Display name */
  name: string
  /** French name */
  nameFr?: string
  /** Category */
  category: ObservedPropertyCategory
  /** How this property is observed/measured */
  observationType: ObservationType
  /** Unit of measurement (for numeric types) */
  unit?: string
  /** Description (English) */
  description?: string
  /** Description (French) */
  descriptionFr?: string
  /** Whether higher values are worse */
  higherIsBad: boolean
}

/**
 * Jurisdiction-specific threshold for an observed property
 */
export interface PropertyThreshold {
  /** Property ID this threshold applies to */
  propertyId: string
  /** Jurisdiction code */
  jurisdictionCode: string
  /** Limit/danger value for numeric observations */
  limitValue?: number
  /** Warning value for numeric observations */
  warningValue?: number
  /** Zone mapping for zone-based observations */
  zoneMapping?: Record<string, SafetyStatus>
  /** Whether endemic presence is danger (vs warning) */
  endemicIsDanger?: boolean
  /** Warning threshold for incidence rate */
  incidenceWarningThreshold?: number
  /** Danger threshold for incidence rate */
  incidenceDangerThreshold?: number
  /** Threshold status */
  status: PropertyThresholdStatus
}

/**
 * A single observation at a location
 */
export interface LocationObservation {
  /** City name */
  city: string
  /** State/province code */
  state: string
  /** Country code */
  country: string
  /** County/region */
  county?: string
  /** Property ID being observed */
  propertyId: string
  /** Numeric value (for numeric observation type) */
  numericValue?: number
  /** Zone value (for zone observation type) */
  zoneValue?: string
  /** Endemic value (for endemic observation type) */
  endemicValue?: boolean
  /** Incidence value (for incidence observation type) */
  incidenceValue?: number
  /** Binary value (for binary observation type) */
  binaryValue?: boolean
  /** When the observation was made */
  observedAt: string
  /** When this observation expires */
  validUntil?: string
  /** Data source */
  source?: string
  /** Link to source */
  sourceUrl?: string
  /** Additional notes */
  notes?: string
}

/**
 * Observation with computed status
 */
export interface ObservationWithStatus extends LocationObservation {
  /** Computed safety status */
  status: SafetyStatus
  /** The property definition */
  property?: ObservedProperty
  /** The threshold used for status calculation */
  threshold?: PropertyThreshold
}

/**
 * Calculate safety status for an observation based on property type and threshold
 */
export function calculateObservationStatus(
  observation: LocationObservation,
  property: ObservedProperty,
  threshold: PropertyThreshold | undefined,
): SafetyStatus {
  // If no threshold or not applicable, we can't determine status
  if (!threshold || threshold.status === "not_applicable") {
    return "safe" // Default to safe when we can't evaluate
  }

  switch (property.observationType) {
    case "numeric": {
      const value = observation.numericValue
      if (value == null) return "safe"

      const limit = threshold.limitValue
      const warning = threshold.warningValue

      if (limit == null) return "safe" // Can't evaluate without a limit

      if (property.higherIsBad) {
        if (value >= limit) return "danger"
        if (warning != null && value >= warning) return "warning"
        return "safe"
      } else {
        if (value <= limit) return "danger"
        if (warning != null && value <= warning) return "warning"
        return "safe"
      }
    }

    case "zone": {
      const zoneValue = observation.zoneValue
      if (!zoneValue || !threshold.zoneMapping) return "safe"

      const mappedStatus = threshold.zoneMapping[zoneValue]
      return mappedStatus || "safe"
    }

    case "endemic": {
      const isEndemic = observation.endemicValue
      if (!isEndemic) return "safe"

      // Endemic presence - check if it's danger or warning level
      return threshold.endemicIsDanger ? "danger" : "warning"
    }

    case "incidence": {
      const rate = observation.incidenceValue
      if (rate == null) return "safe"

      const dangerThreshold = threshold.incidenceDangerThreshold
      const warningThreshold = threshold.incidenceWarningThreshold

      if (dangerThreshold != null && rate >= dangerThreshold) return "danger"
      if (warningThreshold != null && rate >= warningThreshold) return "warning"
      return "safe"
    }

    case "binary": {
      const isActive = observation.binaryValue
      if (!isActive) return "safe"

      // Active binary (e.g., boil water advisory) is typically danger
      return property.higherIsBad ? "danger" : "safe"
    }

    default:
      return "safe"
  }
}

/**
 * Get display name for observed property category
 */
export function getObservedPropertyCategoryDisplayName(
  category: ObservedPropertyCategory,
): string {
  const names: Record<ObservedPropertyCategory, string> = {
    water_quality: "Water Quality",
    air_quality: "Air Quality",
    disease: "Disease & Health",
    radiation: "Radiation",
    soil: "Soil Quality",
    noise: "Noise Pollution",
    climate: "Climate & Weather",
    infrastructure: "Infrastructure",
  }
  return names[category] || category
}

/**
 * Get display name for observed property category in French
 */
export function getObservedPropertyCategoryDisplayNameFr(
  category: ObservedPropertyCategory,
): string {
  const names: Record<ObservedPropertyCategory, string> = {
    water_quality: "Qualité de l'eau",
    air_quality: "Qualité de l'air",
    disease: "Maladies et santé",
    radiation: "Radiation",
    soil: "Qualité du sol",
    noise: "Pollution sonore",
    climate: "Climat et météo",
    infrastructure: "Infrastructure",
  }
  return names[category] || category
}

/**
 * Get display name for observation type
 */
export function getObservationTypeDisplayName(type: ObservationType): string {
  const names: Record<ObservationType, string> = {
    numeric: "Numeric Value",
    zone: "Zone/Category",
    endemic: "Endemic Status",
    incidence: "Incidence Rate",
    binary: "Yes/No",
  }
  return names[type] || type
}

/**
 * Format observation value for display
 */
export function formatObservationValue(
  observation: LocationObservation,
  property: ObservedProperty,
): string {
  switch (property.observationType) {
    case "numeric":
      if (observation.numericValue == null) return "—"
      return property.unit
        ? `${observation.numericValue} ${property.unit}`
        : observation.numericValue.toString()

    case "zone":
      return observation.zoneValue || "—"

    case "endemic":
      return observation.endemicValue ? "Endemic" : "Not Endemic"

    case "incidence":
      if (observation.incidenceValue == null) return "—"
      return `${observation.incidenceValue} per 100k`

    case "binary":
      return observation.binaryValue ? "Yes" : "No"

    default:
      return "—"
  }
}
