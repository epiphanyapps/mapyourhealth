/**
 * Seed script for jurisdictions, contaminants, and thresholds (upsert).
 *
 * Run with: COGNITO_EMAIL=xxx COGNITO_PASSWORD=xxx npx tsx scripts/seed-contaminants.ts
 *
 * For each row in seed-data.json, this script either creates a new record
 * (when the natural key is absent) or updates the existing record when any
 * field has drifted from the seed. Re-running with no JSON edits is a no-op
 * (the `unchanged` counter bumps).
 *
 * Why upsert (not pure create): seed-data.json is the source of truth for
 * categories, threshold limits, and jurisdiction metadata. A .create()-only
 * seed silently no-ops on existing rows, so JSON edits never roll forward —
 * that's how the EPI-18 category miscoding survived multiple reseeds and
 * required a separate `update-contaminant-categories.ts` patch.
 *
 * Prerequisites:
 * - User must be in the "admin" Cognito group
 * - Amplify backend deployed
 *
 * Optional: pass `--clear` to wipe the tables before re-seeding.
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import seedData from "./seed-data.json";

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

// Pagination cap is defensive; current row counts are well under 1000 each
// (jurisdictions ~18, contaminants ~174, thresholds ~414) but thresholds
// scale with contaminant × jurisdiction so pagination matters here.
const PAGE_LIMIT = 1000;
const MAX_PAGES = 100;

async function listAllJurisdictions() {
  const all: Awaited<ReturnType<typeof client.models.Jurisdiction.list>>["data"] = [];
  let nextToken: string | null | undefined = undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await client.models.Jurisdiction.list({ limit: PAGE_LIMIT, nextToken });
    all.push(...page.data);
    nextToken = page.nextToken;
    if (!nextToken) return all;
  }
  throw new Error("listAllJurisdictions exceeded MAX_PAGES — check for runaway data growth.");
}

async function listAllContaminants() {
  const all: Awaited<ReturnType<typeof client.models.Contaminant.list>>["data"] = [];
  let nextToken: string | null | undefined = undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await client.models.Contaminant.list({ limit: PAGE_LIMIT, nextToken });
    all.push(...page.data);
    nextToken = page.nextToken;
    if (!nextToken) return all;
  }
  throw new Error("listAllContaminants exceeded MAX_PAGES — check for runaway data growth.");
}

async function listAllThresholds() {
  const all: Awaited<ReturnType<typeof client.models.ContaminantThreshold.list>>["data"] = [];
  let nextToken: string | null | undefined = undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await client.models.ContaminantThreshold.list({ limit: PAGE_LIMIT, nextToken });
    all.push(...page.data);
    nextToken = page.nextToken;
    if (!nextToken) return all;
  }
  throw new Error("listAllThresholds exceeded MAX_PAGES — check for runaway data growth.");
}

// Treat undefined and null as the same value when comparing seed to DDB,
// so an absent JSON field doesn't appear to differ from a null DDB column.
function nullish<T>(value: T | null | undefined): T | null {
  return value === undefined ? null : value;
}

async function seedJurisdictions(jurisdictions: SeedJurisdiction[]) {
  console.log(`\nSeeding ${jurisdictions.length} jurisdictions...`);
  const existing = await listAllJurisdictions();
  const byCode = new Map(existing.map((j) => [j.code, j]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const seed of jurisdictions) {
    try {
      const current = byCode.get(seed.code);
      if (!current) {
        await client.models.Jurisdiction.create({
          code: seed.code,
          name: seed.name,
          nameFr: seed.nameFr,
          country: seed.country,
          region: seed.region,
          parentCode: seed.parentCode,
          isDefault: seed.isDefault,
        });
        created++;
        process.stdout.write("+");
        continue;
      }
      const differs =
        current.name !== seed.name ||
        nullish(current.nameFr) !== nullish(seed.nameFr) ||
        current.country !== seed.country ||
        nullish(current.region) !== nullish(seed.region) ||
        nullish(current.parentCode) !== nullish(seed.parentCode) ||
        current.isDefault !== seed.isDefault;
      if (!differs) {
        unchanged++;
        process.stdout.write(".");
        continue;
      }
      await client.models.Jurisdiction.update({
        id: current.id,
        name: seed.name,
        nameFr: seed.nameFr,
        country: seed.country,
        region: seed.region,
        parentCode: seed.parentCode,
        isDefault: seed.isDefault,
      });
      updated++;
      process.stdout.write("~");
    } catch (error) {
      errors++;
      console.error(`\nError upserting jurisdiction ${seed.code}:`, error);
    }
  }

  console.log(
    `\nJurisdictions: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`
  );
}

async function seedContaminants(contaminants: SeedContaminant[]) {
  console.log(`\nSeeding ${contaminants.length} contaminants...`);
  const existing = await listAllContaminants();
  const byId = new Map(existing.map((c) => [c.contaminantId, c]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const seed of contaminants) {
    try {
      const current = byId.get(seed.contaminantId);
      if (!current) {
        await client.models.Contaminant.create({
          contaminantId: seed.contaminantId,
          name: seed.name,
          nameFr: seed.nameFr,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: seed.category as any,
          unit: seed.unit,
          description: seed.description,
          descriptionFr: seed.descriptionFr,
          studies: seed.studies,
          higherIsBad: seed.higherIsBad,
        });
        created++;
        process.stdout.write("+");
        continue;
      }
      const differs =
        current.name !== seed.name ||
        nullish(current.nameFr) !== nullish(seed.nameFr) ||
        current.category !== seed.category ||
        current.unit !== seed.unit ||
        nullish(current.description) !== nullish(seed.description) ||
        nullish(current.descriptionFr) !== nullish(seed.descriptionFr) ||
        nullish(current.studies) !== nullish(seed.studies) ||
        current.higherIsBad !== seed.higherIsBad;
      if (!differs) {
        unchanged++;
        process.stdout.write(".");
        continue;
      }
      await client.models.Contaminant.update({
        id: current.id,
        name: seed.name,
        nameFr: seed.nameFr,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: seed.category as any,
        unit: seed.unit,
        description: seed.description,
        descriptionFr: seed.descriptionFr,
        studies: seed.studies,
        higherIsBad: seed.higherIsBad,
      });
      updated++;
      process.stdout.write("~");
    } catch (error) {
      errors++;
      console.error(`\nError upserting contaminant ${seed.contaminantId}:`, error);
    }
  }

  console.log(
    `\nContaminants: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`
  );
}

async function seedThresholds(thresholds: SeedThreshold[]) {
  console.log(`\nSeeding ${thresholds.length} thresholds...`);
  const existing = await listAllThresholds();
  const byKey = new Map(
    existing.map((t) => [`${t.contaminantId}::${t.jurisdictionCode}`, t])
  );

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const seed of thresholds) {
    const key = `${seed.contaminantId}::${seed.jurisdictionCode}`;
    try {
      const current = byKey.get(key);
      if (!current) {
        await client.models.ContaminantThreshold.create({
          contaminantId: seed.contaminantId,
          jurisdictionCode: seed.jurisdictionCode,
          limitValue: seed.limitValue,
          warningRatio: seed.warningRatio,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: seed.status as any,
        });
        created++;
        process.stdout.write("+");
        continue;
      }
      const differs =
        nullish(current.limitValue) !== nullish(seed.limitValue) ||
        nullish(current.warningRatio) !== nullish(seed.warningRatio) ||
        current.status !== seed.status;
      if (!differs) {
        unchanged++;
        process.stdout.write(".");
        continue;
      }
      await client.models.ContaminantThreshold.update({
        id: current.id,
        limitValue: seed.limitValue,
        warningRatio: seed.warningRatio,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: seed.status as any,
      });
      updated++;
      process.stdout.write("~");
    } catch (error) {
      errors++;
      console.error(`\nError upserting threshold ${key}:`, error);
    }
  }

  console.log(
    `\nThresholds: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`
  );
}

async function clearExistingData() {
  console.log("\nClearing existing data...");

  const thresholds = await listAllThresholds();
  for (const threshold of thresholds) {
    await client.models.ContaminantThreshold.delete({ id: threshold.id });
  }
  console.log(`Deleted ${thresholds.length} thresholds`);

  const contaminants = await listAllContaminants();
  for (const contaminant of contaminants) {
    await client.models.Contaminant.delete({ id: contaminant.id });
  }
  console.log(`Deleted ${contaminants.length} contaminants`);

  const jurisdictions = await listAllJurisdictions();
  for (const jurisdiction of jurisdictions) {
    await client.models.Jurisdiction.delete({ id: jurisdiction.id });
  }
  console.log(`Deleted ${jurisdictions.length} jurisdictions`);
}

async function main() {
  console.log("=== MapYourHealth Contaminant Seeding (upsert mode) ===");
  console.log(`Data file contains:`);
  console.log(`  - ${seedData.jurisdictions.length} jurisdictions`);
  console.log(`  - ${seedData.contaminants.length} contaminants`);
  console.log(`  - ${seedData.thresholds.length} thresholds`);

  // Authenticate with Cognito first
  await authenticate();

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
