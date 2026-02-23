/**
 * Observation Utilities
 *
 * Shared utilities for O&M observations including category icons and status colors.
 */

import type { ObservedPropertyCategory } from "@/data/types/safety"

/**
 * Icon names for observation categories
 */
export type CategoryIconName =
  | "water"
  | "air-filter"
  | "virus"
  | "radioactive"
  | "leaf"
  | "volume-high"
  | "weather-cloudy"
  | "home-city"
  | "alert-circle"

/**
 * Safety status type
 */
export type SafetyStatus = "danger" | "warning" | "safe"

/**
 * Get icon name for observation category
 */
export function getCategoryIcon(category: string | ObservedPropertyCategory): CategoryIconName {
  const icons: Record<string, CategoryIconName> = {
    water_quality: "water",
    air_quality: "air-filter",
    disease: "virus",
    radiation: "radioactive",
    soil: "leaf",
    noise: "volume-high",
    climate: "weather-cloudy",
    infrastructure: "home-city",
  }
  return icons[category] ?? "alert-circle"
}

/**
 * Get status color key for theme colors
 * Returns the theme color key to use for the given status
 */
export function getStatusColorKey(
  status: SafetyStatus,
): "statusDanger" | "statusWarning" | "statusSafe" {
  const colorKeys: Record<SafetyStatus, "statusDanger" | "statusWarning" | "statusSafe"> = {
    danger: "statusDanger",
    warning: "statusWarning",
    safe: "statusSafe",
  }
  return colorKeys[status]
}

/**
 * Format date for display
 */
export function formatObservationDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString
    }
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}
