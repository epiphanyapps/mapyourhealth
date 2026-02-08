/**
 * Mock Product Recommendations for MapYourHealth
 *
 * This file contains mock product recommendations for development and testing.
 * Production data will come from the Amplify backend.
 *
 * Each recommendation links to relevant hazard categories to help users
 * find products that address their specific concerns.
 */

import { ProductRecommendation } from "../types/safety"

/**
 * Water safety product recommendations
 */
export const waterRecommendations: ProductRecommendation[] = [
  {
    id: "rec-water-filter",
    name: "Home Water Filtration System",
    description:
      "NSF-certified water filter that removes lead, bacteria, and other contaminants. Installs under sink or on countertop.",
    url: "https://www.example.com/water-filter",
    hazardCategoryIds: ["hazard-contaminated-water"],
  },
  {
    id: "rec-water-test-kit",
    name: "Water Quality Test Kit",
    description:
      "Test your tap water for lead, bacteria, nitrates, pH, and other common contaminants. Results in minutes.",
    url: "https://www.example.com/water-test-kit",
    hazardCategoryIds: ["hazard-contaminated-water"],
  },
]

/**
 * Air quality product recommendations
 */
export const airRecommendations: ProductRecommendation[] = [
  {
    id: "rec-air-purifier",
    name: "HEPA Air Purifier",
    description:
      "Medical-grade HEPA air purifier removes 99.97% of airborne particles including smoke, dust, pollen, and PM2.5.",
    url: "https://www.example.com/air-purifier",
    hazardCategoryIds: ["hazard-poor-air-quality", "hazard-respiratory"],
  },
  {
    id: "rec-n95-masks",
    name: "N95 Respirator Masks",
    description:
      "NIOSH-approved N95 masks for protection against wildfire smoke, air pollution, and airborne particles.",
    url: "https://www.example.com/n95-masks",
    hazardCategoryIds: ["hazard-poor-air-quality", "hazard-respiratory", "hazard-wildfire"],
  },
  {
    id: "rec-air-quality-monitor",
    name: "Indoor Air Quality Monitor",
    description:
      "Monitor PM2.5, CO2, humidity, and temperature levels in your home. Real-time alerts when air quality drops.",
    url: "https://www.example.com/air-monitor",
    hazardCategoryIds: ["hazard-poor-air-quality", "hazard-respiratory"],
  },
]

/**
 * Health-related product recommendations
 */
export const healthRecommendations: ProductRecommendation[] = [
  {
    id: "rec-first-aid-kit",
    name: "Comprehensive First Aid Kit",
    description:
      "300+ piece first aid kit for home emergencies. Includes bandages, medications, CPR mask, and emergency blanket.",
    url: "https://www.example.com/first-aid-kit",
    hazardCategoryIds: ["hazard-limited-healthcare", "hazard-general-emergency"],
  },
  {
    id: "rec-sanitizer-supplies",
    name: "Infection Prevention Kit",
    description:
      "Hand sanitizers, disinfectant wipes, disposable gloves, and face masks for disease outbreak protection.",
    url: "https://www.example.com/sanitizer-kit",
    hazardCategoryIds: ["hazard-infectious-disease"],
  },
  {
    id: "rec-oximeter",
    name: "Pulse Oximeter",
    description:
      "FDA-approved pulse oximeter to monitor blood oxygen levels at home. Essential for respiratory illness monitoring.",
    url: "https://www.example.com/oximeter",
    hazardCategoryIds: [
      "hazard-infectious-disease",
      "hazard-respiratory",
      "hazard-limited-healthcare",
    ],
  },
]

/**
 * Disaster preparedness product recommendations
 */
export const disasterRecommendations: ProductRecommendation[] = [
  {
    id: "rec-emergency-kit",
    name: "72-Hour Emergency Survival Kit",
    description:
      "Complete emergency kit with food, water, first aid, flashlight, radio, and shelter supplies for family of 4.",
    url: "https://www.example.com/emergency-kit",
    hazardCategoryIds: ["hazard-wildfire", "hazard-flood", "hazard-general-emergency"],
  },
  {
    id: "rec-weather-radio",
    name: "Emergency Weather Radio",
    description:
      "NOAA weather radio with hand crank, solar panel, flashlight, and USB charging. Receives emergency alerts.",
    url: "https://www.example.com/weather-radio",
    hazardCategoryIds: ["hazard-wildfire", "hazard-flood", "hazard-general-emergency"],
  },
  {
    id: "rec-go-bag",
    name: "Evacuation Go Bag",
    description:
      "Pre-packed evacuation bag with essential documents holder, change of clothes, toiletries, and survival gear.",
    url: "https://www.example.com/go-bag",
    hazardCategoryIds: ["hazard-wildfire", "hazard-flood"],
  },
  {
    id: "rec-flood-barriers",
    name: "Portable Flood Barriers",
    description:
      "Reusable sandbag alternatives that expand when wet. Protects doorways and low areas from floodwater.",
    url: "https://www.example.com/flood-barriers",
    hazardCategoryIds: ["hazard-flood"],
  },
]

/**
 * All product recommendations combined
 */
export const allRecommendations: ProductRecommendation[] = [
  ...waterRecommendations,
  ...airRecommendations,
  ...healthRecommendations,
  ...disasterRecommendations,
]

/**
 * Helper to get recommendation by ID
 */
export function getRecommendationById(id: string): ProductRecommendation | undefined {
  return allRecommendations.find((rec) => rec.id === id)
}

/**
 * Helper to get recommendations by hazard category ID
 */
export function getRecommendationsByHazardCategory(
  hazardCategoryId: string,
): ProductRecommendation[] {
  return allRecommendations.filter((rec) => rec.hazardCategoryIds.includes(hazardCategoryId))
}

/**
 * Helper to get recommendations for multiple hazard categories
 * Returns unique recommendations (no duplicates)
 */
export function getRecommendationsForHazards(hazardCategoryIds: string[]): ProductRecommendation[] {
  const seen = new Set<string>()
  const results: ProductRecommendation[] = []

  for (const rec of allRecommendations) {
    if (seen.has(rec.id)) continue

    const hasMatchingHazard = rec.hazardCategoryIds.some((hazardId) =>
      hazardCategoryIds.includes(hazardId),
    )

    if (hasMatchingHazard) {
      seen.add(rec.id)
      results.push(rec)
    }
  }

  return results
}
