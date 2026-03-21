/**
 * Seed script for hazard categories and product recommendations
 *
 * Run with: COGNITO_EMAIL=xxx COGNITO_PASSWORD=xxx npx tsx scripts/seed-hazards.ts
 *
 * Prerequisites:
 * - User must be in the "admin" Cognito group
 * - Amplify backend deployed with HazardCategory and ProductRecommendation models
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import seedData from "./seed-data-hazards.json";

// Load Amplify outputs
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

// Use userPool auth for admin operations (requires Cognito login)
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

interface SeedHazardCategory {
  hazardId: string;
  name: string;
  nameFr?: string | null;
  description: string;
  descriptionFr?: string | null;
  relatedCategories: string[];
  sortOrder: number;
  isActive: boolean;
}

interface SeedProductRecommendation {
  recommendationId: string;
  name: string;
  nameFr?: string | null;
  description: string;
  descriptionFr?: string | null;
  url: string;
  hazardCategoryIds: string[];
  sortOrder: number;
  isActive: boolean;
}

async function seedHazardCategories(hazards: SeedHazardCategory[]) {
  console.log(`\nSeeding ${hazards.length} hazard categories...`);
  let created = 0;
  let errors = 0;

  for (const hazard of hazards) {
    try {
      await client.models.HazardCategory.create({
        hazardId: hazard.hazardId,
        name: hazard.name,
        nameFr: hazard.nameFr,
        description: hazard.description,
        descriptionFr: hazard.descriptionFr,
        relatedCategories: hazard.relatedCategories,
        sortOrder: hazard.sortOrder,
        isActive: hazard.isActive,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(`\nError creating hazard ${hazard.hazardId}:`, error);
    }
  }

  console.log(`\nHazard categories: ${created} created, ${errors} errors`);
}

async function seedProductRecommendations(
  recommendations: SeedProductRecommendation[]
) {
  console.log(`\nSeeding ${recommendations.length} product recommendations...`);
  let created = 0;
  let errors = 0;

  for (const rec of recommendations) {
    try {
      await client.models.ProductRecommendation.create({
        recommendationId: rec.recommendationId,
        name: rec.name,
        nameFr: rec.nameFr,
        description: rec.description,
        descriptionFr: rec.descriptionFr,
        url: rec.url,
        hazardCategoryIds: rec.hazardCategoryIds,
        sortOrder: rec.sortOrder,
        isActive: rec.isActive,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(
        `\nError creating recommendation ${rec.recommendationId}:`,
        error
      );
    }
  }

  console.log(
    `\nProduct recommendations: ${created} created, ${errors} errors`
  );
}

async function clearExistingData() {
  console.log("\nClearing existing hazard and recommendation data...");

  // Clear recommendations first
  const recommendations = await client.models.ProductRecommendation.list({
    limit: 1000,
  });
  for (const rec of recommendations.data) {
    await client.models.ProductRecommendation.delete({ id: rec.id });
  }
  console.log(`Deleted ${recommendations.data.length} product recommendations`);

  // Clear hazard categories
  const hazards = await client.models.HazardCategory.list({ limit: 1000 });
  for (const hazard of hazards.data) {
    await client.models.HazardCategory.delete({ id: hazard.id });
  }
  console.log(`Deleted ${hazards.data.length} hazard categories`);
}

async function main() {
  console.log("=== MapYourHealth Hazard & Recommendation Seeding ===");
  console.log(`Data file contains:`);
  console.log(
    `  - ${seedData.hazardCategories.length} hazard categories`
  );
  console.log(
    `  - ${seedData.productRecommendations.length} product recommendations`
  );

  // Authenticate with Cognito first
  await authenticate();

  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");

  if (shouldClear) {
    await clearExistingData();
  }

  await seedHazardCategories(
    seedData.hazardCategories as SeedHazardCategory[]
  );
  await seedProductRecommendations(
    seedData.productRecommendations as SeedProductRecommendation[]
  );

  console.log("\n=== Hazard & recommendation seeding complete ===");
}

main().catch(console.error);
