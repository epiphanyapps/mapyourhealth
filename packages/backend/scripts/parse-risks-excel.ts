/**
 * Parse Risks.xlsx and Generate seed-data.json
 *
 * This script reads the Risks.xlsx Excel file and generates seed-data.json
 * with contaminants, jurisdictions, and thresholds for the MapYourHealth backend.
 *
 * Run with: npx ts-node scripts/parse-risks-excel.ts
 */

import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Types
// =============================================================================

interface SeedJurisdiction {
  code: string;
  name: string;
  nameFr?: string | null;
  country: string;
  region?: string | null;
  parentCode?: string | null;
  isDefault: boolean;
}

interface SeedContaminant {
  contaminantId: string;
  name: string;
  nameFr?: string | null;
  category: string;
  unit: string;
  description?: string | null;
  descriptionFr?: string | null;
  studies?: string | null;
  higherIsBad: boolean;
}

interface SeedThreshold {
  contaminantId: string;
  jurisdictionCode: string;
  limitValue: number | null;
  warningRatio: number | null;
  status: "regulated" | "banned" | "not_approved" | "not_controlled";
}

interface SeedData {
  jurisdictions: SeedJurisdiction[];
  contaminants: SeedContaminant[];
  thresholds: SeedThreshold[];
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Column indices in the Excel file
 */
const COLS = {
  NAME: 0,
  WHO: 1,
  QUEBEC: 2,
  NY: 3,
  CA: 4,
  TX: 5,
  FL: 6,
  EU: 7,
  KEYWORDS: 8,
  STUDIES_EN: 9,
  DESCRIPTION_EN: 10,
  STUDIES_EN_ALT: 11,
  DESCRIPTION_FR: 12,
};

/**
 * Map jurisdiction columns to jurisdiction codes
 */
const JURISDICTION_MAP: { col: number; code: string }[] = [
  { col: COLS.WHO, code: "WHO" },
  { col: COLS.QUEBEC, code: "CA-QC" },
  { col: COLS.NY, code: "US-NY" },
  { col: COLS.CA, code: "US-CA" },
  { col: COLS.TX, code: "US-TX" },
  { col: COLS.FL, code: "US-FL" },
  { col: COLS.EU, code: "EU" },
];

/**
 * Category mapping from Excel to schema category
 */
const CATEGORY_MAP: Record<string, string> = {
  fertilizers: "fertilizer",
  fertilizer: "fertilizer",
  pesticides: "pesticide",
  pesticide: "pesticide",
  "radioactive contaminants": "radioactive",
  radioactive: "radioactive",
  "heavy metals": "inorganic",
  "heavy metal": "inorganic",
  inorganic: "inorganic",
  chemicals: "organic",
  chemical: "organic",
  "chemicals - desinfectants used to purify water": "disinfectant",
  "chemicals - disinfectants used to purify water": "disinfectant",
  disinfectants: "disinfectant",
  disinfectant: "disinfectant",
  "pfas - forever chemicals": "organic",
  pfas: "organic",
  "forever chemicals": "organic",
};

/**
 * Jurisdictions configuration
 */
const JURISDICTIONS: SeedJurisdiction[] = [
  {
    code: "WHO",
    name: "World Health Organization",
    nameFr: "Organisation mondiale de la Santé",
    country: "INTL",
    region: null,
    parentCode: null,
    isDefault: true,
  },
  {
    code: "EU",
    name: "European Union",
    nameFr: "Union européenne",
    country: "EU",
    region: null,
    parentCode: "WHO",
    isDefault: false,
  },
  {
    code: "US",
    name: "United States (Federal)",
    nameFr: "États-Unis (Fédéral)",
    country: "US",
    region: null,
    parentCode: "WHO",
    isDefault: false,
  },
  {
    code: "CA",
    name: "Canada (Federal)",
    nameFr: "Canada (Fédéral)",
    country: "CA",
    region: null,
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
    code: "US-TX",
    name: "Texas",
    nameFr: "Texas",
    country: "US",
    region: "TX",
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
    code: "US-GA",
    name: "Georgia",
    nameFr: "Géorgie",
    country: "US",
    region: "GA",
    parentCode: "US",
    isDefault: false,
  },
  {
    code: "US-AZ",
    name: "Arizona",
    nameFr: "Arizona",
    country: "US",
    region: "AZ",
    parentCode: "US",
    isDefault: false,
  },
  {
    code: "US-CO",
    name: "Colorado",
    nameFr: "Colorado",
    country: "US",
    region: "CO",
    parentCode: "US",
    isDefault: false,
  },
  {
    code: "US-MA",
    name: "Massachusetts",
    nameFr: "Massachusetts",
    country: "US",
    region: "MA",
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
  {
    code: "CA-ON",
    name: "Ontario",
    nameFr: "Ontario",
    country: "CA",
    region: "ON",
    parentCode: "CA",
    isDefault: false,
  },
  {
    code: "CA-BC",
    name: "British Columbia",
    nameFr: "Colombie-Britannique",
    country: "CA",
    region: "BC",
    parentCode: "CA",
    isDefault: false,
  },
  {
    code: "CA-AB",
    name: "Alberta",
    nameFr: "Alberta",
    country: "CA",
    region: "AB",
    parentCode: "CA",
    isDefault: false,
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a URL-friendly contaminant ID from the name
 */
function generateContaminantId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, "") // Remove parentheses
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, "") // Remove non-alphanumeric except dashes
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, ""); // Remove leading/trailing dashes
}

