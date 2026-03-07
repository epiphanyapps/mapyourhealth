import { defineFunction } from '@aws-amplify/backend'

/**
 * On ZipCodeStat Update Lambda Function
 *
 * Triggered by DynamoDB Streams when ZipCodeStat records are modified.
 * Sends email alerts to subscribers when safety conditions change to danger or warning.
 */
export const onZipCodeStatUpdate = defineFunction({
  name: 'on-zipcode-stat-update',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  resourceGroupName: 'data',
  environment: {
    SEND_EMAIL_ALERT_FUNCTION_NAME: 'send-email-alert',
  },
})
