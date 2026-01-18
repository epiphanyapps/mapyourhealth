import { defineAuth } from '@aws-amplify/backend';

/**
 * Authentication configuration for MapYourHealth
 *
 * Features:
 * - Email/password authentication
 * - Email verification required
 * - Admin group for portal access and data management
 *
 * @see https://docs.amplify.aws/react-native/build-a-backend/auth/
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Verify your MapYourHealth account',
      verificationEmailBody: (createCode) =>
        `Welcome to MapYourHealth! Your verification code is ${createCode()}`,
    },
  },
  userAttributes: {
    preferredUsername: {
      mutable: true,
      required: false,
    },
  },
  groups: ['admin'],
});
