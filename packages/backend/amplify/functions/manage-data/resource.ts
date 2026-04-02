import { defineFunction } from '@aws-amplify/backend';

/**
 * Manage Data Lambda Function
 *
 * Admin-only operations for wiping and reseeding reference data tables.
 * Never touches user data tables (UserSubscription, NotificationLog, etc.).
 */
export const manageData = defineFunction({
  name: 'manage-data',
  entry: './handler.ts',
  timeoutSeconds: 900, // 15 min max — reseed ~9K records may take several minutes
  memoryMB: 512, // Extra memory for loading ~6MB of seed JSON
  resourceGroupName: 'data',
});
