/**
 * Seed Data Script for MapYourHealth Admin
 *
 * This script seeds the Amplify backend with initial data:
 * - Jurisdictions (WHO, US, CA, etc.)
 * - Contaminants (water quality contaminants)
 * - ContaminantThresholds (jurisdiction-specific limits)
 * - Sample LocationMeasurements
 *
 * NOTE: For full contaminant seeding, use the backend seed script:
 *   cd packages/backend && npx tsx scripts/seed-contaminants.ts
 *
 * Usage:
 *   npx tsx apps/admin/scripts/seed-data.ts
 *   or
 *   yarn seed:data (from root)
 *
 * Prerequisites:
 * - Admin user credentials configured in environment
 * - amplify_outputs.json present in apps/admin/
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../../../packages/backend/amplify/data/resource";
import outputs from "../amplify_outputs.json";

// Configure Amplify for Node.js environment
Amplify.configure(outputs);

const client = generateClient<Schema>();

// ============================================================================
// Sample Jurisdictions
// ============================================================================

const jurisdictions = [
  {
    code: "WHO",
    name: "World Health Organization",
    nameFr: "Organisation mondiale de la Santé",
    country: "INTL",
    isDefault: true,
  },
  {
    code: "US",
    name: "United States (Federal)",
    nameFr: "États-Unis (fédéral)",
    country: "US",
  },
  {
    code: "CA",
    name: "Canada (Federal)",
    nameFr: "Canada (fédéral)",
    country: "CA",
  },
  {
    code: "US-NY",
    name: "New York State",
    nameFr: "État de New York",
    country: "US",
    region: "NY",
    parentCode: "US",
  },
  {
    code: "US-CA",
    name: "California",
    nameFr: "Californie",
    country: "US",
    region: "CA",
    parentCode: "US",
  },
  {
    code: "CA-QC",
    name: "Quebec",
    nameFr: "Québec",
    country: "CA",
    region: "QC",
    parentCode: "CA",
  },
];

// ============================================================================
// Sample Contaminants
// ============================================================================

type ContaminantCategory =
  | "fertilizer"
  | "pesticide"
  | "radioactive"
  | "disinfectant"
  | "inorganic"
  | "organic"
  | "microbiological";

interface ContaminantInput {
  contaminantId: string;
  name: string;
  nameFr?: string;
  category: ContaminantCategory;
  unit: string;
  description?: string;
  descriptionFr?: string;
  higherIsBad: boolean;
}

const contaminants: ContaminantInput[] = [
  {
    contaminantId: "nitrate",
    name: "Nitrate",
    nameFr: "Nitrate",
    category: "fertilizer",
    unit: "μg/L",
    description:
      "Common fertilizer runoff contaminant. Can cause methemoglobinemia in infants.",
    descriptionFr:
      "Contaminant courant provenant des engrais. Peut causer la méthémoglobinémie chez les nourrissons.",
    higherIsBad: true,
  },
  {
    contaminantId: "nitrite",
    name: "Nitrite",
    nameFr: "Nitrite",
    category: "fertilizer",
    unit: "μg/L",
    description:
      "Intermediate product of nitrogen cycle. More toxic than nitrate.",
    descriptionFr:
      "Produit intermédiaire du cycle de l'azote. Plus toxique que le nitrate.",
    higherIsBad: true,
  },
  {
    contaminantId: "lead",
    name: "Lead",
    nameFr: "Plomb",
    category: "inorganic",
    unit: "μg/L",
    description:
      "Heavy metal that can cause neurological damage, especially in children.",
    descriptionFr:
      "Métal lourd pouvant causer des dommages neurologiques, surtout chez les enfants.",
    higherIsBad: true,
  },
  {
    contaminantId: "arsenic",
    name: "Arsenic",
    nameFr: "Arsenic",
    category: "inorganic",
    unit: "μg/L",
    description:
      "Naturally occurring element that can cause cancer with long-term exposure.",
    descriptionFr:
      "Élément naturel pouvant causer le cancer avec une exposition prolongée.",
    higherIsBad: true,
  },
  {
    contaminantId: "atrazine",
    name: "Atrazine",
    nameFr: "Atrazine",
    category: "pesticide",
    unit: "μg/L",
    description:
      "Herbicide commonly used on corn. Potential endocrine disruptor.",
    descriptionFr:
      "Herbicide couramment utilisé sur le maïs. Perturbateur endocrinien potentiel.",
    higherIsBad: true,
  },
];

// ============================================================================
// Sample Thresholds
// ============================================================================

interface ThresholdInput {
  contaminantId: string;
  jurisdictionCode: string;
  limitValue: number | null;
  status: "regulated" | "banned" | "not_approved" | "not_controlled";
  warningRatio?: number;
}

const thresholds: ThresholdInput[] = [
  // Nitrate
  {
    contaminantId: "nitrate",
    jurisdictionCode: "WHO",
    limitValue: 50000,
    status: "regulated",
  },
  {
    contaminantId: "nitrate",
    jurisdictionCode: "US",
    limitValue: 10000,
    status: "regulated",
  },
  {
    contaminantId: "nitrate",
    jurisdictionCode: "CA-QC",
    limitValue: 10000,
    status: "regulated",
  },

  // Nitrite
  {
    contaminantId: "nitrite",
    jurisdictionCode: "WHO",
    limitValue: 3000,
    status: "regulated",
  },
  {
    contaminantId: "nitrite",
    jurisdictionCode: "US",
    limitValue: 1000,
    status: "regulated",
  },
  {
    contaminantId: "nitrite",
    jurisdictionCode: "CA-QC",
    limitValue: 1000,
    status: "regulated",
  },

  // Lead
  {
    contaminantId: "lead",
    jurisdictionCode: "WHO",
    limitValue: 10,
    status: "regulated",
  },
  {
    contaminantId: "lead",
    jurisdictionCode: "US",
    limitValue: 15,
    status: "regulated",
  },
  {
    contaminantId: "lead",
    jurisdictionCode: "CA-QC",
    limitValue: 10,
    status: "regulated",
  },

  // Arsenic
  {
    contaminantId: "arsenic",
    jurisdictionCode: "WHO",
    limitValue: 10,
    status: "regulated",
  },
  {
    contaminantId: "arsenic",
    jurisdictionCode: "US",
    limitValue: 10,
    status: "regulated",
  },

  // Atrazine
  {
    contaminantId: "atrazine",
    jurisdictionCode: "WHO",
    limitValue: 100,
    status: "regulated",
  },
  {
    contaminantId: "atrazine",
    jurisdictionCode: "US",
    limitValue: 3,
    status: "regulated",
  },
  {
    contaminantId: "atrazine",
    jurisdictionCode: "CA-QC",
    limitValue: null,
    status: "banned",
  },
];

// ============================================================================
// Sample Locations
// ============================================================================

interface LocationInput {
  city: string;
  county?: string;
  state: string;
  country: string;
  jurisdictionCode: string;
  latitude?: number;
  longitude?: number;
}

const locations: LocationInput[] = [
  {
    city: "Montreal",
    county: "Montreal",
    state: "QC",
    country: "CA",
    jurisdictionCode: "CA-QC",
    latitude: 45.5017,
    longitude: -73.5673,
  },
  {
    city: "Toronto",
    county: "Toronto",
    state: "ON",
    country: "CA",
    jurisdictionCode: "CA-ON",
    latitude: 43.6532,
    longitude: -79.3832,
  },
  {
    city: "New York",
    county: "New York County",
    state: "NY",
    country: "US",
    jurisdictionCode: "US-NY",
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    city: "Los Angeles",
    county: "Los Angeles",
    state: "CA",
    country: "US",
    jurisdictionCode: "US-CA",
    latitude: 34.0522,
    longitude: -118.2437,
  },
  {
    city: "Beverly Hills",
    county: "Los Angeles",
    state: "CA",
    country: "US",
    jurisdictionCode: "US-CA",
    latitude: 34.0901,
    longitude: -118.4065,
  },
];

// ============================================================================
// Sample Location Measurements
// ============================================================================

interface LocationMeasurementInput {
  city: string;
  state: string;
  country: string;
  contaminantId: string;
  value: number;
  source: string;
}

const measurements: LocationMeasurementInput[] = [
  // Sample NYC measurements
  {
    city: "New York",
    state: "NY",
    country: "US",
    contaminantId: "nitrate",
    value: 8500,
    source: "NYC DEP",
  },
  {
    city: "New York",
    state: "NY",
    country: "US",
    contaminantId: "lead",
    value: 5.2,
    source: "NYC DEP",
  },
  {
    city: "New York",
    state: "NY",
    country: "US",
    contaminantId: "arsenic",
    value: 3.1,
    source: "NYC DEP",
  },

  // Sample LA measurements
  {
    city: "Beverly Hills",
    state: "CA",
    country: "US",
    contaminantId: "nitrate",
    value: 12000,
    source: "LADWP",
  },
  {
    city: "Beverly Hills",
    state: "CA",
    country: "US",
    contaminantId: "lead",
    value: 8.5,
    source: "LADWP",
  },
  {
    city: "Beverly Hills",
    state: "CA",
    country: "US",
    contaminantId: "atrazine",
    value: 1.2,
    source: "LADWP",
  },

  // Sample Montreal measurements
  {
    city: "Montreal",
    state: "QC",
    country: "CA",
    contaminantId: "nitrate",
    value: 5200,
    source: "Ville de Montreal",
  },
  {
    city: "Montreal",
    state: "QC",
    country: "CA",
    contaminantId: "lead",
    value: 4.8,
    source: "Ville de Montreal",
  },
];

// ============================================================================
// Authentication
// ============================================================================

async function authenticateAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.log(
      "No admin credentials provided. Attempting unauthenticated access...",
    );
    console.log(
      "Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables for authenticated access.",
    );
    return;
  }

  console.log(`Authenticating as ${username}...`);

  try {
    await signIn({ username, password });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "UserAlreadyAuthenticatedException"
    ) {
      console.log("Already authenticated.");
      return;
    }
    throw error;
  }

  console.log("Successfully authenticated as admin.");
}

// ============================================================================
// Seeding Functions
// ============================================================================

async function seedJurisdictions(): Promise<void> {
  console.log("\n--- Seeding Jurisdictions ---");

  const existingResult = await client.models.Jurisdiction.list({ limit: 100 });
  const existing = existingResult.data || [];
  const existingCodes = new Set(existing.map((j) => j.code));

  let created = 0;
  let skipped = 0;

  for (const j of jurisdictions) {
    if (existingCodes.has(j.code)) {
      console.log(`  Skipping ${j.code} (already exists)`);
      skipped++;
      continue;
    }

    try {
      await client.models.Jurisdiction.create({
        code: j.code,
        name: j.name,
        nameFr: j.nameFr || null,
        country: j.country,
        region: j.region || null,
        parentCode: j.parentCode || null,
        isDefault: j.isDefault || false,
      });
      console.log(`  Created ${j.code}`);
      created++;
    } catch (error) {
      console.error(`  Failed to create ${j.code}:`, error);
    }
  }

  console.log(`Jurisdictions: ${created} created, ${skipped} skipped`);
}

async function seedContaminants(): Promise<void> {
  console.log("\n--- Seeding Contaminants ---");

  const existingResult = await client.models.Contaminant.list({ limit: 1000 });
  const existing = existingResult.data || [];
  const existingIds = new Set(existing.map((c) => c.contaminantId));

  let created = 0;
  let skipped = 0;

  for (const c of contaminants) {
    if (existingIds.has(c.contaminantId)) {
      console.log(`  Skipping ${c.contaminantId} (already exists)`);
      skipped++;
      continue;
    }

    try {
      await client.models.Contaminant.create({
        contaminantId: c.contaminantId,
        name: c.name,
        nameFr: c.nameFr || null,
        category: c.category,
        unit: c.unit,
        description: c.description || null,
        descriptionFr: c.descriptionFr || null,
        higherIsBad: c.higherIsBad,
      });
      console.log(`  Created ${c.contaminantId}`);
      created++;
    } catch (error) {
      console.error(`  Failed to create ${c.contaminantId}:`, error);
    }
  }

  console.log(`Contaminants: ${created} created, ${skipped} skipped`);
}

async function seedThresholds(): Promise<void> {
  console.log("\n--- Seeding ContaminantThresholds ---");

  const existingResult = await client.models.ContaminantThreshold.list({
    limit: 1000,
  });
  const existing = existingResult.data || [];
  const existingKeys = new Set(
    existing.map((t) => `${t.contaminantId}:${t.jurisdictionCode}`),
  );

  let created = 0;
  let skipped = 0;

  for (const t of thresholds) {
    const key = `${t.contaminantId}:${t.jurisdictionCode}`;
    if (existingKeys.has(key)) {
      console.log(`  Skipping ${key} (already exists)`);
      skipped++;
      continue;
    }

    try {
      await client.models.ContaminantThreshold.create({
        contaminantId: t.contaminantId,
        jurisdictionCode: t.jurisdictionCode,
        limitValue: t.limitValue,
        status: t.status,
        warningRatio: t.warningRatio || 0.8,
      });
      console.log(`  Created ${key}`);
      created++;
    } catch (error) {
      console.error(`  Failed to create ${key}:`, error);
    }
  }

  console.log(`Thresholds: ${created} created, ${skipped} skipped`);
}

async function seedLocations(): Promise<void> {
  console.log("\n--- Seeding Locations ---");

  const existingResult = await client.models.Location.list({ limit: 1000 });
  const existing = existingResult.data || [];
  const existingKeys = new Set(
    existing.map((l) => `${l.city}:${l.state}:${l.country}`),
  );

  let created = 0;
  let skipped = 0;

  for (const loc of locations) {
    const key = `${loc.city}:${loc.state}:${loc.country}`;
    if (existingKeys.has(key)) {
      console.log(`  Skipping ${loc.city}, ${loc.state} (already exists)`);
      skipped++;
      continue;
    }

    try {
      await client.models.Location.create({
        city: loc.city,
        county: loc.county || null,
        state: loc.state,
        country: loc.country,
        jurisdictionCode: loc.jurisdictionCode,
        latitude: loc.latitude || null,
        longitude: loc.longitude || null,
      });
      console.log(`  Created ${loc.city}, ${loc.state}`);
      created++;
    } catch (error) {
      console.error(`  Failed to create ${loc.city}, ${loc.state}:`, error);
    }
  }

  console.log(`Locations: ${created} created, ${skipped} skipped`);
}

async function seedMeasurements(): Promise<void> {
  console.log("\n--- Seeding LocationMeasurements ---");

  let created = 0;
  let skipped = 0;

  for (const m of measurements) {
    // Check if measurement already exists for this city + contaminant
    const existingResult =
      await client.models.LocationMeasurement.listLocationMeasurementByCity({
        city: m.city,
      });
    const existing = existingResult.data || [];
    const alreadyExists = existing.some(
      (e) => e.contaminantId === m.contaminantId,
    );

    if (alreadyExists) {
      console.log(
        `  Skipping ${m.city}, ${m.state}/${m.contaminantId} (already exists)`,
      );
      skipped++;
      continue;
    }

    try {
      await client.models.LocationMeasurement.create({
        city: m.city,
        state: m.state,
        country: m.country,
        contaminantId: m.contaminantId,
        value: m.value,
        measuredAt: new Date().toISOString(),
        source: m.source,
      });
      console.log(`  Created ${m.city}, ${m.state}/${m.contaminantId}`);
      created++;
    } catch (error) {
      console.error(
        `  Failed to create ${m.city}, ${m.state}/${m.contaminantId}:`,
        error,
      );
    }
  }

  console.log(`Measurements: ${created} created, ${skipped} skipped`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("========================================");
  console.log("MapYourHealth Admin Seed Data Script");
  console.log("========================================");

  try {
    await authenticateAdmin();

    await seedJurisdictions();
    await seedContaminants();
    await seedThresholds();
    await seedLocations();
    await seedMeasurements();

    console.log("\n========================================");
    console.log("Seed completed successfully!");
    console.log("========================================");
  } catch (error) {
    console.error("\nSeed failed:", error);
    process.exit(1);
  }
}

main();
