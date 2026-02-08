/**
 * Mock Stat Definitions for MapYourHealth
 *
 * This file contains mock stat definitions for development and testing.
 * Production data will come from the Amplify backend.
 *
 * Categories and Stats:
 * - Water (3): Lead Levels, Nitrate Levels, Bacteria Count
 * - Air (3): Air Quality Index, PM2.5 Levels, Ozone Levels
 * - Health (3): COVID-19 Cases, Flu Cases, Healthcare Access
 * - Disaster (2): Wildfire Risk, Flood Risk
 */

import { StatCategory, StatDefinition } from "../types/safety"

/**
 * Water quality stat definitions
 */
export const waterStatDefinitions: StatDefinition[] = [
  {
    id: "water-lead",
    name: "Lead Levels",
    unit: "ppb",
    description: "Lead concentration in drinking water. EPA action level is 15 ppb.",
    category: StatCategory.water,
    thresholds: {
      danger: 15,
      warning: 10,
      higherIsBad: true,
    },
  },
  {
    id: "water-nitrate",
    name: "Nitrate Levels",
    unit: "mg/L",
    description: "Nitrate concentration in drinking water. EPA limit is 10 mg/L.",
    category: StatCategory.water,
    thresholds: {
      danger: 10,
      warning: 7,
      higherIsBad: true,
    },
  },
  {
    id: "water-bacteria",
    name: "Bacteria Count",
    unit: "CFU/100mL",
    description: "Coliform bacteria presence in water supply.",
    category: StatCategory.water,
    thresholds: {
      danger: 5,
      warning: 1,
      higherIsBad: true,
    },
  },
]

/**
 * Air quality stat definitions
 */
export const airStatDefinitions: StatDefinition[] = [
  {
    id: "air-aqi",
    name: "Air Quality Index",
    unit: "AQI",
    description:
      "Overall air quality measurement. Values above 100 are unhealthy for sensitive groups.",
    category: StatCategory.air,
    thresholds: {
      danger: 150,
      warning: 100,
      higherIsBad: true,
    },
  },
  {
    id: "air-pm25",
    name: "PM2.5 Levels",
    unit: "µg/m³",
    description: "Fine particulate matter concentration. WHO guideline is 15 µg/m³ annual average.",
    category: StatCategory.air,
    thresholds: {
      danger: 35,
      warning: 15,
      higherIsBad: true,
    },
  },
  {
    id: "air-ozone",
    name: "Ozone Levels",
    unit: "ppb",
    description: "Ground-level ozone concentration. EPA standard is 70 ppb (8-hour average).",
    category: StatCategory.air,
    thresholds: {
      danger: 70,
      warning: 50,
      higherIsBad: true,
    },
  },
]

/**
 * Health stat definitions
 */
export const healthStatDefinitions: StatDefinition[] = [
  {
    id: "health-covid",
    name: "COVID-19 Cases",
    unit: "per 100k",
    description: "Weekly COVID-19 cases per 100,000 population.",
    category: StatCategory.health,
    thresholds: {
      danger: 200,
      warning: 100,
      higherIsBad: true,
    },
  },
  {
    id: "health-flu",
    name: "Flu Cases",
    unit: "per 100k",
    description: "Weekly influenza cases per 100,000 population.",
    category: StatCategory.health,
    thresholds: {
      danger: 50,
      warning: 25,
      higherIsBad: true,
    },
  },
  {
    id: "health-access",
    name: "Healthcare Access",
    unit: "%",
    description: "Percentage of population with access to primary healthcare within 30 minutes.",
    category: StatCategory.health,
    thresholds: {
      danger: 70,
      warning: 85,
      higherIsBad: false,
    },
  },
]

/**
 * Disaster risk stat definitions
 */
export const disasterStatDefinitions: StatDefinition[] = [
  {
    id: "disaster-wildfire",
    name: "Wildfire Risk",
    unit: "level",
    description:
      "Wildfire risk assessment based on vegetation, weather, and historical data. Scale 1-10.",
    category: StatCategory.disaster,
    thresholds: {
      danger: 7,
      warning: 4,
      higherIsBad: true,
    },
  },
  {
    id: "disaster-flood",
    name: "Flood Risk",
    unit: "level",
    description: "Flood risk assessment based on terrain, precipitation, and drainage. Scale 1-10.",
    category: StatCategory.disaster,
    thresholds: {
      danger: 7,
      warning: 4,
      higherIsBad: true,
    },
  },
]

/**
 * All stat definitions combined
 */
export const allStatDefinitions: StatDefinition[] = [
  ...waterStatDefinitions,
  ...airStatDefinitions,
  ...healthStatDefinitions,
  ...disasterStatDefinitions,
]

/**
 * Helper to get stat definition by ID
 */
export function getStatDefinitionById(id: string): StatDefinition | undefined {
  return allStatDefinitions.find((stat) => stat.id === id)
}

/**
 * Helper to get stat definitions by category
 */
export function getStatDefinitionsByCategory(category: StatCategory): StatDefinition[] {
  return allStatDefinitions.filter((stat) => stat.category === category)
}
