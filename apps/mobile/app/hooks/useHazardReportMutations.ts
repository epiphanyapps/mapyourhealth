/**
 * Mutation hooks for hazard report management via React Query.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/queryKeys"
import {
  createHazardReport,
  AmplifyHazardReport,
} from "@/services/amplify/data"

interface CreateHazardReportInput {
  category: "water" | "air" | "health" | "disaster"
  description: string
  location: string
  city?: string
  state?: string
  country?: string
}

/**
 * Hook to create a new hazard report with cache update.
 */
export function useCreateHazardReport() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateHazardReportInput) => {
      return createHazardReport(input)
    },
    onSuccess: (newReport) => {
      qc.setQueryData<AmplifyHazardReport[]>(queryKeys.hazardReports.list(), (old) =>
        old ? [...old, newReport] : [newReport],
      )
    },
  })
}
