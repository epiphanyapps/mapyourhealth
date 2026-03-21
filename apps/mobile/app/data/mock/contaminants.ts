/**
 * Mock Contaminants, Thresholds, and Jurisdictions for MapYourHealth
 *
 * This file contains mock data for development and testing.
 * Production data will come from the Amplify backend.
 */

import type { Contaminant, ContaminantThreshold, Jurisdiction } from "../types/safety"

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
