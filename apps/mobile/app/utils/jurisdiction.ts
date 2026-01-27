/**
 * Jurisdiction Utilities
 *
 * Maps states/provinces to their appropriate jurisdiction codes for
 * contaminant threshold lookups.
 */

import { detectPostalCodeRegion } from "./postalCode"

/**
 * State-specific jurisdictions that have their own threshold limits.
 * These states have stricter or different limits than their federal counterparts.
 */
const STATE_JURISDICTIONS: Record<string, string> = {
  // US States with specific thresholds
  NY: "US-NY",
  CA: "US-CA",
  TX: "US-TX",
  FL: "US-FL",
  IL: "US-IL",
  WA: "US-WA",
  GA: "US-GA",
  AZ: "US-AZ",
  CO: "US-CO",
  MA: "US-MA",

  // Canadian Provinces with specific thresholds
  QC: "CA-QC",
  ON: "CA-ON",
  BC: "CA-BC",
  AB: "CA-AB",
}

/**
 * Get the appropriate jurisdiction code for a state/province and country.
 *
 * Falls back through the hierarchy:
 * 1. State-specific jurisdiction (e.g., US-NY, CA-QC)
 * 2. Country federal jurisdiction (e.g., US, CA)
 * 3. WHO (global default)
 *
 * @param state - Two-letter state/province code (e.g., "NY", "QC")
 * @param country - Two-letter country code (e.g., "US", "CA")
 * @returns Jurisdiction code for threshold lookup
 *
 * @example
 * getJurisdictionForState("NY", "US") // "US-NY"
 * getJurisdictionForState("OH", "US") // "US" (Ohio uses federal limits)
 * getJurisdictionForState("QC", "CA") // "CA-QC"
 * getJurisdictionForState("SK", "CA") // "CA" (Saskatchewan uses federal limits)
 */
export function getJurisdictionForState(state: string, country: string): string {
  // Normalize inputs
  const normalizedState = state?.toUpperCase() || ""
  const normalizedCountry = country?.toUpperCase() || ""

  // Try state-specific jurisdiction first
  const stateJurisdiction = STATE_JURISDICTIONS[normalizedState]
  if (stateJurisdiction) {
    return stateJurisdiction
  }

  // Fall back to country federal
  if (normalizedCountry === "CA") return "CA"
  if (normalizedCountry === "US") return "US"
  if (normalizedCountry === "EU") return "EU"

  // Global fallback
  return "WHO"
}

/**
 * Get jurisdiction code from a postal code.
 *
 * Detects the country from the postal code format and uses bundled
 * metadata or mock data to determine the state for US zip codes.
 *
 * @param postalCode - The postal/zip code
 * @param state - Optional state code (if already known)
 * @param country - Optional country code (if already known)
 * @returns Jurisdiction code for threshold lookup
 *
 * @example
 * getJurisdictionForPostalCode("10001", "NY") // "US-NY" (NYC)
 * getJurisdictionForPostalCode("H2X1Y6") // "CA" (Montreal - needs state lookup)
 * getJurisdictionForPostalCode("90210", "CA") // "US-CA" (Beverly Hills)
 */
export function getJurisdictionForPostalCode(
  postalCode: string,
  state?: string,
  country?: string
): string {
  // If country not provided, detect from postal code format
  const detectedCountry = country || detectPostalCodeRegion(postalCode) || "US"

  // If state is provided, use state-based lookup
  if (state) {
    return getJurisdictionForState(state, detectedCountry)
  }

  // Without state, fall back to country level
  if (detectedCountry === "CA") return "CA"
  if (detectedCountry === "US") return "US"
  if (detectedCountry === "GB" || detectedCountry === "UK") return "EU"
  if (["DE", "FR", "NL", "AU"].includes(detectedCountry)) return "EU"

  return "WHO"
}

/**
 * Check if a jurisdiction has state/province-specific limits.
 *
 * @param state - Two-letter state/province code
 * @returns True if the state has specific thresholds
 */
export function hasStateSpecificLimits(state: string): boolean {
  return state?.toUpperCase() in STATE_JURISDICTIONS
}

/**
 * Get all jurisdictions for a country.
 *
 * @param country - Two-letter country code
 * @returns Array of jurisdiction codes for that country
 */
export function getJurisdictionsForCountry(country: string): string[] {
  const normalizedCountry = country?.toUpperCase() || ""
  const result: string[] = []

  // Add federal jurisdiction
  if (normalizedCountry === "US" || normalizedCountry === "CA") {
    result.push(normalizedCountry)
  }

  // Add state-specific jurisdictions
  for (const [state, jurisdiction] of Object.entries(STATE_JURISDICTIONS)) {
    if (jurisdiction.startsWith(`${normalizedCountry}-`)) {
      result.push(jurisdiction)
    }
  }

  return result
}
