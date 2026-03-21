/**
 * Jurisdiction Utilities
 *
 * Maps states/provinces to their appropriate jurisdiction codes for
 * contaminant threshold lookups.
 *
 * Supports dynamic jurisdiction data from the backend (via Jurisdiction model).
 * Falls back to a hardcoded map when no backend data is available.
 */

import type { Jurisdiction } from "@/data/types/safety"

import { detectPostalCodeRegion } from "./postalCode"

/**
 * Hardcoded fallback map - used when no backend jurisdiction data is available.
 * @deprecated Prefer passing jurisdictions from ContaminantsContext.
 */
const FALLBACK_STATE_JURISDICTIONS: Record<string, string> = {
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
 * Build a state→jurisdiction map from backend jurisdiction data.
 * Only includes jurisdictions that have a region (state/province) code.
 */
function buildStateJurisdictionMap(jurisdictions: Jurisdiction[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const j of jurisdictions) {
    if (j.region) {
      map[j.region.toUpperCase()] = j.code
    }
  }
  return map
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
 * @param jurisdictions - Optional backend jurisdiction data for dynamic lookup
 * @returns Jurisdiction code for threshold lookup
 *
 * @example
 * getJurisdictionForState("NY", "US") // "US-NY"
 * getJurisdictionForState("OH", "US") // "US" (Ohio uses federal limits)
 * getJurisdictionForState("QC", "CA") // "CA-QC"
 * getJurisdictionForState("SK", "CA") // "CA" (Saskatchewan uses federal limits)
 */
export function getJurisdictionForState(
  state: string,
  country: string,
  jurisdictions?: Jurisdiction[],
): string {
  // Normalize inputs
  const normalizedState = state?.toUpperCase() || ""
  const normalizedCountry = country?.toUpperCase() || ""

  // Use dynamic jurisdictions if available, otherwise fall back to hardcoded map
  const stateMap = jurisdictions
    ? buildStateJurisdictionMap(jurisdictions)
    : FALLBACK_STATE_JURISDICTIONS

  // Try state-specific jurisdiction first
  const stateJurisdiction = stateMap[normalizedState]
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
 * @param jurisdictions - Optional backend jurisdiction data for dynamic lookup
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
  country?: string,
  jurisdictions?: Jurisdiction[],
): string {
  // If country not provided, detect from postal code format
  const detectedCountry = country || detectPostalCodeRegion(postalCode) || "US"

  // If state is provided, use state-based lookup
  if (state) {
    return getJurisdictionForState(state, detectedCountry, jurisdictions)
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
 * @param jurisdictions - Optional backend jurisdiction data for dynamic lookup
 * @returns True if the state has specific thresholds
 */
export function hasStateSpecificLimits(state: string, jurisdictions?: Jurisdiction[]): boolean {
  const stateMap = jurisdictions
    ? buildStateJurisdictionMap(jurisdictions)
    : FALLBACK_STATE_JURISDICTIONS
  return state?.toUpperCase() in stateMap
}

/**
 * Get all jurisdictions for a country.
 *
 * @param country - Two-letter country code
 * @param jurisdictions - Optional backend jurisdiction data for dynamic lookup
 * @returns Array of jurisdiction codes for that country
 */
export function getJurisdictionsForCountry(
  country: string,
  jurisdictions?: Jurisdiction[],
): string[] {
  const normalizedCountry = country?.toUpperCase() || ""

  // If dynamic jurisdictions available, use them
  if (jurisdictions) {
    return jurisdictions
      .filter((j) => j.country.toUpperCase() === normalizedCountry)
      .map((j) => j.code)
  }

  // Fallback to hardcoded
  const result: string[] = []

  // Add federal jurisdiction
  if (normalizedCountry === "US" || normalizedCountry === "CA") {
    result.push(normalizedCountry)
  }

  // Add state-specific jurisdictions
  for (const [, jurisdiction] of Object.entries(FALLBACK_STATE_JURISDICTIONS)) {
    if (jurisdiction.startsWith(`${normalizedCountry}-`)) {
      result.push(jurisdiction)
    }
  }

  return result
}
