import { defineFunction } from '@aws-amplify/backend'

/**
 * Process Notifications Lambda Function
 *
 * Orchestrates notification delivery when data is updated.
 * Queries subscribers, evaluates preferences, and invokes
 * send-email-alert and send-notifications Lambdas.
 */
export const processNotifications = defineFunction({
  name: 'process-notifications',
  entry: './handler.ts',
  timeoutSeconds: 60, // Allow time for multiple Lambda invocations
  memoryMB: 256,
})
