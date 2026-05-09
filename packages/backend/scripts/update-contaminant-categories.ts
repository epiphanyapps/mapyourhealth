/**
 * Targeted update for Contaminant.category corrections (EPI-18).
 *
 * `seed-contaminants.ts` is `.create()`-only: re-running it after
 * `seed-data.json` is edited is a no-op for already-seeded contaminants
 * because each row already exists. To roll category corrections forward
 * without wiping the table (and orphaning LocationMeasurements that
 * reference these IDs), this script reads the desired category from
 * `seed-data.json` for a fixed list of `contaminantId`s and calls
 * `.update()` on each existing record.
 *
 * Idempotent: re-running after a successful pass is a no-op.
 *
 * Run against staging:
 *   COGNITO_EMAIL=seed@mapyourhealth.info \
 *   COGNITO_PASSWORD=SeedAdmin2026! \
 *     npx tsx scripts/update-contaminant-categories.ts
 *
 * Run against production: same command from the prod-pointed
 * `amplify_outputs.json` (typically by deploying to main first so the
 * outputs file points at prod, then running this manually).
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";

import type { Schema } from "../amplify/data/resource";
import seedData from "./seed-data.json";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: "userPool" });

/**
 * IDs whose category was corrected in EPI-18. The new category value
 * comes from `seed-data.json` so this list and the JSON cannot disagree
 * — adding an ID here that isn't in the JSON throws; an ID in the JSON
 * with a still-correct category is harmless (we always apply whatever
 * `seed-data.json` currently says).
 */
const TARGET_IDS = [
  "boron",
  "fluoride",
  "microcystin-lr",
  "silver",
  "aluminium",
  "microplastics",
] as const;

async function authenticate() {
  const email = process.env.COGNITO_EMAIL;
  const password = process.env.COGNITO_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Missing credentials. Set COGNITO_EMAIL and COGNITO_PASSWORD environment variables.",
    );
  }
  console.log(`Signing in as ${email}...`);
  const result = await signIn({ username: email, password });
  if (!result.isSignedIn) {
    throw new Error(`Sign in failed: ${result.nextStep?.signInStep}`);
  }
  console.log("Signed in successfully.\n");
}

async function main() {
  console.log("=== EPI-18 contaminant category update ===");
  await authenticate();

  // Build the desired-state map from seed-data.json. If a target ID is
  // absent from the JSON, fail loudly rather than silently skipping —
  // that would mean the script was edited out of step with the JSON.
  const desired = new Map<string, string>();
  for (const id of TARGET_IDS) {
    const row = seedData.contaminants.find((c) => c.contaminantId === id);
    if (!row) {
      throw new Error(
        `Target ID "${id}" not present in seed-data.json — update the script or the JSON.`,
      );
    }
    desired.set(id, row.category);
  }

  console.log(`Resolving ${TARGET_IDS.length} target records via byContaminantId GSI...`);

  let updated = 0;
  let alreadyCorrect = 0;
  let missing = 0;
  let errors = 0;

  for (const id of TARGET_IDS) {
    const targetCategory = desired.get(id)!;

    // The Contaminant model has a secondary index on contaminantId
    // (resource.ts:246). Amplify Gen2 generates a model-prefixed query
    // method: listContaminantByContaminantId. Mirrors the pattern in
    // apps/mobile/app/services/amplify/data.ts:235.
    const lookup = await client.models.Contaminant.listContaminantByContaminantId({
      contaminantId: id,
    });
    if (lookup.errors && lookup.errors.length > 0) {
      console.error(`[${id}] lookup errors:`, lookup.errors);
      errors++;
      continue;
    }
    const records = lookup.data;
    if (records.length === 0) {
      console.warn(`[${id}] not found on this backend — skipping.`);
      missing++;
      continue;
    }
    if (records.length > 1) {
      console.warn(
        `[${id}] found ${records.length} records (expected 1). Updating all to "${targetCategory}".`,
      );
    }

    for (const record of records) {
      if (record.category === targetCategory) {
        console.log(`[${id}] already "${targetCategory}" — skipping.`);
        alreadyCorrect++;
        continue;
      }
      const before = record.category;
      // Cast to `any` matches `seed-contaminants.ts:115` — the generated
      // enum type for `category` is awkward to satisfy from a runtime
      // string. Trust holds because TARGET_IDS and `seed-data.json` are
      // checked for consistency above.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await client.models.Contaminant.update({
        id: record.id,
        category: targetCategory as any,
      });
      if (result.errors && result.errors.length > 0) {
        console.error(`[${id}] update errors:`, result.errors);
        errors++;
        continue;
      }
      console.log(`[${id}] ${before ?? "<null>"} -> ${targetCategory}`);
      updated++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`  Updated:         ${updated}`);
  console.log(`  Already correct: ${alreadyCorrect}`);
  console.log(`  Missing:         ${missing}`);
  console.log(`  Errors:          ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
