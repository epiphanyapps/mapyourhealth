/**
 * Safety Data Types for MapYourHealth
 *
 * These types define the data structures for safety statistics,
 * zip code data, and related entities.
 */

/**
 * Categories for safety statistics
 */
export enum StatCategory {
  water = "water",
  air = "air",
  health = "health",
  disaster = "disaster",
}

/**
 * Status levels indicating safety severity
 */
export type StatStatus = "danger" | "warning" | "safe"

/**
 * Thresholds for determining stat status
 */
export interface StatThresholds {
  /** Value at or above which status is "danger" */
  danger: number
  /** Value at or above which status is "warning" (below danger) */
  warning: number
  /** Whether higher values are worse (true) or better (false) */
  higherIsBad: boolean
}

/**
 * Definition of a safety statistic (metadata)
 */
export interface StatDefinition {
  /** Unique identifier for the stat */
  id: string
  /** Display name of the stat */
  name: string
  /** Unit of measurement (e.g., "ppb", "AQI", "%") */
  unit: string
  /** Description of what this stat measures */
  description: string
  /** Category this stat belongs to */
  category: StatCategory
  /** Thresholds for determining status */
  thresholds: StatThresholds
}

/**
 * A single stat value for a specific zip code
 */
export interface ZipCodeStat {
  /** Reference to the stat definition id */
  statId: string
  /** The measured value */
  value: number
  /** Calculated status based on thresholds */
  status: StatStatus
  /** Timestamp when this measurement was taken */
  lastUpdated: string
}

/**
 * Complete safety data for a zip code
 */
export interface ZipCodeData {
  /** The zip code (e.g., "90210") */
  zipCode: string
  /** City or area name */
  cityName: string
  /** State abbreviation */
  state: string
  /** Array of stat values for this zip code */
  stats: ZipCodeStat[]
}

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
  /** Associated stat categories */
  relatedCategories: StatCategory[]
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
  /** Zip code where hazard was observed */
  zipCode: string
  /** Submission timestamp */
  createdAt: string
  /** Report status */
  status: "pending" | "reviewed" | "resolved"
}

/**
 * User subscription to a zip code
 */
export interface Subscription {
  /** Unique identifier */
  id: string
  /** User ID */
  userId: string
  /** Subscribed zip code */
  zipCode: string
  /** Push notification token (optional) */
  pushToken?: string
  /** Subscription creation timestamp */
  createdAt: string
}
