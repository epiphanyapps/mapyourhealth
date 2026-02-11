/**
 * Mock Contaminants, Thresholds, and Jurisdictions for MapYourHealth
 *
 * This file contains mock data for development and testing.
 * Production data will come from the Amplify backend.
 */

import type {
  Contaminant,
  ContaminantThreshold,
  Jurisdiction,
  LocationData,
  MeasurementWithStatus,
  SafetyStatus,
} from "../types/safety"

// =============================================================================
// Jurisdictions
// =============================================================================

export const mockJurisdictions: Jurisdiction[] = [
  {
    code: "WHO",
    name: "World Health Organization",
    nameFr: "Organisation mondiale de la Santé",
    country: "INTL",
    isDefault: true,
  },
  {
    code: "US",
    name: "United States (Federal)",
    nameFr: "États-Unis (Fédéral)",
    country: "US",
    parentCode: "WHO",
    isDefault: false,
  },
  {
    code: "CA",
    name: "Canada (Federal)",
    nameFr: "Canada (Fédéral)",
    country: "CA",
    parentCode: "WHO",
    isDefault: false,
  },
  {
    code: "US-NY",
    name: "New York State",
    nameFr: "État de New York",
    country: "US",
    region: "NY",
    parentCode: "US",
    isDefault: false,
  },
  {
    code: "US-CA",
    name: "California",
    nameFr: "Californie",
    country: "US",
    region: "CA",
    parentCode: "US",
    isDefault: false,
  },
  {
    code: "US-FL",
    name: "Florida",
    nameFr: "Floride",
    country: "US",
    region: "FL",
    parentCode: "US",
    isDefault: false,
  },
  {
    code: "US-IL",
    name: "Illinois",
    nameFr: "Illinois",
    country: "US",
    region: "IL",
    parentCode: "US",
    isDefault: false,
  },
  {
    code: "US-WA",
    name: "Washington",
    nameFr: "Washington",
    country: "US",
    region: "WA",
    parentCode: "US",
    isDefault: false,
  },
  {
    code: "CA-QC",
    name: "Quebec",
    nameFr: "Québec",
    country: "CA",
    region: "QC",
    parentCode: "CA",
    isDefault: false,
  },
]

// =============================================================================
// Contaminants
// =============================================================================

