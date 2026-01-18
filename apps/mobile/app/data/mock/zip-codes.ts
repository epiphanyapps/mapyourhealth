/**
 * Mock Zip Code Data for MapYourHealth
 *
 * This file contains mock zip code safety data for development and testing.
 * Production data will come from the Amplify backend.
 *
 * Zip codes included:
 * - 90210 (Beverly Hills, CA) - Generally safe with wildfire warning
 * - 10001 (New York, NY) - Mixed with air quality issues
 * - 33139 (Miami Beach, FL) - Safe with flood danger
 * - 60601 (Chicago, IL) - Generally good with some water warnings
 * - 98101 (Seattle, WA) - Very safe overall
 */

import { StatStatus, ZipCodeData, ZipCodeStat } from "../types/safety"
import { allStatDefinitions } from "./stat-definitions"

/**
 * Helper function to calculate status based on thresholds
 */
function calculateStatus(
  value: number,
  thresholds: { danger: number; warning: number; higherIsBad: boolean },
): StatStatus {
  if (thresholds.higherIsBad) {
    if (value >= thresholds.danger) return "danger"
    if (value >= thresholds.warning) return "warning"
    return "safe"
  } else {
    // For metrics where lower is bad (like healthcare access)
    if (value <= thresholds.danger) return "danger"
    if (value <= thresholds.warning) return "warning"
    return "safe"
  }
}

/**
 * Helper to create a ZipCodeStat with calculated status
 */
function createStat(statId: string, value: number): ZipCodeStat {
  const definition = allStatDefinitions.find((s) => s.id === statId)
  if (!definition) {
    throw new Error(`Stat definition not found: ${statId}`)
  }

  return {
    statId,
    value,
    status: calculateStatus(value, definition.thresholds),
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Beverly Hills, CA - Generally safe with wildfire warning
 * Affluent area with good water/air quality but high wildfire risk
 */
export const beverlyHillsData: ZipCodeData = {
  zipCode: "90210",
  cityName: "Beverly Hills",
  state: "CA",
  stats: [
    // Water - all safe
    createStat("water-lead", 3),
    createStat("water-nitrate", 2),
    createStat("water-bacteria", 0),
    // Air - safe
    createStat("air-aqi", 45),
    createStat("air-pm25", 12),
    createStat("air-ozone", 35),
    // Health - safe
    createStat("health-covid", 50),
    createStat("health-flu", 15),
    createStat("health-access", 95),
    // Disaster - wildfire warning
    createStat("disaster-wildfire", 6),
    createStat("disaster-flood", 2),
  ],
}

/**
 * New York, NY - Mixed with air quality issues
 * Dense urban area with air quality warnings
 */
export const newYorkData: ZipCodeData = {
  zipCode: "10001",
  cityName: "New York",
  state: "NY",
  stats: [
    // Water - warning on lead (older infrastructure)
    createStat("water-lead", 12),
    createStat("water-nitrate", 4),
    createStat("water-bacteria", 0),
    // Air - warning on AQI and PM2.5
    createStat("air-aqi", 115),
    createStat("air-pm25", 28),
    createStat("air-ozone", 48),
    // Health - warning on COVID
    createStat("health-covid", 150),
    createStat("health-flu", 30),
    createStat("health-access", 92),
    // Disaster - safe
    createStat("disaster-wildfire", 1),
    createStat("disaster-flood", 3),
  ],
}

/**
 * Miami Beach, FL - Safe with flood danger
 * Coastal area with high flood risk due to sea level and hurricanes
 */
export const miamiBeachData: ZipCodeData = {
  zipCode: "33139",
  cityName: "Miami Beach",
  state: "FL",
  stats: [
    // Water - safe
    createStat("water-lead", 5),
    createStat("water-nitrate", 3),
    createStat("water-bacteria", 0),
    // Air - safe
    createStat("air-aqi", 55),
    createStat("air-pm25", 10),
    createStat("air-ozone", 40),
    // Health - safe
    createStat("health-covid", 80),
    createStat("health-flu", 20),
    createStat("health-access", 88),
    // Disaster - flood DANGER
    createStat("disaster-wildfire", 1),
    createStat("disaster-flood", 8),
  ],
}

/**
 * Chicago, IL - Generally good with some water warnings
 * Urban area with aging water infrastructure
 */
export const chicagoData: ZipCodeData = {
  zipCode: "60601",
  cityName: "Chicago",
  state: "IL",
  stats: [
    // Water - lead DANGER (old pipes)
    createStat("water-lead", 18),
    createStat("water-nitrate", 5),
    createStat("water-bacteria", 2),
    // Air - warning
    createStat("air-aqi", 95),
    createStat("air-pm25", 22),
    createStat("air-ozone", 45),
    // Health - warning
    createStat("health-covid", 120),
    createStat("health-flu", 35),
    createStat("health-access", 80),
    // Disaster - safe
    createStat("disaster-wildfire", 1),
    createStat("disaster-flood", 4),
  ],
}

/**
 * Seattle, WA - Very safe overall
 * Clean city with good environmental ratings
 */
export const seattleData: ZipCodeData = {
  zipCode: "98101",
  cityName: "Seattle",
  state: "WA",
  stats: [
    // Water - safe
    createStat("water-lead", 4),
    createStat("water-nitrate", 2),
    createStat("water-bacteria", 0),
    // Air - safe
    createStat("air-aqi", 35),
    createStat("air-pm25", 8),
    createStat("air-ozone", 30),
    // Health - safe
    createStat("health-covid", 60),
    createStat("health-flu", 18),
    createStat("health-access", 93),
    // Disaster - safe
    createStat("disaster-wildfire", 3),
    createStat("disaster-flood", 2),
  ],
}

/**
 * All mock zip code data
 */
export const allZipCodeData: ZipCodeData[] = [
  beverlyHillsData,
  newYorkData,
  miamiBeachData,
  chicagoData,
  seattleData,
]

/**
 * Map of zip codes to data for quick lookup
 */
export const zipCodeDataMap: Record<string, ZipCodeData> = {
  "90210": beverlyHillsData,
  "10001": newYorkData,
  "33139": miamiBeachData,
  "60601": chicagoData,
  "98101": seattleData,
}

/**
 * Get zip code data by zip code string
 */
export function getZipCodeDataByCode(zipCode: string): ZipCodeData | undefined {
  return zipCodeDataMap[zipCode]
}

/**
 * Get all available zip codes
 */
export function getAvailableZipCodes(): string[] {
  return Object.keys(zipCodeDataMap)
}
