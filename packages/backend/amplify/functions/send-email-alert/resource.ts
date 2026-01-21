import { defineFunction } from '@aws-amplify/backend'

/**
 * Send Email Alert Lambda Function
 *
 * Sends email notifications to subscribers when safety conditions change.
 * Uses Amazon SES to send emails.
 */
export const sendEmailAlert = defineFunction({
  name: 'send-email-alert',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  resourceGroupName: 'data',
  environment: {
    // SES sender email - must be verified in SES
    SES_SENDER_EMAIL: 'alerts@mapyourhealth.com',
  },
})
