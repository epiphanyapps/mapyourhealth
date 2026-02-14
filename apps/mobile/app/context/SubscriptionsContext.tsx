/**
 * SubscriptionsContext - Manages user's zip code subscriptions.
 *
 * Uses React Query for data fetching and caching.
 * Provides access to the primary subscription (first by createdAt) for
 * showing the default zip code on the dashboard.
 */

import { createContext, FC, PropsWithChildren, useCallback, useContext } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/queryKeys"
import {
  getUserZipCodeSubscriptions,
  ZipCodeSubscription,
  createZipCodeSubscription,
  deleteZipCodeSubscription,
  CreateSubscriptionOptions,
} from "@/services/amplify/data"

import { useAuth } from "./AuthContext"

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
  /** Add a new subscription (city-level) */
  addSubscription: (
    city: string,
    state: string,
    country: string,
    options?: CreateSubscriptionOptions,
  ) => Promise<void>
  /** Remove a subscription by ID */
  removeSubscription: (id: string) => Promise<void>
}

const SubscriptionsContext = createContext<SubscriptionsContextType | null>(null)

export const SubscriptionsProvider: FC<PropsWithChildren> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const queryClientInstance = useQueryClient()

  // Fetch subscriptions with React Query
  const {
    data: subscriptions = [],
    isLoading: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.subscriptions.list(),
    queryFn: async () => {
      const subs = await getUserZipCodeSubscriptions()
      // Sort by createdAt to ensure consistent primary subscription
      return subs.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateA - dateB // Oldest first
      })
    },
    enabled: !authLoading && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = authLoading || (isAuthenticated && queryLoading)
  const error = queryError ? "Failed to load subscriptions" : null

  // Add subscription mutation
  const addMutation = useMutation({
    mutationFn: async ({
      city,
      state,
      country,
      options,
    }: {
      city: string
      state: string
      country: string
      options?: CreateSubscriptionOptions
    }) => {
      if (!isAuthenticated) {
        throw new Error("Must be authenticated to add subscription")
      }
      return createZipCodeSubscription(city, state, country, options)
    },
    onSuccess: (newSub) => {
      // Optimistically update cache
      queryClientInstance.setQueryData<ZipCodeSubscription[]>(
        queryKeys.subscriptions.list(),
        (old) => (old ? [...old, newSub] : [newSub]),
      )
    },
  })

  // Remove subscription mutation
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isAuthenticated) {
        throw new Error("Must be authenticated to remove subscription")
      }
      await deleteZipCodeSubscription(id)
      return id
    },
    onSuccess: (id) => {
      // Optimistically update cache
      queryClientInstance.setQueryData<ZipCodeSubscription[]>(
        queryKeys.subscriptions.list(),
        (old) => (old ? old.filter((s) => s.id !== id) : []),
      )
    },
  })

  const primarySubscription = subscriptions.length > 0 ? subscriptions[0] : null

  const refresh = useCallback(async () => {
    await queryClientInstance.invalidateQueries({ queryKey: queryKeys.subscriptions.list() })
  }, [queryClientInstance])

  const addSubscription = useCallback(
    async (city: string, state: string, country: string, options?: CreateSubscriptionOptions) => {
      await addMutation.mutateAsync({ city, state, country, options })
    },
    [addMutation],
  )

  const removeSubscription = useCallback(
    async (id: string) => {
      await removeMutation.mutateAsync(id)
    },
    [removeMutation],
  )

  const value: SubscriptionsContextType = {
    subscriptions,
    primarySubscription,
    isLoading,
    error,
    refresh,
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
