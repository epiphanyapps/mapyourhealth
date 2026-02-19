/**
 * Places Autocomplete Lambda Handler
 *
 * Proxies Google Places API requests to keep the API key server-side.
 * Includes DynamoDB caching to reduce costs and improve performance.
 */

import type { Handler } from 'aws-lambda';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME || '';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const CACHE_TTL_SECONDS = 3600; // 1 hour

interface PlacesAutocompleteEvent {
  arguments: {
    query: string;
    sessionToken?: string;
  };
}

interface GooglePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  types?: string[];
}

interface GoogleAutocompleteResponse {
  status: string;
  predictions?: GooglePrediction[];
  error_message?: string;
}

interface PlaceDetailsResponse {
  status: string;
  result?: {
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  };
  error_message?: string;
}

interface PlacesAutocompleteResult {
  status: string;
  predictions?: GooglePrediction[];
  cached?: boolean;
  error?: string;
}

interface PlaceDetailsResult {
  status: string;
  lat?: number;
  lng?: number;
  cached?: boolean;
  error?: string;
}

/**
 * Get cached result from DynamoDB
 */
async function getCachedResult(cacheKey: string): Promise<PlacesAutocompleteResult | PlaceDetailsResult | null> {
  if (!CACHE_TABLE_NAME) return null;

  try {
    const command = new GetItemCommand({
      TableName: CACHE_TABLE_NAME,
      Key: {
        pk: { S: cacheKey },
      },
    });

    const response = await dynamodb.send(command);

    if (response.Item?.data?.S) {
      const ttl = parseInt(response.Item.ttl?.N || '0', 10);
      const now = Math.floor(Date.now() / 1000);

      // Check if not expired
      if (ttl > now) {
        console.log(`Cache hit for: ${cacheKey}`);
        const parsed = JSON.parse(response.Item.data.S);
        return { ...parsed, cached: true };
      }
    }

    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Store result in DynamoDB cache
 */
async function cacheResult(
  cacheKey: string,
  data: GoogleAutocompleteResponse | PlaceDetailsResponse
): Promise<void> {
  if (!CACHE_TABLE_NAME) return;

  try {
    const ttl = Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS;

    const command = new PutItemCommand({
      TableName: CACHE_TABLE_NAME,
      Item: {
        pk: { S: cacheKey },
        data: { S: JSON.stringify(data) },
        ttl: { N: ttl.toString() },
      },
    });

    await dynamodb.send(command);
    console.log(`Cached result for: ${cacheKey}`);
  } catch (error) {
    console.error('Cache write error:', error);
    // Don't throw - caching is optional
  }
}

/**
 * Fetch autocomplete suggestions from Google Places API
 */
async function fetchPlacesAutocomplete(
  query: string,
  sessionToken?: string
): Promise<GoogleAutocompleteResponse> {
  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_PLACES_API_KEY,
    // Bias towards US/Canada
    components: 'country:us|country:ca',
  });

  if (sessionToken) {
    params.append('sessiontoken', sessionToken);
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
  console.log(`Fetching Google Places: ${query}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  return response.json() as Promise<GoogleAutocompleteResponse>;
}

/**
 * Fetch place details (coordinates) from Google Places API
 */
async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<PlaceDetailsResponse> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_PLACES_API_KEY,
    fields: 'geometry',
  });

  if (sessionToken) {
    params.append('sessiontoken', sessionToken);
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
  console.log(`Fetching Place Details: ${placeId}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Places Details API error: ${response.status}`);
  }

  return response.json() as Promise<PlaceDetailsResponse>;
}

/**
 * Lambda handler for Places Autocomplete
 */
export const handler: Handler<PlacesAutocompleteEvent, PlacesAutocompleteResult | PlaceDetailsResult> = async (
  event
) => {
  const { query, sessionToken } = event.arguments;

  if (!query) {
    return {
      status: 'INVALID_REQUEST',
      error: 'Query is required',
    };
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not configured');
    return {
      status: 'ERROR',
      error: 'Service not configured',
    };
  }

  // Check if this is a place details request (placeId starts with 'details:')
  if (query.startsWith('details:')) {
    const placeId = query.substring(8); // Remove 'details:' prefix
    const cacheKey = `place-details:${placeId}`;

    // Check cache first
    const cached = await getCachedResult(cacheKey);
    if (cached) {
      return cached as PlaceDetailsResult;
    }

    try {
      const data = await fetchPlaceDetails(placeId, sessionToken);

      if (data.status === 'OK' && data.result?.geometry?.location) {
        const result: PlaceDetailsResult = {
          status: 'OK',
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        };

        // Cache successful results
        await cacheResult(cacheKey, data);

        return result;
      }

      return {
        status: data.status,
        error: data.error_message,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Place details error:', message);
      return {
        status: 'ERROR',
        error: message,
      };
    }
  }

  // Regular autocomplete request
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = `places:${normalizedQuery}`;

  // Check cache first
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    return cached as PlacesAutocompleteResult;
  }

  try {
    const data = await fetchPlacesAutocomplete(query, sessionToken);

    // Cache successful results
    if (data.status === 'OK') {
      await cacheResult(cacheKey, data);
    }

    return {
      status: data.status,
      predictions: data.predictions,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Autocomplete error:', message);
    return {
      status: 'ERROR',
      error: message,
    };
  }
};