/**
 * Check if a row is a category header
 */
function isCategoryRow(row: any[]): boolean {
  if (!row || !row[0] || typeof row[0] !== "string") return false;
  const name = row[0].trim();
  // Category headers match pattern like "2 Fertilizers" or "68 Pesticides"
  const match = name.match(/^(\d+)\s+(.+)$/);
  return match !== null && !row[1]; // Category rows don't have limit values
}

/**
 * Extract category from category row text
 */
function extractCategory(text: string): string | null {
  const match = text.match(/^\d+\s+(.+)$/);
  if (!match) return null;
  const rawCategory = match[1].toLowerCase().trim();
  return CATEGORY_MAP[rawCategory] || null;
}

/**
 * Parse threshold value from Excel cell
 * Returns { value, status } where value can be number or null
 */
function parseThresholdValue(
  cellValue: any
): { value: number | null; status: SeedThreshold["status"] } {
  // Empty or undefined - not controlled
  if (cellValue === undefined || cellValue === null || cellValue === "") {
    return { value: null, status: "not_controlled" };
  }

  // If it's a number, it's regulated
  if (typeof cellValue === "number") {
    return { value: cellValue, status: "regulated" };
  }

  // String value - check for special statuses
  const str = String(cellValue).toUpperCase().trim();

  // Banned
  if (str.includes("BANNED")) {
    return { value: null, status: "banned" };
  }

  // Not approved
  if (str.includes("NOT APPROVED")) {
    return { value: null, status: "not_approved" };
  }

  // No standard / not regulated
  if (
    str.includes("NO STANDARD") ||
    str.includes("NO GLOBAL STANDARD") ||
    str.includes("NOT REGULATED") ||
    str.includes("UNREGULATED")
  ) {
    return { value: null, status: "not_controlled" };
  }

  // Try to extract a number from the string
  const numMatch = str.match(/^([\d.]+)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    if (!isNaN(num)) {
      return { value: num, status: "regulated" };
    }
  }

  // Long text descriptions (like EU PFAS explanation) - not controlled
  if (str.length > 50) {
    return { value: null, status: "not_controlled" };
  }

  // Default to not controlled
  return { value: null, status: "not_controlled" };
}

/**
 * Determine unit from contaminant name and category
 */
function determineUnit(name: string, category: string): string {
  const nameLower = name.toLowerCase();

  // Radioactive - use Bq/L
  if (
    category === "radioactive" ||
    nameLower.includes("radium") ||
    nameLower.includes("uranium") ||
    nameLower.includes("radon") ||
    nameLower.includes("tritium") ||
    nameLower.includes("cesium") ||
    nameLower.includes("strontium") ||
    nameLower.includes("iodine") ||
    nameLower.includes("plutonium") ||
    nameLower.includes("thorium") ||
    nameLower.includes("polonium")
  ) {
    return "Bq/L";
  }

  // PFAS use ng/L (parts per trillion)
  if (
    nameLower.includes("pfoa") ||
    nameLower.includes("pfos") ||
    nameLower.includes("pfna") ||
    nameLower.includes("pfhxs") ||
    nameLower.includes("pfbs") ||
    nameLower.includes("pfas") ||
    nameLower.includes("perfluoro")
  ) {
    return "ng/L";
  }

  // Default to μg/L (micrograms per liter)
  return "μg/L";
}

// =============================================================================
// Main Parsing Function
// =============================================================================

