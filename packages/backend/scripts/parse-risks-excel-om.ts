/**
 * Parse Risks.xlsx for O&M (Observations & Measurements) data
 *
 * This script reads the Radon USA, Lyme Quebec, and Lyme USA sheets from
 * Risks.xlsx and generates seed-om-data.json for the O&M schema.
 *
 * Run with: npx tsx scripts/parse-risks-excel-om.ts
 *
 * Output: scripts/seed-om-data.json
 */

import XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// Types
// =============================================================================

interface SeedObservedProperty {
  propertyId: string
  name: string
  nameFr?: string | null
  category: string
  observationType: string
  unit?: string | null
  description?: string | null
  descriptionFr?: string | null
  higherIsBad?: boolean
  metadata?: Record<string, unknown> | null
}

interface SeedPropertyThreshold {
  propertyId: string
  jurisdictionCode: string
  limitValue?: number | null
  warningValue?: number | null
  zoneMapping?: Record<string, string> | null
  endemicIsDanger?: boolean | null
  incidenceWarningThreshold?: number | null
  incidenceDangerThreshold?: number | null
  status: string
  notes?: string | null
}

interface SeedLocationObservation {
  city: string
  state: string
  country: string
  county?: string | null
  propertyId: string
  numericValue?: number | null
  zoneValue?: string | null
  endemicValue?: boolean | null
  incidenceValue?: number | null
  binaryValue?: boolean | null
  observedAt: string
  validUntil?: string | null
  source?: string | null
  sourceUrl?: string | null
  notes?: string | null
  rawData?: Record<string, unknown> | null
}

interface SeedData {
  observedProperties: SeedObservedProperty[]
  propertyThresholds: SeedPropertyThreshold[]
  locationObservations: SeedLocationObservation[]
}

// =============================================================================
// Constants
// =============================================================================

const OBSERVED_PROPERTIES: SeedObservedProperty[] = [
  {
    propertyId: "radon",
    name: "Radon",
    nameFr: "Radon",
    category: "radiation",
    observationType: "zone",
    unit: "pCi/L",
    description:
      "Radon is a naturally occurring radioactive gas that can accumulate in buildings and is the second leading cause of lung cancer after smoking. The EPA divides the US into three radon zones based on predicted average indoor radon screening levels.",
    descriptionFr:
      "Le radon est un gaz radioactif naturel qui peut s'accumuler dans les bâtiments et constitue la deuxième cause de cancer du poumon après le tabagisme.",
    higherIsBad: true,
    metadata: {
      dataSource: "EPA",
      zoneDescriptions: {
        "1": "Zone 1 - High potential (predicted average > 4 pCi/L)",
        "2": "Zone 2 - Moderate potential (predicted average 2-4 pCi/L)",
        "3": "Zone 3 - Low potential (predicted average < 2 pCi/L)",
      },
    },
  },
  {
    propertyId: "lyme_disease",
    name: "Lyme Disease",
    nameFr: "Maladie de Lyme",
    category: "disease",
    observationType: "endemic",
    unit: null,
    description:
      "Lyme disease is a bacterial infection transmitted through the bite of infected blacklegged ticks. It can cause fever, fatigue, joint pain, and a characteristic skin rash. Early treatment with antibiotics is usually effective.",
    descriptionFr:
      "La maladie de Lyme est une infection bactérienne transmise par la piqûre de tiques à pattes noires infectées. Elle peut provoquer de la fièvre, de la fatigue, des douleurs articulaires et une éruption cutanée caractéristique.",
    higherIsBad: true,
    metadata: {
      transmittedBy: "Blacklegged tick (Ixodes scapularis)",
      causativeAgent: "Borrelia burgdorferi",
    },
  },
]

