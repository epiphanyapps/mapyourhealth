/**
 * Direct DynamoDB seed script - bypasses AppSync authorization
 *
 * Run with: AWS_PROFILE=rayane npx tsx scripts/seed-dynamodb-direct.ts
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import seedData from "./seed-data.json";
import locationData from "./seed-locations.json";

const REGION = "ca-central-1";
const TABLE_SUFFIX = "uusoeozunzdy5biliji7vxbjcy-NONE";

const TABLES = {
  Jurisdiction: `Jurisdiction-${TABLE_SUFFIX}`,
  Contaminant: `Contaminant-${TABLE_SUFFIX}`,
  ContaminantThreshold: `ContaminantThreshold-${TABLE_SUFFIX}`,
  Location: `Location-${TABLE_SUFFIX}`,
};

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

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

interface SeedLocation {
  city: string;
  county?: string | null;
  state: string;
  country: string;
  jurisdictionCode: string;
  latitude?: number | null;
  longitude?: number | null;
}

async function seedJurisdictions(jurisdictions: SeedJurisdiction[]) {
  console.log(`\nSeeding ${jurisdictions.length} jurisdictions...`);
  let created = 0;
  let errors = 0;

  for (const jurisdiction of jurisdictions) {
    try {
      const now = new Date().toISOString();
      await docClient.send(
        new PutCommand({
          TableName: TABLES.Jurisdiction,
          Item: {
            id: randomUUID(),
            __typename: "Jurisdiction",
            code: jurisdiction.code,
            name: jurisdiction.name,
            nameFr: jurisdiction.nameFr ?? null,
            country: jurisdiction.country,
            region: jurisdiction.region ?? null,
            parentCode: jurisdiction.parentCode ?? null,
            isDefault: jurisdiction.isDefault,
            createdAt: now,
            updatedAt: now,
          },
        })
      );
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
      const now = new Date().toISOString();
      await docClient.send(
        new PutCommand({
          TableName: TABLES.Contaminant,
          Item: {
            id: randomUUID(),
            __typename: "Contaminant",
            contaminantId: contaminant.contaminantId,
            name: contaminant.name,
            nameFr: contaminant.nameFr ?? null,
            category: contaminant.category,
            unit: contaminant.unit,
            description: contaminant.description ?? null,
            descriptionFr: contaminant.descriptionFr ?? null,
            studies: contaminant.studies ?? null,
            higherIsBad: contaminant.higherIsBad,
            createdAt: now,
            updatedAt: now,
          },
        })
      );
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
      const now = new Date().toISOString();
      await docClient.send(
        new PutCommand({
          TableName: TABLES.ContaminantThreshold,
          Item: {
            id: randomUUID(),
            __typename: "ContaminantThreshold",
            contaminantId: threshold.contaminantId,
            jurisdictionCode: threshold.jurisdictionCode,
            limitValue: threshold.limitValue,
            warningRatio: threshold.warningRatio,
            status: threshold.status,
            createdAt: now,
            updatedAt: now,
          },
        })
      );
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

async function seedLocations(locations: SeedLocation[]) {
  console.log(`\nSeeding ${locations.length} locations...`);
  let created = 0;
  let errors = 0;

  for (const location of locations) {
    try {
      const now = new Date().toISOString();
      await docClient.send(
        new PutCommand({
          TableName: TABLES.Location,
          Item: {
            id: randomUUID(),
            __typename: "Location",
            city: location.city,
            county: location.county ?? null,
            state: location.state,
            country: location.country,
            jurisdictionCode: location.jurisdictionCode,
            latitude: location.latitude ?? null,
            longitude: location.longitude ?? null,
            createdAt: now,
            updatedAt: now,
          },
        })
      );
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(`\nError creating location ${location.city}, ${location.state}:`, error);
    }
  }

  console.log(`\nLocations: ${created} created, ${errors} errors`);
}

async function clearTable(tableName: string) {
  console.log(`Clearing ${tableName}...`);
  let deleted = 0;

  let lastKey: Record<string, any> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastKey,
        ProjectionExpression: "id",
      })
    );

    for (const item of result.Items || []) {
      await docClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { id: item.id },
        })
      );
      deleted++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`  Deleted ${deleted} items`);
}

async function clearExistingData() {
  console.log("\nClearing existing data...");
  await clearTable(TABLES.ContaminantThreshold);
  await clearTable(TABLES.Contaminant);
  await clearTable(TABLES.Jurisdiction);
  await clearTable(TABLES.Location);
}

async function main() {
  console.log("=== MapYourHealth Direct DynamoDB Seeding ===");
  console.log(`Data file contains:`);
  console.log(`  - ${seedData.jurisdictions.length} jurisdictions`);
  console.log(`  - ${seedData.contaminants.length} contaminants`);
  console.log(`  - ${seedData.thresholds.length} thresholds`);
  console.log(`  - ${locationData.locations.length} locations`);

  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");

  if (shouldClear) {
    await clearExistingData();
  }

  await seedJurisdictions(seedData.jurisdictions as SeedJurisdiction[]);
  await seedContaminants(seedData.contaminants as SeedContaminant[]);
  await seedThresholds(seedData.thresholds as SeedThreshold[]);
  await seedLocations(locationData.locations as SeedLocation[]);

  console.log("\n=== Seeding complete ===");
}

main().catch(console.error);
