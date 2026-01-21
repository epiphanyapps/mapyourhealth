/**
 * Create Auth Challenge Lambda Handler
 *
 * Cognito trigger that creates the challenge for custom authentication.
 * Retrieves the magic link token from user attributes and sets it as the expected answer.
 */

import type { CreateAuthChallengeTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({});

/**
 * Create the authentication challenge for magic link verification
 *
 * This handler retrieves the stored magic link token from user attributes
 * and sets it as the expected challenge answer.
 */
export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  console.log('CreateAuthChallenge triggered:', {
    username: event.userName,
    userPoolId: event.userPoolId,
  });

  // Only handle CUSTOM_CHALLENGE
  if (event.request.challengeName !== 'CUSTOM_CHALLENGE') {
    console.log('Not a custom challenge, skipping');
    return event;
  }

  try {
    // Get user attributes to retrieve the magic link token
    const getUserResult = await cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
      })
    );

    // Find magic link token and expiry in user attributes
    const tokenAttr = getUserResult.UserAttributes?.find(
      (attr: { Name?: string }) => attr.Name === 'custom:magicLinkToken'
    );
    const expiryAttr = getUserResult.UserAttributes?.find(
      (attr: { Name?: string }) => attr.Name === 'custom:magicLinkExpiry'
    );

    const token = tokenAttr?.Value;
    const expiry = expiryAttr?.Value;

    // Validate token exists and hasn't expired
    if (!token || !expiry) {
      console.error('Magic link token not found for user');
      // Set an impossible-to-match answer to fail the challenge
      event.response.privateChallengeParameters = {
        answer: 'INVALID_TOKEN_NOT_FOUND',
      };
      event.response.publicChallengeParameters = {
        error: 'No magic link token found. Please request a new link.',
      };
      return event;
    }

    // Check if token has expired
    const expiryDate = new Date(expiry);
    if (expiryDate < new Date()) {
      console.error('Magic link token has expired');
      event.response.privateChallengeParameters = {
        answer: 'INVALID_TOKEN_EXPIRED',
      };
      event.response.publicChallengeParameters = {
        error: 'Magic link has expired. Please request a new link.',
      };
      return event;
    }

    // Set the expected answer (the token)
    event.response.privateChallengeParameters = {
      answer: token,
    };

    // Public parameters can be used to send info to the client
    event.response.publicChallengeParameters = {
      type: 'MAGIC_LINK',
    };

    console.log('Challenge created successfully for user:', event.userName);
  } catch (error) {
    console.error('Error creating auth challenge:', error);
    event.response.privateChallengeParameters = {
      answer: 'INVALID_ERROR_OCCURRED',
    };
    event.response.publicChallengeParameters = {
      error: 'An error occurred. Please try again.',
    };
  }

  return event;
};
