/**
 * Define Auth Challenge Lambda Handler
 *
 * Cognito trigger that defines the custom authentication flow.
 * Determines what challenges to present based on authentication state.
 */

import type { DefineAuthChallengeTriggerHandler } from 'aws-lambda';

/**
 * Define the authentication flow for custom challenge (magic link)
 *
 * This handler runs at the start of the auth flow and after each challenge.
 * It determines whether to issue another challenge or complete authentication.
 */
export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  const { session } = event.request;

  console.log('DefineAuthChallenge triggered:', {
    username: event.userName,
    sessionLength: session?.length || 0,
  });

  // If no sessions yet, this is a fresh auth attempt - issue custom challenge
  if (!session || session.length === 0) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    return event;
  }

  // Get the last challenge in the session
  const lastChallenge = session[session.length - 1];

  // If the last challenge was CUSTOM_CHALLENGE
  if (lastChallenge.challengeName === 'CUSTOM_CHALLENGE') {
    if (lastChallenge.challengeResult === true) {
      // Challenge was answered correctly - issue tokens
      event.response.issueTokens = true;
      event.response.failAuthentication = false;
    } else {
      // Challenge was answered incorrectly - fail authentication
      event.response.issueTokens = false;
      event.response.failAuthentication = true;
    }
    return event;
  }

  // Handle SRP_A challenge (password-based auth)
  // Allow it to proceed normally
  if (lastChallenge.challengeName === 'SRP_A') {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'PASSWORD_VERIFIER';
    return event;
  }

  // Handle PASSWORD_VERIFIER challenge
  if (lastChallenge.challengeName === 'PASSWORD_VERIFIER') {
    if (lastChallenge.challengeResult === true) {
      event.response.issueTokens = true;
      event.response.failAuthentication = false;
    } else {
      event.response.issueTokens = false;
      event.response.failAuthentication = true;
    }
    return event;
  }

  // Default: fail authentication for unknown challenge types
  console.warn('Unknown challenge type:', lastChallenge.challengeName);
  event.response.issueTokens = false;
  event.response.failAuthentication = true;

  return event;
};
