import { defineFunction } from '@aws-amplify/backend';

/**
 * Verify Auth Challenge Response Lambda Function
 *
 * Cognito trigger that verifies the challenge response.
 * Compares the provided token with the expected answer.
 */
export const verifyAuthChallengeResponse = defineFunction({
  name: 'verify-auth-challenge',
  entry: './handler.ts',
  timeoutSeconds: 10,
  memoryMB: 128,
  resourceGroupName: 'auth',
});