export const mockContaminants: Contaminant[] = [
  // Fertilizers
  {
    id: "nitrate",
    name: "Nitrate",
    nameFr: "Nitrate",
    category: "fertilizer",
    unit: "μg/L",
    description: "High levels can cause methemoglobinemia (blue baby syndrome) in infants.",
    descriptionFr: "Des niveaux élevés peuvent causer la méthémoglobinémie chez les nourrissons.",
    higherIsBad: true,
  },
  {
    id: "nitrite",
    name: "Nitrite",
    nameFr: "Nitrite",
    category: "fertilizer",
    unit: "μg/L",
    description: "Can interfere with oxygen-carrying capacity of blood.",
    descriptionFr: "Peut interférer avec la capacité du sang à transporter l'oxygène.",
    higherIsBad: true,
  },

  // Inorganics (Heavy Metals)
  {
    id: "lead",
    name: "Lead",
    nameFr: "Plomb",
    category: "inorganic",
    unit: "μg/L",
    description: "Toxic heavy metal affecting brain development, especially in children.",
    descriptionFr:
      "Métal lourd toxique affectant le développement cérébral, surtout chez les enfants.",
    higherIsBad: true,
  },
  {
    id: "arsenic",
    name: "Arsenic",
    nameFr: "Arsenic",
    category: "inorganic",
    unit: "μg/L",
    description: "Known human carcinogen affecting skin, lungs, bladder.",
    descriptionFr: "Cancérogène humain connu affectant la peau, les poumons, la vessie.",
    higherIsBad: true,
  },
  {
    id: "mercury",
    name: "Mercury",
    nameFr: "Mercure",
    category: "inorganic",
    unit: "μg/L",
    description: "Neurotoxic heavy metal that can cause neurological damage.",
    descriptionFr: "Métal lourd neurotoxique pouvant causer des dommages neurologiques.",
    higherIsBad: true,
  },
  {
    id: "copper",
    name: "Copper",
    nameFr: "Cuivre",
    category: "inorganic",
    unit: "μg/L",
    description: "Essential nutrient but toxic at high levels. Causes gastrointestinal distress.",
    descriptionFr:
      "Nutriment essentiel mais toxique à hauts niveaux. Cause des troubles gastro-intestinaux.",
    higherIsBad: true,
  },

  // Pesticides
  {
    id: "atrazine",
    name: "Atrazine",
    nameFr: "Atrazine",
    category: "pesticide",
    unit: "μg/L",
    description: "Herbicide linked to endocrine disruption.",
    descriptionFr: "Herbicide lié à la perturbation endocrinienne.",
    higherIsBad: true,
  },
  {
    id: "glyphosate",
    name: "Glyphosate",
    nameFr: "Glyphosate",
    category: "pesticide",
    unit: "μg/L",
    description: "Most widely used herbicide. IARC classified as probably carcinogenic.",
    descriptionFr:
      "Herbicide le plus utilisé au monde. Classé par le CIRC comme probablement cancérogène.",
    higherIsBad: true,
  },

  // Disinfection Byproducts
  {
    id: "tthm",
    name: "Total Trihalomethanes",
    nameFr: "Trihalométhanes totaux",
    category: "disinfectant",
    unit: "μg/L",
    description: "Carcinogenic byproducts of chlorination.",
    descriptionFr: "Sous-produits cancérogènes de la chloration.",
    higherIsBad: true,
  },

  // Microbiological
  {
    id: "e-coli",
    name: "E. coli",
    nameFr: "E. coli",
    category: "microbiological",
    unit: "CFU/100mL",
    description: "Indicator of fecal contamination. Must be absent in drinking water.",
    descriptionFr: "Indicateur de contamination fécale. Doit être absent de l'eau potable.",
    higherIsBad: true,
  },
  {
    id: "total-coliform",
    name: "Total Coliform",
    nameFr: "Coliformes totaux",
    category: "microbiological",
    unit: "CFU/100mL",
    description: "General indicator of water quality and potential contamination.",
    descriptionFr: "Indicateur général de la qualité de l'eau et contamination potentielle.",
    higherIsBad: true,
  },
]

// =============================================================================
// Thresholds
// =============================================================================

export const mockThresholds: ContaminantThreshold[] = [
  // Nitrate
  {
    contaminantId: "nitrate",
    jurisdictionCode: "WHO",
    limitValue: 50000,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "nitrate",
    jurisdictionCode: "US",
    limitValue: 10000,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "nitrate",
    jurisdictionCode: "CA",
    limitValue: 45000,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "nitrate",
    jurisdictionCode: "CA-QC",
    limitValue: 10000,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "nitrate",
    jurisdictionCode: "US-NY",
    limitValue: 10000,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "nitrate",
    jurisdictionCode: "US-CA",
    limitValue: 10000,
    warningRatio: 0.8,
    status: "regulated",
  },

  // Nitrite
  {
    contaminantId: "nitrite",
    jurisdictionCode: "WHO",
    limitValue: 3000,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "nitrite",
    jurisdictionCode: "US",
    limitValue: 1000,
    warningRatio: 0.8,
    status: "regulated",
  },

  // Lead
  {
    contaminantId: "lead",
    jurisdictionCode: "WHO",
    limitValue: 10,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "lead",
    jurisdictionCode: "US",
    limitValue: 15,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "lead",
    jurisdictionCode: "CA",
    limitValue: 5,
    warningRatio: 0.8,
    status: "regulated",
  },

  // Arsenic
  {
    contaminantId: "arsenic",
    jurisdictionCode: "WHO",
    limitValue: 10,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "arsenic",
    jurisdictionCode: "US",
    limitValue: 10,
    warningRatio: 0.8,
    status: "regulated",
  },

  // Mercury
  {
    contaminantId: "mercury",
    jurisdictionCode: "WHO",
    limitValue: 6,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "mercury",
    jurisdictionCode: "US",
    limitValue: 2,
    warningRatio: 0.8,
    status: "regulated",
  },

  // Copper
  {
    contaminantId: "copper",
    jurisdictionCode: "WHO",
    limitValue: 2000,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "copper",
    jurisdictionCode: "US",
    limitValue: 1300,
    warningRatio: 0.8,
    status: "regulated",
  },

  // Atrazine
  {
    contaminantId: "atrazine",
    jurisdictionCode: "WHO",
    limitValue: 100,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "atrazine",
    jurisdictionCode: "US",
    limitValue: 3,
    warningRatio: 0.8,
    status: "regulated",
  },

  // Glyphosate
  {
    contaminantId: "glyphosate",
    jurisdictionCode: "US",
    limitValue: 700,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "glyphosate",
    jurisdictionCode: "CA",
    limitValue: 280,
    warningRatio: 0.8,
    status: "regulated",
  },

  // TTHM
  {
    contaminantId: "tthm",
    jurisdictionCode: "US",
    limitValue: 80,
    warningRatio: 0.8,
    status: "regulated",
  },
  {
    contaminantId: "tthm",
    jurisdictionCode: "CA",
    limitValue: 100,
    warningRatio: 0.8,
    status: "regulated",
  },

  // E. coli
  {
    contaminantId: "e-coli",
    jurisdictionCode: "WHO",
    limitValue: 0,
    warningRatio: 0,
    status: "regulated",
  },
  {
    contaminantId: "e-coli",
    jurisdictionCode: "US",
    limitValue: 0,
    warningRatio: 0,
    status: "regulated",
  },

  // Total Coliform
  {
    contaminantId: "total-coliform",
    jurisdictionCode: "WHO",
    limitValue: 0,
    warningRatio: 0,
    status: "regulated",
  },
  {
    contaminantId: "total-coliform",
    jurisdictionCode: "US",
    limitValue: 0,
    warningRatio: 0,
    status: "regulated",
  },
]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get threshold for a contaminant and jurisdiction
 */
