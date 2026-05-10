#!/usr/bin/env tsx
/**
 * Validates seed JSON files against the enum declarations in
 * amplify/data/resource.ts.
 *
 * Checks performed:
 *   - seed-data.json: Contaminant.category
 *   - seed-warning-banners.json: WarningBanner.severity
 *   - seed-pollution-sources.json: PollutionSource.sourceType, severityLevel, status
 *
 * Fails (exit 1) if any seed value is not a member of the corresponding
 * schema enum. Run via `yarn workspace @mapyourhealth/backend validate:seed`.
 */

import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_BACKEND = resolve(__dirname, "..")
const SCHEMA_PATH = resolve(REPO_BACKEND, "amplify/data/resource.ts")
const SEED_PATH = resolve(REPO_BACKEND, "scripts/seed-data.json")
const BANNERS_PATH = resolve(REPO_BACKEND, "scripts/seed-warning-banners.json")
const SOURCES_PATH = resolve(REPO_BACKEND, "scripts/seed-pollution-sources.json")

/**
 * Extract an `a.enum([...])` declaration scoped to a specific model block.
 *
 * Schema models follow the shape:
 *   ModelName: a
 *     .model({ ...fields, fieldName: a.enum([...]) })
 *     .authorization(...)
 * so we anchor the search inside the model() body, not the whole file —
 * that prevents picking up the wrong enum when two models share a field
 * name (e.g. `status` on PollutionSource and ContaminantThreshold).
 */
function extractModelEnum(
  schemaSource: string,
  modelName: string,
  fieldName: string,
): string[] {
  const modelRegex = new RegExp(
    `${modelName}:\\s*a\\s*\\n?\\s*\\.model\\(\\{([\\s\\S]*?)\\}\\)\\s*\\.authorization`,
    "m",
  )
  const modelMatch = schemaSource.match(modelRegex)
  if (!modelMatch) {
    throw new Error(
      `Could not locate ${modelName} model block in ${SCHEMA_PATH}. ` +
        `If the schema was refactored, update validate-seed-data.ts.`,
    )
  }
  const modelBody = modelMatch[1]
  const fieldRegex = new RegExp(
    `${fieldName}:\\s*a\\.enum\\(\\[([\\s\\S]*?)\\]\\)`,
    "m",
  )
  const fieldMatch = modelBody.match(fieldRegex)
  if (!fieldMatch) {
    throw new Error(
      `Could not locate ${modelName}.${fieldName} enum in ${SCHEMA_PATH}.`,
    )
  }
  const values = Array.from(fieldMatch[1].matchAll(/"([^"]+)"/g)).map((m) => m[1])
  if (values.length === 0) {
    throw new Error(`Parsed an empty enum for ${modelName}.${fieldName}.`)
  }
  return values
}

interface ContaminantRecord {
  contaminantId: string
  name: string
  category?: string
}

interface BannerRecord {
  title: string
  severity?: string
}

interface SourceRecord {
  sourceId?: string
  name: string
  sourceType?: string
  severityLevel?: string
  status?: string
}

interface SeedData {
  contaminants?: ContaminantRecord[]
}

interface SeedBanners {
  banners?: BannerRecord[]
}

interface SeedSources {
  sources?: SourceRecord[]
}

function readJson<T>(path: string, label: string): T {
  const raw = readFileSync(path, "utf8")
  try {
    return JSON.parse(raw) as T
  } catch (err) {
    console.error(`${label} is not valid JSON: ${(err as Error).message}`)
    process.exit(1)
  }
}

