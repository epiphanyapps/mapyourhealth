/**
 * Direct DynamoDB seed script - bypasses AppSync authorization
 * Uses BatchWriteCommand (25 items/batch) for efficient bulk operations.
 *
 * Run with: AWS_PROFILE=rayane npx tsx scripts/seed-dynamodb-direct.ts
 */

import { DynamoDBClient, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from "crypto";
import seedData from "./seed-data.json";
import locationData from "./seed-locations.json";
import observedPropertiesData from "./observed-properties.json";
import propertyThresholdsData from "./property-thresholds.json";
import measurementsData from "./seed-measurements.json";

const REGION = "ca-central-1";
const TABLE_SUFFIX = process.env.TABLE_SUFFIX || "uusoeozunzdy5biliji7vxbjcy-NONE";

const TABLES = {
  Jurisdiction: `Jurisdiction-${TABLE_SUFFIX}`,
  Contaminant: `Contaminant-${TABLE_SUFFIX}`,
  ContaminantThreshold: `ContaminantThreshold-${TABLE_SUFFIX}`,
  Location: `Location-${TABLE_SUFFIX}`,
  ObservedProperty: `ObservedProperty-${TABLE_SUFFIX}`,
  PropertyThreshold: `PropertyThreshold-${TABLE_SUFFIX}`,
  LocationMeasurement: `LocationMeasurement-${TABLE_SUFFIX}`,
};

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

// =============================================================================
// Generic batch write helper
// =============================================================================

async function batchPutItems(
  tableName: string,
  items: Record<string, any>[],
  label: string
): Promise<{ created: number; errors: number }> {
  console.log(`\nSeeding ${items.length} ${label}...`);
  let created = 0;
  let errors = 0;

  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    try {
      const response = await client.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: chunk.map((item) => ({
              PutRequest: { Item: marshall(item, { removeUndefinedValues: true }) },
            })),
          },
        })
      );

      // Retry unprocessed items with exponential backoff
      let unprocessed = response.UnprocessedItems;
      let retryCount = 0;
      const MAX_RETRIES = 3;
      while (unprocessed && Object.keys(unprocessed).length > 0 && retryCount < MAX_RETRIES) {
        retryCount++;
        await new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 100));
        const retryResponse = await client.send(
          new BatchWriteItemCommand({ RequestItems: unprocessed })
        );
        unprocessed = retryResponse.UnprocessedItems;
      }

      const unprocessedCount = unprocessed?.[tableName]?.length ?? 0;
      created += chunk.length - unprocessedCount;
      if (unprocessedCount > 0) {
        errors += unprocessedCount;
        console.error(`\n${unprocessedCount} items failed after ${MAX_RETRIES} retries`);
      }
      process.stdout.write(".");
    } catch (error) {
      errors += chunk.length;
      console.error(`\nBatch error for ${label} (items ${i}-${i + chunk.length}):`, error);
    }
  }

  console.log(`\n${label}: ${created} created, ${errors} errors`);
  return { created, errors };
}

// =============================================================================
// Item builders — convert seed data to DynamoDB items
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

interface SeedMeasurement {
  city: string;
  state: string;
  country: string;
  contaminantId: string;
  value: number;
  measuredAt: string;
  source: string;
  sourceUrl: string | null;
  notes: string | null;
  silentImport: boolean;
}

