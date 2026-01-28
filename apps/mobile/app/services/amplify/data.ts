/**
 * Amplify Data Access Service
 *
 * Service functions for interacting with the Amplify backend.
 * Provides typed access to Contaminants, Thresholds, Jurisdictions, Locations, Measurements, and Subscriptions.
 */

import { generateClient } from 'aws-amplify/data'
import type { Schema } from '@mapyourhealth/backend/amplify/data/resource'

// Lazy client initialization to ensure Amplify.configure() has been called first
// Use IAM auth for public access (unauthenticated users can read public data)
let _publicClient: ReturnType<typeof generateClient<Schema>> | null = null
let _privateClient: ReturnType<typeof generateClient<Schema>> | null = null

function getPublicClient() {
  if (!_publicClient) {
    _publicClient = generateClient<Schema>({ authMode: 'iam' })
  }
  return _publicClient
}

function getPrivateClient() {
  if (!_privateClient) {
    _privateClient = generateClient<Schema>({ authMode: 'userPool' })
  }
  return _privateClient
}

// =============================================================================
// New Model Types
// =============================================================================

export type AmplifyContaminant = Schema['Contaminant']['type']
export type AmplifyContaminantThreshold = Schema['ContaminantThreshold']['type']
export type AmplifyJurisdiction = Schema['Jurisdiction']['type']
export type AmplifyLocation = Schema['Location']['type']
export type AmplifyLocationMeasurement = Schema['LocationMeasurement']['type']
export type AmplifyUserSubscription = Schema['UserSubscription']['type']
export type AmplifyHazardReport = Schema['HazardReport']['type']

// =============================================================================
// Contaminants (Public Read)
// =============================================================================

/**
 * Fetch all contaminants (public read - uses IAM auth)
 */
export async function getContaminants(): Promise<AmplifyContaminant[]> {
  const { data, errors } = await getPublicClient().models.Contaminant.list({
    limit: 1000,
  })
  if (errors) {
    console.error('Error fetching contaminants:', errors)
    throw new Error('Failed to fetch contaminants')
  }
  return data
}

/**
 * Fetch a specific contaminant by ID
 */
export async function getContaminantById(contaminantId: string): Promise<AmplifyContaminant | null> {
  const { data, errors } = await getPublicClient().models.Contaminant.listContaminantByContaminantId({
    contaminantId,
  })
  if (errors) {
    console.error('Error fetching contaminant:', errors)
    throw new Error('Failed to fetch contaminant')
  }
  return data.length > 0 ? data[0] : null
}

// =============================================================================
// Contaminant Thresholds (Public Read)
// =============================================================================

/**
 * Fetch all thresholds (public read - uses IAM auth)
 */
export async function getContaminantThresholds(): Promise<AmplifyContaminantThreshold[]> {
  const { data, errors } = await getPublicClient().models.ContaminantThreshold.list({
    limit: 1000,
  })
  if (errors) {
    console.error('Error fetching thresholds:', errors)
    throw new Error('Failed to fetch thresholds')
  }
  return data
}

/**
 * Fetch thresholds for a specific contaminant
 */
export async function getThresholdsForContaminant(contaminantId: string): Promise<AmplifyContaminantThreshold[]> {
  const { data, errors } = await getPublicClient().models.ContaminantThreshold.listContaminantThresholdByContaminantId({
    contaminantId,
  })
  if (errors) {
    console.error('Error fetching thresholds for contaminant:', errors)
    throw new Error('Failed to fetch thresholds for contaminant')
  }
  return data
}

/**
 * Fetch thresholds for a specific jurisdiction
 */
export async function getThresholdsForJurisdiction(jurisdictionCode: string): Promise<AmplifyContaminantThreshold[]> {
  const { data, errors } = await getPublicClient().models.ContaminantThreshold.listContaminantThresholdByJurisdictionCode({
    jurisdictionCode,
  })
  if (errors) {
    console.error('Error fetching thresholds for jurisdiction:', errors)
    throw new Error('Failed to fetch thresholds for jurisdiction')
  }
  return data
}

// =============================================================================
// Jurisdictions (Public Read)
// =============================================================================

/**
 * Fetch all jurisdictions (public read - uses IAM auth)
 */
export async function getJurisdictions(): Promise<AmplifyJurisdiction[]> {
  const { data, errors } = await getPublicClient().models.Jurisdiction.list({
    limit: 100,
  })
  if (errors) {
    console.error('Error fetching jurisdictions:', errors)
    throw new Error('Failed to fetch jurisdictions')
  }
  return data
}

/**
 * Fetch jurisdiction by code
 */
export async function getJurisdictionByCode(code: string): Promise<AmplifyJurisdiction | null> {
  const { data, errors } = await getPublicClient().models.Jurisdiction.listJurisdictionByCode({
    code,
  })
  if (errors) {
    console.error('Error fetching jurisdiction:', errors)
    throw new Error('Failed to fetch jurisdiction')
  }
  return data.length > 0 ? data[0] : null
}

/**
 * Fetch jurisdictions by country
 */
