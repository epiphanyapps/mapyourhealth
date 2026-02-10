/**
 * Category configuration including descriptions, links, and sub-categories
 */
import { StatCategory } from "./types/safety"

export interface CategoryLink {
  /** Display text for the link */
  label: string
  /** URL to open */
  url: string
}

export interface SubCategory {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Description of this sub-category */
  description: string
  /** Links related to this sub-category */
  links?: CategoryLink[]
}

export interface CategoryConfig {
  /** Description template - use {count} for dynamic contaminant count */
  description: string
  /** Links to external resources (WHO, EPA, etc.) */
  links: CategoryLink[]
  /** Sub-categories (if any) */
  subCategories?: SubCategory[]
  /** Whether to show the standards comparison table */
  showStandardsTable?: boolean
}

/**
 * Configuration for each main category
 */
export const CATEGORY_CONFIG: Record<StatCategory, CategoryConfig> = {
  water: {
    description:
      "There are {count} contaminants which filtration concentrations do not meet the [World Health Organization's tap water quality standards](https://www.who.int/publications/i/item/9789241549950).",
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
  air: {
    description:
      "Air pollution data for your area, including [radon levels](https://www.epa.gov/radon) and other airborne contaminants.",
    links: [
      {
        label: "EPA Radon Information",
        url: "https://www.epa.gov/radon",
      },
    ],
    subCategories: [
      {
        id: "radon",
        name: "Radon",
        description:
          "Radon is a naturally occurring radioactive air pollutant responsible for approximately [21,000 lung cancer deaths per year](https://www.epa.gov/radon/health-risk-radon) in the United States.",
        links: [
          {
            label: "EPA Radon Guide",
            url: "https://www.epa.gov/radon/health-risk-radon",
          },
        ],
      },
    ],
  },
  health: {
    description:
      "Pathogen and disease risk information for your area. See [CDC Disease Information](https://www.cdc.gov/) for more details.",
    links: [
      {
        label: "CDC Disease Information",
        url: "https://www.cdc.gov/",
      },
    ],
    subCategories: [
      {
        id: "lyme",
        name: "Lyme Disease",
        description:
          "[Lyme disease](https://www.cdc.gov/lyme/) is caused by the bacterium Borrelia burgdorferi and is transmitted to humans through the bite of infected blacklegged ticks.",
        links: [
          {
            label: "CDC Lyme Disease",
            url: "https://www.cdc.gov/lyme/",
          },
        ],
      },
    ],
  },
  disaster: {
    description:
      "Natural disaster risk assessment for your area. Visit [FEMA](https://www.fema.gov/) for emergency preparedness resources.",
    links: [
      {
        label: "FEMA Disaster Information",
        url: "https://www.fema.gov/",
      },
    ],
  },
}

/**
 * Get the description for a category with dynamic values filled in.
 * For water category, shows risk count or "no risks detected" message.
 */
export function getCategoryDescription(
  category: StatCategory,
  values: { count?: number } = {},
): string {
  const config = CATEGORY_CONFIG[category]
  let description = config.description

  if (values.count !== undefined) {
    if (values.count === 0 && category === StatCategory.water) {
      // No risks detected for water category
      return "No contaminants exceeding safety thresholds were detected. Your tap water meets [WHO drinking water quality standards](https://www.who.int/publications/i/item/9789241549950)."
    }
    description = description.replace("{count}", values.count.toString())
  }

  return description
}
