/**
 * Seed script for categories and sub-categories
 *
 * Run with: COGNITO_EMAIL=xxx COGNITO_PASSWORD=xxx npx tsx scripts/seed-categories.ts
 *
 * Prerequisites:
 * - User must be in the "admin" Cognito group
 * - Amplify backend deployed with Category and SubCategory models
 */

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { signIn } from "aws-amplify/auth";
import type { Schema } from "../amplify/data/resource";
import seedData from "./seed-data-categories.json";

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

interface CategoryLink {
  label: string;
  url: string;
}

interface SeedCategory {
  categoryId: string;
  name: string;
  nameFr?: string | null;
  description?: string | null;
  descriptionFr?: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  links?: CategoryLink[] | null;
  showStandardsTable: boolean;
}

interface SeedSubCategory {
  subCategoryId: string;
  categoryId: string;
  name: string;
  nameFr?: string | null;
  description?: string | null;
  descriptionFr?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder: number;
  isActive: boolean;
  links?: CategoryLink[] | null;
}

async function seedCategories(categories: SeedCategory[]) {
  console.log(`\nSeeding ${categories.length} categories...`);
  let created = 0;
  let errors = 0;

  for (const category of categories) {
    try {
      await client.models.Category.create({
        categoryId: category.categoryId,
        name: category.name,
        nameFr: category.nameFr,
        description: category.description,
        descriptionFr: category.descriptionFr,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        links: category.links ? JSON.stringify(category.links) : null,
        showStandardsTable: category.showStandardsTable,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(`\nError creating category ${category.categoryId}:`, error);
    }
  }

  console.log(`\nCategories: ${created} created, ${errors} errors`);
}

async function seedSubCategories(subCategories: SeedSubCategory[]) {
  console.log(`\nSeeding ${subCategories.length} sub-categories...`);
  let created = 0;
  let errors = 0;

  for (const subCategory of subCategories) {
    try {
      await client.models.SubCategory.create({
        subCategoryId: subCategory.subCategoryId,
        categoryId: subCategory.categoryId,
        name: subCategory.name,
        nameFr: subCategory.nameFr,
        description: subCategory.description,
        descriptionFr: subCategory.descriptionFr,
        icon: subCategory.icon,
        color: subCategory.color,
        sortOrder: subCategory.sortOrder,
        isActive: subCategory.isActive,
        links: subCategory.links ? JSON.stringify(subCategory.links) : null,
      });
      created++;
      process.stdout.write(".");
    } catch (error) {
      errors++;
      console.error(`\nError creating sub-category ${subCategory.subCategoryId}:`, error);
    }
  }

  console.log(`\nSubCategories: ${created} created, ${errors} errors`);
}

async function clearExistingData() {
  console.log("\nClearing existing category data...");

  // Clear sub-categories first (depends on categories)
  const subCategories = await client.models.SubCategory.list({ limit: 1000 });
  for (const subCategory of subCategories.data) {
    await client.models.SubCategory.delete({ id: subCategory.id });
  }
  console.log(`Deleted ${subCategories.data.length} sub-categories`);

  // Clear categories
  const categories = await client.models.Category.list({ limit: 1000 });
  for (const category of categories.data) {
    await client.models.Category.delete({ id: category.id });
  }
  console.log(`Deleted ${categories.data.length} categories`);
}

async function main() {
  console.log("=== MapYourHealth Category Seeding ===");
  console.log(`Data file contains:`);
  console.log(`  - ${seedData.categories.length} categories`);
  console.log(`  - ${seedData.subCategories.length} sub-categories`);

  // Authenticate with Cognito first
  await authenticate();

  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");

  if (shouldClear) {
    await clearExistingData();
  }

  await seedCategories(seedData.categories as SeedCategory[]);
  await seedSubCategories(seedData.subCategories as SeedSubCategory[]);

  console.log("\n=== Category seeding complete ===");
}

main().catch(console.error);
