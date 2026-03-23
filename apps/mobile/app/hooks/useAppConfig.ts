/**
 * useAppConfig Hook
 *
 * Fetches a specific app configuration value from the AppConfig table.
 * Used for feature flags and gate toggles (e.g., Coming Soon gate).
 */

import { useQuery } from "@tanstack/react-query"

import { getAppConfig } from "@/services/amplify/data"

interface UseAppConfigResult {
  isEnabled: boolean
  value: string | null
  isLoading: boolean
  error: string | null
}

export function useAppConfig(configKey: string): UseAppConfigResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["appConfig", configKey],
    queryFn: () => getAppConfig(configKey),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  })

  return {
    isEnabled: data?.isEnabled ?? false,
    value: data?.value ?? null,
    isLoading,
    error: error ? "Failed to load app config" : null,
  }
}
