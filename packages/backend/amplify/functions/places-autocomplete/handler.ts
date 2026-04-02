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

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
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
    address_components?: AddressComponent[];
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
  city?: string;
  state?: string;
  country?: string;
  cached?: boolean;
  error?: string;
}

/**
 * Sort Google Places predictions to prioritize main cities over neighborhoods and sub-locations
 * 
 * Priority ranking:
 * 1. Main administrative areas (locality, administrative_area_level_1/2)
 * 2. Secondary administrative areas (sublocality_level_1) 
 * 3. Lower-level areas (sublocality_level_2+, neighborhoods)
 * 4. Establishments and points of interest
 * 
 * Within each tier, sort alphabetically by main text
 */
function sortPlacesPredictions(predictions: GooglePrediction[]): GooglePrediction[] {
  return predictions.sort((a, b) => {
    const scoreA = getPlacePriorityScore(a);
    const scoreB = getPlacePriorityScore(b);
    
    // Higher scores come first
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Same priority - sort alphabetically by main text
    const textA = a.structured_formatting?.main_text || a.description || '';
    const textB = b.structured_formatting?.main_text || b.description || '';
    return textA.localeCompare(textB);
  });
}

/**
 * Calculate priority score for a place prediction
 * Higher scores = higher priority in search results
 */
function getPlacePriorityScore(prediction: GooglePrediction): number {
  const types = prediction.types || [];
  
  // Tier 1: Main administrative areas (highest priority)
  if (types.includes('locality')) return 100; // Main cities
  if (types.includes('administrative_area_level_1')) return 95; // States/provinces  
  if (types.includes('administrative_area_level_2')) return 90; // Counties
  if (types.includes('administrative_area_level_3')) return 85; // Administrative divisions
  
  // Tier 2: Secondary administrative areas
  if (types.includes('sublocality_level_1')) return 80; // Major neighborhoods/districts
  if (types.includes('sublocality')) return 75; // Neighborhoods (generic)
  
  // Tier 3: Lower-level areas  
  if (types.includes('sublocality_level_2')) return 70; // Sub-neighborhoods
  if (types.includes('sublocality_level_3')) return 65; // Minor subdivisions
  if (types.includes('sublocality_level_4')) return 60; // Very minor subdivisions
  if (types.includes('sublocality_level_5')) return 55; // Smallest subdivisions
  if (types.includes('neighborhood')) return 50; // Neighborhood boundaries
  
  // Tier 4: Establishments and POIs (lowest priority for location search)
  if (types.includes('establishment')) return 30;
  if (types.includes('point_of_interest')) return 25;
  if (types.includes('premise')) return 20;
  
  // Default: medium-low priority for unknown types
  return 40;
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
    fields: 'geometry,address_components',
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
      // Handle both new format (lat/lng at top) and old format (nested in result.geometry)
      const cachedResult = cached as PlaceDetailsResult & { result?: { geometry?: { location?: { lat: number; lng: number } } } };
      if (cachedResult.lat != null && cachedResult.lng != null) {
        return cachedResult;
      }
      // Old format - extract from nested structure
      if (cachedResult.result?.geometry?.location) {
        return {
          status: 'OK',
          lat: cachedResult.result.geometry.location.lat,
          lng: cachedResult.result.geometry.location.lng,
          cached: true,
        };
      }
    }

    try {
      const data = await fetchPlaceDetails(placeId, sessionToken);

      if (data.status === 'OK' && data.result?.geometry?.location) {
        // Extract city/state/country from address_components
        const components = data.result.address_components || [];
        const findComponent = (type: string) =>
          components.find((c) => c.types.includes(type));

        const localityComp = findComponent('locality')
          || findComponent('sublocality')
          || findComponent('administrative_area_level_3');
        const stateComp = findComponent('administrative_area_level_1');
        const countryComp = findComponent('country');

        const result: PlaceDetailsResult = {
          status: 'OK',
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
          city: localityComp?.long_name,
          state: stateComp?.short_name,
          country: countryComp?.short_name,
        };

        // Cache the formatted result (not raw Google response)
        await cacheResult(cacheKey, result);

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
    const cachedResult = cached as PlacesAutocompleteResult;
    // Apply sorting to cached results in case they were cached before sorting was implemented
    if (cachedResult.predictions && cachedResult.predictions.length > 0) {
      cachedResult.predictions = sortPlacesPredictions(cachedResult.predictions);
    }
    return cachedResult;
  }

  try {
    const data = await fetchPlacesAutocomplete(query, sessionToken);

    // Sort predictions for better user experience (main cities first)
    let sortedPredictions = data.predictions;
    if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
      sortedPredictions = sortPlacesPredictions(data.predictions);
      console.log(`Sorted ${sortedPredictions.length} predictions for query: "${query}"`);
    }

    // Cache successful results (with original data to maintain API contract)
    if (data.status === 'OK') {
      await cacheResult(cacheKey, data);
    }

    return {
      status: data.status,
      predictions: sortedPredictions,
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