export function getMockThreshold(
  contaminantId: string,
  jurisdictionCode: string,
): ContaminantThreshold | undefined {
  // Try exact match
  const exact = mockThresholds.find(
    (t) => t.contaminantId === contaminantId && t.jurisdictionCode === jurisdictionCode,
  )
  if (exact) return exact

  // Try parent jurisdiction
  const jurisdiction = mockJurisdictions.find((j) => j.code === jurisdictionCode)
  if (jurisdiction?.parentCode) {
    const parent = mockThresholds.find(
      (t) => t.contaminantId === contaminantId && t.jurisdictionCode === jurisdiction.parentCode,
    )
    if (parent) return parent
  }

  // Fall back to WHO
  return mockThresholds.find(
    (t) => t.contaminantId === contaminantId && t.jurisdictionCode === "WHO",
  )
}

/**
 * Calculate status for a value given threshold
 */
function calculateMockStatus(
  value: number,
  threshold: ContaminantThreshold | undefined,
  higherIsBad: boolean = true,
): SafetyStatus {
  if (!threshold || threshold.status === "banned") {
    return "danger"
  }
  if (threshold.status === "not_controlled" || threshold.limitValue === null) {
    return "safe"
  }

  const limit = threshold.limitValue
  const warningRatio = threshold.warningRatio ?? 0.8
  const warningThreshold = limit * warningRatio

  if (higherIsBad) {
    if (value >= limit) return "danger"
    if (value >= warningThreshold) return "warning"
    return "safe"
  } else {
    if (value <= limit) return "danger"
    if (value <= warningThreshold) return "warning"
    return "safe"
  }
}

/**
 * Create a measurement with computed status
 */
function createMeasurement(
  city: string,
  state: string,
  country: string,
  contaminantId: string,
  value: number,
  jurisdictionCode: string,
): MeasurementWithStatus {
  const contaminant = mockContaminants.find((c) => c.id === contaminantId)
  const threshold = getMockThreshold(contaminantId, jurisdictionCode)
  const whoThreshold = getMockThreshold(contaminantId, "WHO")
  const status = calculateMockStatus(value, threshold, contaminant?.higherIsBad ?? true)

  return {
    city,
    state,
    country,
    contaminantId,
    value,
    measuredAt: new Date().toISOString(),
    source: "Mock Data",
    status,
    threshold,
    whoThreshold,
  }
}

// =============================================================================
// Mock Location Data
// =============================================================================

/**
 * Beverly Hills, CA - Generally safe
 */
