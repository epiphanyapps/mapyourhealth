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

// Small, deliberately distinctive set. Values are obviously synthetic
// (whole numbers; threshold-mid range) so they're recognisable in the
// admin portal as test data, not real measurements.
const FIXTURES: FixtureRow[] = [
  // State-scoped: applies to every QC city without its own row.
  // Confirms the city → state cascade leg.
  {
    city: null,
    state: "QC",
    country: "CA",
    contaminantId: "radon",
    value: 100,
    unit: "Bq/m³",
    notes: "Cascade coverage fixture: QC state-level row.",
  },
  // Country-scoped: applies to every CA city without state-level data.
  // Confirms the city → state → country cascade leg.
  {
    city: null,
    state: null,
    country: "CA",
    contaminantId: "radon",
    value: 80,
    unit: "Bq/m³",
    notes: "Cascade coverage fixture: CA country-level row.",
  },
];

async function findFixtureRows(): Promise<{ id: string }[]> {
  const found: { id: string }[] = [];
  let lastKey: Record<string, unknown> | undefined;
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
