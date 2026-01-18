/**
 * Send Notifications Lambda Handler
 *
 * Sends push notifications to subscribers when safety stats change.
 * Uses Expo Push Notifications service.
 */

import type { Handler } from 'aws-lambda'

interface NotificationEvent {
  statId: string
  message: string
  zipCodes: string[]
}

interface NotificationResult {
  success: boolean
  sentCount: number
  errors: string[]
}

/**
 * Lambda handler for sending push notifications
 *
 * @param event - Contains statId, message, and target zipCodes
 * @returns Result with count of sent notifications and any errors
 */
export const handler: Handler<NotificationEvent, NotificationResult> = async (event) => {
  const { statId, message, zipCodes } = event
  const errors: string[] = []
  let sentCount = 0

  console.log(`Sending notifications for stat ${statId} to ${zipCodes.length} zip codes`)

  try {
    // In production, this would:
    // 1. Query subscriptions for the given zip codes
    // 2. Get push tokens for each subscriber
    // 3. Send push notifications via Expo Push API

    // For now, log the notification details
    for (const zipCode of zipCodes) {
      console.log(`Would send to zip ${zipCode}: ${message}`)
      sentCount++
    }

    return {
      success: true,
      sentCount,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending notifications:', errorMessage)
    errors.push(errorMessage)

    return {
      success: false,
      sentCount,
      errors,
    }
  }
}
