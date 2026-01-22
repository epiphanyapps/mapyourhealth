import { defineAuth } from "@aws-amplify/backend";
import { defineAuthChallenge } from "../functions/define-auth-challenge/resource";
import { createAuthChallenge } from "../functions/create-auth-challenge/resource";
import { verifyAuthChallengeResponse } from "../functions/verify-auth-challenge/resource";

/**
 * Authentication configuration for MapYourHealth
 *
 * Features:
 * - Email/password authentication
 * - Magic link (passwordless) authentication via custom auth flow
 * - Email verification required
 * - Admin group for portal access and data management
 *
 * @see https://docs.amplify.aws/react-native/build-a-backend/auth/
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Verify your MapYourHealth account",
      verificationEmailBody: (createCode) =>
        `Welcome to MapYourHealth! Your verification code is ${createCode()}`,
    },
  },
  userAttributes: {
    preferredUsername: {
      mutable: true,
      required: false,
    },
    // Custom attributes for magic link authentication
    "custom:magicLinkToken": {
      dataType: "String",
      mutable: true,
    },
    "custom:magicLinkExpiry": {
      dataType: "String",
      mutable: true,
    },
  },
  // Cognito triggers for custom auth flow (magic link)
  triggers: {
    defineAuthChallenge,
    createAuthChallenge,
    verifyAuthChallengeResponse,
  },
  groups: ["admin"],
});