function validateField<T>(
  records: T[],
  field: keyof T,
  identityField: keyof T,
  allowed: Set<string>,
  label: string,
): { violations: number; tally: Map<string, number> } {
  const violations: { id: unknown; value: unknown }[] = []
  const tally = new Map<string, number>()

  for (const r of records) {
    const value = r[field] as unknown
    if (typeof value !== "string" || !allowed.has(value)) {
      violations.push({ id: r[identityField], value })
      continue
    }
    tally.set(value, (tally.get(value) ?? 0) + 1)
  }

  console.log(`\n${label}: ${records.length} records`)
  for (const v of [...allowed].sort()) {
    console.log(`  ${v}: ${tally.get(v) ?? 0}`)
  }

  if (violations.length > 0) {
    console.error(`\n${violations.length} invalid value(s) for ${label}:`)
    for (const v of violations) {
      console.error(`  - ${JSON.stringify(v.id)}: ${JSON.stringify(v.value)}`)
    }
    console.error(`\nExpected one of: ${[...allowed].join(", ")}`)
    return { violations: violations.length, tally }
  }
  return { violations: 0, tally }
}

function main(): void {
  const schemaSource = readFileSync(SCHEMA_PATH, "utf8")

  const allowedCategories = new Set(
    extractModelEnum(schemaSource, "Contaminant", "category"),
  )
  const allowedSeverities = new Set(
    extractModelEnum(schemaSource, "WarningBanner", "severity"),
  )
  const allowedSourceTypes = new Set(
    extractModelEnum(schemaSource, "PollutionSource", "sourceType"),
  )
  const allowedSeverityLevels = new Set(
    extractModelEnum(schemaSource, "PollutionSource", "severityLevel"),
  )
  const allowedStatuses = new Set(
    extractModelEnum(schemaSource, "PollutionSource", "status"),
  )

  let totalViolations = 0

  // -------- Contaminants --------
  const seed = readJson<SeedData>(SEED_PATH, "seed-data.json")
  const contaminants = seed.contaminants ?? []
  if (contaminants.length === 0) {
    console.error("seed-data.json contains no contaminants.")
    process.exit(1)
  }
  console.log(`Schema enum Contaminant.category: ${[...allowedCategories].join(", ")}`)
  totalViolations += validateField(
    contaminants,
    "category",
    "contaminantId",
    allowedCategories,
    "Contaminants (category)",
  ).violations

  // -------- Warning banners (optional file) --------
  if (existsSync(BANNERS_PATH)) {
    const banners = readJson<SeedBanners>(BANNERS_PATH, "seed-warning-banners.json").banners ?? []
    console.log(`\nSchema enum WarningBanner.severity: ${[...allowedSeverities].join(", ")}`)
    totalViolations += validateField(
      banners,
      "severity",
      "title",
      allowedSeverities,
      "Warning banners (severity)",
    ).violations
  } else {
    console.log("\n(no seed-warning-banners.json found; skipping)")
  }

  // -------- Pollution sources (optional file) --------
  if (existsSync(SOURCES_PATH)) {
    const sources =
      readJson<SeedSources>(SOURCES_PATH, "seed-pollution-sources.json").sources ?? []
    console.log(
      `\nSchema enums PollutionSource: sourceType=${[...allowedSourceTypes].join(", ")}`,
    )
    totalViolations += validateField(
      sources,
      "sourceType",
      "sourceId",
      allowedSourceTypes,
      "Pollution sources (sourceType)",
    ).violations
    console.log(`severityLevel=${[...allowedSeverityLevels].join(", ")}`)
    totalViolations += validateField(
      sources,
      "severityLevel",
      "sourceId",
      allowedSeverityLevels,
      "Pollution sources (severityLevel)",
    ).violations
    console.log(`status=${[...allowedStatuses].join(", ")}`)
    totalViolations += validateField(
      sources,
      "status",
      "sourceId",
      allowedStatuses,
      "Pollution sources (status)",
    ).violations
  } else {
    console.log("\n(no seed-pollution-sources.json found; skipping)")
  }

  if (totalViolations > 0) {
    console.error(`\n${totalViolations} total enum violation(s) — failing.`)
    process.exit(1)
  }
  console.log("\nAll seed values valid.")
}

main()
