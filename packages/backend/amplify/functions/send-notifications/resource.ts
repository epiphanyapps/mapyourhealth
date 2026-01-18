import { defineFunction } from '@aws-amplify/backend'

/**
 * Send Notifications Lambda Function
 *
 * Triggered to send push notifications to subscribers
 * when safety stats are updated.
 */
export const sendNotifications = defineFunction({
  name: 'send-notifications',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
})