export async function getJurisdictionsByCountry(country: string): Promise<AmplifyJurisdiction[]> {
  const { data, errors } = await getPublicClient().models.Jurisdiction.listJurisdictionByCountry({
    country,
  })
  if (errors) {
    console.error('Error fetching jurisdictions by country:', errors)
    throw new Error('Failed to fetch jurisdictions by country')
  }
  return data
}

// =============================================================================
// Locations (Public Read)
// =============================================================================

/**
 * Fetch location by postal code
 */
export async function getLocationByPostalCode(postalCode: string): Promise<AmplifyLocation | null> {
  const { data, errors } = await getPublicClient().models.Location.listLocationByPostalCode({
    postalCode,
  })
  if (errors) {
    console.error('Error fetching location:', errors)
    throw new Error('Failed to fetch location')
  }
  return data.length > 0 ? data[0] : null
}

// =============================================================================
// Location Measurements (Public Read)
// =============================================================================

/**
 * Fetch measurements for a specific postal code (public read - uses IAM auth)
 */
export async function getLocationMeasurements(postalCode: string): Promise<AmplifyLocationMeasurement[]> {
  const { data, errors } = await getPublicClient().models.LocationMeasurement.listLocationMeasurementByPostalCode({
    postalCode,
  })
  if (errors) {
    console.error('Error fetching location measurements:', errors)
    throw new Error('Failed to fetch location measurements')
  }
  return data
}

/**
 * Fetch measurements for a specific contaminant across all locations
 */
export async function getMeasurementsByContaminant(contaminantId: string): Promise<AmplifyLocationMeasurement[]> {
  const { data, errors } = await getPublicClient().models.LocationMeasurement.listLocationMeasurementByContaminantId({
    contaminantId,
  })
  if (errors) {
    console.error('Error fetching measurements by contaminant:', errors)
    throw new Error('Failed to fetch measurements by contaminant')
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
 * Create a new subscription for the current user
 */
export async function createUserSubscription(
  postalCode: string,
  cityName?: string,
  state?: string,
  country?: string,
  options?: CreateSubscriptionOptions,
): Promise<AmplifyUserSubscription> {
  const { data, errors } = await getPrivateClient().models.UserSubscription.create({
    postalCode,
    cityName,
    state,
    country,
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
    console.error('Error creating subscription:', errors)
    throw new Error('Failed to create subscription')
  }
  if (!data) {
    throw new Error('No data returned from subscription creation')
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
    console.error('Error updating subscription:', errors)
    throw new Error('Failed to update subscription')
  }
  if (!data) {
    throw new Error('No data returned from subscription update')
  }
  return data
}

/**
 * Delete a subscription by ID
 */
export async function deleteUserSubscription(id: string): Promise<void> {
  const { errors } = await getPrivateClient().models.UserSubscription.delete({ id })
  if (errors) {
    console.error('Error deleting subscription:', errors)
    throw new Error('Failed to delete subscription')
  }
}

/**
 * Get all subscriptions for the current user
 */
export async function getUserSubscriptions(): Promise<AmplifyUserSubscription[]> {
  const { data, errors } = await getPrivateClient().models.UserSubscription.list()
  if (errors) {
    console.error('Error fetching user subscriptions:', errors)
    throw new Error('Failed to fetch user subscriptions')
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
  category: 'water' | 'air' | 'health' | 'disaster'
  description: string
  location: string
  zipCode?: string
}): Promise<AmplifyHazardReport> {
  const { data, errors } = await getPrivateClient().models.HazardReport.create({
    ...reportData,
    status: 'pending',
  })
  if (errors) {
    console.error('Error creating hazard report:', errors)
    throw new Error('Failed to create hazard report')
  }
  if (!data) {
    throw new Error('No data returned from hazard report creation')
  }
  return data
}

/**
 * Get all hazard reports for the current user
 */
export async function getUserHazardReports(): Promise<AmplifyHazardReport[]> {
  const { data, errors } = await getPrivateClient().models.HazardReport.list()
  if (errors) {
    console.error('Error fetching hazard reports:', errors)
    throw new Error('Failed to fetch hazard reports')
  }
  return data
}

// =============================================================================
// Legacy Exports (for backward compatibility during migration)
// =============================================================================

/** @deprecated Use AmplifyContaminant instead */
export type StatDefinition = Schema['Contaminant']['type']

/** @deprecated Use AmplifyLocationMeasurement instead */
export type ZipCodeStat = Schema['LocationMeasurement']['type']

/** @deprecated Use AmplifyUserSubscription instead */
export type ZipCodeSubscription = Schema['UserSubscription']['type']

/** @deprecated Use AmplifyHazardReport instead */
export type HazardReport = Schema['HazardReport']['type']

/** @deprecated Use getContaminants instead */
export async function getStatDefinitions(): Promise<AmplifyContaminant[]> {
  return getContaminants()
}

/** @deprecated Use getLocationMeasurements instead */
export async function getZipCodeStats(zipCode: string): Promise<AmplifyLocationMeasurement[]> {
  return getLocationMeasurements(zipCode)
}

/** @deprecated Use createUserSubscription instead */
export async function createZipCodeSubscription(
  zipCode: string,
  cityName?: string,
  state?: string,
  options?: { notifyWhenDataAvailable?: boolean },
): Promise<AmplifyUserSubscription> {
  return createUserSubscription(zipCode, cityName, state, undefined, {
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
