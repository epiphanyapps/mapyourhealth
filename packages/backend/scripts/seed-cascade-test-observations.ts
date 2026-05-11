/**
 * Cascade-coverage seed for LocationObservation (companion to
 * `seed-cascade-test-rows.ts`).
 *
 * The main O&M seed (`seed-om-data.ts --observations-only`) populates
 * city-anchored observations from `seed-om-data.json`. It does NOT
 * populate state- or country-anchored rows, so the country-scope leg of
 * the observation cascade is unverified end-to-end.
 *
 * This script writes a small fixed set of state- and country-anchored
 * radon rows so an operator can manually verify the full cascade. Rows
 * are tagged with `source = "cascade-coverage-fixture"` for easy
 * identification and cleanup. Idempotent: deletes any existing fixture
 * rows before inserting.
 *
 * Run with:
 *   TABLE_SUFFIX=<env>-NONE AWS_PROFILE=rayane \
 *     npx tsx scripts/seed-cascade-test-observations.ts
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
const TABLE_NAME = `LocationObservation-${TABLE_SUFFIX}`;
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

interface FixtureRow {
  city: string | null;
  state: string | null;
  country: string;
  propertyId: string;
  zoneValue: string;
  notes: string;
}

// Uses `radon` — a real seeded ObservedProperty (radiation category) with
// thresholds for US and CA-QC. zoneValue mirrors EPA's radon zone scale
// ("1" = highest potential, "3" = lowest). The QC fixture sits at zone 2
// (moderate); CA + US fixtures at zone 3 (low) to give visibly distinct
// rows in the dashboard.
const FIXTURES: FixtureRow[] = [
  // State-scoped: applies to every QC city without its own observation.
  // Confirms the city → state cascade leg for observations.
  {
    city: null,
    state: "QC",
    country: "CA",
    propertyId: "radon",
    zoneValue: "2",
    notes: "Cascade coverage fixture: QC state-level radon observation.",
  },
  // Country-scoped CA: applies to every CA city without state-level data.
  // Confirms city → state → country cascade leg.
  {
    city: null,
    state: null,
    country: "CA",
    propertyId: "radon",
    zoneValue: "3",
    notes: "Cascade coverage fixture: CA country-level radon observation.",
  },
  // Country-scoped US: same role for US cities.
  {
    city: null,
    state: null,
    country: "US",
    propertyId: "radon",
    zoneValue: "3",
    notes: "Cascade coverage fixture: US country-level radon observation.",
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
    // Mirror seed-cascade-test-rows.ts: a fresh sandbox where the schema
    // hasn't deployed yet means there are no fixtures to find. Skip
    // cleanly rather than crashing on ResourceNotFoundException.
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
  // GSI on city/state requires String type — sparse index = absent key,
  // not null key. Same handling as seed-cascade-test-rows.ts.
  const items = FIXTURES.map((row) => {
    const item: Record<string, unknown> = {
      id: randomUUID(),
      country: row.country,
      propertyId: row.propertyId,
      zoneValue: row.zoneValue,
      observedAt: now,
      source: FIXTURE_SOURCE,
      notes: row.notes,
      createdAt: now,
      updatedAt: now,
      __typename: "LocationObservation",
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
    console.log(
      `  - ${scope}: city=${f.city ?? "(null)"} state=${f.state ?? "(null)"} country=${f.country} propertyId=${f.propertyId} zone=${f.zoneValue}`,
    );
  }
}

main().catch((err) => {
  console.error("Cascade observations fixture script failed:", err);
  process.exit(1);
});