const PROPERTY_THRESHOLDS: SeedPropertyThreshold[] = [
  // Radon zone mapping for US
  {
    propertyId: "radon",
    jurisdictionCode: "US",
    zoneMapping: {
      "1": "danger",
      "2": "warning",
      "3": "safe",
    },
    status: "active",
    notes: "EPA Zone classification based on predicted indoor radon levels",
  },
  // Lyme endemic mapping for Quebec
  {
    propertyId: "lyme_disease",
    jurisdictionCode: "CA-QC",
    endemicIsDanger: true,
    status: "active",
    notes: "Quebec public health endemic zone designation",
  },
  // Lyme incidence mapping for US (based on CDC categories)
  {
    propertyId: "lyme_disease",
    jurisdictionCode: "US",
    incidenceWarningThreshold: 10.0,
    incidenceDangerThreshold: 50.0,
    status: "active",
    notes:
      "Based on CDC incidence categories - Low (<10/100k), Moderate (10-50/100k), High (>50/100k)",
  },
]

// US State name to code mapping
const US_STATE_CODES: Record<string, string> = {
  "Alabama": "AL",
  "Alaska": "AK",
  "Arizona": "AZ",
  "Arkansas": "AR",
  "California": "CA",
  "Colorado": "CO",
  "Connecticut": "CT",
  "Delaware": "DE",
  "District of Columbia": "DC",
  "Florida": "FL",
  "Georgia": "GA",
  "Hawaii": "HI",
  "Idaho": "ID",
  "Illinois": "IL",
  "Indiana": "IN",
  "Iowa": "IA",
  "Kansas": "KS",
  "Kentucky": "KY",
  "Louisiana": "LA",
  "Maine": "ME",
  "Maryland": "MD",
  "Massachusetts": "MA",
  "Massachussetts": "MA", // Handle typo in source data
  "Michigan": "MI",
  "Minnesota": "MN",
  "Mississippi": "MS",
  "Missouri": "MO",
  "Montana": "MT",
  "Nebraska": "NE",
  "Nevada": "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  "Ohio": "OH",
  "Oklahoma": "OK",
  "Oregon": "OR",
  "Pennsylvania": "PA",
  "Puerto Rico": "PR",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  "Tennessee": "TN",
  "Texas": "TX",
  "Utah": "UT",
  "Vermont": "VT",
  "Virginia": "VA",
  "VA-CITY": "VA", // Virginia independent cities (they have separate FIPS codes but are still in VA)
  "Washington": "WA",
  "West Virginia": "WV",
  "Wisconsin": "WI",
  "Wyoming": "WY",
}

// =============================================================================
// Parsing Functions
// =============================================================================

/**
 * Parse the Radon USA sheet
 *
 * Sheet structure:
 * - Column 0: County,State (e.g., "Autauga, AL")
 * - Column 1: COUNTY LABEL (e.g., ".Autauga County")
 * - Column 2: STATE (e.g., "Alabama")
 * - Column 3: Region (1-4)
 * - Column 4: Zone (1, 2, 3, or "." for no data)
 */
function parseRadonUSA(workbook: XLSX.WorkBook): SeedLocationObservation[] {
  console.log("\nParsing Radon USA sheet...")

  const sheetName = "Air Pollution - Radon (USA) "
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    console.log(`  Sheet '${sheetName}' not found, skipping`)
    return []
  }

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const observations: SeedLocationObservation[] = []
  const observedAt = new Date().toISOString()

  let skipped = 0
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as (string | number | undefined)[]
    if (!row || row.length < 5) {
      skipped++
      continue
    }

    const countyState = row[0]
    const countyLabel = row[1]
    const stateName = row[2]
    const zone = row[4]

    // Skip header rows, state summary rows (zone = "."), or rows without zone data
    if (
      !countyState ||
      !stateName ||
      zone === undefined ||
      zone === null ||
      zone === "." ||
      zone === "Zone"
    ) {
      skipped++
      continue
    }

    // Parse zone value (must be 1, 2, or 3)
    const zoneNum = typeof zone === "number" ? zone : parseInt(String(zone), 10)
    if (isNaN(zoneNum) || zoneNum < 1 || zoneNum > 3) {
      skipped++
      continue
    }

    // Get state code
    const stateCode = US_STATE_CODES[String(stateName).trim()]
    if (!stateCode) {
      console.log(`  Warning: Unknown state "${stateName}" at row ${i + 1}`)
      skipped++
      continue
    }

    // Parse county name from countyLabel (format: ".Autauga County")
    let countyName = String(countyLabel || "").trim()
    if (countyName.startsWith(".")) {
      countyName = countyName.substring(1)
    }
    // Remove "County" suffix if present
    countyName = countyName.replace(/ County$/i, "").trim()

    // Use county name as city (for display purposes)
    observations.push({
      city: countyName,
      state: stateCode,
      country: "US",
      county: countyName,
      propertyId: "radon",
      zoneValue: String(zoneNum),
      observedAt,
      source: "EPA",
      sourceUrl: "https://www.epa.gov/radon/epa-map-radon-zones",
      rawData: {
        originalRow: i + 1,
        countyState: String(countyState),
        region: row[3],
      },
    })
  }

  console.log(`  Parsed ${observations.length} radon observations (skipped ${skipped} rows)`)
  return observations
}

