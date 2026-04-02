/**
 * Manage Data Lambda Handler
 *
 * Admin-only operations for wiping and reseeding reference data tables.
 * Logic adapted from seed-dynamodb-direct.ts and wipe-all-data.ts.
 *
 * SAFETY: Only operates on the hardcoded REFERENCE_TABLES list.
 * User data tables are never touched.
 */

import type { Handler } from 'aws-lambda';
import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

// Seed data — bundled by esbuild at build time
import seedData from '../../../scripts/seed-data.json';
import locationData from '../../../scripts/seed-locations.json';
import observedPropertiesData from '../../../scripts/observed-properties.json';
import propertyThresholdsData from '../../../scripts/property-thresholds.json';
import measurementsData from '../../../scripts/seed-measurements.json';
import categoriesData from '../../../scripts/seed-data-categories.json';
import omData from '../../../scripts/seed-om-data.json';

const dynamodb = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamodb);

// Table names from environment variables (set in backend.ts)
const TABLES: Record<string, string> = {
  Jurisdiction: process.env.JURISDICTION_TABLE_NAME || '',
  Contaminant: process.env.CONTAMINANT_TABLE_NAME || '',
  ContaminantThreshold: process.env.CONTAMINANTTHRESHOLD_TABLE_NAME || '',
  Location: process.env.LOCATION_TABLE_NAME || '',
  LocationMeasurement: process.env.LOCATIONMEASUREMENT_TABLE_NAME || '',
  LocationObservation: process.env.LOCATIONOBSERVATION_TABLE_NAME || '',
  Category: process.env.CATEGORY_TABLE_NAME || '',
  SubCategory: process.env.SUBCATEGORY_TABLE_NAME || '',
  ObservedProperty: process.env.OBSERVEDPROPERTY_TABLE_NAME || '',
  PropertyThreshold: process.env.PROPERTYTHRESHOLD_TABLE_NAME || '',
};

// Action → table groupings
const TABLE_GROUPS: Record<string, string[]> = {
  wipeContaminants: ['Contaminant', 'ContaminantThreshold', 'Jurisdiction'],
  wipeLocations: ['Location', 'LocationMeasurement', 'LocationObservation'],
  wipeAll: Object.keys(TABLES),
};

type Action = 'wipeContaminants' | 'wipeLocations' | 'wipeAll' | 'reseedAll';

interface ManageDataEvent {
  arguments: {
    action: Action;
  };
}

interface ManageDataResult {
  success: boolean;
  action: string;
  details: string;
  tablesAffected: string[];
  recordCount: number;
  error?: string;
}

// =============================================================================
// Generic helpers (from seed-dynamodb-direct.ts)
// =============================================================================

async function clearTable(tableName: string): Promise<number> {
  let deleted = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastKey,
        ProjectionExpression: 'id',
      }),
    );

    const items = result.Items || [];
    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25);
      const response = await dynamodb.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: chunk.map((item) => ({
              DeleteRequest: { Key: { id: { S: item.id } } },
            })),
          },
        }),
      );

      // Retry unprocessed items with exponential backoff
      let unprocessed = response.UnprocessedItems;
      let retryCount = 0;
      while (unprocessed && Object.keys(unprocessed).length > 0 && retryCount < 3) {
        retryCount++;
        await new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 100));
        const retryResponse = await dynamodb.send(
          new BatchWriteItemCommand({ RequestItems: unprocessed }),
        );
        unprocessed = retryResponse.UnprocessedItems;
      }

      const unprocessedCount = unprocessed?.[tableName]?.length ?? 0;
      deleted += chunk.length - unprocessedCount;
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return deleted;
}

async function batchPutItems(
  tableName: string,
  items: Record<string, unknown>[],
): Promise<{ created: number; errors: number }> {
  let created = 0;
  let errors = 0;

  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    try {
      const response = await dynamodb.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: chunk.map((item) => ({
              PutRequest: { Item: marshall(item, { removeUndefinedValues: true }) },
            })),
          },
        }),
      );

      let unprocessed = response.UnprocessedItems;
      let retryCount = 0;
      while (unprocessed && Object.keys(unprocessed).length > 0 && retryCount < 3) {
        retryCount++;
        await new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 100));
        const retryResponse = await dynamodb.send(
          new BatchWriteItemCommand({ RequestItems: unprocessed }),
        );
        unprocessed = retryResponse.UnprocessedItems;
      }

      const unprocessedCount = unprocessed?.[tableName]?.length ?? 0;
      created += chunk.length - unprocessedCount;
      if (unprocessedCount > 0) errors += unprocessedCount;
    } catch (err) {
      console.error(`BatchWrite failed for ${tableName} (chunk ${i}-${i + chunk.length}):`, err);
      errors += chunk.length;
    }
  }

  return { created, errors };
}

