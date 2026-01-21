import { defineFunction } from '@aws-amplify/backend';

/**
 * Request Magic Link Lambda Function
 *
 * Handles requests for passwordless authentication via email magic links.
 * Exposed via public function URL for unauthenticated access.
 */
export const requestMagicLink = defineFunction({
  name: 'request-magic-link',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: 'auth',
  environment: {
    // These will be set dynamically in backend.ts
    USER_POOL_ID: '',
    FROM_EMAIL: 'noreply@mapyourhealth.com',
    APP_URL: 'mapyourhealth://',
    RATE_LIMIT_TABLE_NAME: '',
  },
});
