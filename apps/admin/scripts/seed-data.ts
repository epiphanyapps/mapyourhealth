/**
 * Seed Data Script for MapYourHealth
 *
 * This script seeds the Amplify backend with initial safety data:
 * - 11 StatDefinitions (matching mock data)
 * - ZipCodeStats for 10 major US zip codes
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
// Stat Definitions (11 total: water: 3, air: 3, health: 3, disaster: 2)
// ============================================================================

interface StatDefinitionInput {
  statId: string;
  name: string;
  unit: string;
  description: string;
  category: "water" | "air" | "health" | "disaster";
  dangerThreshold: number;
  warningThreshold: number;
  higherIsBad: boolean;
}

const statDefinitions: StatDefinitionInput[] = [
  // Water (3)
  {
    statId: "water-lead",
    name: "Lead Levels",
    unit: "ppb",
    description:
      "Lead concentration in drinking water. EPA action level is 15 ppb.",
    category: "water",
    dangerThreshold: 15,
    warningThreshold: 10,
    higherIsBad: true,
  },
  {
    statId: "water-nitrate",
    name: "Nitrate Levels",
    unit: "mg/L",
    description:
      "Nitrate concentration in drinking water. EPA limit is 10 mg/L.",
    category: "water",
    dangerThreshold: 10,
    warningThreshold: 7,
    higherIsBad: true,
  },
  {
    statId: "water-bacteria",
    name: "Bacteria Count",
    unit: "CFU/100mL",
    description: "Coliform bacteria presence in water supply.",
    category: "water",
    dangerThreshold: 5,
    warningThreshold: 1,
    higherIsBad: true,
  },
  // Air (3)
  {
    statId: "air-aqi",
    name: "Air Quality Index",
    unit: "AQI",
    description:
      "Overall air quality measurement. Values above 100 are unhealthy for sensitive groups.",
    category: "air",
    dangerThreshold: 150,
    warningThreshold: 100,
    higherIsBad: true,
  },
  {
    statId: "air-pm25",
    name: "PM2.5 Levels",
    unit: "µg/m³",
    description:
      "Fine particulate matter concentration. WHO guideline is 15 µg/m³ annual average.",
    category: "air",
    dangerThreshold: 35,
    warningThreshold: 15,
    higherIsBad: true,
  },
  {
    statId: "air-ozone",
    name: "Ozone Levels",
    unit: "ppb",
    description:
      "Ground-level ozone concentration. EPA standard is 70 ppb (8-hour average).",
    category: "air",
    dangerThreshold: 70,
    warningThreshold: 50,
    higherIsBad: true,
  },
  // Health (3)
  {
    statId: "health-covid",
    name: "COVID-19 Cases",
    unit: "per 100k",
    description: "Weekly COVID-19 cases per 100,000 population.",
    category: "health",
    dangerThreshold: 200,
    warningThreshold: 100,
    higherIsBad: true,
  },
  {
    statId: "health-flu",
    name: "Flu Cases",
    unit: "per 100k",
    description: "Weekly influenza cases per 100,000 population.",
    category: "health",
    dangerThreshold: 50,
    warningThreshold: 25,
    higherIsBad: true,
  },
  {
    statId: "health-access",
    name: "Healthcare Access",
    unit: "%",
    description:
      "Percentage of population with access to primary healthcare within 30 minutes.",
    category: "health",
    dangerThreshold: 70,
    warningThreshold: 85,
    higherIsBad: false, // Lower is bad for healthcare access
  },
  // Disaster (2)
  {
    statId: "disaster-wildfire",
    name: "Wildfire Risk",
    unit: "level",
    description:
      "Wildfire risk assessment based on vegetation, weather, and historical data. Scale 1-10.",
    category: "disaster",
    dangerThreshold: 7,
    warningThreshold: 4,
    higherIsBad: true,
  },
  {
    statId: "disaster-flood",
    name: "Flood Risk",
    unit: "level",
    description:
      "Flood risk assessment based on terrain, precipitation, and drainage. Scale 1-10.",
    category: "disaster",
    dangerThreshold: 7,
    warningThreshold: 4,
    higherIsBad: true,
  },
];

// ============================================================================
// Zip Code Data (10 cities with varied safety profiles)
// ============================================================================

interface ZipCodeInfo {
  zipCode: string;
  cityName: string;
  state: string;
}

interface ZipCodeStatInput {
  statId: string;
  value: number;
}

interface ZipCodeData {
  info: ZipCodeInfo;
  stats: ZipCodeStatInput[];
}

/**
 * Calculate status based on thresholds
 */