/**
 * Parse the Lyme Disease - Quebec sheet
 *
 * Sheet structure:
 * - Column 0: Region (e.g., "03 - Capitale-Nationale")
 * - Column 1: Municipality code (number)
 * - Column 2: Municipality name (e.g., "Deschambault-Grondines")
 * - Column 3: Endemic Zone ("yes" or "no")
 * - Column 4: Secteur PPE ("oui" or not)
 */
function parseLymeQuebec(workbook: XLSX.WorkBook): SeedLocationObservation[] {
  console.log("\nParsing Lyme Disease - Quebec sheet...")

  const sheetName = "Lyme Disease - Quebec"
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    console.log(`  Sheet '${sheetName}' not found, skipping`)
    return []
  }

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const observations: SeedLocationObservation[] = []
  const observedAt = new Date().toISOString()

  let skipped = 0
  let currentRegion = ""

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as (string | number | undefined)[]
    if (!row || row.length < 4) {
      skipped++
      continue
    }

    // Update current region if present
    const regionCell = row[0]
    if (regionCell && String(regionCell).trim()) {
      currentRegion = String(regionCell).trim()
    }

    const municipalityName = row[2]
    const endemicZone = row[3]

    // Skip rows without municipality name or endemic zone
    if (!municipalityName || !endemicZone) {
      skipped++
      continue
    }

    // Skip header row
    if (String(municipalityName).toLowerCase() === "endemic zone") {
      skipped++
      continue
    }

    // Parse endemic value
    const isEndemic = String(endemicZone).toLowerCase().trim() === "yes"

    observations.push({
      city: String(municipalityName).trim(),
      state: "QC",
      country: "CA",
      county: null,
      propertyId: "lyme_disease",
      endemicValue: isEndemic,
      observedAt,
      source: "INSPQ (Quebec Public Health)",
      sourceUrl: "https://www.inspq.qc.ca/zoonoses/maladie-de-lyme",
      notes: currentRegion || undefined,
      rawData: {
        originalRow: i + 1,
        region: currentRegion,
        municipalityCode: row[1],
        secteurPPE: row[4],
      },
    })
  }

  console.log(`  Parsed ${observations.length} Lyme Quebec observations (skipped ${skipped} rows)`)
  return observations
}

/**
 * Parse the Lyme Disease - USA sheet
 *
 * Sheet structure:
 * - Column 0: Ctyname (e.g., "Autauga County")
 * - Column 1: stname (e.g., "Alabama")
 * - Column 2: ststatus ("Low Incidence" or "High Incidenc")
 * - Column 3: stcode (state code number)
 * - Column 4: ctycode (county code number)
 * - Columns 5-27: Cases2001 through cases2023
 */
