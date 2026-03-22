/**
 * Process Notifications Lambda Handler
 *
 * Orchestrates notification delivery:
 * 1. Queries subscribers for the affected city
 * 2. Evaluates each subscriber's preferences
 * 3. Invokes send-email-alert and/or send-notifications
 * 4. Logs notification delivery to NotificationLog
 */

import type { Handler } from 'aws-lambda'
import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb'

// Initialize clients
const dynamoClient = new DynamoDBClient({})
const lambdaClient = new LambdaClient({})
const cognitoClient = new CognitoIdentityProviderClient({})

// Environment variables (set in backend.ts)
const SUBSCRIPTIONS_TABLE_NAME = process.env.SUBSCRIPTIONS_TABLE_NAME!
const NOTIFICATION_LOG_TABLE_NAME = process.env.NOTIFICATION_LOG_TABLE_NAME!
const SEND_EMAIL_FUNCTION_NAME = process.env.SEND_EMAIL_FUNCTION_NAME!
const SEND_PUSH_FUNCTION_NAME = process.env.SEND_PUSH_FUNCTION_NAME!
const USER_POOL_ID = process.env.USER_POOL_ID!

type TriggerType = 'data_update' | 'data_available' | 'status_change' | 'manual_alert'
type NotificationStatus = 'danger' | 'warning' | 'safe'

interface ProcessNotificationsEvent {
  /** City name */
  city: string
  /** State/province code */
  state?: string
  /** Country code */
  country?: string
  /** What triggered this notification */
  triggerType: TriggerType
  /** Whether this was manually triggered by admin */
  adminTriggered?: boolean
  /** Contaminant that changed (if applicable) */
  contaminantId?: string
  contaminantName?: string
  /** Status change details (if applicable) */
  oldStatus?: NotificationStatus
  newStatus?: NotificationStatus
  currentValue?: number
  unit?: string
  /** Alert severity for manual alerts */
  alertLevel?: 'info' | 'warning' | 'danger'
  /** Custom message for manual alerts */
  customMessage?: string
}

interface ProcessNotificationsResult {
  success: boolean
  subscribersNotified: number
  emailsSent: number
  pushSent: number
  errors: string[]
}

interface Subscription {
  id: string
  owner: string // Cognito user ID
  city: string
  state?: string
  country?: string
  enablePush: boolean
  enableEmail: boolean
  alertOnDanger: boolean
  alertOnWarning: boolean
  alertOnAnyChange: boolean
  watchContaminants?: string[]
  notifyWhenDataAvailable: boolean
  expoPushToken?: string
}

/**
 * Query subscriptions by city using GSI
 */
async function getSubscriptionsByCity(city: string): Promise<Subscription[]> {
  const command = new QueryCommand({
    TableName: SUBSCRIPTIONS_TABLE_NAME,
    IndexName: 'userSubscriptionsByCity',
    KeyConditionExpression: 'city = :city',
    ExpressionAttributeValues: {
      ':city': { S: city },
    },
  })

  const result = await dynamoClient.send(command)
  return (result.Items || []).map((item) => unmarshall(item) as Subscription)
}

/**
 * Get user email from Cognito
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    // userId format from Amplify is typically the Cognito sub
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
    })

    const result = await cognitoClient.send(command)
    const emailAttr = result.UserAttributes?.find((attr) => attr.Name === 'email')
    return emailAttr?.Value || null
  } catch (error) {
    console.error(`Failed to get email for user ${userId}:`, error)
    return null
  }
}

/**
 * Check if subscriber should be notified based on preferences
 */
function shouldNotify(
  subscription: Subscription,
  event: ProcessNotificationsEvent
): boolean {
  const { triggerType, newStatus, contaminantId, alertLevel } = event

  // For manual admin alerts, always notify based on alert level preferences
  if (triggerType === 'manual_alert') {
    // Map alertLevel to newStatus for preference checking
    const effectiveStatus = alertLevel === 'info' ? 'safe' : alertLevel || 'warning'

    // For danger level, notify if they want danger alerts
    if (effectiveStatus === 'danger' && subscription.alertOnDanger !== false) {
      return true
    }
    // For warning level, notify if they want warning alerts
    if (effectiveStatus === 'warning' && (subscription.alertOnWarning || subscription.alertOnAnyChange)) {
      return true
    }
    // For info level, only notify if they want any change alerts
    if (effectiveStatus === 'safe' && subscription.alertOnAnyChange) {
      return true
    }
    // Default: notify on danger-level manual alerts
    return effectiveStatus === 'danger'
  }

  // For "data_available" trigger, only notify if they opted in
  if (triggerType === 'data_available') {
    return subscription.notifyWhenDataAvailable
  }

  // Check contaminant filter
  if (
    contaminantId &&
    subscription.watchContaminants &&
    subscription.watchContaminants.length > 0
  ) {
    if (!subscription.watchContaminants.includes(contaminantId)) {
      return false
    }
  }

  // Check alert level preferences
  if (subscription.alertOnAnyChange) {
    return true
  }

  if (newStatus === 'danger' && subscription.alertOnDanger) {
    return true
  }

  if (newStatus === 'warning' && subscription.alertOnWarning) {
    return true
  }

  // Default: notify on danger if no explicit preferences
  if (!subscription.alertOnDanger && !subscription.alertOnWarning && !subscription.alertOnAnyChange) {
    return newStatus === 'danger'
  }

  return false
}

