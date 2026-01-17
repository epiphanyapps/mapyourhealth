import { defineAuth } from '@aws-amplify/backend';

/**
 * Authentication configuration
 *
 * @see https://docs.amplify.aws/react-native/build-a-backend/auth/
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    preferredUsername: {
      mutable: true,
      required: false,
    },
  },
});
