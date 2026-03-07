/**
 * On ZipCodeStat Update Lambda Handler
 *
 * Triggered by DynamoDB Streams when ZipCodeStat records are modified.
 * Processes status changes and triggers email alerts to subscribers.
 */

import type { DynamoDBStreamHandler, DynamoDBRecord } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import type { AttributeValue } from '@aws-sdk/client-dynamodb'

// Initialize clients
const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const lambdaClient = new LambdaClient({})

// Environment variables
const SEND_EMAIL_ALERT_FUNCTION_NAME = process.env.SEND_EMAIL_ALERT_FUNCTION_NAME || 'send-email-alert'
const SUBSCRIPTIONS_TABLE_NAME = process.env.SUBSCRIPTIONS_TABLE_NAME || ''
const STAT_DEFINITIONS_TABLE_NAME = process.env.STAT_DEFINITIONS_TABLE_NAME || ''

type StatStatus = 'danger' | 'warning' | 'safe'

interface ZipCodeStatRecord {
  id: string
  zipCode: string
  statId: string
  value: number
  status: StatStatus
  lastUpdated: string
  source?: string
  owner?: string
}

interface ZipCodeSubscription {
  id: string
  zipCode: string
  cityName?: string
  state?: string
  emailNotifications?: boolean
  owner: string
}

interface StatDefinition {
  id: string
  statId: string
  name: string
  unit: string
  description?: string
  category: string
}

interface EmailAlertPayload {
  statId: string
  statName: string
  zipCode: string
  cityName?: string
  oldStatus: StatStatus
  newStatus: StatStatus
  currentValue: number
  unit: string
  subscriberEmails: string[]
}

/**
 * Query subscribers for a given zip code with email notifications enabled
 */
async function getSubscribersForZipCode(zipCode: string): Promise<ZipCodeSubscription[]> {
  if (!SUBSCRIPTIONS_TABLE_NAME) {
    console.warn('SUBSCRIPTIONS_TABLE_NAME not set, cannot query subscribers')
    return []
  }

  try {
    // Query using GSI on zipCode
    const result = await docClient.send(
      new QueryCommand({
        TableName: SUBSCRIPTIONS_TABLE_NAME,
        IndexName: 'zipCode',
        KeyConditionExpression: 'zipCode = :zipCode',
        FilterExpression: 'emailNotifications = :enabled',
        ExpressionAttributeValues: {
          ':zipCode': zipCode,
          ':enabled': true,
        },
      })
    )

    return (result.Items || []) as ZipCodeSubscription[]
  } catch (error) {
    console.error(`Error querying subscribers for zip ${zipCode}:`, error)
    return []
  }
}

/**
 * Get stat definition by statId
 */
async function getStatDefinition(statId: string): Promise<StatDefinition | null> {
  if (!STAT_DEFINITIONS_TABLE_NAME) {
    console.warn('STAT_DEFINITIONS_TABLE_NAME not set, cannot query stat definitions')
    return null
  }

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: STAT_DEFINITIONS_TABLE_NAME,
        IndexName: 'statId',
        KeyConditionExpression: 'statId = :statId',
        ExpressionAttributeValues: {
          ':statId': statId,
        },
        Limit: 1,
      })
    )

    return (result.Items?.[0] as StatDefinition) || null
  } catch (error) {
    console.error(`Error querying stat definition for ${statId}:`, error)
    return null
  }
}

/**
 * Get user email from Cognito (requires additional permission)
 * For now, return the owner (sub) as placeholder - real implementation
 * would need to query Cognito User Pool
 */
async function getUserEmail(owner: string): Promise<string | null> {
  // In a full implementation, this would query Cognito to get the email
  // For now, we log that email lookup is needed
  console.log(`Would look up email for user: ${owner}`)
  // Return null to skip sending - real implementation needed
  return null
}

/**
 * Invoke the send-email-alert Lambda function
 */
async function invokeEmailAlertFunction(payload: EmailAlertPayload): Promise<void> {
  try {
    const command = new InvokeCommand({
      FunctionName: SEND_EMAIL_ALERT_FUNCTION_NAME,
      InvocationType: 'Event', // Async invocation
      Payload: Buffer.from(JSON.stringify(payload)),
    })

    await lambdaClient.send(command)
    console.log(`Email alert function invoked for ${payload.zipCode} - ${payload.statName}`)
  } catch (error) {
    console.error('Error invoking email alert function:', error)
    throw error
  }
}

/**
 * Process a single DynamoDB record
 */
async function processRecord(record: DynamoDBRecord): Promise<void> {
  // Only process MODIFY events (status changes)
  if (record.eventName !== 'MODIFY') {
    return
  }

  const oldImage = record.dynamodb?.OldImage
  const newImage = record.dynamodb?.NewImage

  if (!oldImage || !newImage) {
    return
  }

  // Unmarshall DynamoDB format to plain objects
  const oldItem = unmarshall(oldImage as Record<string, AttributeValue>) as ZipCodeStatRecord
  const newItem = unmarshall(newImage as Record<string, AttributeValue>) as ZipCodeStatRecord

  // Check if status changed
  const oldStatus = oldItem.status
  const newStatus = newItem.status

  if (oldStatus === newStatus) {
    return
  }

  console.log(
    `Status changed for ${newItem.statId} in ${newItem.zipCode}: ${oldStatus} -> ${newStatus}`
  )

  // Only send alerts for danger or warning status changes
  if (newStatus === 'safe') {
    console.log('New status is safe, skipping alert')
    return
  }

  // Get subscribers for this zip code
  const subscribers = await getSubscribersForZipCode(newItem.zipCode)

  if (subscribers.length === 0) {
    console.log(`No subscribers with email notifications for zip ${newItem.zipCode}`)
    return
  }

  // Get emails for subscribers
  const emailPromises = subscribers.map((sub) => getUserEmail(sub.owner))
  const emails = (await Promise.all(emailPromises)).filter((e): e is string => e !== null)

  if (emails.length === 0) {
    console.log('No valid emails found for subscribers')
    return
  }

  // Get stat definition for display name
  const statDef = await getStatDefinition(newItem.statId)
  const statName = statDef?.name || newItem.statId
  const unit = statDef?.unit || ''

  // Get city name from first subscriber if available
  const cityName = subscribers[0]?.cityName

  // Build email payload
  const payload: EmailAlertPayload = {
    statId: newItem.statId,
    statName,
    zipCode: newItem.zipCode,
    cityName,
    oldStatus: oldStatus as StatStatus,
    newStatus: newStatus as StatStatus,
    currentValue: newItem.value,
    unit,
    subscriberEmails: emails,
  }

  // Invoke email alert function
  await invokeEmailAlertFunction(payload)
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
