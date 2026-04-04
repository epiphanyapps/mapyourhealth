/**
 * Generate contaminantHealthEffects.ts from seed-data.json
 *
 * Reads the contaminant descriptions and studies from seed-data.json
 * (which is parsed from Risks.xlsx) and generates the typed data file
 * used by the mobile app to show health info modals.
 *
 * Usage: npx tsx scripts/generate-health-effects.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SeedContaminant {
  contaminantId: string;
  name: string;
  description: string | null;
  studies: string | null;
}

interface SeedData {
  contaminants: SeedContaminant[];
}

interface HealthEffect {
  id: string;
  name: string;
  description: string;
  references?: string[];
}

const SEED_DATA_PATH = path.join(__dirname, "seed-data.json");
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "apps",
  "mobile",
  "app",
  "data",
  "contaminantHealthEffects.ts"
);

function parseReferences(studies: string | null): string[] {
  if (!studies) return [];
  return studies
    .split(/\r?\n\r?\n/)
    .map((s) => s.replace(/\r/g, "").trim())
    .filter((s) => s.length > 0);
}

function main() {
  const seedData: SeedData = JSON.parse(
    fs.readFileSync(SEED_DATA_PATH, "utf-8")
  );

  const effects: Record<string, HealthEffect> = {};

  for (const contaminant of seedData.contaminants) {
    if (!contaminant.description) continue;

    const entry: HealthEffect = {
      id: contaminant.contaminantId,
      name: contaminant.name,
      description: contaminant.description.replace(/\r/g, ""),
    };

    const references = parseReferences(contaminant.studies);
    if (references.length > 0) {
      entry.references = references;
    }

    effects[contaminant.contaminantId] = entry;
  }

  // Serialize the data as JSON, then wrap in TypeScript
  const jsonData = JSON.stringify(effects, null, 2);

  const output = `/**
 * Auto-generated from seed-data.json by generate-health-effects.ts
 * Do not edit manually. Re-run the script to update:
 *   cd packages/backend && npx tsx scripts/generate-health-effects.ts
 */

export interface ContaminantHealthEffect {
  id: string
  name: string
  description: string
  references?: string[]
}

// prettier-ignore
export const CONTAMINANT_HEALTH_EFFECTS: Record<string, ContaminantHealthEffect> = ${jsonData}

export function getContaminantHealthEffects(
  contaminantId: string,
): ContaminantHealthEffect | null {
  return CONTAMINANT_HEALTH_EFFECTS[contaminantId.toLowerCase()] || null
}

export function hasHealthEffectsData(contaminantId: string): boolean {
  return contaminantId.toLowerCase() in CONTAMINANT_HEALTH_EFFECTS
}
`;

  fs.writeFileSync(OUTPUT_PATH, output, "utf-8");

  // Run prettier on the output
  try {
    execSync(`npx prettier --write "${OUTPUT_PATH}"`, {
      cwd: path.join(__dirname, "..", "..", "..", "apps", "mobile"),
      stdio: "inherit",
    });
  } catch (e) {
    console.warn("Warning: prettier formatting failed, file saved without formatting", e);
  }

  console.log(
    `Generated ${Object.keys(effects).length} contaminant health effects entries to:`
  );
  console.log(`  ${OUTPUT_PATH}`);
}

main();
