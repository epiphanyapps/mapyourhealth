#!/usr/bin/env npx ts-node
/**
 * Setup E2E Email Testing Infrastructure
 *
 * Creates AWS resources for receiving test emails:
 * - S3 bucket to store received emails
 * - SES receipt rule to route emails to S3
 * - Route 53 MX record for e2e.mapyourhealth.info subdomain
 *
 * Usage:
 *   AWS_PROFILE=rayane npx ts-node scripts/setup-e2e-email.ts
 *
 * To tear down:
 *   AWS_PROFILE=rayane npx ts-node scripts/setup-e2e-email.ts --teardown
 */

import {
  S3Client,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import {
  SESClient,
  CreateReceiptRuleSetCommand,
  CreateReceiptRuleCommand,
  SetActiveReceiptRuleSetCommand,
  DeleteReceiptRuleCommand,
  DeleteReceiptRuleSetCommand,
  DescribeActiveReceiptRuleSetCommand,
} from "@aws-sdk/client-ses";
import {
  Route53Client,
  ChangeResourceRecordSetsCommand,
  ListResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";

// Configuration
const CONFIG = {
  region: "us-east-1", // SES receiving only available in us-east-1, us-west-2, eu-west-1
  bucketName: "mapyourhealth-e2e-emails",
  ruleSetName: "mapyourhealth-e2e-ruleset",
  ruleName: "e2e-email-to-s3",
  hostedZoneId: "Z0203323ECR0URJEVE2O",
  subdomain: "e2e.mapyourhealth.info",
  sesInboundEndpoint: "inbound-smtp.us-east-1.amazonaws.com",
};

const s3Client = new S3Client({ region: CONFIG.region });
const sesClient = new SESClient({ region: CONFIG.region });
const route53Client = new Route53Client({ region: CONFIG.region });

async function checkBucketExists(): Promise<boolean> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: CONFIG.bucketName }));
    return true;
  } catch {
    return false;
  }
}

async function createS3Bucket(): Promise<void> {
  console.log(`\n📦 Creating S3 bucket: ${CONFIG.bucketName}`);

  if (await checkBucketExists()) {
    console.log("   Bucket already exists, skipping creation");
    return;
  }

  // Create bucket
  await s3Client.send(
    new CreateBucketCommand({
      Bucket: CONFIG.bucketName,
    })
  );
  console.log("   ✓ Bucket created");

  // Add bucket policy to allow SES to write emails
  const bucketPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowSESPuts",
        Effect: "Allow",
        Principal: {
          Service: "ses.amazonaws.com",
        },
        Action: "s3:PutObject",
        Resource: `arn:aws:s3:::${CONFIG.bucketName}/*`,
        Condition: {
          StringEquals: {
            "AWS:SourceAccount": await getAccountId(),
          },
        },
      },
    ],
  };

  await s3Client.send(
    new PutBucketPolicyCommand({
      Bucket: CONFIG.bucketName,
      Policy: JSON.stringify(bucketPolicy),
    })
  );
  console.log("   ✓ Bucket policy applied (SES write access)");
}

async function getAccountId(): Promise<string> {
  const { STSClient, GetCallerIdentityCommand } = await import(
    "@aws-sdk/client-sts"
  );
  const stsClient = new STSClient({ region: CONFIG.region });
  const response = await stsClient.send(new GetCallerIdentityCommand({}));
  return response.Account!;
}

async function createSESReceiptRule(): Promise<void> {
  console.log(`\n📧 Setting up SES receipt rules`);

  // Check if rule set already exists
  try {
    const activeRuleSet = await sesClient.send(
      new DescribeActiveReceiptRuleSetCommand({})
    );
    if (activeRuleSet.Metadata?.Name === CONFIG.ruleSetName) {
      console.log("   Rule set already active, skipping");
      return;
    }
  } catch {
    // No active rule set, continue
  }

  // Create receipt rule set
  try {
    await sesClient.send(
      new CreateReceiptRuleSetCommand({
        RuleSetName: CONFIG.ruleSetName,
      })
    );
    console.log(`   ✓ Created rule set: ${CONFIG.ruleSetName}`);
  } catch (error: any) {
    if (error.name === "AlreadyExistsException") {
      console.log(`   Rule set already exists: ${CONFIG.ruleSetName}`);
    } else {
      throw error;
    }
  }

  // Create receipt rule
  try {
    await sesClient.send(
      new CreateReceiptRuleCommand({
        RuleSetName: CONFIG.ruleSetName,
        Rule: {
          Name: CONFIG.ruleName,
          Enabled: true,
          Recipients: [CONFIG.subdomain],
          Actions: [
            {
              S3Action: {
                BucketName: CONFIG.bucketName,
                ObjectKeyPrefix: "emails/",
              },
            },
          ],
          ScanEnabled: true,
        },
      })
    );
    console.log(`   ✓ Created receipt rule: ${CONFIG.ruleName}`);
  } catch (error: any) {
    if (error.name === "AlreadyExistsException") {
      console.log(`   Receipt rule already exists: ${CONFIG.ruleName}`);
    } else {
      throw error;
    }
  }

  // Activate the rule set
  await sesClient.send(
    new SetActiveReceiptRuleSetCommand({
      RuleSetName: CONFIG.ruleSetName,
    })
  );
  console.log(`   ✓ Activated rule set`);
}

