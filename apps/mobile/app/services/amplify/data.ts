/**
 * Amplify Data Access Service
 *
 * Service functions for interacting with the Amplify backend.
 * Provides typed access to StatDefinitions, ZipCodeStats, Subscriptions, and HazardReports.
 */

import { generateClient } from 'aws-amplify/data'
import type { Schema } from '@mapyourhealth/backend/amplify/data/resource'

const client = generateClient<Schema>()

// Types for easier consumption
export type StatDefinition = Schema['StatDefinition']['type']
export type ZipCodeStat = Schema['ZipCodeStat']['type']
export type Subscription = Schema['Subscription']['type']
export type HazardReport = Schema['HazardReport']['type']

/**
 * Fetch all stat definitions
 */
export async function getStatDefinitions(): Promise<StatDefinition[]> {
  const { data, errors } = await client.models.StatDefinition.list()
  if (errors) {
    console.error('Error fetching stat definitions:', errors)
    throw new Error('Failed to fetch stat definitions')
  }
  return data
}

/**
 * Fetch stats for a specific zip code
 */
export async function getZipCodeStats(zipCode: string): Promise<ZipCodeStat[]> {
  const { data, errors } = await client.models.ZipCodeStat.listZipCodeStatByZipCode({
    zipCode,
  })
  if (errors) {
    console.error('Error fetching zip code stats:', errors)
    throw new Error('Failed to fetch zip code stats')
  }
  return data
}

/**
 * Create a new subscription for the current user
 */
export async function createSubscription(
  zipCode: string,
  cityName?: string,
  state?: string,
): Promise<Subscription> {
  const { data, errors } = await client.models.Subscription.create({
    zipCode,
    cityName,
    state,
    enableNotifications: true,
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
 * Delete a subscription by ID
 */
export async function deleteSubscription(id: string): Promise<void> {
  const { errors } = await client.models.Subscription.delete({ id })
  if (errors) {
    console.error('Error deleting subscription:', errors)
    throw new Error('Failed to delete subscription')
  }
}

/**
 * Get all subscriptions for the current user
 */
export async function getUserSubscriptions(): Promise<Subscription[]> {
  const { data, errors } = await client.models.Subscription.list()
  if (errors) {
    console.error('Error fetching user subscriptions:', errors)
    throw new Error('Failed to fetch user subscriptions')
  }
  return data
}

/**
 * Create a new hazard report
 */
export async function createHazardReport(reportData: {
  category: 'water' | 'air' | 'health' | 'disaster'
  description: string
  location: string
  zipCode?: string
}): Promise<HazardReport> {
  const { data, errors } = await client.models.HazardReport.create({
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
export async function getUserHazardReports(): Promise<HazardReport[]> {
  const { data, errors } = await client.models.HazardReport.list()
  if (errors) {
    console.error('Error fetching hazard reports:', errors)
    throw new Error('Failed to fetch hazard reports')
  }
  return data
}
