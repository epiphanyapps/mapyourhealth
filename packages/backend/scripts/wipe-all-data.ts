/**
 * Wipe all data tables via direct DynamoDB access (no auth needed)
 *
 * Run with: AWS_PROFILE=rayane npx tsx scripts/wipe-all-data.ts
 *
 * Clears all seeded/reference data tables but preserves user data tables:
 * - UserSubscription, NotificationLog, HazardReport, HealthRecord, WarningBanner
 */

import { DynamoDBClient, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const REGION = "ca-central-1";
const TABLE_SUFFIX = process.env.TABLE_SUFFIX || "uusoeozunzdy5biliji7vxbjcy-NONE";

const TABLES_TO_WIPE = [
  "Jurisdiction",
  "Contaminant",
  "ContaminantThreshold",
  "Location",
  "LocationMeasurement",
  "Category",
  "SubCategory",
  "ObservedProperty",
  "PropertyThreshold",
  "LocationObservation",
];

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function clearTable(tableName: string): Promise<number> {
  const fullName = `${tableName}-${TABLE_SUFFIX}`;
  process.stdout.write(`Clearing ${fullName}...`);
  let deleted = 0;

  try {
    let lastKey: Record<string, any> | undefined;
    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: fullName,
          ExclusiveStartKey: lastKey,
          ProjectionExpression: "id",
        })
      );

      const items = result.Items || [];
      // Batch delete in chunks of 25 (DynamoDB limit)
      for (let i = 0; i < items.length; i += 25) {
        const chunk = items.slice(i, i + 25);
        await client.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [fullName]: chunk.map((item) => ({
                DeleteRequest: {
                  Key: { id: { S: item.id } },
                },
              })),
            },
          })
        );
        deleted += chunk.length;
        process.stdout.write(".");
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    console.log(` deleted ${deleted} items`);
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log(` table not found (skipped)`);
    } else {
      console.error(` ERROR: ${error.message}`);
    }
  }

  return deleted;
}

async function main() {
  console.log("=== MapYourHealth: Wipe All Data Tables ===");
  console.log(`Table suffix: ${TABLE_SUFFIX}\n`);

  let totalDeleted = 0;

  for (const table of TABLES_TO_WIPE) {
    totalDeleted += await clearTable(table);
  }

  console.log(`\n=== Wipe complete: ${totalDeleted} total items deleted ===`);
}

main().catch(console.error);
