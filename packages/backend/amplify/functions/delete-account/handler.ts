/**
 * Delete Account Lambda Handler
 *
 * Performs FULL account deletion atomically on the server side:
 * 1. Cleans up all user-owned data from DynamoDB tables
 * 2. Deletes the Cognito user account
 *
 * Data is deleted first, then the Cognito user. If Cognito deletion fails,
 * the user can still log in and retry. The client handles local sign-out after success.
 */

import type { AppSyncResolverHandler } from 'aws-lambda';
import {
  DynamoDBClient,
  QueryCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({});
const cognitoClient = new CognitoIdentityProviderClient({});

// Table names set via environment variables in backend.ts
const HEALTH_RECORD_TABLE = process.env.HEALTH_RECORD_TABLE_NAME!;
const USER_SUBSCRIPTION_TABLE = process.env.USER_SUBSCRIPTION_TABLE_NAME!;
const NOTIFICATION_LOG_TABLE = process.env.NOTIFICATION_LOG_TABLE_NAME!;
const HAZARD_REPORT_TABLE = process.env.HAZARD_REPORT_TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;

interface DeleteAccountResponse {
  success: boolean;
  deletedCounts: Record<string, number>;
}

/**
 * Query all items from a table where the owner field matches the user's identity claim.
 * Amplify Gen 2 stores owner as `owner` field with the identity ID (sub::username format).
 */
async function queryItemsByOwner(
  tableName: string,
  ownerValue: string,
  indexName?: string
): Promise<{ id: string }[]> {
  const items: { id: string }[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: '#owner = :owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
      ExpressionAttributeValues: {
        ':owner': { S: ownerValue },
      },
      ExclusiveStartKey: lastEvaluatedKey,
      ProjectionExpression: 'id',
    });

    const result = await dynamoClient.send(command);
    if (result.Items) {
      items.push(...result.Items.map((item) => unmarshall(item) as { id: string }));
    }
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

/**
 * Query NotificationLog by userId GSI
 */
async function queryNotificationLogsByUserId(
  tableName: string,
  userId: string
): Promise<{ id: string }[]> {
  const items: { id: string }[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'userIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
      },
      ExclusiveStartKey: lastEvaluatedKey,
      ProjectionExpression: 'id',
    });

    const result = await dynamoClient.send(command);
    if (result.Items) {
      items.push(...result.Items.map((item) => unmarshall(item) as { id: string }));
    }
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

/**
 * Batch delete items from a DynamoDB table.
 * DynamoDB BatchWriteItem supports max 25 items per request.
 */
async function batchDeleteItems(tableName: string, items: { id: string }[]): Promise<number> {
  if (items.length === 0) return 0;

  const chunks: { id: string }[][] = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: chunk.map((item) => ({
          DeleteRequest: {
            Key: { id: { S: item.id } },
          },
        })),
      },
    });

    await dynamoClient.send(command);
  }

  return items.length;
}

export const handler: AppSyncResolverHandler<Record<string, never>, DeleteAccountResponse> = async (event) => {
  const userId = event.identity && 'sub' in event.identity ? event.identity.sub : undefined;
  const username = event.identity && 'username' in event.identity ? event.identity.username : undefined;

  if (!userId) {
    throw new Error('Unauthorized: No user identity found');
  }

  // Amplify stores owner as "sub::username" format
  const ownerValue = `${userId}::${username}`;

  console.log(`Deleting account data for user: ${userId}`);

  const deletedCounts: Record<string, number> = {};

  try {
    // 1. Delete HealthRecords (owner-based)
    const healthRecords = await queryItemsByOwner(HEALTH_RECORD_TABLE, ownerValue);
    deletedCounts.healthRecords = await batchDeleteItems(HEALTH_RECORD_TABLE, healthRecords);

    // 2. Delete UserSubscriptions (owner-based)
    const subscriptions = await queryItemsByOwner(USER_SUBSCRIPTION_TABLE, ownerValue);
    deletedCounts.userSubscriptions = await batchDeleteItems(USER_SUBSCRIPTION_TABLE, subscriptions);

    // 3. Delete NotificationLogs (query by userId GSI)
    const notifications = await queryNotificationLogsByUserId(NOTIFICATION_LOG_TABLE, userId);
    deletedCounts.notificationLogs = await batchDeleteItems(NOTIFICATION_LOG_TABLE, notifications);

    // 4. Delete HazardReports (owner-based)
    const hazardReports = await queryItemsByOwner(HAZARD_REPORT_TABLE, ownerValue);
    deletedCounts.hazardReports = await batchDeleteItems(HAZARD_REPORT_TABLE, hazardReports);

    console.log('Account data deletion complete:', deletedCounts);

    // 5. Delete Cognito user account (server-side, atomic with data cleanup)
    if (!username) {
      throw new Error('Cannot delete Cognito user: username not found in identity');
    }

    console.log(`Deleting Cognito user: ${username}`);
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );
    console.log('Cognito user deleted successfully');

    return {
      success: true,
      deletedCounts,
    };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw new Error(`Failed to delete account: ${(error as Error).message}`);
  }
};