function calculateStatus(
  value: number,
  thresholds: { danger: number; warning: number; higherIsBad: boolean }
): "danger" | "warning" | "safe" {
  if (thresholds.higherIsBad) {
    if (value >= thresholds.danger) return "danger";
    if (value >= thresholds.warning) return "warning";
    return "safe";
  } else {
    // For metrics where lower is bad (like healthcare access)
    if (value <= thresholds.danger) return "danger";
    if (value <= thresholds.warning) return "warning";
    return "safe";
  }
}

const zipCodeData: ZipCodeData[] = [
  // 1. Beverly Hills, CA - Generally safe with wildfire warning
  {
    info: { zipCode: "90210", cityName: "Beverly Hills", state: "CA" },
    stats: [
      { statId: "water-lead", value: 3 },
      { statId: "water-nitrate", value: 2 },
      { statId: "water-bacteria", value: 0 },
      { statId: "air-aqi", value: 45 },
      { statId: "air-pm25", value: 12 },
      { statId: "air-ozone", value: 35 },
      { statId: "health-covid", value: 50 },
      { statId: "health-flu", value: 15 },
      { statId: "health-access", value: 95 },
      { statId: "disaster-wildfire", value: 6 }, // Warning
      { statId: "disaster-flood", value: 2 },
    ],
  },
  // 2. New York, NY - Mixed with air quality issues
  {
    info: { zipCode: "10001", cityName: "New York", state: "NY" },
    stats: [
      { statId: "water-lead", value: 12 }, // Warning
      { statId: "water-nitrate", value: 4 },
      { statId: "water-bacteria", value: 0 },
      { statId: "air-aqi", value: 115 }, // Warning
      { statId: "air-pm25", value: 28 }, // Warning
      { statId: "air-ozone", value: 48 },
      { statId: "health-covid", value: 150 }, // Warning
      { statId: "health-flu", value: 30 }, // Warning
      { statId: "health-access", value: 92 },
      { statId: "disaster-wildfire", value: 1 },
      { statId: "disaster-flood", value: 3 },
    ],
  },
  // 3. Miami Beach, FL - Safe with flood danger
  {
    info: { zipCode: "33139", cityName: "Miami Beach", state: "FL" },
    stats: [
      { statId: "water-lead", value: 5 },
      { statId: "water-nitrate", value: 3 },
      { statId: "water-bacteria", value: 0 },
      { statId: "air-aqi", value: 55 },
      { statId: "air-pm25", value: 10 },
      { statId: "air-ozone", value: 40 },
      { statId: "health-covid", value: 80 },
      { statId: "health-flu", value: 20 },
      { statId: "health-access", value: 88 },
      { statId: "disaster-wildfire", value: 1 },
      { statId: "disaster-flood", value: 8 }, // Danger
    ],
  },
  // 4. Chicago, IL - Lead danger from old infrastructure
  {
    info: { zipCode: "60601", cityName: "Chicago", state: "IL" },
    stats: [
      { statId: "water-lead", value: 18 }, // Danger
      { statId: "water-nitrate", value: 5 },
      { statId: "water-bacteria", value: 2 }, // Warning
      { statId: "air-aqi", value: 95 },
      { statId: "air-pm25", value: 22 }, // Warning
      { statId: "air-ozone", value: 45 },
      { statId: "health-covid", value: 120 }, // Warning
      { statId: "health-flu", value: 35 }, // Warning
      { statId: "health-access", value: 80 },
      { statId: "disaster-wildfire", value: 1 },
      { statId: "disaster-flood", value: 4 }, // Warning
    ],
  },
  // 5. Seattle, WA - Very safe overall
  {
    info: { zipCode: "98101", cityName: "Seattle", state: "WA" },
    stats: [
      { statId: "water-lead", value: 4 },
      { statId: "water-nitrate", value: 2 },
      { statId: "water-bacteria", value: 0 },
      { statId: "air-aqi", value: 35 },
      { statId: "air-pm25", value: 8 },
      { statId: "air-ozone", value: 30 },
      { statId: "health-covid", value: 60 },
      { statId: "health-flu", value: 18 },
      { statId: "health-access", value: 93 },
      { statId: "disaster-wildfire", value: 3 },
      { statId: "disaster-flood", value: 2 },
    ],
  },
  // 6. Atlanta, GA - Urban area with mixed conditions
  {
    info: { zipCode: "30301", cityName: "Atlanta", state: "GA" },
    stats: [
      { statId: "water-lead", value: 8 },
      { statId: "water-nitrate", value: 4 },
      { statId: "water-bacteria", value: 1 }, // Warning
      { statId: "air-aqi", value: 105 }, // Warning
      { statId: "air-pm25", value: 18 }, // Warning
      { statId: "air-ozone", value: 52 }, // Warning
      { statId: "health-covid", value: 90 },
      { statId: "health-flu", value: 22 },
      { statId: "health-access", value: 87 },
      { statId: "disaster-wildfire", value: 2 },
      { statId: "disaster-flood", value: 5 }, // Warning
    ],
  },
  // 7. Dallas, TX - Hot climate with ozone issues
  {
    info: { zipCode: "75201", cityName: "Dallas", state: "TX" },
    stats: [
      { statId: "water-lead", value: 6 },
      { statId: "water-nitrate", value: 5 },
      { statId: "water-bacteria", value: 0 },
      { statId: "air-aqi", value: 85 },
      { statId: "air-pm25", value: 14 },
      { statId: "air-ozone", value: 68 }, // Warning
      { statId: "health-covid", value: 75 },
      { statId: "health-flu", value: 28 }, // Warning
      { statId: "health-access", value: 84 },
      { statId: "disaster-wildfire", value: 5 }, // Warning
      { statId: "disaster-flood", value: 6 }, // Warning
    ],
  },
  // 8. Phoenix, AZ - Extreme heat and air quality
  {
    info: { zipCode: "85001", cityName: "Phoenix", state: "AZ" },
    stats: [
      { statId: "water-lead", value: 4 },
      { statId: "water-nitrate", value: 6 },
      { statId: "water-bacteria", value: 0 },
      { statId: "air-aqi", value: 135 }, // Warning
      { statId: "air-pm25", value: 30 }, // Warning
      { statId: "air-ozone", value: 75 }, // Danger
      { statId: "health-covid", value: 85 },
      { statId: "health-flu", value: 20 },
      { statId: "health-access", value: 82 },
      { statId: "disaster-wildfire", value: 8 }, // Danger
      { statId: "disaster-flood", value: 3 },
    ],
  },
  // 9. Denver, CO - Clean air but wildfire risk
  {
    info: { zipCode: "80202", cityName: "Denver", state: "CO" },
    stats: [
      { statId: "water-lead", value: 5 },
      { statId: "water-nitrate", value: 3 },
      { statId: "water-bacteria", value: 0 },
      { statId: "air-aqi", value: 48 },
      { statId: "air-pm25", value: 11 },
      { statId: "air-ozone", value: 55 }, // Warning
      { statId: "health-covid", value: 70 },
      { statId: "health-flu", value: 25 }, // Warning
      { statId: "health-access", value: 91 },
      { statId: "disaster-wildfire", value: 7 }, // Danger
      { statId: "disaster-flood", value: 4 }, // Warning
    ],
  },
  // 10. Boston, MA - Old infrastructure issues
  {
    info: { zipCode: "02101", cityName: "Boston", state: "MA" },
    stats: [
      { statId: "water-lead", value: 14 }, // Warning
      { statId: "water-nitrate", value: 4 },
      { statId: "water-bacteria", value: 1 }, // Warning
      { statId: "air-aqi", value: 65 },
      { statId: "air-pm25", value: 13 },
      { statId: "air-ozone", value: 42 },
      { statId: "health-covid", value: 110 }, // Warning
      { statId: "health-flu", value: 32 }, // Warning
      { statId: "health-access", value: 94 },
      { statId: "disaster-wildfire", value: 1 },
      { statId: "disaster-flood", value: 5 }, // Warning
    ],
  },
];

