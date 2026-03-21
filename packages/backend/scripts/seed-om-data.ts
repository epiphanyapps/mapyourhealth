/**
 * Seed script for O&M (Observations & Measurements) data
 *
 * Run with: COGNITO_EMAIL=xxx COGNITO_PASSWORD=xxx npx tsx scripts/seed-om-data.ts --json scripts/seed-om-data.json
 *
 * Prerequisites:
 * - User must be in the "admin" Cognito group
 * - Amplify backend deployed
 * - Run parse-risks-excel-om.ts first to generate seed-om-data.json
 */

import fs from "fs"
import path from "path"
import { Amplify } from "aws-amplify"
import { generateClient } from "aws-amplify/data"
import { signIn } from "aws-amplify/auth"
import type { Schema } from "../amplify/data/resource"

// Load Amplify outputs
import outputs from "../amplify_outputs.json"

Amplify.configure(outputs)

// Use userPool auth for admin operations (requires Cognito login)
const client = generateClient<Schema>({
  authMode: "userPool",
})

// =============================================================================
// Types
// =============================================================================

// Valid category values from schema
type ObservedPropertyCategory =
  | "water_quality"
  | "air_quality"
  | "disease"
  | "radiation"
  | "soil"
  | "noise"
  | "climate"
  | "infrastructure"

// Valid observation types from schema
type ObservationType = "numeric" | "zone" | "endemic" | "incidence" | "binary"

// Valid threshold status values from schema
type ThresholdStatus = "active" | "historical" | "not_applicable"

interface SeedObservedProperty {
  propertyId: string
  name: string
  nameFr?: string | null
  category: ObservedPropertyCategory
  observationType: ObservationType
  unit?: string | null
  description?: string | null
  descriptionFr?: string | null
  higherIsBad?: boolean
  metadata?: Record<string, unknown> | null
}

interface SeedPropertyThreshold {
  propertyId: string
  jurisdictionCode: string
  limitValue?: number | null
  warningValue?: number | null
  zoneMapping?: Record<string, string> | null
  endemicIsDanger?: boolean | null
  incidenceWarningThreshold?: number | null
  incidenceDangerThreshold?: number | null
  status: ThresholdStatus
  notes?: string | null
}

interface SeedLocationObservation {
  city: string
  state: string
  country: string
  county?: string | null
  propertyId: string
  numericValue?: number | null
  zoneValue?: string | null
  endemicValue?: boolean | null
  incidenceValue?: number | null
  binaryValue?: boolean | null
  observedAt: string
  validUntil?: string | null
  source?: string | null
  sourceUrl?: string | null
  notes?: string | null
  rawData?: Record<string, unknown> | null
}

interface SeedData {
  observedProperties: SeedObservedProperty[]
  propertyThresholds: SeedPropertyThreshold[]
  locationObservations: SeedLocationObservation[]
}

// =============================================================================
// Authentication
// =============================================================================

async function authenticate() {
  const email = process.env.COGNITO_EMAIL
  const password = process.env.COGNITO_PASSWORD

  if (!email || !password) {
    throw new Error(
      "Missing credentials. Set COGNITO_EMAIL and COGNITO_PASSWORD environment variables."
    )
  }

  console.log(`Signing in as ${email}...`)
  const result = await signIn({ username: email, password })

  if (!result.isSignedIn) {
    throw new Error(`Sign in failed: ${result.nextStep?.signInStep}`)
  }

  console.log("Signed in successfully!\n")
}

// =============================================================================
// Seeding Functions
// =============================================================================

async function seedObservedProperties(properties: SeedObservedProperty[], dryRun: boolean) {
  console.log(`\nSeeding ${properties.length} observed properties...`)
  let created = 0
  let errors = 0

  for (const property of properties) {
    if (dryRun) {
      console.log(`  [DRY RUN] Would create property: ${property.propertyId}`)
      created++
      continue
    }

    try {
      await client.models.ObservedProperty.create({
        propertyId: property.propertyId,
        name: property.name,
        nameFr: property.nameFr,
        category: property.category,
        observationType: property.observationType,
        unit: property.unit,
        description: property.description,
        descriptionFr: property.descriptionFr,
        higherIsBad: property.higherIsBad ?? true,
        metadata: property.metadata ? JSON.stringify(property.metadata) : null,
      })
      created++
      process.stdout.write(".")
    } catch (error) {
      errors++
      console.error(`\nError creating property ${property.propertyId}:`, error)
    }
  }

  console.log(`\nObserved Properties: ${created} created, ${errors} errors`)
}

async function seedPropertyThresholds(thresholds: SeedPropertyThreshold[], dryRun: boolean) {
  console.log(`\nSeeding ${thresholds.length} property thresholds...`)
  let created = 0
  let errors = 0

  for (const threshold of thresholds) {
    if (dryRun) {
      console.log(
        `  [DRY RUN] Would create threshold: ${threshold.propertyId}/${threshold.jurisdictionCode}`
      )
      created++
      continue
    }

    try {
      await client.models.PropertyThreshold.create({
        propertyId: threshold.propertyId,
        jurisdictionCode: threshold.jurisdictionCode,
        limitValue: threshold.limitValue,
        warningValue: threshold.warningValue,
        zoneMapping: threshold.zoneMapping ? JSON.stringify(threshold.zoneMapping) : null,
        endemicIsDanger: threshold.endemicIsDanger,
        incidenceWarningThreshold: threshold.incidenceWarningThreshold,
        incidenceDangerThreshold: threshold.incidenceDangerThreshold,
        status: threshold.status,
        notes: threshold.notes,
      })
      created++
      process.stdout.write(".")
    } catch (error) {
      errors++
      console.error(
        `\nError creating threshold ${threshold.propertyId}/${threshold.jurisdictionCode}:`,
        error
      )
    }
  }

  console.log(`\nProperty Thresholds: ${created} created, ${errors} errors`)
}