export const beverlyHillsLocationData: LocationData = {
  city: "Beverly Hills",
  state: "CA",
  country: "US",
  jurisdictionCode: "US-CA",
  measurements: [
    createMeasurement("Beverly Hills", "CA", "US", "nitrate", 2000, "US-CA"),
    createMeasurement("Beverly Hills", "CA", "US", "lead", 3, "US-CA"),
    createMeasurement("Beverly Hills", "CA", "US", "arsenic", 2, "US-CA"),
    createMeasurement("Beverly Hills", "CA", "US", "copper", 150, "US-CA"),
    createMeasurement("Beverly Hills", "CA", "US", "e-coli", 0, "US-CA"),
  ],
}

/**
 * New York, NY - Mixed with lead warning
 */
export const newYorkLocationData: LocationData = {
  city: "New York",
  state: "NY",
  country: "US",
  jurisdictionCode: "US-NY",
  measurements: [
    createMeasurement("New York", "NY", "US", "nitrate", 5000, "US-NY"),
    createMeasurement("New York", "NY", "US", "lead", 12, "US-NY"), // Warning level
    createMeasurement("New York", "NY", "US", "arsenic", 5, "US-NY"),
    createMeasurement("New York", "NY", "US", "copper", 800, "US-NY"),
    createMeasurement("New York", "NY", "US", "tthm", 65, "US-NY"),
    createMeasurement("New York", "NY", "US", "e-coli", 0, "US-NY"),
  ],
}

/**
 * Miami Beach, FL - Safe
 */
export const miamiBeachLocationData: LocationData = {
  city: "Miami Beach",
  state: "FL",
  country: "US",
  jurisdictionCode: "US-FL",
  measurements: [
    createMeasurement("Miami Beach", "FL", "US", "nitrate", 3000, "US-FL"),
    createMeasurement("Miami Beach", "FL", "US", "lead", 5, "US-FL"),
    createMeasurement("Miami Beach", "FL", "US", "arsenic", 3, "US-FL"),
    createMeasurement("Miami Beach", "FL", "US", "copper", 200, "US-FL"),
    createMeasurement("Miami Beach", "FL", "US", "e-coli", 0, "US-FL"),
  ],
}

/**
 * Chicago, IL - Lead danger
 */
export const chicagoLocationData: LocationData = {
  city: "Chicago",
  state: "IL",
  country: "US",
  jurisdictionCode: "US-IL",
  measurements: [
    createMeasurement("Chicago", "IL", "US", "nitrate", 4500, "US-IL"),
    createMeasurement("Chicago", "IL", "US", "lead", 18, "US-IL"), // DANGER
    createMeasurement("Chicago", "IL", "US", "arsenic", 4, "US-IL"),
    createMeasurement("Chicago", "IL", "US", "copper", 500, "US-IL"),
    createMeasurement("Chicago", "IL", "US", "total-coliform", 2, "US-IL"), // DANGER
  ],
}

/**
 * Seattle, WA - Very safe
 */
export const seattleLocationData: LocationData = {
  city: "Seattle",
  state: "WA",
  country: "US",
  jurisdictionCode: "US-WA",
  measurements: [
    createMeasurement("Seattle", "WA", "US", "nitrate", 1500, "US-WA"),
    createMeasurement("Seattle", "WA", "US", "lead", 2, "US-WA"),
    createMeasurement("Seattle", "WA", "US", "arsenic", 1, "US-WA"),
    createMeasurement("Seattle", "WA", "US", "copper", 100, "US-WA"),
    createMeasurement("Seattle", "WA", "US", "e-coli", 0, "US-WA"),
  ],
}

/**
 * All mock location data
 */
export const allMockLocationData: LocationData[] = [
  beverlyHillsLocationData,
  newYorkLocationData,
  miamiBeachLocationData,
  chicagoLocationData,
  seattleLocationData,
]

/**
 * Map of city names to location data
 */
export const mockLocationDataMap: Record<string, LocationData> = {
  "Beverly Hills": beverlyHillsLocationData,
  "New York": newYorkLocationData,
  "Miami Beach": miamiBeachLocationData,
  "Chicago": chicagoLocationData,
  "Seattle": seattleLocationData,
}

/**
 * Get location data by city name
 */
export function getMockLocationData(city: string): LocationData | undefined {
  return mockLocationDataMap[city]
}

/**
 * Get all available cities
 */
export function getAvailableMockCities(): string[] {
  return Object.keys(mockLocationDataMap)
}