function parseExcel(filePath: string): SeedData {
  console.log(`Reading Excel file: ${filePath}`);
  const workbook = XLSX.readFile(filePath);

  const sheet = workbook.Sheets["Drinking Water Contamination"];
  if (!sheet) {
    throw new Error("Sheet 'Drinking Water Contamination' not found");
  }

  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total rows in sheet: ${data.length}`);

  const contaminants: SeedContaminant[] = [];
  const thresholds: SeedThreshold[] = [];
  const seenIds = new Set<string>();

  let currentCategory = "inorganic"; // Default category
  let skippedRows = 0;
  let processedRows = 0;

  // Skip header row (row 0) and summary row (row 1)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row || !row[0]) {
      skippedRows++;
      continue;
    }

    const name = String(row[0]).trim();

    // Check if this is a category header
    if (isCategoryRow(row)) {
      const category = extractCategory(name);
      if (category) {
        currentCategory = category;
        console.log(`  Category changed to: ${currentCategory} (row ${i})`);
      }
      skippedRows++;
      continue;
    }

    // Skip non-contaminant rows
    if (!name || name.length < 2) {
      skippedRows++;
      continue;
    }

    // Generate contaminant ID
    let contaminantId = generateContaminantId(name);

    // Handle duplicate IDs
    if (seenIds.has(contaminantId)) {
      const originalId = contaminantId;
      let suffix = 2;
      while (seenIds.has(contaminantId)) {
        contaminantId = `${originalId}-${suffix}`;
        suffix++;
      }
      console.log(`  Renamed duplicate: ${originalId} -> ${contaminantId}`);
    }
    seenIds.add(contaminantId);

    // Extract descriptions
    const descriptionEn = row[COLS.DESCRIPTION_EN]
      ? String(row[COLS.DESCRIPTION_EN]).trim()
      : null;
    const descriptionFr = row[COLS.DESCRIPTION_FR]
      ? String(row[COLS.DESCRIPTION_FR]).trim()
      : null;
    const studies = row[COLS.STUDIES_EN]
      ? String(row[COLS.STUDIES_EN]).trim()
      : null;

    // Determine unit
    const unit = determineUnit(name, currentCategory);

    // Create contaminant entry
    const contaminant: SeedContaminant = {
      contaminantId,
      name,
      nameFr: null, // Not available in Excel, could be added later
      category: currentCategory,
      unit,
      description: descriptionEn,
      descriptionFr: descriptionFr,
      studies,
      higherIsBad: true, // Default - all contaminants are bad at high levels
    };

    contaminants.push(contaminant);

    // Process thresholds for each jurisdiction
    for (const { col, code } of JURISDICTION_MAP) {
      const cellValue = row[col];
      const { value, status } = parseThresholdValue(cellValue);

      // Only add threshold if we have meaningful data
      if (value !== null || status !== "not_controlled") {
        const threshold: SeedThreshold = {
          contaminantId,
          jurisdictionCode: code,
          limitValue: value,
          warningRatio: status === "regulated" ? 0.8 : null,
          status,
        };
        thresholds.push(threshold);
      }
    }

    processedRows++;
  }

  console.log(`\nProcessing complete:`);
  console.log(`  Contaminants: ${contaminants.length}`);
  console.log(`  Thresholds: ${thresholds.length}`);
  console.log(`  Skipped rows: ${skippedRows}`);

  return {
    jurisdictions: JURISDICTIONS,
    contaminants,
    thresholds,
  };
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const excelPath = path.resolve(__dirname, "../../../Risks.xlsx");
  const outputPath = path.resolve(__dirname, "./seed-data.json");

  console.log("=== MapYourHealth Risks Excel Parser ===\n");

  try {
    const seedData = parseExcel(excelPath);

    // Write to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2));
    console.log(`\nSeed data written to: ${outputPath}`);

    // Summary
    console.log("\n=== Summary ===");
    console.log(`Jurisdictions: ${seedData.jurisdictions.length}`);
    console.log(`Contaminants: ${seedData.contaminants.length}`);
    console.log(`Thresholds: ${seedData.thresholds.length}`);

    // Category breakdown
    const categoryCount: Record<string, number> = {};
    for (const c of seedData.contaminants) {
      categoryCount[c.category] = (categoryCount[c.category] || 0) + 1;
    }
    console.log("\nContaminants by category:");
    for (const [cat, count] of Object.entries(categoryCount).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${cat}: ${count}`);
    }

    // Threshold status breakdown
    const statusCount: Record<string, number> = {};
    for (const t of seedData.thresholds) {
      statusCount[t.status] = (statusCount[t.status] || 0) + 1;
    }
    console.log("\nThresholds by status:");
    for (const [status, count] of Object.entries(statusCount).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${status}: ${count}`);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