async function seedLocationObservations(
  observations: SeedLocationObservation[],
  dryRun: boolean,
  batchSize: number = 100
) {
  console.log(`\nSeeding ${observations.length} location observations...`)
  let created = 0
  let errors = 0

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < observations.length; i += batchSize) {
    const batch = observations.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(observations.length / batchSize)

    if (dryRun) {
      console.log(`  [DRY RUN] Would create batch ${batchNum}/${totalBatches} (${batch.length} observations)`)
      created += batch.length
      continue
    }

    process.stdout.write(`\n  Batch ${batchNum}/${totalBatches}: `)

    // Process concurrently within each batch (10 at a time to avoid throttling)
    const CONCURRENCY = 10
    for (let j = 0; j < batch.length; j += CONCURRENCY) {
      const concurrent = batch.slice(j, j + CONCURRENCY)
      const results = await Promise.allSettled(
        concurrent.map((obs) =>
          client.models.LocationObservation.create({
            city: obs.city,
            state: obs.state,
            country: obs.country,
            county: obs.county,
            propertyId: obs.propertyId,
            numericValue: obs.numericValue,
            zoneValue: obs.zoneValue,
            endemicValue: obs.endemicValue,
            incidenceValue: obs.incidenceValue,
            binaryValue: obs.binaryValue,
            observedAt: obs.observedAt,
            validUntil: obs.validUntil,
            source: obs.source,
            sourceUrl: obs.sourceUrl,
            notes: obs.notes,
            rawData: obs.rawData ? JSON.stringify(obs.rawData) : null,
          })
        )
      )
      for (const result of results) {
        if (result.status === "fulfilled") {
          created++
        } else {
          errors++
          console.error(`\nError creating observation:`, result.reason)
        }
      }
      process.stdout.write(".")
    }
  }

  console.log(`\nLocation Observations: ${created} created, ${errors} errors`)
}

// =============================================================================
// Clear Functions
// =============================================================================

async function clearExistingData() {
  console.log("\nClearing existing O&M data...")

  const CONCURRENCY = 10

  // Clear location observations
  let nextToken: string | null | undefined = undefined
  let totalObservations = 0
  do {
    const result = await client.models.LocationObservation.list({
      limit: 1000,
      nextToken,
    })
    const items = result.data
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const chunk = items.slice(i, i + CONCURRENCY)
      await Promise.allSettled(
        chunk.map((obs) => client.models.LocationObservation.delete({ id: obs.id }))
      )
      totalObservations += chunk.length
    }
    nextToken = result.nextToken
    if (items.length > 0) {
      process.stdout.write(".")
    }
  } while (nextToken)
  console.log(`\nDeleted ${totalObservations} location observations`)

  // Clear property thresholds
  const thresholds = await client.models.PropertyThreshold.list({ limit: 1000 })
  await Promise.allSettled(
    thresholds.data.map((t) => client.models.PropertyThreshold.delete({ id: t.id }))
  )
  console.log(`Deleted ${thresholds.data.length} property thresholds`)

  // Clear observed properties
  const properties = await client.models.ObservedProperty.list({ limit: 1000 })
  await Promise.allSettled(
    properties.data.map((p) => client.models.ObservedProperty.delete({ id: p.id }))
  )
  console.log(`Deleted ${properties.data.length} observed properties`)
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const jsonIndex = args.indexOf("--json")
  const jsonPath = jsonIndex !== -1 && args[jsonIndex + 1] ? args[jsonIndex + 1] : null
  const shouldClear = args.includes("--clear")
  const dryRun = args.includes("--dry-run")
  const observationsOnly = args.includes("--observations-only")

  if (!jsonPath) {
    console.error("Usage: npx tsx scripts/seed-om-data.ts --json <path-to-json> [--clear] [--dry-run]")
    console.error("\nOptions:")
    console.error("  --json <path>  Path to seed-om-data.json (required)")
    console.error("  --clear        Clear existing O&M data before seeding")
    console.error("  --dry-run      Preview what would be created without making changes")
    process.exit(1)
  }

  // Load seed data
  const resolvedPath = path.resolve(process.cwd(), jsonPath)
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Seed data file not found: ${resolvedPath}`)
    console.error("\nRun 'npm run parse:om' first to generate the seed data file.")
    process.exit(1)
  }

  const seedData: SeedData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"))

  console.log("=== MapYourHealth O&M Data Seeding ===")
  console.log(`Data file: ${resolvedPath}`)
  console.log(`Contains:`)
  console.log(`  - ${seedData.observedProperties.length} observed properties`)
  console.log(`  - ${seedData.propertyThresholds.length} property thresholds`)
  console.log(`  - ${seedData.locationObservations.length} location observations`)

  if (dryRun) {
    console.log("\n[DRY RUN MODE - No changes will be made]")
  } else {
    // Authenticate with Cognito first
    await authenticate()
  }

  if (shouldClear && !dryRun) {
    await clearExistingData()
  }

  if (!observationsOnly) {
    await seedObservedProperties(seedData.observedProperties, dryRun)
    await seedPropertyThresholds(seedData.propertyThresholds, dryRun)
  }
  await seedLocationObservations(seedData.locationObservations, dryRun)

  console.log("\n=== Seeding complete ===")
}

main().catch(console.error)
