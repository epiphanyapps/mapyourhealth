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
 */
export async function updateSubscriptionsWithPushToken(token: string): Promise<void> {
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
  } catch (error) {
    console.error('Failed to update subscriptions with push token:', error)
  }
}

/**
 * Initialize push notifications
 * Call this when user is authenticated and app is ready
 */
export async function initializePushNotifications(): Promise<string | null> {
  // Set up Android notification channel
  await setupNotificationChannel()

  // Register for push notifications
  const token = await registerForPushNotificationsAsync()

  if (token) {
    // Update all existing subscriptions with the new token
    await updateSubscriptionsWithPushToken(token)
  }

  return token
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