/**
 * Build notification message based on trigger type
 */
function buildNotificationContent(event: ProcessNotificationsEvent): {
  title: string
  body: string
} {
  const { triggerType, city, contaminantName, newStatus, alertLevel, customMessage } = event
  const location = city || 'your area'

  if (triggerType === 'manual_alert') {
    const alertLabels = {
      danger: '⚠️ ALERT',
      warning: '⚡ Warning',
      info: 'ℹ️ Notice',
    }
    const level = alertLevel || 'info'
    return {
      title: `${alertLabels[level]}: ${location}`,
      body: customMessage || `Important water quality notice for ${location}. Tap for details.`,
    }
  }

  if (triggerType === 'data_available') {
    return {
      title: 'Data Now Available',
      body: `Water quality data is now available for ${location}. Tap to view the report.`,
    }
  }

  if (triggerType === 'status_change' && newStatus && contaminantName) {
    const statusLabels = {
      danger: '⚠️ DANGER',
      warning: '⚡ Warning',
      safe: '✅ Safe',
    }
    return {
      title: `${statusLabels[newStatus]}: ${contaminantName}`,
      body: `${contaminantName} levels in ${location} have changed to ${newStatus.toUpperCase()}. Tap for details.`,
    }
  }

  // Default data_update message
  return {
    title: 'Water Quality Update',
    body: `New water quality data available for ${location}. Tap to view the latest report.`,
  }
}

/**
 * Log notification to NotificationLog table
 */
async function logNotification(
  subscriptionId: string,
  userId: string,
  city: string,
  state: string,
  country: string,
  type: 'push' | 'email',
  status: 'sent' | 'failed',
  title: string,
  body: string,
  triggerType: TriggerType,
  error?: string
): Promise<void> {
  const now = new Date().toISOString()
  const id = `${subscriptionId}-${type}-${Date.now()}`

  const item = {
    id: { S: id },
    __typename: { S: 'NotificationLog' },
    subscriptionId: { S: subscriptionId },
    userId: { S: userId },
    city: { S: city },
    state: { S: state },
    country: { S: country },
    type: { S: type },
    status: { S: status },
    title: { S: title },
    body: { S: body },
    sentAt: { S: now },
    triggerType: { S: triggerType },
    ...(error && { error: { S: error } }),
    createdAt: { S: now },
    updatedAt: { S: now },
  }

  try {
    await dynamoClient.send(
      new PutItemCommand({
        TableName: NOTIFICATION_LOG_TABLE_NAME,
        Item: item,
      })
    )
  } catch (err) {
    console.error('Failed to log notification:', err)
  }
}

/**
 * Invoke send-email-alert Lambda
 */
async function sendEmailNotification(
  emails: string[],
  event: ProcessNotificationsEvent
): Promise<{ success: boolean; sentCount: number }> {
  const payload = {
    statId: event.contaminantId || 'water-quality',
    statName: event.contaminantName || 'Water Quality',
    city: event.city,
    state: event.state || '',
    country: event.country || '',
    oldStatus: event.oldStatus || 'safe',
    newStatus: event.newStatus || 'warning',
    currentValue: event.currentValue || 0,
    unit: event.unit || '',
    subscriberEmails: emails,
  }

  try {
    const command = new InvokeCommand({
      FunctionName: SEND_EMAIL_FUNCTION_NAME,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(payload)),
    })

    const result = await lambdaClient.send(command)
    const response = JSON.parse(Buffer.from(result.Payload!).toString())

    return {
      success: response.success,
      sentCount: response.sentCount || 0,
    }
  } catch (error) {
    console.error('Failed to invoke send-email-alert:', error)
    return { success: false, sentCount: 0 }
  }
}

/**
 * Invoke send-notifications Lambda (push)
 */
