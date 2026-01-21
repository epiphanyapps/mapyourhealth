import { defineFunction } from '@aws-amplify/backend';

/**
 * Create Auth Challenge Lambda Function
 *
 * Cognito trigger that creates the challenge for custom authentication.
 * Retrieves the magic link token and sets it as the expected answer.
 */
export const createAuthChallenge = defineFunction({
  name: 'create-auth-challenge',
  entry: './handler.ts',
  timeoutSeconds: 10,
  memoryMB: 128,
  resourceGroupName: 'auth',
});
