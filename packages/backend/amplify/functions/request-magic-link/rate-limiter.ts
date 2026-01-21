/**
 * DynamoDB-based Rate Limiter for Magic Link Requests
 *
 * Implements a sliding window rate limiter to prevent abuse.
 * Stores request timestamps with TTL for automatic cleanup.
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({});

const TABLE_NAME = process.env.RATE_LIMIT_TABLE_NAME || 'MagicLinkRateLimit';
const MAX_REQUESTS = 3;
const WINDOW_MINUTES = 15;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * Check if an email has exceeded the rate limit
 *
 * @param email - The email address to check
 * @returns Object with allowed status and remaining requests
 */
export async function checkRateLimit(
  email: string
): Promise<{ allowed: boolean; remaining: number; resetAt?: Date }> {
  const key = `magic-link:${email.toLowerCase()}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    // Get existing record
    const getResult = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: { S: key },
        },
      })
    );

    let timestamps: number[] = [];

    if (getResult.Item?.timestamps?.L) {
      // Filter timestamps within the window
      timestamps = getResult.Item.timestamps.L.map((item) =>
        parseInt(item.N || '0', 10)
      ).filter((ts) => ts > windowStart);
    }

    // Check if rate limit exceeded
    if (timestamps.length >= MAX_REQUESTS) {
      const oldestTimestamp = Math.min(...timestamps);
      const resetAt = new Date(oldestTimestamp + WINDOW_MS);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    return {
      allowed: true,
      remaining: MAX_REQUESTS - timestamps.length - 1, // -1 for the upcoming request
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request but log it
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
}

/**
 * Record a magic link request for rate limiting
 *
 * @param email - The email address that made the request
 */
export async function recordRequest(email: string): Promise<void> {
  const key = `magic-link:${email.toLowerCase()}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const ttl = Math.floor((now + WINDOW_MS) / 1000); // TTL in seconds

  try {
    // Get existing record
    const getResult = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: { S: key },
        },
      })
    );

    let timestamps: number[] = [];

    if (getResult.Item?.timestamps?.L) {
      // Keep only timestamps within the window
      timestamps = getResult.Item.timestamps.L.map((item) =>
        parseInt(item.N || '0', 10)
      ).filter((ts) => ts > windowStart);
    }

    // Add current timestamp
    timestamps.push(now);

    // Store updated record
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: { S: key },
          timestamps: { L: timestamps.map((ts) => ({ N: ts.toString() })) },
          ttl: { N: ttl.toString() },
        },
      })
    );
  } catch (error) {
    console.error('Rate limit record error:', error);
    // Don't throw - rate limiting failure shouldn't block the request
  }
}
