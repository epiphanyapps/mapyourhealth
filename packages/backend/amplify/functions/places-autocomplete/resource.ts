import { defineFunction, secret } from '@aws-amplify/backend';

/**
 * Places Autocomplete Lambda Function
 *
 * Proxies Google Places API requests to keep the API key server-side.
 * Includes caching to reduce API costs.
 */
export const placesAutocomplete = defineFunction({
  name: 'places-autocomplete',
  entry: './handler.ts',
  timeoutSeconds: 10,
  memoryMB: 256,
  resourceGroupName: 'data',
  environment: {
    // Secret managed via Amplify Console or `npx ampx sandbox secret set`
    GOOGLE_PLACES_API_KEY: secret('GOOGLE_PLACES_API_KEY'),
    // Cache table name will be set dynamically in backend.ts
    CACHE_TABLE_NAME: '',
  },
});
