/**
 * Cascade-coverage seed (#123).
 *
 * The main seed (`seed-dynamodb-direct.ts`) populates city-anchored
 * `LocationMeasurement` rows from Risks.xlsx, which exercises the
 * city → state cascade once a no-data Quebec city is searched. It does
 * NOT populate state- or country-anchored rows, so the country-scope
 * leg of the cascade is unverified end-to-end.
 *
 * This script writes a small fixed set of state- and country-anchored
 * rows so an operator can manually verify the full cascade. Rows are
 * tagged with `source = "cascade-coverage-fixture"` for easy
 * identification and cleanup. Idempotent: deletes any existing
 * fixture rows before inserting.
 *
 * Run with:
 *   TABLE_SUFFIX=<env>-NONE AWS_PROFILE=rayane \
 *     npx tsx scripts/seed-cascade-test-rows.ts
 *
 * After running, search any Canadian city in the mobile app:
 *   - `Sorel-Tracy, QC` → "Showing QC data" (state cascade)
 *   - any non-QC, non-ON Canadian city → "Showing CA data" (country cascade)
 *
 * Caveat: `getLocationMeasurementsByCountry` is a GSI scan on `country`
 * and returns every row tagged with that country, including the
 * city-anchored rows seeded from Risks.xlsx. So the country-cascade badge
 * fires even without these fixtures on a populated env — the fixture's
 * unique value is in adding visibly-distinguishable rows (uranium-238
 * with `source = "cascade-coverage-fixture"`) you can pick out in the
 * dashboard and admin portal as cascade-test data.
 *
 * Cleanup later with the same script + the --remove flag.
 */

import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from "crypto";

const REGION = "ca-central-1";
const FIXTURE_SOURCE = "cascade-coverage-fixture";

const TABLE_SUFFIX = process.env.TABLE_SUFFIX;
if (!TABLE_SUFFIX) {
  console.error(
    "\nERROR: TABLE_SUFFIX env var is required. There is no safe default.\n" +
      "Set it to the AppSync data suffix for the environment you intend to seed.\n" +
      "  staging: TABLE_SUFFIX=dwz5zs2ghrc5xplczomoh4fzke-NONE\n" +
      "  main:    TABLE_SUFFIX=uusoeozunzdy5biliji7vxbjcy-NONE  (PRODUCTION — confirm twice)\n",
  );
  process.exit(1);
}

const REMOVE_MODE = process.argv.includes("--remove");
const TABLE_NAME = `LocationMeasurement-${TABLE_SUFFIX}`;
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

interface FixtureRow {
  city: string | null;
  state: string | null;
  country: string;
  contaminantId: string;
  value: number;
  unit?: string;
  notes: string;
}

// Deliberately uses `uranium-238` (a real seeded radioactive Contaminant
// with WHO/CA-QC/EU thresholds) rather than `radon` — `radon` exists as
// an O&M ObservedProperty but NOT as a Contaminant, so a row with
// `contaminantId: "radon"` would be an orphan that mobile's stat
// mapping can't resolve to a category. Different values per row so an
// operator inspecting the dashboard can identify which fixture got
// returned (warning vs safe status under WHO's 1.0 Bq/L limit).
const FIXTURES: FixtureRow[] = [
  // State-scoped: applies to every QC city without its own row.
  // Confirms the city → state cascade leg. Value 0.9 sits above the
  // 0.8 warningRatio of WHO's 1.0 limit → renders as "warning".
  {
    city: null,
    state: "QC",
    country: "CA",
    contaminantId: "uranium-238",
    value: 0.9,
    unit: "Bq/L",
    notes: "Cascade coverage fixture: QC state-level row (warning status).",
  },
  // Country-scoped: applies to every CA city without state-level data.
  // Confirms the city → state → country cascade leg. Value 0.3 is below
  // warning threshold → renders as "safe".
  {
    city: null,
    state: null,
    country: "CA",
    contaminantId: "uranium-238",
    value: 0.3,
    unit: "Bq/L",
    notes: "Cascade coverage fixture: CA country-level row (safe status).",
  },
];

