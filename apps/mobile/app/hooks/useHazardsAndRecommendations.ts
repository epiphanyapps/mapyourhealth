/**
 * useHazardsAndRecommendations Hook
 *
 * Fetches hazard categories and product recommendations from the Amplify backend.
 * Falls back to hardcoded mock data if the API fails or returns empty results.
 */

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  allHazardCategories as mockHazardCategories,
  allRecommendations as mockRecommendations,
} from "@/data/mock"
import type { HazardCategory, ProductRecommendation } from "@/data/types/safety"
import { queryKeys } from "@/lib/queryKeys"
import {
  getHazardCategories,
  getProductRecommendations,
  AmplifyHazardCategory,
  AmplifyProductRecommendation,
} from "@/services/amplify/data"

function mapAmplifyHazardCategory(amplify: AmplifyHazardCategory): HazardCategory {
  return {
    id: amplify.hazardId,
    name: amplify.name,
    description: amplify.description,
    relatedCategories: (amplify.relatedCategories ?? []) as HazardCategory["relatedCategories"],
  }
}

function mapAmplifyProductRecommendation(
  amplify: AmplifyProductRecommendation,
): ProductRecommendation {
  return {
    id: amplify.recommendationId,
    name: amplify.name,
    description: amplify.description,
    url: amplify.url,
    hazardCategoryIds: (amplify.hazardCategoryIds ?? []) as string[],
  }
}

async function fetchHazardCategoriesWithFallback(): Promise<{
  hazards: HazardCategory[]
  isMock: boolean
}> {
  try {
    const amplifyHazards = await getHazardCategories()
    if (amplifyHazards.length > 0) {
      const mapped = amplifyHazards
        .filter((h) => h.isActive !== false)
        .map(mapAmplifyHazardCategory)
      return { hazards: mapped, isMock: false }
    }
  } catch (err) {
    console.error("Failed to fetch hazard categories:", err)
  }
  return { hazards: mockHazardCategories, isMock: true }
}

async function fetchProductRecommendationsWithFallback(): Promise<{
  recommendations: ProductRecommendation[]
  isMock: boolean
}> {
  try {
    const amplifyRecs = await getProductRecommendations()
    if (amplifyRecs.length > 0) {
      const mapped = amplifyRecs
        .filter((r) => r.isActive !== false)
        .map(mapAmplifyProductRecommendation)
      return { recommendations: mapped, isMock: false }
    }
  } catch (err) {
    console.error("Failed to fetch product recommendations:", err)
  }
  return { recommendations: mockRecommendations, isMock: true }
}

export function useHazardsAndRecommendations() {
  const { data: hazardsResult } = useQuery({
    queryKey: queryKeys.hazardCategories.list(),
    queryFn: fetchHazardCategoriesWithFallback,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const { data: recsResult } = useQuery({
    queryKey: queryKeys.productRecommendations.list(),
    queryFn: fetchProductRecommendationsWithFallback,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const hazardCategories = useMemo(
    () => hazardsResult?.hazards ?? mockHazardCategories,
    [hazardsResult],
  )
  const recommendations = useMemo(
    () => recsResult?.recommendations ?? mockRecommendations,
    [recsResult],
  )

  const getHazardCategoriesByStatCategory = useMemo(() => {
    return (category: string): HazardCategory[] => {
      return hazardCategories.filter((h) =>
        h.relatedCategories.includes(category as HazardCategory["relatedCategories"][number]),
      )
    }
  }, [hazardCategories])

  const getRecommendationsForHazards = useMemo(() => {
    return (hazardCategoryIds: string[]): ProductRecommendation[] => {
      const seen = new Set<string>()
      const results: ProductRecommendation[] = []
      for (const rec of recommendations) {
        if (seen.has(rec.id)) continue
        if (rec.hazardCategoryIds.some((id) => hazardCategoryIds.includes(id))) {
          seen.add(rec.id)
          results.push(rec)
        }
      }
      return results
    }
  }, [recommendations])

  return {
    hazardCategories,
    recommendations,
    getHazardCategoriesByStatCategory,
    getRecommendationsForHazards,
  }
}
