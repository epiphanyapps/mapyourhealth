import { StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { getAlertStats } from "@/data/helpers"
import { getHazardCategoriesByStatCategory, getRecommendationsForHazards } from "@/data/mock"
import type { ZipCodeData } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

import { ProductRecommendationCard } from "./ProductRecommendationCard"
import { Text } from "./Text"

export interface RecommendationsSectionProps {
  /**
   * The zip code data to analyze for hazards
   */
  zipData: ZipCodeData
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A section component that displays product recommendations based on
 * detected hazards (danger/warning stats) in the zip code data.
 *
 * Only renders if there are matching recommendations for the hazards.
 *
 * @example
 * <RecommendationsSection zipData={zipCodeData} />
 */
export function RecommendationsSection(props: RecommendationsSectionProps) {
  const { zipData, style } = props
  const { theme } = useAppTheme()

  // Get all danger/warning stats
  const alertStats = getAlertStats(zipData)

  if (alertStats.length === 0) {
    return null // No alerts, no recommendations needed
  }

  // Get unique categories from alert stats
  const alertCategories = [
    ...new Set(alertStats.filter((a) => a.definition).map((a) => a.definition.category)),
  ]

  // Get hazard category IDs for these stat categories
  const hazardCategoryIds: string[] = []
  for (const category of alertCategories) {
    const hazards = getHazardCategoriesByStatCategory(category)
    hazardCategoryIds.push(...hazards.map((h) => h.id))
  }

  // Get recommendations for these hazards
  const recommendations = getRecommendationsForHazards(hazardCategoryIds)

  if (recommendations.length === 0) {
    return null // No recommendations for these hazards
  }

  // Limit to first 3 recommendations
  const displayedRecommendations = recommendations.slice(0, 3)

  const $container: ViewStyle = {
    marginTop: 24,
  }

  const $headerText: TextStyle = {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginHorizontal: 16,
    marginBottom: 12,
  }

  const $recommendationsList: ViewStyle = {
    gap: 8,
  }

  return (
    <View style={[$container, style]}>
      <Text style={$headerText}>Recommended for You</Text>
      <View style={$recommendationsList}>
        {displayedRecommendations.map((rec) => (
          <ProductRecommendationCard key={rec.id} recommendation={rec} />
        ))}
      </View>
    </View>
  )
}