async function findFixtureRows(): Promise<{ id: string }[]> {
  const found: { id: string }[] = [];
  let lastKey: Record<string, unknown> | undefined;
  try {
    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "#src = :src",
          ExpressionAttributeNames: { "#src": "source" },
          ExpressionAttributeValues: { ":src": FIXTURE_SOURCE },
          ProjectionExpression: "id",
          ExclusiveStartKey: lastKey as Record<string, never> | undefined,
        }),
      );
      for (const item of result.Items ?? []) {
        if (typeof item.id === "string") found.push({ id: item.id });
      }
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
  } catch (err: unknown) {
    // Mirror wipe-all-data.ts:104–110 — a fresh sandbox where the
    // schema hasn't deployed yet means there are no fixtures to find.
    // Skip cleanly rather than crashing on ResourceNotFoundException.
    if (err instanceof Error && err.name === "ResourceNotFoundException") {
      console.log(`Table ${TABLE_NAME} not found (skipping fixture lookup).`);
      return [];
    }
    throw err;
  }
  return found;
}

async function deleteRows(ids: { id: string }[]): Promise<number> {
  if (ids.length === 0) return 0;
  // BatchWriteItem caps at 25 per request.
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 25) {
    const chunk = ids.slice(i, i + 25);
    await client.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map(({ id }) => ({
            DeleteRequest: { Key: marshall({ id }) },
          })),
        },
      }),
    );
    deleted += chunk.length;
  }
  return deleted;
}

async function insertFixtures(): Promise<number> {
  const now = new Date().toISOString();
  // Build items with the city/state attributes OMITTED (not set to null)
  // when the row is anchored above that level. The DynamoDB GSI on
  // `city` requires String type; writing a typed NULL is rejected with
  // "Type mismatch for Index Key city Expected: S Actual: NULL". Sparse
  // index = absent key, not null key. AppSync VTL strips nulls before
  // PutItem; we have to do the same here.
  const items = FIXTURES.map((row) => {
    const item: Record<string, unknown> = {
      id: randomUUID(),
      country: row.country,
      contaminantId: row.contaminantId,
      value: row.value,
      measuredAt: now,
      source: FIXTURE_SOURCE,
      notes: row.notes,
      silentImport: true, // Don't fan out push notifications for fixture data.
      createdAt: now,
      updatedAt: now,
      __typename: "LocationMeasurement",
    };
    if (row.city !== null) item.city = row.city;
    if (row.state !== null) item.state = row.state;
    return item;
  });

  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await client.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((item) => ({
            PutRequest: { Item: marshall(item, { removeUndefinedValues: true }) },
          })),
        },
      }),
    );
  }
  return items.length;
}

async function main() {
  console.log(`Target table: ${TABLE_NAME}`);
  console.log(`Mode: ${REMOVE_MODE ? "REMOVE fixtures" : "INSERT fixtures (idempotent)"}`);

  const existing = await findFixtureRows();
  console.log(`Existing fixture rows: ${existing.length}`);

  if (existing.length > 0) {
    const removed = await deleteRows(existing);
    console.log(`Removed ${removed} existing fixture row(s).`);
  }

  if (REMOVE_MODE) {
    console.log("Done (remove mode).");
    return;
  }

  const inserted = await insertFixtures();
  console.log(`Inserted ${inserted} cascade fixture row(s):`);
  for (const f of FIXTURES) {
    const scope = f.city ? "city" : f.state ? "state" : "country";
    console.log(`  - ${scope}: city=${f.city ?? "(null)"} state=${f.state ?? "(null)"} country=${f.country} contaminantId=${f.contaminantId}`);
  }
}

main().catch((err) => {
  console.error("Cascade fixture script failed:", err);
  process.exit(1);
});
