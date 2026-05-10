/**
 * Seed script for PollutionSource cascade test fixtures.
 *
 * Run with: COGNITO_EMAIL=xxx COGNITO_PASSWORD=xxx npx tsx scripts/seed-pollution-sources.ts
 *
 * Reads seed-pollution-sources.json and upserts each row by `sourceId`
 * (the natural key for seed sources — every fixture sourceId is prefixed
 * with `seed-source-`). Re-running with no JSON edits is a no-op (the
 * `unchanged` counter bumps).
 *
 * Why upsert (not pure create): PollutionSource has no business unique
 * constraint and a `.create()`-only loop would silently skip existing
 * rows on re-runs, so JSON edits would never roll forward.
 *
 * Prerequisites:
 * - User must be in the "admin" Cognito group
 * - Amplify backend deployed
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import seedData from "./seed-pollution-sources.json";

import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

const client = generateClient<Schema>({
  authMode: "userPool",
});

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

type SourceTypeValue =
  | "industrial"
  | "agricultural"
  | "waste_site"
  | "spill"
  | "mining"
  | "transportation"
  | "construction"
  | "other";

type SeverityLevelValue = "low" | "moderate" | "high" | "critical";
type StatusValue = "active" | "monitored" | "remediated" | "closed";

interface SeedSource {
  sourceId: string;
  name: string;
  sourceType: SourceTypeValue;
  latitude: number;
  longitude: number;
  impactRadius: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  jurisdictionCode?: string | null;
  primaryContaminants?: string[];
  severityLevel: SeverityLevelValue;
  status: StatusValue;
  description?: string | null;
  notes?: string | null;
}

const PAGE_LIMIT = 1000;
const MAX_PAGES = 100;

async function listAllSources() {
  const all: Awaited<ReturnType<typeof client.models.PollutionSource.list>>["data"] = [];
  let nextToken: string | null | undefined = undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await client.models.PollutionSource.list({ limit: PAGE_LIMIT, nextToken });
    all.push(...page.data);
    nextToken = page.nextToken;
    if (!nextToken) return all;
  }
  throw new Error("listAllSources exceeded MAX_PAGES — check for runaway data growth.");
}

function nullish<T>(value: T | null | undefined): T | null {
  return value === undefined ? null : value;
}

function arraysEqual(a: readonly (string | null)[] | null | undefined, b: readonly string[] | undefined): boolean {
  const aArr = a ?? [];
  const bArr = b ?? [];
  if (aArr.length !== bArr.length) return false;
  for (let i = 0; i < aArr.length; i++) {
    if (aArr[i] !== bArr[i]) return false;
  }
  return true;
}

async function seedSources(sources: SeedSource[]) {
  console.log(`\nSeeding ${sources.length} pollution sources...`);
  const existing = await listAllSources();
  const bySourceId = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    if (row.sourceId) bySourceId.set(row.sourceId, row);
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const seed of sources) {
    try {
      const current = bySourceId.get(seed.sourceId);
      if (!current) {
        await client.models.PollutionSource.create({
          sourceId: seed.sourceId,
          name: seed.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sourceType: seed.sourceType as any,
          latitude: seed.latitude,
          longitude: seed.longitude,
          impactRadius: seed.impactRadius,
          address: seed.address,
          city: seed.city,
          state: seed.state,
          country: seed.country,
          jurisdictionCode: seed.jurisdictionCode,
          primaryContaminants: seed.primaryContaminants,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          severityLevel: seed.severityLevel as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: seed.status as any,
          description: seed.description,
          notes: seed.notes,
        });
        created++;
        process.stdout.write("+");
        continue;
      }
      const differs =
        current.name !== seed.name ||
        current.sourceType !== seed.sourceType ||
        current.latitude !== seed.latitude ||
        current.longitude !== seed.longitude ||
        current.impactRadius !== seed.impactRadius ||
        nullish(current.address) !== nullish(seed.address) ||
        nullish(current.city) !== nullish(seed.city) ||
        nullish(current.state) !== nullish(seed.state) ||
        current.country !== seed.country ||
        nullish(current.jurisdictionCode) !== nullish(seed.jurisdictionCode) ||
        !arraysEqual(current.primaryContaminants, seed.primaryContaminants) ||
        current.severityLevel !== seed.severityLevel ||
        current.status !== seed.status ||
        nullish(current.description) !== nullish(seed.description) ||
        nullish(current.notes) !== nullish(seed.notes);
      if (!differs) {
        unchanged++;
        process.stdout.write(".");
        continue;
      }
      await client.models.PollutionSource.update({
        id: current.id,
        name: seed.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceType: seed.sourceType as any,
        latitude: seed.latitude,
        longitude: seed.longitude,
        impactRadius: seed.impactRadius,
        address: seed.address,
        city: seed.city,
        state: seed.state,
        country: seed.country,
        jurisdictionCode: seed.jurisdictionCode,
        primaryContaminants: seed.primaryContaminants,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        severityLevel: seed.severityLevel as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: seed.status as any,
        description: seed.description,
        notes: seed.notes,
      });
      updated++;
      process.stdout.write("~");
    } catch (error) {
      errors++;
      console.error(`\nError upserting source "${seed.sourceId}":`, error);
    }
  }

  console.log(
    `\nPollution sources: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`
  );
  if (errors > 0) {
    process.exit(1);
  }
}

async function main() {
  console.log("=== MapYourHealth Pollution Source Seeding (upsert by sourceId) ===");
  console.log(`Data file contains ${seedData.sources.length} sources`);

  await authenticate();
  await seedSources(seedData.sources as SeedSource[]);

  console.log("\n=== Done ===");
}

main().catch(console.error);
