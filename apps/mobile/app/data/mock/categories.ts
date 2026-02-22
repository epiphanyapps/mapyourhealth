/**
 * Mock Categories and SubCategories for MapYourHealth
 *
 * These are used as fallback data when the backend is unavailable.
 */

import type { Category, SubCategory } from "../types/safety"

// =============================================================================
// Mock Categories
// =============================================================================

export const mockCategories: Category[] = [
  {
    categoryId: "water",
    name: "Water Quality",
    nameFr: "Qualité de l'eau",
    description:
      "There are {count} contaminants which filtration concentrations do not meet the [World Health Organization's tap water quality standards](https://www.who.int/publications/i/item/9789241549950).",
    descriptionFr:
      "Il y a {count} contaminants dont les concentrations de filtration ne respectent pas les [normes de qualité de l'eau potable de l'Organisation mondiale de la santé](https://www.who.int/publications/i/item/9789241549950).",
    icon: "water",
    color: "#3B82F6",
    sortOrder: 0,
    isActive: true,
    links: [
      {
        label: "WHO Drinking Water Guidelines",
        url: "https://www.who.int/publications/i/item/9789241549950",
      },
      {
        label: "Local Standards",
        url: "https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations",
      },
    ],
    showStandardsTable: true,
  },
  {
    categoryId: "air",
    name: "Air Quality",
    nameFr: "Qualité de l'air",
    description:
      "Air pollution data for your area, including [radon levels](https://www.epa.gov/radon) and other airborne contaminants.",
    descriptionFr:
      "Données sur la pollution de l'air pour votre région, y compris les [niveaux de radon](https://www.epa.gov/radon) et autres contaminants atmosphériques.",
    icon: "weather-cloudy",
    color: "#8B5CF6",
    sortOrder: 1,
    isActive: true,
    links: [
      {
        label: "EPA Radon Information",
        url: "https://www.epa.gov/radon",
      },
    ],
    showStandardsTable: false,
  },
  {
    categoryId: "health",
    name: "Health",
    nameFr: "Santé",
    description:
      "Pathogen and disease risk information for your area. See [CDC Disease Information](https://www.cdc.gov/) for more details.",
    descriptionFr:
      "Informations sur les risques de pathogènes et de maladies pour votre région. Consultez les [informations sur les maladies du CDC](https://www.cdc.gov/) pour plus de détails.",
    icon: "heart",
    color: "#EF4444",
    sortOrder: 2,
    isActive: true,
    links: [
      {
        label: "CDC Disease Information",
        url: "https://www.cdc.gov/",
      },
    ],
    showStandardsTable: false,
  },
  {
    categoryId: "disaster",
    name: "Disaster Risk",
    nameFr: "Risques de catastrophes",
    description:
      "Natural disaster risk assessment for your area. Visit [FEMA](https://www.fema.gov/) for emergency preparedness resources.",
    descriptionFr:
      "Évaluation des risques de catastrophes naturelles pour votre région. Visitez [FEMA](https://www.fema.gov/) pour les ressources de préparation aux urgences.",
    icon: "fire",
    color: "#F97316",
    sortOrder: 3,
    isActive: true,
    links: [
      {
        label: "FEMA Disaster Information",
        url: "https://www.fema.gov/",
      },
    ],
    showStandardsTable: false,
  },
]

// =============================================================================
// Mock SubCategories
// =============================================================================

