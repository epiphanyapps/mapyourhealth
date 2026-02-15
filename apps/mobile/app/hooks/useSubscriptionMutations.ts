/**
 * Mutation hooks for subscription management via React Query.
 *
 * These provide standalone mutation hooks that can be used outside
 * the SubscriptionsContext if needed (e.g., in onboarding flows).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/queryKeys"
import {
  createZipCodeSubscription,
  deleteZipCodeSubscription,
  CreateSubscriptionOptions,
  ZipCodeSubscription,
} from "@/services/amplify/data"

/**
 * Hook to create a new subscription with optimistic cache update.
 */
export function useCreateSubscription() {
  const qc = useQueryClient()

  return useMutation({
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
      return createZipCodeSubscription(city, state, country, options)
    },
    onMutate: async ({ city, state, country }) => {
      await qc.cancelQueries({ queryKey: queryKeys.subscriptions.list() })
      const previous = qc.getQueryData<ZipCodeSubscription[]>(queryKeys.subscriptions.list())

      // Optimistically add a temporary subscription
      const tempSub: ZipCodeSubscription = {
        id: `temp-${Date.now()}`,
        city,
        state,
        country,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      qc.setQueryData<ZipCodeSubscription[]>(queryKeys.subscriptions.list(), (old) =>
        old ? [...old, tempSub] : [tempSub],
      )
      return { previous }
    },
    onSuccess: (newSub) => {
      // Replace temp subscription with real one
      qc.setQueryData<ZipCodeSubscription[]>(queryKeys.subscriptions.list(), (old) =>
        old ? old.map((s) => (s.id.startsWith("temp-") ? newSub : s)) : [newSub],
      )
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        qc.setQueryData(queryKeys.subscriptions.list(), context.previous)
      }
    },
  })
}

/**
 * Hook to delete a subscription with optimistic cache update.
 */
export function useDeleteSubscription() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteZipCodeSubscription(id)
      return id
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.subscriptions.list() })
      const previous = qc.getQueryData<ZipCodeSubscription[]>(queryKeys.subscriptions.list())
      qc.setQueryData<ZipCodeSubscription[]>(queryKeys.subscriptions.list(), (old) =>
        old ? old.filter((s) => s.id !== id) : [],
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previous) {
        qc.setQueryData(queryKeys.subscriptions.list(), context.previous)
      }
    },
  })
}