// =============================================================================
// Item builders (from seed-dynamodb-direct.ts + new category/observation builders)
// =============================================================================

function buildJurisdictionItems(jurisdictions: typeof seedData.jurisdictions) {
  const now = new Date().toISOString();
  return jurisdictions.map((j) => ({
    id: randomUUID(),
    __typename: 'Jurisdiction',
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

function buildContaminantItems(contaminants: typeof seedData.contaminants) {
  const now = new Date().toISOString();
  return contaminants.map((c) => ({
    id: randomUUID(),
    __typename: 'Contaminant',
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

function buildThresholdItems(thresholds: typeof seedData.thresholds) {
  const now = new Date().toISOString();
  return thresholds.map((t) => ({
    id: randomUUID(),
    __typename: 'ContaminantThreshold',
    contaminantId: t.contaminantId,
    jurisdictionCode: t.jurisdictionCode,
    limitValue: t.limitValue,
    warningRatio: t.warningRatio,
    status: t.status,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildLocationItems(locations: typeof locationData.locations) {
  const now = new Date().toISOString();
  return locations.map((l) => ({
    id: randomUUID(),
    __typename: 'Location',
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

function buildMeasurementItems(measurements: typeof measurementsData.measurements) {
  const now = new Date().toISOString();
  return measurements.map((m) => ({
    id: randomUUID(),
    __typename: 'LocationMeasurement',
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

function buildObservedPropertyItems(properties: typeof observedPropertiesData) {
  const now = new Date().toISOString();
  return properties.map((p) => ({
    id: randomUUID(),
    __typename: 'ObservedProperty',
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

function buildPropertyThresholdItems(thresholds: SeedPropertyThreshold[]) {
  const now = new Date().toISOString();
  return thresholds.map((t) => ({
    id: randomUUID(),
    __typename: 'PropertyThreshold',
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

function buildCategoryItems(categories: typeof categoriesData.categories) {
  const now = new Date().toISOString();
  return categories.map((c) => ({
    id: randomUUID(),
    __typename: 'Category',
    categoryId: c.categoryId,
    name: c.name,
    nameFr: c.nameFr ?? null,
    description: c.description ?? null,
    descriptionFr: c.descriptionFr ?? null,
    icon: c.icon ?? null,
    color: c.color ?? null,
    sortOrder: c.sortOrder ?? 0,
    isActive: c.isActive ?? true,
    links: c.links ? JSON.stringify(c.links) : null,
    showStandardsTable: c.showStandardsTable ?? false,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildSubCategoryItems(subCategories: typeof categoriesData.subCategories) {
  const now = new Date().toISOString();
  return subCategories.map((s) => ({
    id: randomUUID(),
    __typename: 'SubCategory',
    subCategoryId: s.subCategoryId,
    categoryId: s.categoryId,
    name: s.name,
    nameFr: s.nameFr ?? null,
    description: s.description ?? null,
    descriptionFr: s.descriptionFr ?? null,
    sortOrder: s.sortOrder ?? 0,
    isActive: s.isActive ?? true,
    links: (s as Record<string, unknown>).links
      ? JSON.stringify((s as Record<string, unknown>).links)
      : null,
    createdAt: now,
    updatedAt: now,
  }));
}

interface SeedLocationObservation {
  city: string;
  state: string;
  country: string;
  county?: string | null;
  propertyId: string;
  zoneValue?: string | null;
  observedAt: string;
  source?: string | null;
  sourceUrl?: string | null;
  rawData?: Record<string, unknown> | null;
}

function buildLocationObservationItems(observations: SeedLocationObservation[]) {
  const now = new Date().toISOString();
  return observations.map((o) => ({
    id: randomUUID(),
    __typename: 'LocationObservation',
    city: o.city,
    state: o.state,
    country: o.country,
    county: o.county ?? null,
    propertyId: o.propertyId,
    zoneValue: o.zoneValue ?? null,
    observedAt: o.observedAt,
    source: o.source ?? null,
    sourceUrl: o.sourceUrl ?? null,
    rawData: o.rawData ? JSON.stringify(o.rawData) : null,
    createdAt: now,
    updatedAt: now,
  }));
}

// =============================================================================
// Action handlers
// =============================================================================

async function wipeTables(tableNames: string[]): Promise<{ deleted: number; tables: string[] }> {
  let totalDeleted = 0;
  const wiped: string[] = [];

  for (const name of tableNames) {
    const tableName = TABLES[name];
    if (!tableName) {
      console.warn(`Table ${name} not configured, skipping`);
      continue;
    }
    const count = await clearTable(tableName);
    totalDeleted += count;
    wiped.push(name);
    console.log(`Cleared ${name}: ${count} items`);
  }

  return { deleted: totalDeleted, tables: wiped };
}

async function seedAllTables(): Promise<{ seeded: number; errors: number }> {
  let totalSeeded = 0;
  let totalErrors = 0;

  const seedOps: Array<{ table: string; items: Record<string, unknown>[]; label: string }> = [
    { table: 'Jurisdiction', items: buildJurisdictionItems(seedData.jurisdictions), label: 'Jurisdictions' },
    { table: 'Contaminant', items: buildContaminantItems(seedData.contaminants), label: 'Contaminants' },
    { table: 'ContaminantThreshold', items: buildThresholdItems(seedData.thresholds), label: 'Thresholds' },
    { table: 'Location', items: buildLocationItems(locationData.locations), label: 'Locations' },
    { table: 'ObservedProperty', items: buildObservedPropertyItems(observedPropertiesData), label: 'Observed Properties' },
    { table: 'PropertyThreshold', items: buildPropertyThresholdItems(propertyThresholdsData as SeedPropertyThreshold[]), label: 'Property Thresholds' },
    { table: 'LocationMeasurement', items: buildMeasurementItems(measurementsData.measurements), label: 'Measurements' },
    { table: 'Category', items: buildCategoryItems(categoriesData.categories), label: 'Categories' },
    { table: 'SubCategory', items: buildSubCategoryItems(categoriesData.subCategories), label: 'SubCategories' },
    { table: 'LocationObservation', items: buildLocationObservationItems(omData.locationObservations as SeedLocationObservation[]), label: 'Location Observations' },
  ];

  for (const op of seedOps) {
    const tableName = TABLES[op.table];
    if (!tableName) {
      console.warn(`Table ${op.table} not configured, skipping ${op.label}`);
      continue;
    }
    console.log(`Seeding ${op.items.length} ${op.label}...`);
    const result = await batchPutItems(tableName, op.items);
    totalSeeded += result.created;
    totalErrors += result.errors;
    console.log(`${op.label}: ${result.created} created, ${result.errors} errors`);
  }

  return { seeded: totalSeeded, errors: totalErrors };
}

// =============================================================================
// Main handler
// =============================================================================

export const handler: Handler<ManageDataEvent, ManageDataResult> = async (event) => {
  const { action } = event.arguments;

  const validActions: Action[] = ['wipeContaminants', 'wipeLocations', 'wipeAll', 'reseedAll'];
  if (!validActions.includes(action)) {
    return {
      success: false,
      action: action || 'unknown',
      details: `Invalid action: ${action}`,
      tablesAffected: [],
      recordCount: 0,
      error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
    };
  }

  // Validate table names are configured
  const missingTables = Object.entries(TABLES)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missingTables.length > 0) {
    return {
      success: false,
      action,
      details: `Missing table configuration for: ${missingTables.join(', ')}`,
      tablesAffected: [],
      recordCount: 0,
      error: 'Service not configured',
    };
  }

  try {
    if (action === 'reseedAll') {
      // Wipe all tables first, then seed
      console.log('=== Reseed All: Wiping... ===');
      const wipeResult = await wipeTables(TABLE_GROUPS.wipeAll);
      console.log(`Wiped ${wipeResult.deleted} records from ${wipeResult.tables.length} tables`);

      console.log('=== Reseed All: Seeding... ===');
      const seedResult = await seedAllTables();
      console.log(`Seeded ${seedResult.seeded} records (${seedResult.errors} errors)`);

      const details = seedResult.errors > 0
        ? `Wiped ${wipeResult.deleted} records, seeded ${seedResult.seeded} records (${seedResult.errors} errors)`
        : `Wiped ${wipeResult.deleted} records, seeded ${seedResult.seeded} records`;

      return {
        success: seedResult.errors === 0,
        action,
        details,
        tablesAffected: wipeResult.tables,
        recordCount: seedResult.seeded,
        error: seedResult.errors > 0 ? `${seedResult.errors} records failed to seed` : undefined,
      };
    }

    // Wipe action
    const tableNames = TABLE_GROUPS[action];
    const result = await wipeTables(tableNames);

    return {
      success: true,
      action,
      details: `Deleted ${result.deleted} records from ${result.tables.length} tables (${result.tables.join(', ')})`,
      tablesAffected: result.tables,
      recordCount: result.deleted,
    };
  } catch (error) {
    console.error(`Error during ${action}:`, error);
    return {
      success: false,
      action,
      details: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tablesAffected: [],
      recordCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