function parseLymeUSA(workbook: XLSX.WorkBook): SeedLocationObservation[] {
  console.log("\nParsing Lyme Disease - USA sheet...")

  const sheetName = "Lyme Disease - USA"
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    console.log(`  Sheet '${sheetName}' not found, skipping`)
    return []
  }

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const observations: SeedLocationObservation[] = []
  const observedAt = new Date().toISOString()

  let skipped = 0

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as (string | number | undefined)[]
    if (!row || row.length < 5) {
      skipped++
      continue
    }

    const countyName = row[0]
    const stateName = row[1]
    const status = row[2]

    // Skip header or invalid rows
    if (
      !countyName ||
      !stateName ||
      String(countyName).toLowerCase() === "ctyname"
    ) {
      skipped++
      continue
    }

    // Get state code
    const stateCode = US_STATE_CODES[String(stateName).trim()]
    if (!stateCode) {
      console.log(`  Warning: Unknown state "${stateName}" at row ${i + 1}`)
      skipped++
      continue
    }

    // Calculate total cases and average annual incidence
    // Cases are in columns 5-27 (Cases2001 through cases2023)
    let totalCases = 0
    const yearlyData: Record<string, number> = {}
    for (let j = 5; j <= 27 && j < row.length; j++) {
      const cases = row[j]
      const year = 2001 + (j - 5)
      const caseCount = typeof cases === "number" ? cases : parseInt(String(cases || "0"), 10)
      if (!isNaN(caseCount)) {
        totalCases += caseCount
        yearlyData[String(year)] = caseCount
      }
    }

    // Calculate average annual cases (over 23 years)
    const avgAnnualCases = totalCases / 23

    // Parse county name (remove "County" suffix for city field)
    let cityName = String(countyName).trim()
    cityName = cityName.replace(/ County$/i, "").trim()

    // Determine incidence status
    const statusStr = String(status || "").trim().toLowerCase()
    const isHighIncidence = statusStr.includes("high")

    observations.push({
      city: cityName,
      state: stateCode,
      country: "US",
      county: cityName,
      propertyId: "lyme_disease",
      incidenceValue: avgAnnualCases,
      observedAt,
      source: "CDC",
      sourceUrl: "https://www.cdc.gov/lyme/data-research/facts-stats/index.html",
      notes: isHighIncidence ? "High Incidence State" : "Low Incidence State",
      rawData: {
        originalRow: i + 1,
        totalCases,
        yearRange: "2001-2023",
        stateStatus: status,
        stateCode: row[3],
        countyCode: row[4],
        yearlyCases: yearlyData,
      },
    })
  }

  console.log(`  Parsed ${observations.length} Lyme USA observations (skipped ${skipped} rows)`)
  return observations
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const excelPath = process.argv[2] || path.resolve(__dirname, "../../../Risks.xlsx")
  const outputPath = path.resolve(__dirname, "./seed-om-data.json")

  console.log("=== MapYourHealth O&M Excel Parser ===")
  console.log(`Input: ${excelPath}`)
  console.log(`Output: ${outputPath}`)

  if (!fs.existsSync(excelPath)) {
    console.error(`\nError: Excel file not found at ${excelPath}`)
    console.error("Please provide the path to Risks.xlsx as an argument or place it at the repo root.")
    process.exit(1)
  }

  const workbook = XLSX.readFile(excelPath)
  console.log(`\nFound sheets: ${workbook.SheetNames.join(", ")}`)

  // Parse each sheet
  const radonObservations = parseRadonUSA(workbook)
  const lymeQuebecObservations = parseLymeQuebec(workbook)
  const lymeUSAObservations = parseLymeUSA(workbook)

  // Combine all observations
  const allObservations = [
    ...radonObservations,
    ...lymeQuebecObservations,
    ...lymeUSAObservations,
  ]

  // Build seed data
  const seedData: SeedData = {
    observedProperties: OBSERVED_PROPERTIES,
    propertyThresholds: PROPERTY_THRESHOLDS,
    locationObservations: allObservations,
  }

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2))
  console.log(`\nSeed data written to: ${outputPath}`)

  // Print summary
  console.log("\n=== Summary ===")
  console.log(`Observed Properties: ${seedData.observedProperties.length}`)
  console.log(`Property Thresholds: ${seedData.propertyThresholds.length}`)
  console.log(`Total Location Observations: ${seedData.locationObservations.length}`)
  console.log(`  - Radon USA: ${radonObservations.length}`)
  console.log(`  - Lyme Quebec: ${lymeQuebecObservations.length}`)
  console.log(`  - Lyme USA: ${lymeUSAObservations.length}`)

  // Category breakdown
  const byProperty: Record<string, number> = {}
  for (const obs of seedData.locationObservations) {
    byProperty[obs.propertyId] = (byProperty[obs.propertyId] || 0) + 1
  }
  console.log("\nObservations by property:")
  for (const [prop, count] of Object.entries(byProperty)) {
    console.log(`  ${prop}: ${count}`)
  }
}

main()