// ============================================================================
// Seed Functions
// ============================================================================

/**
 * Authenticate as admin user
 */
async function authenticateAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.\n" +
        "Set them before running: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npx tsx seed-data.ts"
    );
  }

  console.log(`Authenticating as ${email}...`);
  const result = await signIn({ username: email, password });

  if (!result.isSignedIn) {
    throw new Error(
      `Authentication failed. Next step: ${result.nextStep?.signInStep}`
    );
  }

  console.log("Successfully authenticated as admin.");
}

/**
 * Seed StatDefinitions
 */
async function seedStatDefinitions(): Promise<void> {
  console.log("\n--- Seeding StatDefinitions ---");

  // First, check for existing definitions to avoid duplicates
  const existingResult = await client.models.StatDefinition.list();
  const existing = existingResult.data || [];
  const existingStatIds = new Set(existing.map((s) => s.statId));

  console.log(`Found ${existing.length} existing StatDefinitions`);

  let created = 0;
  let skipped = 0;

  for (const def of statDefinitions) {
    if (existingStatIds.has(def.statId)) {
      console.log(`  Skipping ${def.statId} (already exists)`);
      skipped++;
      continue;
    }

    try {
      await client.models.StatDefinition.create(def);
      console.log(`  Created ${def.statId}`);
      created++;
    } catch (error) {
      console.error(`  Failed to create ${def.statId}:`, error);
    }
  }

  console.log(
    `StatDefinitions: ${created} created, ${skipped} skipped (already existed)`
  );
}

