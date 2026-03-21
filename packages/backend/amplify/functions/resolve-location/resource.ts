import { defineFunction, secret } from '@aws-amplify/backend';

/**
 * Resolve Location Lambda Function
 *
 * Resolves a Google Places placeId to a city/state/country,
 * auto-assigns jurisdiction, caches in Location table,
 * and checks data availability.
 */
export const resolveLocation = defineFunction({
  name: 'resolve-location',
  entry: './handler.ts',
  timeoutSeconds: 15,
  memoryMB: 256,
  resourceGroupName: 'data',
  environment: {
    GOOGLE_PLACES_API_KEY: secret('GOOGLE_PLACES_API_KEY'),
    // Table names set dynamically in backend.ts
    CACHE_TABLE_NAME: '',
    LOCATION_TABLE_NAME: '',
    JURISDICTION_TABLE_NAME: '',
    LOCATION_MEASUREMENT_TABLE_NAME: '',
  },
});
