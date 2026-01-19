/**
 * SubscriptionsContext - Manages user's zip code subscriptions.
 *
 * This context fetches and caches the user's subscriptions when authenticated.
 * It provides access to the primary subscription (first by createdAt) for
 * showing the default zip code on the dashboard.
 */

import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import { useAuth } from "./AuthContext"
import {
  getUserZipCodeSubscriptions,
  ZipCodeSubscription,
  createZipCodeSubscription,
  deleteZipCodeSubscription,
  CreateSubscriptionOptions,
} from "@/services/amplify/data"

interface SubscriptionsContextType {
  /** All user subscriptions */
  subscriptions: ZipCodeSubscription[]
  /** The primary subscription (first by createdAt) */
  primarySubscription: ZipCodeSubscription | null
  /** Whether subscriptions are still loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Refresh subscriptions from the backend */
  refresh: () => Promise<void>
  /** Add a new subscription */
  addSubscription: (
    zipCode: string,
    cityName?: string,
    state?: string,
    options?: CreateSubscriptionOptions,
  ) => Promise<void>
  /** Remove a subscription by ID */
  removeSubscription: (id: string) => Promise<void>
}

const SubscriptionsContext = createContext<SubscriptionsContextType | null>(null)

export const SubscriptionsProvider: FC<PropsWithChildren> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [subscriptions, setSubscriptions] = useState<ZipCodeSubscription[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch subscriptions from the backend
   */
  const fetchSubscriptions = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscriptions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const subs = await getUserZipCodeSubscriptions()
      // Sort by createdAt to ensure consistent primary subscription
      const sorted = subs.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateA - dateB // Oldest first
      })
      setSubscriptions(sorted)
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err)
      setError("Failed to load subscriptions")
      setSubscriptions([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Fetch subscriptions when auth state changes
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSubscriptions()
    } else if (!authLoading && !isAuthenticated) {
      // Clear subscriptions on logout
      setSubscriptions([])
    }
  }, [isAuthenticated, authLoading, fetchSubscriptions])

  /**
   * Get the primary subscription (first by createdAt)
   */
  const primarySubscription = subscriptions.length > 0 ? subscriptions[0] : null

  /**
   * Add a new subscription
   */
  const addSubscription = useCallback(
    async (
      zipCode: string,
      cityName?: string,
      state?: string,
      options?: CreateSubscriptionOptions,
    ) => {
      if (!isAuthenticated) {
        throw new Error("Must be authenticated to add subscription")
      }

      try {
        const newSub = await createZipCodeSubscription(zipCode, cityName, state, options)
        setSubscriptions((prev) => [...prev, newSub])
      } catch (err) {
        console.error("Failed to add subscription:", err)
        throw err
      }
    },
    [isAuthenticated],
  )

  /**
   * Remove a subscription by ID
   */
  const removeSubscription = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        throw new Error("Must be authenticated to remove subscription")
      }

      try {
        await deleteZipCodeSubscription(id)
        setSubscriptions((prev) => prev.filter((s) => s.id !== id))
      } catch (err) {
        console.error("Failed to remove subscription:", err)
        throw err
      }
    },
    [isAuthenticated],
  )

  const value: SubscriptionsContextType = {
    subscriptions,
    primarySubscription,
    isLoading,
    error,
    refresh: fetchSubscriptions,
    addSubscription,
    removeSubscription,
  }

  return <SubscriptionsContext.Provider value={value}>{children}</SubscriptionsContext.Provider>
}

/**
 * Hook to access subscriptions from context
 */
export function useSubscriptions(): SubscriptionsContextType {
  const context = useContext(SubscriptionsContext)
  if (!context) {
    throw new Error("useSubscriptions must be used within a SubscriptionsProvider")
  }
  return context
}
