/**
 * Seed script for contaminants and thresholds
 *
 * Run with: npx ts-node scripts/seed-contaminants.ts
 *
 * Prerequisites:
 * - AWS credentials configured
 * - Amplify backend deployed
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import seedData from "./seed-data.json";

// Load Amplify outputs
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

// Use IAM auth for admin operations (requires AWS credentials)
const client = generateClient<Schema>({
  authMode: "iam",
});

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
  status: string;
}

async function seedJurisdictions(jurisdictions: SeedJurisdiction[]) {
  console.log(`\nSeeding ${jurisdictions.length} jurisdictions...`);
  let created = 0;
  let errors = 0;

  for (const jurisdiction of jurisdictions) {
    try {
      await client.models.Jurisdiction.create({
        code: jurisdiction.code,
        name: jurisdiction.name,
        nameFr: jurisdiction.nameFr,
        country: jurisdiction.country,
        region: jurisdiction.region,
        parentCode: jurisdiction.parentCode,
        isDefault: jurisdiction.isDefault,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(`\nError creating jurisdiction ${jurisdiction.code}:`, error);
    }
  }

  console.log(`\nJurisdictions: ${created} created, ${errors} errors`);
}

async function seedContaminants(contaminants: SeedContaminant[]) {
  console.log(`\nSeeding ${contaminants.length} contaminants...`);
  let created = 0;
  let errors = 0;

  for (const contaminant of contaminants) {
    try {
      await client.models.Contaminant.create({
        contaminantId: contaminant.contaminantId,
        name: contaminant.name,
        nameFr: contaminant.nameFr,
        category: contaminant.category as any,
        unit: contaminant.unit,
        description: contaminant.description,
        descriptionFr: contaminant.descriptionFr,
        studies: contaminant.studies,
        higherIsBad: contaminant.higherIsBad,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(`\nError creating contaminant ${contaminant.contaminantId}:`, error);
    }
  }

  console.log(`\nContaminants: ${created} created, ${errors} errors`);
}

async function seedThresholds(thresholds: SeedThreshold[]) {
  console.log(`\nSeeding ${thresholds.length} thresholds...`);
  let created = 0;
  let errors = 0;

  for (const threshold of thresholds) {
    try {
      await client.models.ContaminantThreshold.create({
        contaminantId: threshold.contaminantId,
        jurisdictionCode: threshold.jurisdictionCode,
        limitValue: threshold.limitValue,
        warningRatio: threshold.warningRatio,
        status: threshold.status as any,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(
        `\nError creating threshold ${threshold.contaminantId}/${threshold.jurisdictionCode}:`,
        error
      );
    }
  }

  console.log(`\nThresholds: ${created} created, ${errors} errors`);
}

async function clearExistingData() {
  console.log("\nClearing existing data...");

  // Clear thresholds
  const thresholds = await client.models.ContaminantThreshold.list({ limit: 1000 });
  for (const threshold of thresholds.data) {
    await client.models.ContaminantThreshold.delete({ id: threshold.id });
  }
  console.log(`Deleted ${thresholds.data.length} thresholds`);

  // Clear contaminants
  const contaminants = await client.models.Contaminant.list({ limit: 1000 });
  for (const contaminant of contaminants.data) {
    await client.models.Contaminant.delete({ id: contaminant.id });
  }
  console.log(`Deleted ${contaminants.data.length} contaminants`);

  // Clear jurisdictions
  const jurisdictions = await client.models.Jurisdiction.list({ limit: 1000 });
  for (const jurisdiction of jurisdictions.data) {
    await client.models.Jurisdiction.delete({ id: jurisdiction.id });
  }
  console.log(`Deleted ${jurisdictions.data.length} jurisdictions`);
}

async function main() {
  console.log("=== MapYourHealth Contaminant Seeding ===");
  console.log(`Data file contains:`);
  console.log(`  - ${seedData.jurisdictions.length} jurisdictions`);
  console.log(`  - ${seedData.contaminants.length} contaminants`);
  console.log(`  - ${seedData.thresholds.length} thresholds`);

  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");

  if (shouldClear) {
    await clearExistingData();
  }

  await seedJurisdictions(seedData.jurisdictions);
  await seedContaminants(seedData.contaminants);
  await seedThresholds(seedData.thresholds);

  console.log("\n=== Seeding complete ===");
}

main().catch(console.error);
