/**
 * Verify Auth Challenge Response Lambda Handler
 *
 * Cognito trigger that verifies the challenge response.
 * Compares the provided token with the expected answer.
 */

import type { VerifyAuthChallengeResponseTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { timingSafeEqual } from 'crypto';

const cognitoClient = new CognitoIdentityProviderClient({});

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Verify the authentication challenge response
 *
 * This handler compares the provided token with the stored token
 * using a timing-safe comparison to prevent timing attacks.
 */
export const handler: VerifyAuthChallengeResponseTriggerHandler = async (
  event
) => {
  console.log('VerifyAuthChallengeResponse triggered:', {
    username: event.userName,
    userPoolId: event.userPoolId,
  });

  const expectedAnswer =
    event.request.privateChallengeParameters?.answer || '';
  const providedAnswer = event.request.challengeAnswer || '';

  // Use timing-safe comparison to prevent timing attacks
  const isCorrect = safeCompare(expectedAnswer, providedAnswer);

  event.response.answerCorrect = isCorrect;

  console.log('Challenge verification result:', {
    username: event.userName,
    isCorrect,
  });

  // If verification succeeded, clear the magic link token to prevent reuse
  if (isCorrect) {
    try {
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: event.userPoolId,
          Username: event.userName,
          UserAttributes: [
            { Name: 'custom:magicLinkToken', Value: '' },
            { Name: 'custom:magicLinkExpiry', Value: '' },
          ],
        })
      );
      console.log('Magic link token cleared for user:', event.userName);
    } catch (error) {
      // Log but don't fail the auth - token clearing is a security enhancement
      console.error('Failed to clear magic link token:', error);
    }
  }

  return event;
};
