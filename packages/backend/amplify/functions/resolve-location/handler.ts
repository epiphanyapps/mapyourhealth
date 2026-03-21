/**
 * Resolve Location Lambda Handler
 *
 * Given a Google Places placeId:
 * 1. Fetches place details (coordinates + address components)
 * 2. Extracts city/state/country/county
 * 3. Auto-assigns jurisdiction by querying the Jurisdiction table
 * 4. Creates a Location record if one doesn't exist
 * 5. Checks if measurement data exists for the location
 * 6. Returns resolved location info
 */

import type { Handler } from 'aws-lambda';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const dynamodb = new DynamoDBClient({});
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME || '';
const LOCATION_TABLE_NAME = process.env.LOCATION_TABLE_NAME || '';
const JURISDICTION_TABLE_NAME = process.env.JURISDICTION_TABLE_NAME || '';
const LOCATION_MEASUREMENT_TABLE_NAME = process.env.LOCATION_MEASUREMENT_TABLE_NAME || '';

const CACHE_TTL_SECONDS = 86400; // 24 hours for location data (changes rarely)

interface ResolveLocationEvent {
  arguments: {
    placeId: string;
    sessionToken?: string;
  };
}

interface ResolveLocationResult {
  city: string;
  state: string;
  country: string;
  county?: string;
  jurisdictionCode: string;
  latitude?: number;
  longitude?: number;
  hasData: boolean;
  isNew: boolean;
  error?: string;
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

interface CachedPlaceDetails {
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
  country?: string;
  county?: string;
  status: string;
}

// ============================================
// Cache helpers (reuses PlacesCache table)
// ============================================

async function getCachedPlaceDetails(placeId: string): Promise<CachedPlaceDetails | null> {
  if (!CACHE_TABLE_NAME) return null;

  try {
    const cacheKey = `place-details:${placeId}`;
    const response = await dynamodb.send(new GetItemCommand({
      TableName: CACHE_TABLE_NAME,
      Key: { pk: { S: cacheKey } },
    }));

    if (response.Item?.data?.S) {
      const ttl = parseInt(response.Item.ttl?.N || '0', 10);
      if (ttl > Math.floor(Date.now() / 1000)) {
        return JSON.parse(response.Item.data.S);
      }
    }
    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

async function cachePlaceDetails(placeId: string, data: CachedPlaceDetails): Promise<void> {
  if (!CACHE_TABLE_NAME) return;

  try {
    const ttl = Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS;
    await dynamodb.send(new PutItemCommand({
      TableName: CACHE_TABLE_NAME,
      Item: {
        pk: { S: `place-details:${placeId}` },
        data: { S: JSON.stringify(data) },
        ttl: { N: ttl.toString() },
      },
    }));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

// ============================================
// Google Places API
// ============================================

async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: string,
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

function parseAddressComponents(components: AddressComponent[]): {
  city?: string;
  state?: string;
  country?: string;
  county?: string;
} {
  const find = (type: string) => components.find((c) => c.types.includes(type));

  const localityComp = find('locality') || find('neighborhood') || find('sublocality') || find('administrative_area_level_3');
  const stateComp = find('administrative_area_level_1');
  const countryComp = find('country');
  const countyComp = find('administrative_area_level_2');

  return {
    city: localityComp?.long_name,
    state: stateComp?.short_name,
    country: countryComp?.short_name,
    county: countyComp?.long_name,
  };
}

// ============================================
// DynamoDB queries
// ============================================

/**
 * Query Jurisdiction table to find the best matching jurisdiction code.
 * Priority: city-level (e.g., US-NY-New York) → state-level (e.g., US-NY)
 *           → country-level (e.g., US) → WHO
 */
async function resolveJurisdiction(country: string, state: string, city: string): Promise<string> {
  if (!JURISDICTION_TABLE_NAME) return 'WHO';

  // Try city-level jurisdiction first (e.g., US-NY-New York)
  if (city) {
    const cityCode = `${country}-${state}-${city}`;
    const cityResult = await queryJurisdictionByCode(cityCode);
    if (cityResult) return cityCode;
  }

  // Try state-level jurisdiction (e.g., US-NY)
  const stateCode = `${country}-${state}`;
  const stateResult = await queryJurisdictionByCode(stateCode);
  if (stateResult) return stateCode;

  // Try country-level jurisdiction (e.g., US)
  const countryResult = await queryJurisdictionByCode(country);
  if (countryResult) return country;

  // Fallback to WHO
  return 'WHO';
}

async function queryJurisdictionByCode(code: string): Promise<boolean> {
  try {
    const response = await dynamodb.send(new QueryCommand({
      TableName: JURISDICTION_TABLE_NAME,
      IndexName: 'jurisdictionsByCode',
      KeyConditionExpression: 'code = :code',
      ExpressionAttributeValues: {
        ':code': { S: code },
      },
      Limit: 1,
    }));

    return (response.Items?.length ?? 0) > 0;
  } catch (error) {
    console.error(`Jurisdiction query error for ${code}:`, error);
    return false;
  }
}

/**
 * Check if a Location record already exists for this city+state+country.
 * Returns the existing record's ID if found, null otherwise.
 */
async function findExistingLocation(
  city: string,
  state: string,
  country: string,
): Promise<{ id: string; jurisdictionCode: string } | null> {
  if (!LOCATION_TABLE_NAME) return null;

  try {
    const response = await dynamodb.send(new QueryCommand({
      TableName: LOCATION_TABLE_NAME,
      IndexName: 'locationsByCity',
      KeyConditionExpression: 'city = :city',
      FilterExpression: '#state = :state AND country = :country',
      ExpressionAttributeNames: {
        '#state': 'state', // 'state' is a DynamoDB reserved word
      },
      ExpressionAttributeValues: {
        ':city': { S: city },
        ':state': { S: state },
        ':country': { S: country },
      },
      Limit: 5,
    }));

    if (response.Items && response.Items.length > 0) {
      const record = unmarshall(response.Items[0]);
      return { id: record.id, jurisdictionCode: record.jurisdictionCode };
    }

    return null;
  } catch (error) {
    console.error('Location query error:', error);
    return null;
  }
}

/**
 * Create a new Location record in DynamoDB.
 */
async function createLocation(params: {
  city: string;
  state: string;
  country: string;
  county?: string;
  jurisdictionCode: string;
  latitude?: number;
  longitude?: number;
}): Promise<void> {
  if (!LOCATION_TABLE_NAME) return;

  try {
    const now = new Date().toISOString();
    const id = randomUUID();

    const item: Record<string, { S: string } | { N: string } | { NULL: true }> = {
      id: { S: id },
      city: { S: params.city },
      state: { S: params.state },
      country: { S: params.country },
      jurisdictionCode: { S: params.jurisdictionCode },
      createdAt: { S: now },
      updatedAt: { S: now },
      __typename: { S: 'Location' },
    };

    if (params.county) {
      item.county = { S: params.county };
    }
    if (params.latitude != null) {
      item.latitude = { N: params.latitude.toString() };
    }
    if (params.longitude != null) {
      item.longitude = { N: params.longitude.toString() };
    }

    await dynamodb.send(new PutItemCommand({
      TableName: LOCATION_TABLE_NAME,
      Item: item,
    }));

    console.log(`Created Location: ${id} (${params.city}, ${params.state}, ${params.country})`);
  } catch (error) {
    console.error('Location create error:', error);
  }
}

/**
 * Check if any LocationMeasurement records exist for a given city+state.
 * Queries by city GSI then filters by state to avoid cross-state false positives
 * (e.g., Portland, ME vs Portland, OR).
 */
async function checkDataAvailability(city: string, state: string): Promise<boolean> {
  if (!LOCATION_MEASUREMENT_TABLE_NAME) return false;

  try {
    const response = await dynamodb.send(new QueryCommand({
      TableName: LOCATION_MEASUREMENT_TABLE_NAME,
      IndexName: 'locationMeasurementsByCity',
      KeyConditionExpression: 'city = :city',
      FilterExpression: '#state = :state',
      ExpressionAttributeNames: {
        '#state': 'state', // 'state' is a DynamoDB reserved word
      },
      ExpressionAttributeValues: {
        ':city': { S: city },
        ':state': { S: state },
      },
      Limit: 10, // Fetch a small batch; filter may discard some
    }));

    return (response.Items?.length ?? 0) > 0;
  } catch (error) {
    console.error('Data availability check error:', error);
    return false;
  }
}

// ============================================
// Main handler
// ============================================

export const handler: Handler<ResolveLocationEvent, ResolveLocationResult> = async (event) => {
  const { placeId, sessionToken } = event.arguments;

  if (!placeId) {
    return {
      city: '',
      state: '',
      country: '',
      jurisdictionCode: 'WHO',
      hasData: false,
      isNew: false,
      error: 'placeId is required',
    };
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return {
      city: '',
      state: '',
      country: '',
      jurisdictionCode: 'WHO',
      hasData: false,
      isNew: false,
      error: 'Service not configured',
    };
  }

  try {
    // Step 1: Get place details (from cache or Google API)
    let lat: number | undefined;
    let lng: number | undefined;
    let city: string | undefined;
    let state: string | undefined;
    let country: string | undefined;
    let county: string | undefined;

    const cached = await getCachedPlaceDetails(placeId);
    if (cached && cached.city && cached.state && cached.country) {
      lat = cached.lat;
      lng = cached.lng;
      city = cached.city;
      state = cached.state;
      country = cached.country;
      county = cached.county;
      console.log(`Cache hit for place details: ${placeId}`);
    } else {
      const details = await fetchPlaceDetails(placeId, sessionToken);

      if (details.status !== 'OK' || !details.result) {
        return {
          city: '',
          state: '',
          country: '',
          jurisdictionCode: 'WHO',
          hasData: false,
          isNew: false,
          error: details.error_message || `Place details failed: ${details.status}`,
        };
      }

      const components = details.result.address_components || [];
      const parsed = parseAddressComponents(components);
      lat = details.result.geometry?.location?.lat;
      lng = details.result.geometry?.location?.lng;
      city = parsed.city;
      state = parsed.state;
      country = parsed.country;
      county = parsed.county;

      // Cache for future requests
      await cachePlaceDetails(placeId, {
        status: 'OK',
        lat,
        lng,
        city,
        state,
        country,
        county,
      });
    }

    if (!city || !state || !country) {
      return {
        city: city || '',
        state: state || '',
        country: country || '',
        jurisdictionCode: 'WHO',
        hasData: false,
        isNew: false,
        error: 'Could not resolve city/state/country from place details',
      };
    }

    // Step 2: Check if Location already exists
    const existing = await findExistingLocation(city, state, country);

    // Step 3: Resolve jurisdiction
    const jurisdictionCode = existing?.jurisdictionCode
      || await resolveJurisdiction(country, state, city);

    // Step 4: Create Location if new
    const isNew = !existing;
    if (isNew) {
      await createLocation({
        city,
        state,
        country,
        county,
        jurisdictionCode,
        latitude: lat,
        longitude: lng,
      });
    }

    // Step 5: Check data availability
    const hasData = await checkDataAvailability(city, state);

    console.log(`Resolved: ${city}, ${state}, ${country} → jurisdiction=${jurisdictionCode}, hasData=${hasData}, isNew=${isNew}`);

    return {
      city,
      state,
      country,
      county,
      jurisdictionCode,
      latitude: lat,
      longitude: lng,
      hasData,
      isNew,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Resolve location error:', message);
    return {
      city: '',
      state: '',
      country: '',
      jurisdictionCode: 'WHO',
      hasData: false,
      isNew: false,
      error: message,
    };
  }
};
