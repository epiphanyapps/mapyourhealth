/**
 * Amplify Data Access Service
 *
 * Service functions for interacting with the Amplify backend.
 * Provides typed access to Contaminants, Thresholds, Jurisdictions, Locations, Measurements, and Subscriptions.
 */

// @ts-expect-error - Monorepo workspace resolution works at runtime via Metro bundler
// TypeScript cannot resolve cross-package exports during standalone type checking
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource"
import { fetchAuthSession } from "aws-amplify/auth"
import { generateClient } from "aws-amplify/data"

// Lazy client initialization to ensure Amplify.configure() has been called first
// Use userPool auth for authenticated users, IAM for guest access
let _userPoolClient: ReturnType<typeof generateClient<Schema>> | null = null
let _iamClient: ReturnType<typeof generateClient<Schema>> | null = null

function getUserPoolClient() {
  if (!_userPoolClient) {
    _userPoolClient = generateClient<Schema>({ authMode: "userPool" })
  }
  return _userPoolClient
}

function getIamClient() {
  if (!_iamClient) {
    _iamClient = generateClient<Schema>({ authMode: "iam" })
  }
  return _iamClient
}

/**
 * Get the appropriate client for public data access.
 * Uses userPool auth when authenticated, IAM auth for guest access.
 */
async function getPublicClient(): Promise<ReturnType<typeof generateClient<Schema>>> {
  try {
    const session = await fetchAuthSession()
    if (session.tokens?.accessToken) {
      return getUserPoolClient()
    }
  } catch {
    // Not authenticated, use IAM
  }
  return getIamClient()
}

function getPrivateClient() {
  return getUserPoolClient()
}

// =============================================================================
// New Model Types
// =============================================================================

export type AmplifyContaminant = Schema["Contaminant"]["type"]
export type AmplifyContaminantThreshold = Schema["ContaminantThreshold"]["type"]
export type AmplifyJurisdiction = Schema["Jurisdiction"]["type"]
export type AmplifyLocation = Schema["Location"]["type"]
export type AmplifyLocationMeasurement = Schema["LocationMeasurement"]["type"]
export type AmplifyUserSubscription = Schema["UserSubscription"]["type"]
export type AmplifyHazardReport = Schema["HazardReport"]["type"]

// =============================================================================
// Contaminants (Public Read)
// =============================================================================

/**
 * Fetch all contaminants (public read - uses userPool when authenticated, IAM for guests)
 */
export async function getContaminants(): Promise<AmplifyContaminant[]> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Contaminant.list({
    limit: 1000,
  })
  if (errors) {
    console.error("Error fetching contaminants:", errors)
    throw new Error("Failed to fetch contaminants")
  }
  return data
}

/**
 * Fetch a specific contaminant by ID
 */
export async function getContaminantById(
  contaminantId: string,
): Promise<AmplifyContaminant | null> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Contaminant.listContaminantByContaminantId({
    contaminantId,
  })
  if (errors) {
    console.error("Error fetching contaminant:", errors)
    throw new Error("Failed to fetch contaminant")
  }
  return data.length > 0 ? data[0] : null
}

// =============================================================================
// Contaminant Thresholds (Public Read)
// =============================================================================

/**
 * Fetch all thresholds (public read - uses userPool when authenticated, IAM for guests)
 */
export async function getContaminantThresholds(): Promise<AmplifyContaminantThreshold[]> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.ContaminantThreshold.list({
    limit: 1000,
  })
  if (errors) {
    console.error("Error fetching thresholds:", errors)
    throw new Error("Failed to fetch thresholds")
  }
  return data
}

/**
 * Fetch thresholds for a specific contaminant
 */
export async function getThresholdsForContaminant(
  contaminantId: string,
): Promise<AmplifyContaminantThreshold[]> {
  const client = await getPublicClient()
  const { data, errors } =
    await client.models.ContaminantThreshold.listContaminantThresholdByContaminantId({
      contaminantId,
    })
  if (errors) {
    console.error("Error fetching thresholds for contaminant:", errors)
    throw new Error("Failed to fetch thresholds for contaminant")
  }
  return data
}

/**
 * Fetch thresholds for a specific jurisdiction
 */
export async function getThresholdsForJurisdiction(
  jurisdictionCode: string,
): Promise<AmplifyContaminantThreshold[]> {
  const client = await getPublicClient()
  const { data, errors } =
    await client.models.ContaminantThreshold.listContaminantThresholdByJurisdictionCode({
      jurisdictionCode,
    })
  if (errors) {
    console.error("Error fetching thresholds for jurisdiction:", errors)
    throw new Error("Failed to fetch thresholds for jurisdiction")
  }
  return data
}

// =============================================================================
// Jurisdictions (Public Read)
// =============================================================================

/**
 * Fetch all jurisdictions (public read - uses userPool when authenticated, IAM for guests)
 */