function buildJurisdictionItems(jurisdictions: SeedJurisdiction[]) {
  const now = new Date().toISOString();
  return jurisdictions.map((j) => ({
    id: randomUUID(),
    __typename: "Jurisdiction",
    code: j.code,
    name: j.name,
    nameFr: j.nameFr ?? null,
    country: j.country,
    region: j.region ?? null,
    parentCode: j.parentCode ?? null,
    isDefault: j.isDefault,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildContaminantItems(contaminants: SeedContaminant[]) {
  const now = new Date().toISOString();
  return contaminants.map((c) => ({
    id: randomUUID(),
    __typename: "Contaminant",
    contaminantId: c.contaminantId,
    name: c.name,
    nameFr: c.nameFr ?? null,
    category: c.category,
    unit: c.unit,
    description: c.description ?? null,
    descriptionFr: c.descriptionFr ?? null,
    studies: c.studies ?? null,
    higherIsBad: c.higherIsBad,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildThresholdItems(thresholds: SeedThreshold[]) {
  const now = new Date().toISOString();
  return thresholds.map((t) => ({
    id: randomUUID(),
    __typename: "ContaminantThreshold",
    contaminantId: t.contaminantId,
    jurisdictionCode: t.jurisdictionCode,
    limitValue: t.limitValue,
    warningRatio: t.warningRatio,
    status: t.status,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildLocationItems(locations: SeedLocation[]) {
  const now = new Date().toISOString();
  return locations.map((l) => ({
    id: randomUUID(),
    __typename: "Location",
    city: l.city,
    county: l.county ?? null,
    state: l.state,
    country: l.country,
    jurisdictionCode: l.jurisdictionCode,
    latitude: l.latitude ?? null,
    longitude: l.longitude ?? null,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildObservedPropertyItems(properties: SeedObservedProperty[]) {
  const now = new Date().toISOString();
  return properties.map((p) => ({
    id: randomUUID(),
    __typename: "ObservedProperty",
    propertyId: p.propertyId,
    name: p.name,
    nameFr: p.nameFr ?? null,
    category: p.category,
    observationType: p.observationType,
    unit: p.unit ?? null,
    description: p.description ?? null,
    descriptionFr: p.descriptionFr ?? null,
    higherIsBad: p.higherIsBad ?? true,
    metadata: p.metadata ? JSON.stringify(p.metadata) : null,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildPropertyThresholdItems(thresholds: SeedPropertyThreshold[]) {
  const now = new Date().toISOString();
  return thresholds.map((t) => ({
    id: randomUUID(),
    __typename: "PropertyThreshold",
    propertyId: t.propertyId,
    jurisdictionCode: t.jurisdictionCode,
    limitValue: t.limitValue ?? null,
    warningValue: t.warningValue ?? null,
    zoneMapping: t.zoneMapping ? JSON.stringify(t.zoneMapping) : null,
    endemicIsDanger: t.endemicIsDanger ?? null,
    incidenceWarningThreshold: t.incidenceWarningThreshold ?? null,
    incidenceDangerThreshold: t.incidenceDangerThreshold ?? null,
    status: t.status,
    notes: t.notes ?? null,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildMeasurementItems(measurements: SeedMeasurement[]) {
  const now = new Date().toISOString();
  return measurements.map((m) => ({
    id: randomUUID(),
    __typename: "LocationMeasurement",
    city: m.city,
    state: m.state,
    country: m.country,
    contaminantId: m.contaminantId,
    value: m.value,
    measuredAt: m.measuredAt,
    source: m.source ?? null,
    sourceUrl: m.sourceUrl ?? null,
    notes: m.notes ?? null,
    silentImport: m.silentImport ?? true,
    createdAt: now,
    updatedAt: now,
  }));
}

// =============================================================================
// Clear (batch delete)
// =============================================================================

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

    const items = result.Items || [];
    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25);
      await client.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: chunk.map((item) => ({
              DeleteRequest: { Key: { id: { S: item.id } } },
            })),
          },
        })
      );
      deleted += chunk.length;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`  Deleted ${deleted} items`);
}

async function clearExistingData() {
  console.log("\nClearing existing data...");
  await clearTable(TABLES.LocationMeasurement);
  await clearTable(TABLES.PropertyThreshold);
  await clearTable(TABLES.ObservedProperty);
  await clearTable(TABLES.ContaminantThreshold);
  await clearTable(TABLES.Contaminant);
  await clearTable(TABLES.Jurisdiction);
  await clearTable(TABLES.Location);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log("=== MapYourHealth Direct DynamoDB Seeding ===");
  console.log(`Data file contains:`);
  console.log(`  - ${seedData.jurisdictions.length} jurisdictions`);
  console.log(`  - ${seedData.contaminants.length} contaminants`);
  console.log(`  - ${seedData.thresholds.length} thresholds`);
  console.log(`  - ${locationData.locations.length} locations`);
  console.log(`  - ${observedPropertiesData.length} observed properties`);
  console.log(`  - ${propertyThresholdsData.length} property thresholds`);
  console.log(`  - ${measurementsData.measurements.length} location measurements`);

  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");

  if (shouldClear) {
    await clearExistingData();
  }

  await batchPutItems(TABLES.Jurisdiction, buildJurisdictionItems(seedData.jurisdictions as SeedJurisdiction[]), "Jurisdictions");
  await batchPutItems(TABLES.Contaminant, buildContaminantItems(seedData.contaminants as SeedContaminant[]), "Contaminants");
  await batchPutItems(TABLES.ContaminantThreshold, buildThresholdItems(seedData.thresholds as SeedThreshold[]), "Thresholds");
  await batchPutItems(TABLES.Location, buildLocationItems(locationData.locations as SeedLocation[]), "Locations");
  await batchPutItems(TABLES.ObservedProperty, buildObservedPropertyItems(observedPropertiesData as SeedObservedProperty[]), "Observed Properties");
  await batchPutItems(TABLES.PropertyThreshold, buildPropertyThresholdItems(propertyThresholdsData as SeedPropertyThreshold[]), "Property Thresholds");
  await batchPutItems(TABLES.LocationMeasurement, buildMeasurementItems(measurementsData.measurements as SeedMeasurement[]), "Location Measurements");

  console.log("\n=== Seeding complete ===");
}

main().catch(console.error);
