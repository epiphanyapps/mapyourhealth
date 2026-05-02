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

/**
 * Which level of the location hierarchy this notification originated from
 * (#123). Drives subscriber fan-out: city-scope notifies that city only;
 * state-scope notifies every subscriber in that state; country-scope
 * notifies every subscriber in that country.
 */
type LocationScope = 'city' | 'state' | 'country'

interface ProcessNotificationsEvent {
  /** City name (null when the source record was state- or country-scoped). */
  city: string | null
  /** State/province code (null when the record was country-scoped). */
  state?: string | null
  /** Country code — required as the lowest cascade anchor. */
  country?: string | null
  /**
   * Which scope to fan out to. Optional for backward compatibility — if
   * omitted, derived from which location fields are populated.
   */
  scope?: LocationScope
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
 * Query subscriptions by state via the state GSI (#123 cascade fan-out).
 * Used when the source record is state-scoped: every subscriber in that
 * state should be notified, regardless of their specific city.
 */
async function getSubscriptionsByState(state: string): Promise<Subscription[]> {
  const command = new QueryCommand({
    TableName: SUBSCRIPTIONS_TABLE_NAME,
    IndexName: 'userSubscriptionsByState',
    KeyConditionExpression: '#state = :state',
    ExpressionAttributeNames: { '#state': 'state' },
    ExpressionAttributeValues: {
      ':state': { S: state },
    },
  })

  const result = await dynamoClient.send(command)
  return (result.Items || []).map((item) => unmarshall(item) as Subscription)
}

/**
 * Query subscriptions by country via the country GSI (#123 cascade fan-out).
 * Used when the source record is country-scoped.
 */
async function getSubscriptionsByCountry(country: string): Promise<Subscription[]> {
  const command = new QueryCommand({
    TableName: SUBSCRIPTIONS_TABLE_NAME,
    IndexName: 'userSubscriptionsByCountry',
    KeyConditionExpression: 'country = :country',
    ExpressionAttributeValues: {
      ':country': { S: country },
    },
  })

  const result = await dynamoClient.send(command)
  return (result.Items || []).map((item) => unmarshall(item) as Subscription)
}

/**
 * Fan out to every subscriber whose location matches the source record's
 * cascade scope. Deduplicates so a subscriber whose city, state, AND
 * country all matched a hypothetical record only gets one notification.
 */
async function getSubscriptionsForScope(
  scope: LocationScope,
  city: string | null,
  state: string | null | undefined,
  country: string | null | undefined,
): Promise<Subscription[]> {
  switch (scope) {
    case 'city':
      if (!city) return []
      return getSubscriptionsByCity(city)
    case 'state':
      if (!state) return []
      return getSubscriptionsByState(state)
    case 'country':
      if (!country) return []
      return getSubscriptionsByCountry(country)
  }
}

/**
 * Derive cascade scope from which location fields are populated. Used as
 * the fallback when an upstream caller didn't supply `scope` explicitly.
 */
function deriveScope(
  city: string | null,
  state: string | null | undefined,
  country: string | null | undefined,
): LocationScope {
  if (city) return 'city'
  if (state) return 'state'
  if (country) return 'country'
  // Default — preserves legacy single-city behaviour for callers that pass
  // city only.
  return 'city'
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
    // city may be null on state-/country-scoped events (#123); send empty
    // string so downstream email Lambda doesn't break on null.
    city: event.city ?? '',
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
  const scope = event.scope ?? deriveScope(city, state, country)
  const errors: string[] = []
  let emailsSent = 0
  let pushSent = 0

  // At least one location anchor must be present for fan-out to make sense.
  if (!city && !state && !country) {
    console.error('Event has no location anchor (city/state/country all empty)')
    return {
      success: false,
      subscribersNotified: 0,
      emailsSent: 0,
      pushSent: 0,
      errors: ['No location anchor provided'],
    }
  }

  console.log(
    `Processing notifications (${scope}-scope) for ${city ?? '-'}, ${state ?? '-'}, ${country ?? '-'} (trigger: ${triggerType})`,
  )

  // Fan out to every subscriber matching the cascade scope (#123). A
  // state-scoped record reaches every subscriber in that state; a
  // country-scoped record reaches every subscriber in that country.
  const subscriptions = await getSubscriptionsForScope(scope, city, state, country)
  console.log(`Found ${subscriptions.length} ${scope}-scope subscribers`)

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

    // Log email notifications. For state/country fan-out (#123), record the
    // subscriber's own city so existing per-city audit queries on
    // NotificationLog still group correctly.
    for (const { subscription } of emailRecipients) {
      await logNotification(
        subscription.id,
        subscription.owner,
        subscription.city || city || '',
        subscription.state || state || '',
        subscription.country || country || '',
        'email',
        emailResult.success ? 'sent' : 'failed',
        title,
        body,
        triggerType,
      )
    }
  }

  // Send push notifications. Each push gets a deep-link tailored to that
  // subscriber's own location so tapping it opens the user's dashboard.
  // Mobile cascade then resolves the data the user should actually see.
  if (pushRecipients.length > 0) {
    console.log(`Sending push to ${pushRecipients.length} devices`)

    // For city scope, every recipient shares the same deep-link target
    // (the originating city). For state/country (#123), each recipient
    // gets their own city in the link so tapping the notification opens
    // their personal dashboard, where the cascade resolves what to show.
    const sharedDeepLinkData = {
      screen: 'Dashboard',
      city: city ?? '',
      state: state ?? '',
      country: country ?? '',
      contaminantId: event.contaminantId,
    }
    const deepLinkForSubscriber = (sub: Subscription) =>
      scope === 'city'
        ? sharedDeepLinkData
        : {
            screen: 'Dashboard',
            city: sub.city,
            state: sub.state ?? '',
            country: sub.country ?? '',
            contaminantId: event.contaminantId,
          }

    // Send one push per subscriber so each gets a personalised deep-link.
    const pushResult: { success: boolean; sentCount: number; invalidTokens: string[] } = {
      success: true,
      sentCount: 0,
      invalidTokens: [],
    }
    for (const { token, subscription } of pushRecipients) {
      const single = await sendPushNotifications(
        [token],
        title,
        body,
        deepLinkForSubscriber(subscription),
      )
      pushResult.success = pushResult.success && single.success
      pushResult.sentCount += single.sentCount
      pushResult.invalidTokens.push(...single.invalidTokens)
    }
    pushSent = pushResult.sentCount

    // Log push notifications. Subscriber city/state/country wins so log
    // queries by city continue to work for fan-out notifications (#123).
    for (const { subscription } of pushRecipients) {
      const failed = pushResult.invalidTokens.includes(subscription.expoPushToken!)
      await logNotification(
        subscription.id,
        subscription.owner,
        subscription.city || city || '',
        subscription.state || state || '',
        subscription.country || country || '',
        'push',
        failed ? 'failed' : 'sent',
        title,
        body,
        triggerType,
        failed ? 'Invalid or expired token' : undefined,
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
