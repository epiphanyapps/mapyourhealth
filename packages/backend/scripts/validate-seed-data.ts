#!/usr/bin/env tsx
/**
 * Validates packages/backend/scripts/seed-data.json against the
 * Contaminant.category enum declared in amplify/data/resource.ts.
 *
 * Fails (exit 1) if any contaminant has a category that is not a member of
 * the schema enum. Run via `yarn workspace @mapyourhealth/backend validate:seed`.
 */

import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_BACKEND = resolve(__dirname, "..")
const SCHEMA_PATH = resolve(REPO_BACKEND, "amplify/data/resource.ts")
const SEED_PATH = resolve(REPO_BACKEND, "scripts/seed-data.json")

function extractCategoryEnum(schemaSource: string): string[] {
  const block = schemaSource.match(/category:\s*a\.enum\(\[([\s\S]*?)\]\)/)
  if (!block) {
    throw new Error(
      `Could not locate Contaminant.category enum in ${SCHEMA_PATH}. ` +
        `If the schema was refactored, update validate-seed-data.ts.`,
    )
  }
  const values = Array.from(block[1].matchAll(/"([^"]+)"/g)).map((m) => m[1])
  if (values.length === 0) {
    throw new Error(`Parsed an empty category enum from ${SCHEMA_PATH}.`)
  }
  return values
}

interface ContaminantRecord {
  contaminantId: string
  name: string
  category?: string
}

interface SeedData {
  contaminants?: ContaminantRecord[]
}

function main(): void {
  const schemaSource = readFileSync(SCHEMA_PATH, "utf8")
  const allowedCategories = new Set(extractCategoryEnum(schemaSource))

  const seedRaw = readFileSync(SEED_PATH, "utf8")
  let seed: SeedData
  try {
    seed = JSON.parse(seedRaw)
  } catch (err) {
    console.error(`seed-data.json is not valid JSON: ${(err as Error).message}`)
    process.exit(1)
  }

  const contaminants = seed.contaminants ?? []
  if (contaminants.length === 0) {
    console.error("seed-data.json contains no contaminants.")
    process.exit(1)
  }

  const violations: { contaminantId: string; name: string; category: unknown }[] = []
  const tally = new Map<string, number>()

  for (const c of contaminants) {
    const cat = c.category
    if (typeof cat !== "string" || !allowedCategories.has(cat)) {
      violations.push({ contaminantId: c.contaminantId, name: c.name, category: cat })
      continue
    }
    tally.set(cat, (tally.get(cat) ?? 0) + 1)
  }

  console.log(`Schema enum (${SCHEMA_PATH}):`)
  console.log(`  ${[...allowedCategories].join(", ")}\n`)
  console.log(`Seed data: ${contaminants.length} contaminants`)
  for (const cat of [...allowedCategories].sort()) {
    console.log(`  ${cat}: ${tally.get(cat) ?? 0}`)
  }

  if (violations.length > 0) {
    console.error(`\n${violations.length} invalid category value(s):`)
    for (const v of violations) {
      console.error(
        `  - ${v.contaminantId} (${v.name}): ${JSON.stringify(v.category)}`,
      )
    }
    console.error(
      `\nExpected one of: ${[...allowedCategories].join(", ")}`,
    )
    process.exit(1)
  }

  console.log("\nAll category values valid.")
}

main()
