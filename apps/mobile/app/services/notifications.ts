/**
 * Push Notifications Service
 *
 * Handles Expo push notification registration and token management.
 * @see https://docs.expo.dev/push-notifications/overview/
 */

import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { getUserSubscriptions, updateUserSubscription } from './amplify/data'

/**
 * Status of push notification setup
 */
export type NotificationStatus = 'unknown' | 'granted' | 'denied' | 'unsupported' | 'error'

/**
 * Result of push notification initialization
 */
export interface NotificationInitResult {
  status: NotificationStatus
  token: string | null
  error?: string
}

/**
 * Result of token sync to backend
 */
export interface TokenSyncResult {
  success: boolean
  error?: string
}

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted')
    return null
  }

  try {
    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId

    if (!projectId) {
      console.warn('No project ID found for push notifications')
      // Fall back to getting token without project ID (works in development)
      const token = await Notifications.getExpoPushTokenAsync()
      return token.data
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    })

    console.log('Expo push token:', token.data)
    return token.data
  } catch (error) {
    console.error('Failed to get push token:', error)
    return null
  }
}

/**
 * Set up Android notification channel (required for Android 8+)
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('water-quality-alerts', {
      name: 'Water Quality Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      description: 'Notifications about water quality changes in your subscribed locations',
    })
  }
}

/**
 * Update all user subscriptions with the current push token
 * Includes retry logic with exponential backoff
 */
export async function updateSubscriptionsWithPushToken(
  token: string,
  maxRetries = 3
): Promise<TokenSyncResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const subscriptions = await getUserSubscriptions()

      for (const subscription of subscriptions) {
        // Only update if token is different or missing
        if (subscription.expoPushToken !== token) {
          await updateUserSubscription(subscription.id, {
            expoPushToken: token,
          })
          console.log(`Updated subscription ${subscription.id} with push token`)
        }
      }

      return { success: true }
    } catch (error) {
      console.error(`Failed to update subscriptions (attempt ${attempt}/${maxRetries}):`, error)

      if (attempt === maxRetries) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sync push token'
        return { success: false, error: errorMessage }
      }

      // Exponential backoff: 1s, 2s, 3s
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  return { success: false, error: 'Max retries exceeded' }
}

/**
 * Initialize push notifications
 * Call this when user is authenticated and app is ready
 * Returns detailed status information for UI feedback
 */
export async function initializePushNotifications(): Promise<NotificationInitResult> {
  // Check if device supports push notifications
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return {
      status: 'unsupported',
      token: null,
      error: 'Push notifications require a physical device',
    }
  }

  // Set up Android notification channel
  await setupNotificationChannel()

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  // Handle permission denied
  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted')
    return {
      status: 'denied',
      token: null,
    }
  }

  // Try to get the push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId

    let token: string
    if (!projectId) {
      console.warn('No project ID found for push notifications')
      const tokenResponse = await Notifications.getExpoPushTokenAsync()
      token = tokenResponse.data
    } else {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId })
      token = tokenResponse.data
    }

    console.log('Expo push token:', token)

    // Sync token to backend subscriptions
    const syncResult = await updateSubscriptionsWithPushToken(token)

    if (!syncResult.success) {
      console.warn('Token obtained but failed to sync to backend:', syncResult.error)
      // Still return granted since we have the token - sync can be retried
      return {
        status: 'granted',
        token,
        error: syncResult.error,
      }
    }

    return {
      status: 'granted',
      token,
    }
  } catch (error) {
    console.error('Failed to get push token:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get push token'
    return {
      status: 'error',
      token: null,
      error: errorMessage,
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use initializePushNotifications() which returns detailed status
 */
export async function initializePushNotificationsLegacy(): Promise<string | null> {
  const result = await initializePushNotifications()
  return result.token
}

/**
 * Add a listener for incoming notifications (when app is in foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback)
}

/**
 * Add a listener for notification responses (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback)
}

/**
 * Get the last notification response (for handling app launch from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync()
}

/**
 * Clear all delivered notifications
 */
export async function clearNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync()
}

/**
 * Get current push token without re-registering
 */
export async function getCurrentPushToken(): Promise<string | null> {
  try {
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') {
      return null
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    const token = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync()

    return token.data
  } catch (error) {
    console.error('Failed to get current push token:', error)
    return null
  }
}
