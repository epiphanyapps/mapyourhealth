/**
 * NotificationContext
 *
 * Provides in-app notification display functionality.
 * Shows a banner when notifications arrive while the app is in foreground.
 * Automatically sets up the foreground notification listener.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  FC,
  PropsWithChildren,
} from "react"

import { NotificationBanner } from "@/components/NotificationBanner"
import { navigate } from "@/navigators/navigationUtilities"
import { addNotificationReceivedListener } from "@/services/notifications"

/**
 * Notification data for display
 */
export interface InAppNotification {
  id: string
  title: string
  body: string
  data?: {
    screen?: string
    postalCode?: string
    contaminantId?: string
  }
}

/**
 * Context type
 */
interface NotificationContextType {
  showNotification: (notification: InAppNotification) => void
  dismissNotification: () => void
  currentNotification: InAppNotification | null
}

const NotificationContext = createContext<NotificationContextType | null>(null)

/**
 * NotificationProvider
 *
 * Wrap your app with this provider to enable in-app notification display.
 * Automatically listens for foreground notifications and displays them.
 */
export const NotificationProvider: FC<PropsWithChildren> = ({ children }) => {
  const [notification, setNotification] = useState<InAppNotification | null>(null)
  const listenerRef = useRef<ReturnType<typeof addNotificationReceivedListener> | null>(null)

  /**
   * Show an in-app notification banner
   */
  const showNotification = useCallback((notif: InAppNotification) => {
    // If there's already a notification showing, replace it
    setNotification(notif)
  }, [])

  /**
   * Set up foreground notification listener
   * This fires when a notification arrives while the app is in the foreground
   */
  useEffect(() => {
    listenerRef.current = addNotificationReceivedListener((notificationEvent) => {
      const { title, body, data } = notificationEvent.request.content

      console.log("Foreground notification received:", { title, body, data })

      showNotification({
        id: notificationEvent.request.identifier,
        title: title ?? "MapYourHealth",
        body: body ?? "",
        data: data as InAppNotification["data"],
      })
    })

    return () => {
      if (listenerRef.current) {
        listenerRef.current.remove()
      }
    }
  }, [showNotification])

  /**
   * Dismiss the current notification
   */
  const dismissNotification = useCallback(() => {
    setNotification(null)
  }, [])

  /**
   * Handle banner press - navigate to relevant screen
   */
  const handleBannerPress = useCallback(() => {
    if (!notification?.data) {
      setNotification(null)
      return
    }

    const { postalCode, screen } = notification.data

    // Navigate based on notification data (same logic as AuthContext)
    if (postalCode) {
      navigate("Dashboard", { zipCode: postalCode })
    } else if (screen === "Dashboard") {
      navigate("Dashboard", undefined)
    }

    setNotification(null)
  }, [notification])

  /**
   * Handle banner dismiss
   */
  const handleBannerDismiss = useCallback(() => {
    setNotification(null)
  }, [])

  const value = {
    showNotification,
    dismissNotification,
    currentNotification: notification,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification && (
        <NotificationBanner
          title={notification.title}
          body={notification.body}
          onPress={handleBannerPress}
          onDismiss={handleBannerDismiss}
          autoDismissMs={5000}
        />
      )}
    </NotificationContext.Provider>
  )
}

/**
 * Hook to access notification context
 */
export const useInAppNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useInAppNotifications must be used within a NotificationProvider")
  }
  return context
}
