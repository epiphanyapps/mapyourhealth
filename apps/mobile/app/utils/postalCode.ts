/**
 * Postal Code Utilities
 *
 * Handles international postal code validation and terminology.
 * Supports US ZIP codes, Canadian postal codes, and other formats.
 */

import * as Localization from "expo-localization"

/**
 * Get the appropriate label for postal codes based on region
 * - US: "zip code"
 * - Canada: "postal code"
 * - UK: "postcode"
 * - Others: "ZIP/postal code"
 */
export function getPostalCodeLabel(region?: string): string {
  const detectedRegion = region || Localization.getLocales()[0]?.regionCode || ""

  switch (detectedRegion.toUpperCase()) {
    case "US":
      return "zip code"
    case "CA":
      return "postal code"
    case "GB":
    case "UK":
      return "postcode"
    default:
      return "ZIP/postal code"
  }
}

/**
 * Get capitalized version for use at start of sentences
 */
export function getPostalCodeLabelCapitalized(region?: string): string {
  const label = getPostalCodeLabel(region)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Postal code validation patterns by country
 */
const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  // US: 5 digits or 5+4 format
  US: /^\d{5}(-\d{4})?$/,
  // Canada: A1A 1A1 or A1A1A1 format
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  // UK: Various formats (simplified)
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]?[ ]?\d[A-Za-z]{2}$/,
  // Australia: 4 digits
  AU: /^\d{4}$/,
  // Generic: 3-10 alphanumeric characters
  DEFAULT: /^[A-Za-z0-9]{3,10}$/,
}

/**
 * Validate a postal code
 * Returns true if the postal code matches any known format
 */
export function isValidPostalCode(postalCode: string): boolean {
  const trimmed = postalCode.trim()
  if (!trimmed) return false

  // Check against all known patterns
  return Object.values(POSTAL_CODE_PATTERNS).some((pattern) => pattern.test(trimmed))
}

/**
 * Detect the country/region from a postal code format
 * Returns the region code or null if unknown
 */
export function detectPostalCodeRegion(postalCode: string): string | null {
  const trimmed = postalCode.trim()

  if (POSTAL_CODE_PATTERNS.US.test(trimmed)) return "US"
  if (POSTAL_CODE_PATTERNS.CA.test(trimmed)) return "CA"
  if (POSTAL_CODE_PATTERNS.GB.test(trimmed)) return "GB"
  if (POSTAL_CODE_PATTERNS.AU.test(trimmed)) return "AU"

  return null
}

/**
 * Normalize a postal code for storage
 * - Uppercase
 * - Remove extra spaces
 * - Canadian codes: remove space (M5V 3L9 → M5V3L9)
 */
export function normalizePostalCode(postalCode: string): string {
  const trimmed = postalCode.trim().toUpperCase()

  // Canadian postal codes: remove space
  if (POSTAL_CODE_PATTERNS.CA.test(trimmed)) {
    return trimmed.replace(/[ -]/g, "")
  }

  return trimmed
}

/**
 * Format a postal code for display
 * - Canadian codes: add space (M5V3L9 → M5V 3L9)
 */
export function formatPostalCodeForDisplay(postalCode: string): string {
  const normalized = normalizePostalCode(postalCode)

  // Canadian postal codes: add space in middle
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(normalized)) {
    return `${normalized.slice(0, 3)} ${normalized.slice(3)}`
  }

  return normalized
}