export const mockSubCategories: SubCategory[] = [
  {
    subCategoryId: "fertilizer",
    categoryId: "water",
    name: "Fertilizers",
    nameFr: "Engrais",
    description:
      "Nitrates and phosphates from agricultural runoff that can contaminate water supplies.",
    descriptionFr:
      "Nitrates et phosphates provenant du ruissellement agricole qui peuvent contaminer les approvisionnements en eau.",
    sortOrder: 0,
    isActive: true,
  },
  {
    subCategoryId: "pesticide",
    categoryId: "water",
    name: "Pesticides",
    nameFr: "Pesticides",
    description:
      "Chemical pesticides including herbicides, insecticides, and fungicides that may contaminate water sources.",
    descriptionFr:
      "Pesticides chimiques, y compris les herbicides, insecticides et fongicides qui peuvent contaminer les sources d'eau.",
    sortOrder: 1,
    isActive: true,
  },
  {
    subCategoryId: "radioactive",
    categoryId: "water",
    name: "Radioactive",
    nameFr: "Radioactifs",
    description:
      "Radioactive elements such as uranium, radium, and radon that can occur naturally or from industrial sources.",
    descriptionFr:
      "Éléments radioactifs tels que l'uranium, le radium et le radon qui peuvent provenir de sources naturelles ou industrielles.",
    sortOrder: 2,
    isActive: true,
  },
  {
    subCategoryId: "disinfectant",
    categoryId: "water",
    name: "Disinfection Byproducts",
    nameFr: "Sous-produits de désinfection",
    description:
      "Chemical byproducts formed when disinfectants like chlorine react with organic matter in water.",
    descriptionFr:
      "Sous-produits chimiques formés lorsque les désinfectants comme le chlore réagissent avec la matière organique dans l'eau.",
    sortOrder: 3,
    isActive: true,
  },
  {
    subCategoryId: "inorganic",
    categoryId: "water",
    name: "Heavy Metals & Inorganics",
    nameFr: "Métaux lourds et inorganiques",
    description:
      "Heavy metals like lead, arsenic, and mercury, as well as other inorganic compounds.",
    descriptionFr:
      "Métaux lourds comme le plomb, l'arsenic et le mercure, ainsi que d'autres composés inorganiques.",
    sortOrder: 4,
    isActive: true,
  },
  {
    subCategoryId: "organic",
    categoryId: "water",
    name: "Organic Compounds",
    nameFr: "Composés organiques",
    description:
      "Volatile organic compounds (VOCs) and other organic chemicals that can contaminate water.",
    descriptionFr:
      "Composés organiques volatils (COV) et autres produits chimiques organiques qui peuvent contaminer l'eau.",
    sortOrder: 5,
    isActive: true,
  },
  {
    subCategoryId: "microbiological",
    categoryId: "water",
    name: "Microbiological",
    nameFr: "Microbiologiques",
    description: "Bacteria, viruses, and other microorganisms that can contaminate water supplies.",
    descriptionFr:
      "Bactéries, virus et autres micro-organismes qui peuvent contaminer les approvisionnements en eau.",
    sortOrder: 6,
    isActive: true,
  },
  {
    subCategoryId: "radon",
    categoryId: "air",
    name: "Radon",
    nameFr: "Radon",
    description:
      "Radon is a naturally occurring radioactive air pollutant responsible for approximately [21,000 lung cancer deaths per year](https://www.epa.gov/radon/health-risk-radon) in the United States.",
    descriptionFr:
      "Le radon est un polluant atmosphérique radioactif naturel responsable d'environ [21 000 décès par cancer du poumon par an](https://www.epa.gov/radon/health-risk-radon) aux États-Unis.",
    sortOrder: 0,
    isActive: true,
    links: [
      {
        label: "EPA Radon Guide",
        url: "https://www.epa.gov/radon/health-risk-radon",
      },
    ],
  },
  {
    subCategoryId: "lyme",
    categoryId: "health",
    name: "Lyme Disease",
    nameFr: "Maladie de Lyme",
    description:
      "[Lyme disease](https://www.cdc.gov/lyme/) is caused by the bacterium Borrelia burgdorferi and is transmitted to humans through the bite of infected blacklegged ticks.",
    descriptionFr:
      "La [maladie de Lyme](https://www.cdc.gov/lyme/) est causée par la bactérie Borrelia burgdorferi et est transmise aux humains par la piqûre de tiques à pattes noires infectées.",
    sortOrder: 0,
    isActive: true,
    links: [
      {
        label: "CDC Lyme Disease",
        url: "https://www.cdc.gov/lyme/",
      },
    ],
  },
]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get a category by its ID from mock data
 */
export function getMockCategoryById(categoryId: string): Category | undefined {
  return mockCategories.find((c) => c.categoryId === categoryId)
}

/**
 * Get sub-categories for a specific category from mock data
 */
export function getMockSubCategoriesByCategoryId(categoryId: string): SubCategory[] {
  return mockSubCategories.filter((sc) => sc.categoryId === categoryId)
}

/**
 * Get a sub-category by its ID from mock data
 */
export function getMockSubCategoryById(subCategoryId: string): SubCategory | undefined {
  return mockSubCategories.find((sc) => sc.subCategoryId === subCategoryId)
}