/**
 * Seed ZipCodeStats for all cities
 */
async function seedZipCodeStats(): Promise<void> {
  console.log("\n--- Seeding ZipCodeStats ---");

  // Build a lookup map for stat definitions (for threshold calculation)
  const defMap = new Map<
    string,
    { danger: number; warning: number; higherIsBad: boolean }
  >();
  for (const def of statDefinitions) {
    defMap.set(def.statId, {
      danger: def.dangerThreshold,
      warning: def.warningThreshold,
      higherIsBad: def.higherIsBad,
    });
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const cityData of zipCodeData) {
    const { info, stats } = cityData;
    console.log(`\nProcessing ${info.cityName}, ${info.state} (${info.zipCode})`);

    // Check for existing stats for this zip code
    const existingResult = await client.models.ZipCodeStat.listZipCodeStatByZipCode(
      { zipCode: info.zipCode }
    );
    const existing = existingResult.data || [];
    const existingStatIds = new Set(existing.map((s) => s.statId));

    let cityCreated = 0;
    let citySkipped = 0;

    for (const stat of stats) {
      if (existingStatIds.has(stat.statId)) {
        citySkipped++;
        continue;
      }

      const thresholds = defMap.get(stat.statId);
      if (!thresholds) {
        console.error(`  No threshold found for ${stat.statId}`);
        continue;
      }

      const status = calculateStatus(stat.value, thresholds);

      try {
        await client.models.ZipCodeStat.create({
          zipCode: info.zipCode,
          statId: stat.statId,
          value: stat.value,
          status,
          lastUpdated: new Date().toISOString(),
          source: "MapYourHealth Seed Data",
        });
        cityCreated++;
      } catch (error) {
        console.error(`  Failed to create ${stat.statId}:`, error);
      }
    }

    console.log(
      `  ${info.zipCode}: ${cityCreated} created, ${citySkipped} skipped`
    );
    totalCreated += cityCreated;
    totalSkipped += citySkipped;
  }

  console.log(
    `\nZipCodeStats total: ${totalCreated} created, ${totalSkipped} skipped`
  );
}

/**
 * Main seed function
 */
async function main(): Promise<void> {
  console.log("========================================");
  console.log("MapYourHealth Seed Data Script");
  console.log("========================================");

  try {
    // Authenticate as admin
    await authenticateAdmin();

    // Seed the data
    await seedStatDefinitions();
    await seedZipCodeStats();

    console.log("\n========================================");
    console.log("Seed completed successfully!");
    console.log("========================================");
  } catch (error) {
    console.error("\nSeed failed:", error);
    process.exit(1);
  }
}

// Run the script
main();
