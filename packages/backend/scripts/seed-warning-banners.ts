/**
 * Seed script for WarningBanner cascade test fixtures.
 *
 * Run with: COGNITO_EMAIL=xxx COGNITO_PASSWORD=xxx npx tsx scripts/seed-warning-banners.ts
 *
 * Reads seed-warning-banners.json and upserts each row by `title` (the
 * natural key for seed banners — every fixture title is prefixed with
 * `[SEED] `). Re-running with no JSON edits is a no-op (the `unchanged`
 * counter bumps).
 *
 * Why upsert (not pure create): WarningBanner has no business unique
 * constraint and a `.create()`-only loop would silently skip existing
 * rows on re-runs, so JSON edits would never roll forward — same trap
 * EPI-18 hit with seed-contaminants.ts.
 *
 * Prerequisites:
 * - User must be in the "admin" Cognito group
 * - Amplify backend deployed with the WarningBanner cascade GSIs (PR #329)
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import seedData from "./seed-warning-banners.json";

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

type SeverityValue = "critical" | "warning" | "info";

interface SeedBanner {
  title: string;
  titleFr?: string | null;
  description: string;
  descriptionFr?: string | null;
  severity: SeverityValue;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  startsAt: string;
  expiresAt?: string | null;
  isActive: boolean;
}

const PAGE_LIMIT = 1000;
const MAX_PAGES = 100;

async function listAllBanners() {
  const all: Awaited<ReturnType<typeof client.models.WarningBanner.list>>["data"] = [];
  let nextToken: string | null | undefined = undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await client.models.WarningBanner.list({ limit: PAGE_LIMIT, nextToken });
    all.push(...page.data);
    nextToken = page.nextToken;
    if (!nextToken) return all;
  }
  throw new Error("listAllBanners exceeded MAX_PAGES — check for runaway data growth.");
}

// Treat undefined and null as the same value when comparing seed to DDB,
// so an absent JSON field doesn't appear to differ from a null DDB column.
function nullish<T>(value: T | null | undefined): T | null {
  return value === undefined ? null : value;
}

async function seedBanners(banners: SeedBanner[]) {
  console.log(`\nSeeding ${banners.length} warning banners...`);
  const existing = await listAllBanners();
  const byTitle = new Map(existing.map((b) => [b.title, b]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const seed of banners) {
    try {
      const current = byTitle.get(seed.title);
      if (!current) {
        await client.models.WarningBanner.create({
          title: seed.title,
          titleFr: seed.titleFr,
          description: seed.description,
          descriptionFr: seed.descriptionFr,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          severity: seed.severity as any,
          city: seed.city,
          state: seed.state,
          country: seed.country,
          startsAt: seed.startsAt,
          expiresAt: seed.expiresAt,
          isActive: seed.isActive,
        });
        created++;
        process.stdout.write("+");
        continue;
      }
      const differs =
        nullish(current.titleFr) !== nullish(seed.titleFr) ||
        current.description !== seed.description ||
        nullish(current.descriptionFr) !== nullish(seed.descriptionFr) ||
        current.severity !== seed.severity ||
        nullish(current.city) !== nullish(seed.city) ||
        nullish(current.state) !== nullish(seed.state) ||
        nullish(current.country) !== nullish(seed.country) ||
        current.startsAt !== seed.startsAt ||
        nullish(current.expiresAt) !== nullish(seed.expiresAt) ||
        current.isActive !== seed.isActive;
      if (!differs) {
        unchanged++;
        process.stdout.write(".");
        continue;
      }
      await client.models.WarningBanner.update({
        id: current.id,
        titleFr: seed.titleFr,
        description: seed.description,
        descriptionFr: seed.descriptionFr,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        severity: seed.severity as any,
        city: seed.city,
        state: seed.state,
        country: seed.country,
        startsAt: seed.startsAt,
        expiresAt: seed.expiresAt,
        isActive: seed.isActive,
      });
      updated++;
      process.stdout.write("~");
    } catch (error) {
      errors++;
      console.error(`\nError upserting banner "${seed.title}":`, error);
    }
  }

  console.log(
    `\nWarning banners: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`
  );
  if (errors > 0) {
    process.exit(1);
  }
}

async function main() {
  console.log("=== MapYourHealth Warning Banner Seeding (upsert by title) ===");
  console.log(`Data file contains ${seedData.banners.length} banners`);

  await authenticate();
  await seedBanners(seedData.banners as SeedBanner[]);

  console.log("\n=== Done ===");
}

main().catch(console.error);
