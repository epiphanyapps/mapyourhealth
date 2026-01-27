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
 * Known postal code patterns by country (used for detection and normalization)
 * Note: These are NOT used for strict validation - we accept most reasonable inputs
 */
const KNOWN_PATTERNS: Record<string, RegExp> = {
  // US: 5 digits or 5+4 format
  US: /^\d{5}(-\d{4})?$/,
  // Canada: A1A 1A1 or A1A1A1 format
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  // UK: Various formats
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]?[ ]?\d[A-Za-z]{2}$/,
  // Australia: 4 digits
  AU: /^\d{4}$/,
  // Germany/Austria/Switzerland: 4-5 digits
  DE: /^\d{4,5}$/,
  // France: 5 digits
  FR: /^\d{5}$/,
  // Netherlands: 4 digits + 2 letters
  NL: /^\d{4}[ ]?[A-Za-z]{2}$/,
  // Japan: 3 digits - 4 digits or 7 digits
  JP: /^\d{3}-?\d{4}$/,
  // India: 6 digits
  IN: /^\d{6}$/,
}

/**
 * Validate a postal code
 *
 * Philosophy: Accept flexibly, let the data layer determine if we have coverage.
 * We accept most reasonable inputs (2-12 alphanumeric chars with optional spaces/dashes)
 * rather than rejecting based on strict country-specific patterns.
 */
export function isValidPostalCode(postalCode: string): boolean {
  const trimmed = postalCode.trim()
  if (!trimmed) return false

  // Minimum 4 chars (shortest valid format: Australian 4-digit codes), maximum 12 chars
  if (trimmed.length < 4 || trimmed.length > 12) return false

  // Must start and end with alphanumeric, can contain spaces or dashes in between
  // This covers virtually all postal code formats worldwide
  return /^[A-Za-z0-9][A-Za-z0-9 -]*[A-Za-z0-9]$/.test(trimmed)
}

/**
 * Detect the country/region from a postal code format
 * Returns the region code or null if unknown
 */
export function detectPostalCodeRegion(postalCode: string): string | null {
  const trimmed = postalCode.trim()

  // Check specific patterns (order matters - check more specific patterns first)
  if (KNOWN_PATTERNS.CA.test(trimmed)) return "CA"
  if (KNOWN_PATTERNS.GB.test(trimmed)) return "GB"
  if (KNOWN_PATTERNS.NL.test(trimmed)) return "NL"
  if (KNOWN_PATTERNS.JP.test(trimmed)) return "JP"
  if (KNOWN_PATTERNS.IN.test(trimmed)) return "IN"
  if (KNOWN_PATTERNS.US.test(trimmed)) return "US"
  if (KNOWN_PATTERNS.AU.test(trimmed)) return "AU"
  if (KNOWN_PATTERNS.DE.test(trimmed)) return "DE"
  if (KNOWN_PATTERNS.FR.test(trimmed)) return "FR"

  return null
}

/**
 * Normalize a postal code for storage
 * - Uppercase
 * - Trim whitespace
 * - Canadian codes: remove space (M5V 3L9 → M5V3L9)
 * - Japanese codes: remove dash (123-4567 → 1234567)
 * - Netherlands: remove space (1234 AB → 1234AB)
 */
export function normalizePostalCode(postalCode: string): string {
  const trimmed = postalCode.trim().toUpperCase()

  // Canadian postal codes: remove space/dash
  if (KNOWN_PATTERNS.CA.test(trimmed)) {
    return trimmed.replace(/[ -]/g, "")
  }

  // Japanese postal codes: remove dash
  if (KNOWN_PATTERNS.JP.test(trimmed)) {
    return trimmed.replace(/-/g, "")
  }

  // Netherlands: remove space
  if (KNOWN_PATTERNS.NL.test(trimmed)) {
    return trimmed.replace(/ /g, "")
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
