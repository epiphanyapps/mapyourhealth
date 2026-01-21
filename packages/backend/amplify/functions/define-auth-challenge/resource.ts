import { defineFunction } from '@aws-amplify/backend';

/**
 * Define Auth Challenge Lambda Function
 *
 * Cognito trigger that defines the custom authentication flow.
 * Used for magic link authentication.
 */
export const defineAuthChallenge = defineFunction({
  name: 'define-auth-challenge',
  entry: './handler.ts',
  timeoutSeconds: 10,
  memoryMB: 128,
  resourceGroupName: 'auth',
});