async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; sentCount: number; invalidTokens: string[] }> {
  const payload = {
    tokens,
    title,
    body,
    data,
    channelId: 'water-quality-alerts',
  }

  try {
    const command = new InvokeCommand({
      FunctionName: SEND_PUSH_FUNCTION_NAME,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(payload)),
    })

    const result = await lambdaClient.send(command)
    const response = JSON.parse(Buffer.from(result.Payload!).toString())

    return {
      success: response.success,
      sentCount: response.sentCount || 0,
      invalidTokens: response.invalidTokens || [],
    }
  } catch (error) {
    console.error('Failed to invoke send-notifications:', error)
    return { success: false, sentCount: 0, invalidTokens: [] }
  }
}

/**
 * Main handler
 */
export const handler: Handler<ProcessNotificationsEvent, ProcessNotificationsResult> = async (
  event
) => {
  const { city, state, country, triggerType } = event
  const errors: string[] = []
  let emailsSent = 0
  let pushSent = 0

  if (!city) {
    console.error('No city provided in event')
    return {
      success: false,
      subscribersNotified: 0,
      emailsSent: 0,
      pushSent: 0,
      errors: ['No city provided'],
    }
  }

  console.log(`Processing notifications for ${city}, ${state || ''}, ${country || ''} (trigger: ${triggerType})`)

  // Get all subscribers for this city
  const subscriptions = await getSubscriptionsByCity(city)
  console.log(`Found ${subscriptions.length} subscribers`)

  if (subscriptions.length === 0) {
    return {
      success: true,
      subscribersNotified: 0,
      emailsSent: 0,
      pushSent: 0,
      errors: [],
    }
  }

  // Build notification content
  const { title, body } = buildNotificationContent(event)
  const deepLinkData = {
    screen: 'Dashboard',
    city,
    state: state || '',
    country: country || '',
    contaminantId: event.contaminantId,
  }

  // Collect recipients based on preferences
  const emailRecipients: { email: string; subscription: Subscription }[] = []
  const pushRecipients: { token: string; subscription: Subscription }[] = []

  for (const subscription of subscriptions) {
    // Check if this subscriber should be notified
    if (!shouldNotify(subscription, event)) {
      console.log(`Skipping ${subscription.id} - preferences don't match`)
      continue
    }

    // Collect email recipients
    if (subscription.enableEmail) {
      const email = await getUserEmail(subscription.owner)
      if (email) {
        emailRecipients.push({ email, subscription })
      } else {
        console.warn(`No email found for user ${subscription.owner}`)
      }
    }

    // Collect push recipients
    if (subscription.enablePush && subscription.expoPushToken) {
      pushRecipients.push({ token: subscription.expoPushToken, subscription })
    }
  }

  const subscribersNotified = new Set([
    ...emailRecipients.map((r) => r.subscription.id),
    ...pushRecipients.map((r) => r.subscription.id),
  ]).size

  // Send email notifications
  if (emailRecipients.length > 0) {
    const emails = emailRecipients.map((r) => r.email)
    console.log(`Sending emails to ${emails.length} recipients`)

    const emailResult = await sendEmailNotification(emails, event)
    emailsSent = emailResult.sentCount

    // Log email notifications
    for (const { email, subscription } of emailRecipients) {
      await logNotification(
        subscription.id,
        subscription.owner,
        city,
        state || '',
        country || '',
        'email',
        emailResult.success ? 'sent' : 'failed',
        title,
        body,
        triggerType
      )
    }
  }

  // Send push notifications
  if (pushRecipients.length > 0) {
    const tokens = pushRecipients.map((r) => r.token)
    console.log(`Sending push to ${tokens.length} devices`)

    const pushResult = await sendPushNotifications(tokens, title, body, deepLinkData)
    pushSent = pushResult.sentCount

    // Log push notifications
    for (const { subscription } of pushRecipients) {
      const failed = pushResult.invalidTokens.includes(subscription.expoPushToken!)
      await logNotification(
        subscription.id,
        subscription.owner,
        city,
        state || '',
        country || '',
        'push',
        failed ? 'failed' : 'sent',
        title,
        body,
        triggerType,
        failed ? 'Invalid or expired token' : undefined
      )
    }

    // TODO: Clean up invalid tokens from subscriptions
    if (pushResult.invalidTokens.length > 0) {
      console.warn(`${pushResult.invalidTokens.length} invalid push tokens need cleanup`)
    }
  }

  console.log(
    `Notification processing complete: ${subscribersNotified} notified, ` +
      `${emailsSent} emails, ${pushSent} push`
  )

  return {
    success: errors.length === 0,
    subscribersNotified,
    emailsSent,
    pushSent,
    errors,
  }
}
