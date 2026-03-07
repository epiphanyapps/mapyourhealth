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
  city: string
  state: string
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

  // Skip notification for silent imports (bulk imports, data corrections, etc.)
  if (silentImport === true) {
    console.log(`Skipping notification for silent import: ${city}, ${state}, ${contaminantId}`)
    return
  }

  // Determine trigger type based on event
  const triggerType = record.eventName === 'INSERT' ? 'data_update' : 'data_update'

  console.log(`Processing ${record.eventName} for ${city}, ${state}/${contaminantId} (value: ${value})`)

  // Build payload for process-notifications Lambda
  const payload = {
    city,
    state,
    country,
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
    console.log(`Successfully invoked process-notifications for ${city}, ${state}/${contaminantId}`)
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
      if (record.dynamodb?.SequenceNumber) {
        batchItemFailures.push({ itemIdentifier: record.dynamodb.SequenceNumber })
      }
    }
  }

  console.log(`Processed ${event.Records.length - batchItemFailures.length} records successfully`)

  return {
    batchItemFailures,
  }
}
