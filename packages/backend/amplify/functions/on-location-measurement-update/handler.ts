/**
 * On LocationMeasurement Update Lambda Handler
 *
 * Triggered by DynamoDB Streams when LocationMeasurement records are created or modified.
 * Invokes the process-notifications Lambda to send alerts to subscribers.
 */

import type { DynamoDBStreamHandler, DynamoDBRecord } from 'aws-lambda'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import type { AttributeValue } from '@aws-sdk/client-dynamodb'

// Initialize clients
const lambdaClient = new LambdaClient({})

// Environment variables (set in backend.ts)
const PROCESS_NOTIFICATIONS_FUNCTION_NAME = process.env.PROCESS_NOTIFICATIONS_FUNCTION_NAME!

interface LocationMeasurementRecord {
  id: string
  // Location hierarchy (#123): city/state may be null on state- or country-
  // anchored records. country is the only field guaranteed to be set.
  city?: string | null
  state?: string | null
  country: string
  contaminantId: string
  value: number
  measuredAt: string
  source?: string
  sourceUrl?: string
  notes?: string
  silentImport?: boolean
}

/**
 * Determine which level of the location hierarchy this record was anchored
 * at. Drives notification fan-out: city-scope notifies one city's
 * subscribers, state-scope notifies every subscriber in that state, etc.
 */
function deriveScope(
  record: LocationMeasurementRecord,
): 'city' | 'state' | 'country' {
  if (record.city) return 'city'
  if (record.state) return 'state'
  return 'country'
}

/**
 * Process a single DynamoDB record
 */
async function processRecord(record: DynamoDBRecord): Promise<void> {
  // Only process INSERT and MODIFY events
  if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') {
    console.log(`Skipping event type: ${record.eventName}`)
    return
  }

  const newImage = record.dynamodb?.NewImage
  if (!newImage) {
    console.log('No NewImage in record, skipping')
    return
  }

  // Unmarshall DynamoDB format to plain object
  const newItem = unmarshall(newImage as Record<string, AttributeValue>) as LocationMeasurementRecord

  const { city, state, country, contaminantId, value, silentImport } = newItem

  if (!country) {
    console.log('Record missing country anchor, skipping')
    return
  }

  // Skip notification for silent imports (bulk imports, data corrections, etc.)
  if (silentImport === true) {
    console.log(
      `Skipping notification for silent import: ${city ?? ''}, ${state ?? ''}, ${country}, ${contaminantId}`,
    )
    return
  }

  const scope = deriveScope(newItem)
  const triggerType = 'data_update'
  const locationLabel = `${city ?? '-'}, ${state ?? '-'}, ${country}`

  console.log(
    `Processing ${record.eventName} (${scope}-scope) for ${locationLabel}/${contaminantId} (value: ${value})`,
  )

  // Build payload for process-notifications Lambda. `scope` tells the
  // downstream Lambda which subscriber set to fan out to (#123).
  const payload = {
    city: city ?? null,
    state: state ?? null,
    country,
    scope,
    contaminantId,
    triggerType,
    currentValue: value,
  }

  // Invoke process-notifications Lambda asynchronously
  try {
    const command = new InvokeCommand({
      FunctionName: PROCESS_NOTIFICATIONS_FUNCTION_NAME,
      InvocationType: 'Event', // Async invocation
      Payload: Buffer.from(JSON.stringify(payload)),
    })

    await lambdaClient.send(command)
    console.log(
      `Successfully invoked process-notifications (${scope}) for ${locationLabel}/${contaminantId}`,
    )
  } catch (error) {
    console.error(`Error invoking process-notifications:`, error)
    throw error // Re-throw to trigger retry
  }
}

/**
 * Lambda handler for DynamoDB Stream events
 */
export const handler: DynamoDBStreamHandler = async (event) => {
  console.log(`Processing ${event.Records.length} DynamoDB stream records`)

  const batchItemFailures: { itemIdentifier: string }[] = []

  for (const record of event.Records) {
    try {
      await processRecord(record)
    } catch (error) {
      console.error(`Error processing record ${record.eventID}:`, error)
      // Add to failures for retry
      if (record.eventID) {
        batchItemFailures.push({ itemIdentifier: record.eventID })
      }
    }
  }

  console.log(`Processed ${event.Records.length - batchItemFailures.length} records successfully`)

  return {
    batchItemFailures,
  }
}