async function createMXRecord(): Promise<void> {
  console.log(`\n🌐 Creating MX record for ${CONFIG.subdomain}`);

  // Check if MX record already exists
  const existingRecords = await route53Client.send(
    new ListResourceRecordSetsCommand({
      HostedZoneId: CONFIG.hostedZoneId,
      StartRecordName: CONFIG.subdomain,
      StartRecordType: "MX",
      MaxItems: 1,
    })
  );

  const mxExists = existingRecords.ResourceRecordSets?.some(
    (r) => r.Name === `${CONFIG.subdomain}.` && r.Type === "MX"
  );

  if (mxExists) {
    console.log("   MX record already exists, skipping");
    return;
  }

  // Create MX record
  await route53Client.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: CONFIG.hostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: "CREATE",
            ResourceRecordSet: {
              Name: CONFIG.subdomain,
              Type: "MX",
              TTL: 300,
              ResourceRecords: [
                {
                  Value: `10 ${CONFIG.sesInboundEndpoint}`,
                },
              ],
            },
          },
        ],
      },
    })
  );
  console.log(`   ✓ Created MX record: ${CONFIG.subdomain} → ${CONFIG.sesInboundEndpoint}`);
}

async function teardown(): Promise<void> {
  console.log("\n🗑️  Tearing down E2E email infrastructure...\n");

  // Delete MX record
  console.log("Deleting MX record...");
  try {
    await route53Client.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: CONFIG.hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: "DELETE",
              ResourceRecordSet: {
                Name: CONFIG.subdomain,
                Type: "MX",
                TTL: 300,
                ResourceRecords: [
                  {
                    Value: `10 ${CONFIG.sesInboundEndpoint}`,
                  },
                ],
              },
            },
          ],
        },
      })
    );
    console.log("   ✓ MX record deleted");
  } catch (error: any) {
    console.log(`   ⚠ MX record: ${error.message}`);
  }

  // Deactivate and delete SES rule set
  console.log("Deleting SES receipt rules...");
  try {
    await sesClient.send(new SetActiveReceiptRuleSetCommand({}));
    await sesClient.send(
      new DeleteReceiptRuleCommand({
        RuleSetName: CONFIG.ruleSetName,
        RuleName: CONFIG.ruleName,
      })
    );
    await sesClient.send(
      new DeleteReceiptRuleSetCommand({
        RuleSetName: CONFIG.ruleSetName,
      })
    );
    console.log("   ✓ SES rules deleted");
  } catch (error: any) {
    console.log(`   ⚠ SES rules: ${error.message}`);
  }

  // Empty and delete S3 bucket
  console.log("Deleting S3 bucket...");
  try {
    // List and delete all objects
    const objects = await s3Client.send(
      new ListObjectsV2Command({ Bucket: CONFIG.bucketName })
    );
    if (objects.Contents && objects.Contents.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: CONFIG.bucketName,
          Delete: {
            Objects: objects.Contents.map((obj) => ({ Key: obj.Key })),
          },
        })
      );
    }
    await s3Client.send(new DeleteBucketCommand({ Bucket: CONFIG.bucketName }));
    console.log("   ✓ S3 bucket deleted");
  } catch (error: any) {
    console.log(`   ⚠ S3 bucket: ${error.message}`);
  }

  console.log("\n✅ Teardown complete");
}

async function setup(): Promise<void> {
  console.log("🚀 Setting up E2E Email Testing Infrastructure");
  console.log("================================================");
  console.log(`   Region: ${CONFIG.region}`);
  console.log(`   Subdomain: ${CONFIG.subdomain}`);
  console.log(`   S3 Bucket: ${CONFIG.bucketName}`);
  console.log(`   SES Rule Set: ${CONFIG.ruleSetName}`);

  await createS3Bucket();
  await createSESReceiptRule();
  await createMXRecord();

  console.log("\n✅ Setup complete!");
  console.log("\n📋 Next steps:");
  console.log(`   1. Wait a few minutes for DNS propagation`);
  console.log(`   2. Send a test email to: test@${CONFIG.subdomain}`);
  console.log(`   3. Check S3 bucket for received email:`);
  console.log(
    `      aws s3 ls s3://${CONFIG.bucketName}/emails/ --profile rayane`
  );
}

// Main
const args = process.argv.slice(2);
if (args.includes("--teardown")) {
  teardown().catch(console.error);
} else {
  setup().catch(console.error);
}
