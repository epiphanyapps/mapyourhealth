/**
 * Postal Code Utilities
 *
 * Normalization for postal codes used in reverse geocoding results.
 */

/**
 * Known postal code patterns by country (used for normalization)
 */
const KNOWN_PATTERNS: Record<string, RegExp> = {
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  JP: /^\d{3}-?\d{4}$/,
  NL: /^\d{4}[ ]?[A-Za-z]{2}$/,
}

/**
 * Normalize a postal code for storage
 * - Uppercase
 * - Trim whitespace
 * - Canadian codes: remove space (M5V 3L9 -> M5V3L9)
 * - Japanese codes: remove dash (123-4567 -> 1234567)
 * - Netherlands: remove space (1234 AB -> 1234AB)
 */
export function normalizePostalCode(postalCode: string): string {
  const trimmed = postalCode.trim().toUpperCase()

  if (KNOWN_PATTERNS.CA.test(trimmed)) {
    return trimmed.replace(/[ -]/g, "")
  }

  if (KNOWN_PATTERNS.JP.test(trimmed)) {
    return trimmed.replace(/-/g, "")
  }

  if (KNOWN_PATTERNS.NL.test(trimmed)) {
    return trimmed.replace(/ /g, "")
  }

  return trimmed
}
