/**
 * Shared React Query client configuration.
 */

import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes, then refetch in background
      staleTime: 5 * 60 * 1000,
      // Cache unused data for 30 minutes before garbage collection
      gcTime: 30 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't refetch on window focus for mobile
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})