export async function getJurisdictions(): Promise<AmplifyJurisdiction[]> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Jurisdiction.list({
    limit: 100,
  })
  if (errors) {
    console.error("Error fetching jurisdictions:", errors)
    throw new Error("Failed to fetch jurisdictions")
  }
  return data
}

/**
 * Fetch jurisdiction by code
 */
export async function getJurisdictionByCode(code: string): Promise<AmplifyJurisdiction | null> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Jurisdiction.listJurisdictionByCode({
    code,
  })
  if (errors) {
    console.error("Error fetching jurisdiction:", errors)
    throw new Error("Failed to fetch jurisdiction")
  }
  return data.length > 0 ? data[0] : null
}

/**
 * Fetch jurisdictions by country
 */
export async function getJurisdictionsByCountry(country: string): Promise<AmplifyJurisdiction[]> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Jurisdiction.listJurisdictionByCountry({
    country,
  })
  if (errors) {
    console.error("Error fetching jurisdictions by country:", errors)
    throw new Error("Failed to fetch jurisdictions by country")
  }
  return data
}

// =============================================================================
// Locations (Public Read)
// =============================================================================

/**
 * Fetch locations by city name
 * Uses the city index for efficient lookup
 */
export async function getLocationsByCity(city: string): Promise<AmplifyLocation[]> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Location.listLocationByCity({
    city,
  })
  if (errors) {
    console.error("Error fetching locations by city:", errors)
    throw new Error("Failed to fetch locations by city")
  }
  return data
}

/**
 * Fetch all locations by state/province
 * Uses the state index for efficient lookup
 */
export async function getLocationsByState(state: string): Promise<AmplifyLocation[]> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Location.listLocationByState({
    state,
  })
  if (errors) {
    console.error("Error fetching locations by state:", errors)
    throw new Error("Failed to fetch locations by state")
  }
  return data
}

/**
 * Fetch all locations by county/region
 */
export async function getLocationsByCounty(county: string): Promise<AmplifyLocation[]> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Location.listLocationByCounty({
    county,
  })
  if (errors) {
    console.error("Error fetching locations by county:", errors)
    throw new Error("Failed to fetch locations by county")
  }
  return data
}

/**
 * Fetch all locations by country
 */
export async function getLocationsByCountry(country: string): Promise<AmplifyLocation[]> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Location.listLocationByCountry({
    country,
  })
  if (errors) {
    console.error("Error fetching locations by country:", errors)
    throw new Error("Failed to fetch locations by country")
  }
  return data
}

/**
 * Fetch all locations from the database
 * Used for building the search index
 */
export async function getAllLocations(): Promise<AmplifyLocation[]> {
  const client = await getPublicClient()
  const { data, errors } = await client.models.Location.list({
    limit: 1000,
  })
  if (errors) {
    console.error("Error fetching all locations:", errors)
    throw new Error("Failed to fetch all locations")
  }
  return data
}

// =============================================================================
// Location Measurements (Public Read)
// =============================================================================

/**
 * Fetch measurements for a specific city (public read - uses userPool when authenticated, IAM for guests)
 */
export async function getLocationMeasurements(
  city: string,
): Promise<AmplifyLocationMeasurement[]> {
  const client = await getPublicClient()
  const { data, errors } =
    await client.models.LocationMeasurement.listLocationMeasurementByCity({
      city,
    })
  if (errors) {
    console.error("Error fetching location measurements:", errors)
    throw new Error("Failed to fetch location measurements")
  }
  return data
}

/**
 * Fetch measurements for a specific state
 */
export async function getLocationMeasurementsByState(
  state: string,
): Promise<AmplifyLocationMeasurement[]> {
  const client = await getPublicClient()
  const { data, errors } =
    await client.models.LocationMeasurement.listLocationMeasurementByState({
      state,
    })
  if (errors) {
    console.error("Error fetching location measurements by state:", errors)
    throw new Error("Failed to fetch location measurements by state")
  }
  return data
}

/**
 * Fetch measurements for a specific contaminant across all locations
 */
export async function getMeasurementsByContaminant(
  contaminantId: string,
): Promise<AmplifyLocationMeasurement[]> {
  const client = await getPublicClient()
  const { data, errors } =
    await client.models.LocationMeasurement.listLocationMeasurementByContaminantId({
      contaminantId,
    })
  if (errors) {
    console.error("Error fetching measurements by contaminant:", errors)
    throw new Error("Failed to fetch measurements by contaminant")
  }
  return data
}

// =============================================================================
// User Subscriptions (Private - requires authentication)
// =============================================================================

/**
 * Options for creating a subscription
 */
export interface CreateSubscriptionOptions {
  enablePush?: boolean
  enableEmail?: boolean
  alertOnDanger?: boolean
  alertOnWarning?: boolean
  alertOnAnyChange?: boolean
  watchContaminants?: string[]
  notifyWhenDataAvailable?: boolean
  expoPushToken?: string
}

/**
 * Create a new subscription for the current user (city-level)
 */
