import { defineFunction } from '@aws-amplify/backend'

/**
 * On LocationMeasurement Update Lambda Function
 *
 * Triggered by DynamoDB Streams when LocationMeasurement records are created or modified.
 * Invokes the process-notifications Lambda to send alerts to subscribers.
 */
export const onLocationMeasurementUpdate = defineFunction({
  name: 'on-location-measurement-update',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  resourceGroupName: 'data',
})
