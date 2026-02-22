/**
 * Seed script for Observations & Measurements (O&M) data
 *
 * Supports two modes:
 * 1. Excel import: npx tsx scripts/seed-om-data.ts --file path/to/data.xlsx
 * 2. JSON import: npx tsx scripts/seed-om-data.ts --json path/to/data.json
 *
 * Options:
 * --dry-run    Preview what would be created without actually seeding
 * --clear      Clear existing O&M data before seeding
 *
 * Prerequisites:
 * - COGNITO_EMAIL and COGNITO_PASSWORD env vars set
 * - User must be in the "admin" Cognito group
 * - Amplify backend deployed
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import type { Schema } from "../amplify/data/resource";

// Load Amplify outputs
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

const client = generateClient<Schema>({
  authMode: "userPool",
});

// ============================================================================
// Types
// ============================================================================

interface SeedObservedProperty {
  propertyId: string;
  name: string;
  nameFr?: string | null;
  category: string;
  observationType: string;
  unit?: string | null;
  description?: string | null;
  descriptionFr?: string | null;
  higherIsBad?: boolean;
  metadata?: Record<string, unknown> | null;
}

interface SeedPropertyThreshold {
  propertyId: string;
  jurisdictionCode: string;
  limitValue?: number | null;
  warningValue?: number | null;
  zoneMapping?: Record<string, string> | null;
  endemicIsDanger?: boolean | null;
  incidenceWarningThreshold?: number | null;
  incidenceDangerThreshold?: number | null;
  status: string;
  notes?: string | null;
}

interface SeedLocationObservation {
  city: string;
  state: string;
  country: string;
  county?: string | null;
  propertyId: string;
  numericValue?: number | null;
  zoneValue?: string | null;
  endemicValue?: boolean | null;
  incidenceValue?: number | null;
  binaryValue?: boolean | null;
  observedAt: string;
  validUntil?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  rawData?: Record<string, unknown> | null;
}

interface SeedData {
  observedProperties: SeedObservedProperty[];
  propertyThresholds: SeedPropertyThreshold[];
  locationObservations: SeedLocationObservation[];
}

// ============================================================================
// Authentication
// ============================================================================

async function authenticate() {
  const email = process.env.COGNITO_EMAIL;
  const password = process.env.COGNITO_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing credentials. Set COGNITO_EMAIL and COGNITO_PASSWORD environment variables."
    );
  }

  console.log(`Signing in as ${email}...`);
  const result = await signIn({ username: email, password });

  if (!result.isSignedIn) {
    throw new Error(`Sign in failed: ${result.nextStep?.signInStep}`);
  }

  console.log("Signed in successfully!\n");
}

// ============================================================================
// Excel Parsing
// ============================================================================

function parseExcel(filePath: string): SeedData {
  console.log(`\nParsing Excel file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;

  console.log(`Found sheets: ${sheetNames.join(", ")}`);

  const data: SeedData = {
    observedProperties: [],
    propertyThresholds: [],
    locationObservations: [],
  };

  // Parse ObservedProperties sheet
  if (sheetNames.includes("ObservedProperties")) {
    const sheet = workbook.Sheets["ObservedProperties"];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    data.observedProperties = rows.map((row) => ({
      propertyId: String(row["propertyId"] || ""),
      name: String(row["name"] || ""),
      nameFr: row["nameFr"] ? String(row["nameFr"]) : null,
      category: String(row["category"] || ""),
      observationType: String(row["observationType"] || "numeric"),
      unit: row["unit"] ? String(row["unit"]) : null,
      description: row["description"] ? String(row["description"]) : null,
      descriptionFr: row["descriptionFr"] ? String(row["descriptionFr"]) : null,
      higherIsBad: row["higherIsBad"] !== false && row["higherIsBad"] !== "false",
      metadata: row["metadata"] ? JSON.parse(String(row["metadata"])) : null,
    }));
    console.log(`  - ObservedProperties: ${data.observedProperties.length} rows`);
  }

  // Parse PropertyThresholds sheet
  if (sheetNames.includes("PropertyThresholds")) {
    const sheet = workbook.Sheets["PropertyThresholds"];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    data.propertyThresholds = rows.map((row) => ({
      propertyId: String(row["propertyId"] || ""),
      jurisdictionCode: String(row["jurisdictionCode"] || ""),
      limitValue: row["limitValue"] ? Number(row["limitValue"]) : null,
      warningValue: row["warningValue"] ? Number(row["warningValue"]) : null,
      zoneMapping: row["zoneMapping"] ? JSON.parse(String(row["zoneMapping"])) : null,
      endemicIsDanger: row["endemicIsDanger"] === true || row["endemicIsDanger"] === "true",
      incidenceWarningThreshold: row["incidenceWarningThreshold"]
        ? Number(row["incidenceWarningThreshold"])
        : null,
      incidenceDangerThreshold: row["incidenceDangerThreshold"]
        ? Number(row["incidenceDangerThreshold"])
        : null,
      status: String(row["status"] || "active"),
      notes: row["notes"] ? String(row["notes"]) : null,
    }));
    console.log(`  - PropertyThresholds: ${data.propertyThresholds.length} rows`);
  }

  // Parse LocationObservations sheet
  if (sheetNames.includes("LocationObservations")) {
    const sheet = workbook.Sheets["LocationObservations"];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    data.locationObservations = rows.map((row) => ({
      city: String(row["city"] || ""),
      state: String(row["state"] || ""),
      country: String(row["country"] || ""),
      county: row["county"] ? String(row["county"]) : null,
      propertyId: String(row["propertyId"] || ""),
      numericValue: row["numericValue"] ? Number(row["numericValue"]) : null,
      zoneValue: row["zoneValue"] ? String(row["zoneValue"]) : null,
      endemicValue:
        row["endemicValue"] === true || row["endemicValue"] === "true" ? true :
        row["endemicValue"] === false || row["endemicValue"] === "false" ? false : null,
      incidenceValue: row["incidenceValue"] ? Number(row["incidenceValue"]) : null,
      binaryValue:
        row["binaryValue"] === true || row["binaryValue"] === "true" ? true :
        row["binaryValue"] === false || row["binaryValue"] === "false" ? false : null,
      observedAt: String(row["observedAt"] || new Date().toISOString()),
      validUntil: row["validUntil"] ? String(row["validUntil"]) : null,
      source: row["source"] ? String(row["source"]) : null,
      sourceUrl: row["sourceUrl"] ? String(row["sourceUrl"]) : null,
      notes: row["notes"] ? String(row["notes"]) : null,
      rawData: row["rawData"] ? JSON.parse(String(row["rawData"])) : null,
    }));
    console.log(`  - LocationObservations: ${data.locationObservations.length} rows`);
  }

  return data;
}

function parseJson(filePath: string): SeedData {
  console.log(`\nParsing JSON file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content) as SeedData;

  console.log(`  - ObservedProperties: ${data.observedProperties?.length || 0} items`);
  console.log(`  - PropertyThresholds: ${data.propertyThresholds?.length || 0} items`);
  console.log(`  - LocationObservations: ${data.locationObservations?.length || 0} items`);

  return {
    observedProperties: data.observedProperties || [],
    propertyThresholds: data.propertyThresholds || [],
    locationObservations: data.locationObservations || [],
  };
}

// ============================================================================
// Seeding Functions
// ============================================================================

async function seedObservedProperties(
  properties: SeedObservedProperty[],
  dryRun: boolean
) {
  console.log(`\nSeeding ${properties.length} observed properties...`);
  let created = 0;
  let errors = 0;

  for (const prop of properties) {
    if (dryRun) {
      console.log(`  [DRY RUN] Would create property: ${prop.propertyId} (${prop.name})`);
      created++;
      continue;
    }

    try {
      await client.models.ObservedProperty.create({
        propertyId: prop.propertyId,
        name: prop.name,
        nameFr: prop.nameFr,
        category: prop.category as Schema["ObservedProperty"]["type"]["category"],
        observationType: prop.observationType as Schema["ObservedProperty"]["type"]["observationType"],
        unit: prop.unit,
        description: prop.description,
        descriptionFr: prop.descriptionFr,
        higherIsBad: prop.higherIsBad ?? true,
        metadata: prop.metadata,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(`\nError creating property ${prop.propertyId}:`, error);
    }
  }

  console.log(`\nObservedProperties: ${created} created, ${errors} errors`);
}

async function seedPropertyThresholds(
  thresholds: SeedPropertyThreshold[],
  dryRun: boolean
) {
  console.log(`\nSeeding ${thresholds.length} property thresholds...`);
  let created = 0;
  let errors = 0;

  for (const threshold of thresholds) {
    if (dryRun) {
      console.log(
        `  [DRY RUN] Would create threshold: ${threshold.propertyId} / ${threshold.jurisdictionCode}`
      );
      created++;
      continue;
    }

    try {
      await client.models.PropertyThreshold.create({
        propertyId: threshold.propertyId,
        jurisdictionCode: threshold.jurisdictionCode,
        limitValue: threshold.limitValue,
        warningValue: threshold.warningValue,
        zoneMapping: threshold.zoneMapping,
        endemicIsDanger: threshold.endemicIsDanger,
        incidenceWarningThreshold: threshold.incidenceWarningThreshold,
        incidenceDangerThreshold: threshold.incidenceDangerThreshold,
        status: threshold.status as Schema["PropertyThreshold"]["type"]["status"],
        notes: threshold.notes,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(
        `\nError creating threshold ${threshold.propertyId}/${threshold.jurisdictionCode}:`,
        error
      );
    }
  }

  console.log(`\nPropertyThresholds: ${created} created, ${errors} errors`);
}

async function seedLocationObservations(
  observations: SeedLocationObservation[],
  dryRun: boolean
) {
  console.log(`\nSeeding ${observations.length} location observations...`);
  let created = 0;
  let errors = 0;

  for (const obs of observations) {
    if (dryRun) {
      console.log(
        `  [DRY RUN] Would create observation: ${obs.propertyId} @ ${obs.city}, ${obs.state}`
      );
      created++;
      continue;
    }

    try {
      await client.models.LocationObservation.create({
        city: obs.city,
        state: obs.state,
        country: obs.country,
        county: obs.county,
        propertyId: obs.propertyId,
        numericValue: obs.numericValue,
        zoneValue: obs.zoneValue,
        endemicValue: obs.endemicValue,
        incidenceValue: obs.incidenceValue,
        binaryValue: obs.binaryValue,
        observedAt: obs.observedAt,
        validUntil: obs.validUntil,
        source: obs.source,
        sourceUrl: obs.sourceUrl,
        notes: obs.notes,
        rawData: obs.rawData,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(
        `\nError creating observation ${obs.propertyId}@${obs.city}:`,
        error
      );
    }
  }

  console.log(`\nLocationObservations: ${created} created, ${errors} errors`);
}

async function clearOMData() {
  console.log("\nClearing existing O&M data...");

  // Clear observations first (depends on properties)
  const observations = await client.models.LocationObservation.list({ limit: 1000 });
  for (const obs of observations.data) {
    await client.models.LocationObservation.delete({ id: obs.id });
  }
  console.log(`Deleted ${observations.data.length} location observations`);

  // Clear thresholds (depends on properties)
  const thresholds = await client.models.PropertyThreshold.list({ limit: 1000 });
  for (const threshold of thresholds.data) {
    await client.models.PropertyThreshold.delete({ id: threshold.id });
  }
  console.log(`Deleted ${thresholds.data.length} property thresholds`);

  // Clear properties
  const properties = await client.models.ObservedProperty.list({ limit: 1000 });
  for (const prop of properties.data) {
    await client.models.ObservedProperty.delete({ id: prop.id });
  }
  console.log(`Deleted ${properties.data.length} observed properties`);
}

// ============================================================================
// Main
// ============================================================================

function printUsage() {
  console.log(`
Usage: COGNITO_EMAIL=xxx COGNITO_PASSWORD=xxx npx tsx scripts/seed-om-data.ts [options]

Options:
  --file <path>   Path to Excel file (.xlsx) with O&M data
  --json <path>   Path to JSON file with O&M data
  --dry-run       Preview what would be created without seeding
  --clear         Clear existing O&M data before seeding

Excel file should have sheets named:
  - ObservedProperties (columns: propertyId, name, nameFr, category, observationType, unit, description, descriptionFr, higherIsBad, metadata)
  - PropertyThresholds (columns: propertyId, jurisdictionCode, limitValue, warningValue, zoneMapping, endemicIsDanger, incidenceWarningThreshold, incidenceDangerThreshold, status, notes)
  - LocationObservations (columns: city, state, country, county, propertyId, numericValue, zoneValue, endemicValue, incidenceValue, binaryValue, observedAt, validUntil, source, sourceUrl, notes, rawData)
  `);
}

async function main() {
  const args = process.argv.slice(2);

  const fileIndex = args.indexOf("--file");
  const jsonIndex = args.indexOf("--json");
  const dryRun = args.includes("--dry-run");
  const shouldClear = args.includes("--clear");

  if (fileIndex === -1 && jsonIndex === -1) {
    printUsage();
    process.exit(1);
  }

  let data: SeedData;

  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = path.resolve(args[fileIndex + 1]);
    data = parseExcel(filePath);
  } else if (jsonIndex !== -1 && args[jsonIndex + 1]) {
    const filePath = path.resolve(args[jsonIndex + 1]);
    data = parseJson(filePath);
  } else {
    printUsage();
    process.exit(1);
  }

  console.log("\n=== MapYourHealth O&M Data Seeding ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Data summary:`);
  console.log(`  - ${data.observedProperties.length} observed properties`);
  console.log(`  - ${data.propertyThresholds.length} property thresholds`);
  console.log(`  - ${data.locationObservations.length} location observations`);

  if (!dryRun) {
    await authenticate();
  }

  if (shouldClear && !dryRun) {
    await clearOMData();
  }

  // Seed in order: properties first, then thresholds, then observations
  await seedObservedProperties(data.observedProperties, dryRun);
  await seedPropertyThresholds(data.propertyThresholds, dryRun);
  await seedLocationObservations(data.locationObservations, dryRun);

  console.log("\n=== Seeding complete ===");
}

main().catch(console.error);