export async function createUserSubscription(
  city: string,
  state: string,
  country: string,
  county?: string,
  options?: CreateSubscriptionOptions,
): Promise<AmplifyUserSubscription> {
  const { data, errors } = await getPrivateClient().models.UserSubscription.create({
    city,
    state,
    country,
    county,
    enablePush: options?.enablePush ?? true,
    enableEmail: options?.enableEmail ?? false,
    alertOnDanger: options?.alertOnDanger ?? true,
    alertOnWarning: options?.alertOnWarning ?? false,
    alertOnAnyChange: options?.alertOnAnyChange ?? false,
    watchContaminants: options?.watchContaminants,
    notifyWhenDataAvailable: options?.notifyWhenDataAvailable ?? false,
    expoPushToken: options?.expoPushToken,
  })
  if (errors) {
    console.error("Error creating subscription:", errors)
    throw new Error("Failed to create subscription")
  }
  if (!data) {
    throw new Error("No data returned from subscription creation")
  }
  return data
}

/**
 * Update an existing subscription
 */
export async function updateUserSubscription(
  id: string,
  updates: Partial<CreateSubscriptionOptions>,
): Promise<AmplifyUserSubscription> {
  const { data, errors } = await getPrivateClient().models.UserSubscription.update({
    id,
    ...updates,
  })
  if (errors) {
    console.error("Error updating subscription:", errors)
    throw new Error("Failed to update subscription")
  }
  if (!data) {
    throw new Error("No data returned from subscription update")
  }
  return data
}

/**
 * Delete a subscription by ID
 */
export async function deleteUserSubscription(id: string): Promise<void> {
  const { errors } = await getPrivateClient().models.UserSubscription.delete({ id })
  if (errors) {
    console.error("Error deleting subscription:", errors)
    throw new Error("Failed to delete subscription")
  }
}

/**
 * Get all subscriptions for the current user
 */
export async function getUserSubscriptions(): Promise<AmplifyUserSubscription[]> {
  const { data, errors } = await getPrivateClient().models.UserSubscription.list({
    limit: 1000,
  })
  if (errors) {
    console.error("Error fetching user subscriptions:", errors)
    throw new Error("Failed to fetch user subscriptions")
  }
  return data
}

// =============================================================================
// Hazard Reports (Private - requires authentication)
// =============================================================================

/**
 * Create a new hazard report
 */
export async function createHazardReport(reportData: {
  category: "water" | "air" | "health" | "disaster"
  description: string
  location: string
  city?: string
  state?: string
  country?: string
}): Promise<AmplifyHazardReport> {
  const { data, errors } = await getPrivateClient().models.HazardReport.create({
    ...reportData,
    status: "pending",
  })
  if (errors) {
    console.error("Error creating hazard report:", errors)
    throw new Error("Failed to create hazard report")
  }
  if (!data) {
    throw new Error("No data returned from hazard report creation")
  }
  return data
}

/**
 * Get all hazard reports for the current user
 */
export async function getUserHazardReports(): Promise<AmplifyHazardReport[]> {
  const { data, errors } = await getPrivateClient().models.HazardReport.list({
    limit: 1000,
  })
  if (errors) {
    console.error("Error fetching hazard reports:", errors)
    throw new Error("Failed to fetch hazard reports")
  }
  return data
}

// =============================================================================
// Legacy Exports (for backward compatibility during migration)
// =============================================================================

/** @deprecated Use AmplifyContaminant instead */
export type StatDefinition = Schema["Contaminant"]["type"]

/** @deprecated Use AmplifyLocationMeasurement instead */
export type ZipCodeStat = Schema["LocationMeasurement"]["type"]

/** @deprecated Use AmplifyUserSubscription instead */
export type ZipCodeSubscription = Schema["UserSubscription"]["type"]

/** @deprecated Use AmplifyHazardReport instead */
export type HazardReport = Schema["HazardReport"]["type"]

/** @deprecated Use getContaminants instead */
export async function getStatDefinitions(): Promise<AmplifyContaminant[]> {
  return getContaminants()
}

/** @deprecated Use getLocationMeasurements instead */
export async function getZipCodeStats(city: string): Promise<AmplifyLocationMeasurement[]> {
  return getLocationMeasurements(city)
}

/** @deprecated Use createUserSubscription instead */
export async function createZipCodeSubscription(
  city: string,
  state: string,
  country: string,
  options?: { notifyWhenDataAvailable?: boolean },
): Promise<AmplifyUserSubscription> {
  return createUserSubscription(city, state, country, undefined, {
    notifyWhenDataAvailable: options?.notifyWhenDataAvailable,
  })
}

/** @deprecated Use deleteUserSubscription instead */
export async function deleteZipCodeSubscription(id: string): Promise<void> {
  return deleteUserSubscription(id)
}

/** @deprecated Use getUserSubscriptions instead */
export async function getUserZipCodeSubscriptions(): Promise<AmplifyUserSubscription[]> {
  return getUserSubscriptions()
}
