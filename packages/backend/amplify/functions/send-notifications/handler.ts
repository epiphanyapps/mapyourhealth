/**
 * Send Push Notifications Lambda Handler
 *
 * Sends push notifications via Expo Push Notifications service.
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

import type { Handler } from 'aws-lambda'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface PushMessage {
  to: string // Expo push token
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
  channelId?: string
  priority?: 'default' | 'normal' | 'high'
}

interface ExpoPushTicket {
  id?: string
  status: 'ok' | 'error'
  message?: string
  details?: {
    error?: 'DeviceNotRegistered' | 'MessageTooBig' | 'MessageRateExceeded' | 'InvalidCredentials'
  }
}

interface SendNotificationsEvent {
  /** Expo push tokens to send to */
  tokens: string[]
  /** Notification title */
  title: string
  /** Notification body */
  body: string
  /** Optional data payload for deep linking */
  data?: Record<string, unknown>
  /** Optional channel ID for Android */
  channelId?: string
}

interface SendNotificationsResult {
  success: boolean
  sentCount: number
  failedCount: number
  /** Expo ticket IDs for sent notifications */
  ticketIds: string[]
  /** Tokens that failed (e.g., DeviceNotRegistered) */
  invalidTokens: string[]
  errors: string[]
}

/**
 * Check if a string is a valid Expo push token
 */
function isExpoPushToken(token: string): boolean {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
  )
}

/**
 * Send push notifications in batches (Expo limit: 100 per request)
 */
async function sendPushNotificationBatch(messages: PushMessage[]): Promise<ExpoPushTicket[]> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  })

  if (!response.ok) {
    throw new Error(`Expo Push API error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json() as { data: ExpoPushTicket[] }
  return result.data
}

/**
 * Lambda handler for sending push notifications
 *
 * @param event - Contains tokens, title, body, and optional data
 * @returns Result with sent count, ticket IDs, and any errors
 */
export const handler: Handler<SendNotificationsEvent, SendNotificationsResult> = async (event) => {
  const { tokens, title, body, data, channelId } = event
  const ticketIds: string[] = []
  const invalidTokens: string[] = []
  const errors: string[] = []
  let sentCount = 0
  let failedCount = 0

  console.log(`Sending push notifications to ${tokens.length} devices`)
  console.log(`Title: ${title}`)
  console.log(`Body: ${body}`)

  // Filter valid Expo push tokens
  const validTokens = tokens.filter((token) => {
    if (!isExpoPushToken(token)) {
      console.warn(`Invalid Expo push token: ${token}`)
      invalidTokens.push(token)
      return false
    }
    return true
  })

  if (validTokens.length === 0) {
    console.log('No valid Expo push tokens to send to')
    return {
      success: true,
      sentCount: 0,
      failedCount: invalidTokens.length,
      ticketIds: [],
      invalidTokens,
      errors: invalidTokens.length > 0 ? ['No valid Expo push tokens'] : [],
    }
  }

  // Build messages
  const messages: PushMessage[] = validTokens.map((token) => ({
    to: token,
    title,
    body,
    sound: 'default',
    data,
    channelId: channelId || 'default',
    priority: 'high',
  }))

  // Send in batches of 100 (Expo's limit)
  const BATCH_SIZE = 100
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)
    const batchTokens = validTokens.slice(i, i + BATCH_SIZE)

    try {
      console.log(`Sending batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} messages)`)
      const tickets = await sendPushNotificationBatch(batch)

      // Process tickets
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok' && ticket.id) {
          ticketIds.push(ticket.id)
          sentCount++
        } else if (ticket.status === 'error') {
          failedCount++
          const token = batchTokens[index]
          const errorMsg = ticket.message || 'Unknown error'

          // Track invalid tokens for cleanup
          if (ticket.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(token)
            console.warn(`Device not registered: ${token}`)
          } else {
            console.error(`Push failed for ${token}: ${errorMsg}`)
          }

          errors.push(`${token}: ${errorMsg}`)
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Batch send failed: ${errorMessage}`)
      errors.push(`Batch error: ${errorMessage}`)
      failedCount += batch.length
    }
  }

  console.log(`Push notifications complete: ${sentCount} sent, ${failedCount} failed`)

  return {
    success: failedCount === 0,
    sentCount,
    failedCount,
    ticketIds,
    invalidTokens,
    errors,
  }
}
