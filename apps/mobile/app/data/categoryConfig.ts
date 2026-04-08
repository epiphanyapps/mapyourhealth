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
 * Jurisdiction-specific regulatory links for water standards.
 * Falls back through: exact jurisdiction → country-level → WHO.
 * Source: Rayane's data sources doc (Apr 2026).
 */
export const JURISDICTION_STANDARDS_LINKS: Record<string, CategoryLink> = {
  "WHO": {
    label: "WHO Drinking Water Guidelines",
    url: "https://iris.who.int/bitstream/handle/10665/44584/9789241548151_eng.pdf",
  },
  "US": {
    label: "EPA Drinking Water Standards",
    url: "https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations",
  },
  "US-NY": {
    label: "New York State Water Standards",
    url: "https://www.health.ny.gov/environmental/water/drinking/annual_water_quality_report/docs/table1.pdf",
  },
  "CA": {
    label: "Canadian Water Guidelines",
    url: "https://pest-control.canada.ca/pesticide-registry/en/index.html",
  },
  "CA-QC": {
    label: "Quebec Water Standards",
    url: "https://www.legisquebec.gouv.qc.ca/en/document/cr/Q-2,%20r.%2040?langCont=en#ga:l_iii-h1",
  },
  "EU": {
    label: "EU Drinking Water Standards",
    url: "https://eur-lex.europa.eu/eli/dir/2020/2184/oj",
  },
}

/**
 * Get the local standards link for a given jurisdiction code.
 * Falls back: exact code → country prefix → WHO.
 */
export function getLocalStandardsLink(jurisdictionCode: string): CategoryLink {
  if (JURISDICTION_STANDARDS_LINKS[jurisdictionCode]) {
    return JURISDICTION_STANDARDS_LINKS[jurisdictionCode]
  }
  const countryCode = jurisdictionCode.split("-")[0]
  if (JURISDICTION_STANDARDS_LINKS[countryCode]) {
    return JURISDICTION_STANDARDS_LINKS[countryCode]
  }
  return JURISDICTION_STANDARDS_LINKS["WHO"]
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
  // Note: health and disaster categories removed per issue #126
  // Keeping minimal config for backward compatibility with any existing data
  health: {
    description: "",
    links: [],
  },
  disaster: {
    description: "",
    links: [],
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
