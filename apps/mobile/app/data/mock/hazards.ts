/**
 * Mock Hazard Categories for MapYourHealth
 *
 * This file contains mock hazard category definitions for development and testing.
 * Production data will come from the Amplify backend.
 *
 * 8 Hazard Categories covering water, air, health, and disaster concerns:
 * 1. Contaminated Water - Lead, bacteria, nitrates in water supply
 * 2. Poor Air Quality - High AQI, PM2.5, or ozone levels
 * 3. Respiratory Health - Air-related health concerns
 * 4. Infectious Disease - COVID-19, flu, and other outbreaks
 * 5. Limited Healthcare - Low healthcare access
 * 6. Wildfire Danger - High wildfire risk areas
 * 7. Flood Danger - High flood risk areas
 * 8. General Emergency - Multi-hazard preparedness
 */

import { HazardCategory, StatCategory } from "../types/safety"

/**
 * Water-related hazard categories
 */
export const waterHazards: HazardCategory[] = [
  {
    id: "hazard-contaminated-water",
    name: "Contaminated Water",
    description:
      "Water supply may contain elevated levels of lead, bacteria, nitrates, or other contaminants that pose health risks.",
    relatedCategories: [StatCategory.water],
  },
]

/**
 * Air-related hazard categories
 */
export const airHazards: HazardCategory[] = [
  {
    id: "hazard-poor-air-quality",
    name: "Poor Air Quality",
    description:
      "Air quality index, PM2.5, or ozone levels exceed healthy thresholds. Outdoor activities may be restricted.",
    relatedCategories: [StatCategory.air],
  },
  {
    id: "hazard-respiratory",
    name: "Respiratory Health Concerns",
    description:
      "Air conditions may aggravate respiratory conditions like asthma, COPD, or allergies.",
    relatedCategories: [StatCategory.air, StatCategory.health],
  },
]

/**
 * Health-related hazard categories
 */
export const healthHazards: HazardCategory[] = [
  {
    id: "hazard-infectious-disease",
    name: "Infectious Disease Outbreak",
    description: "Elevated cases of COVID-19, influenza, or other infectious diseases in the area.",
    relatedCategories: [StatCategory.health],
  },
  {
    id: "hazard-limited-healthcare",
    name: "Limited Healthcare Access",
    description:
      "Area has limited access to primary healthcare facilities, hospitals, or emergency services.",
    relatedCategories: [StatCategory.health],
  },
]

/**
 * Disaster-related hazard categories
 */
export const disasterHazards: HazardCategory[] = [
  {
    id: "hazard-wildfire",
    name: "Wildfire Danger",
    description:
      "High wildfire risk due to dry conditions, vegetation, or historical fire activity. Evacuation may be required.",
    relatedCategories: [StatCategory.disaster],
  },
  {
    id: "hazard-flood",
    name: "Flood Danger",
    description:
      "High flood risk due to terrain, rainfall patterns, or proximity to waterways. Property damage possible.",
    relatedCategories: [StatCategory.disaster],
  },
]

/**
 * Multi-hazard categories
 */
export const generalHazards: HazardCategory[] = [
  {
    id: "hazard-general-emergency",
    name: "General Emergency Preparedness",
    description:
      "General preparedness for multiple hazard types including natural disasters, infrastructure failures, and health emergencies.",
    relatedCategories: [
      StatCategory.water,
      StatCategory.air,
      StatCategory.health,
      StatCategory.disaster,
    ],
  },
]

/**
 * All hazard categories combined
 */
export const allHazardCategories: HazardCategory[] = [
  ...waterHazards,
  ...airHazards,
  ...healthHazards,
  ...disasterHazards,
  ...generalHazards,
]

/**
 * Helper to get hazard category by ID
 */
export function getHazardCategoryById(id: string): HazardCategory | undefined {
  return allHazardCategories.find((hazard) => hazard.id === id)
}

/**
 * Helper to get hazard categories by stat category
 */
export function getHazardCategoriesByStatCategory(category: StatCategory): HazardCategory[] {
  return allHazardCategories.filter((hazard) => hazard.relatedCategories.includes(category))
}

/**
 * Helper to get all hazard category IDs
 */
export function getAllHazardCategoryIds(): string[] {
  return allHazardCategories.map((hazard) => hazard.id)
}
