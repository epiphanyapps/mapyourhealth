import { Linking, Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import type { ProductRecommendation } from "@/data/types/safety"

import { Text } from "./Text"

/**
 * Green color for recommendation cards
 */
const RECOMMENDATION_GREEN = "#10B981"
const RECOMMENDATION_BG = "#D1FAE5"

export interface ProductRecommendationCardProps {
  /**
   * The product recommendation to display
   */
  recommendation: ProductRecommendation
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A card component that displays a product recommendation.
 * Green themed with a heart icon and "We Recommend" header.
 * Learn More button opens the product URL in the browser.
 *
 * @example
 * <ProductRecommendationCard recommendation={waterFilter} />
 */
export function ProductRecommendationCard(props: ProductRecommendationCardProps) {
  const { recommendation, style } = props

  const handleLearnMore = () => {
    Linking.openURL(recommendation.url)
  }

  const $container: ViewStyle = {
    backgroundColor: RECOMMENDATION_BG,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
  }

  const $headerRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  }

  const $icon: ViewStyle = {
    marginRight: 8,
  }

  const $headerText: TextStyle = {
    fontSize: 12,
    fontWeight: "600",
    color: RECOMMENDATION_GREEN,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  }

  const $productName: TextStyle = {
    fontSize: 18,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 4,
  }

  const $description: TextStyle = {
    fontSize: 14,
    color: "#047857",
    lineHeight: 20,
    marginBottom: 12,
  }

  const $button: ViewStyle = {
    backgroundColor: RECOMMENDATION_GREEN,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  }

  const $buttonText: TextStyle = {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  }

  return (
    <View style={[$container, style]}>
      <View style={$headerRow}>
        <MaterialCommunityIcons name="heart" size={18} color={RECOMMENDATION_GREEN} style={$icon} />
        <Text style={$headerText}>We Recommend</Text>
      </View>

      <Text style={$productName}>{recommendation.name}</Text>
      <Text style={$description}>{recommendation.description}</Text>

      <Pressable
        onPress={handleLearnMore}
        style={({ pressed }) => [$button, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={`Learn more about ${recommendation.name}`}
      >
        <Text style={$buttonText}>Learn More</Text>
      </Pressable>
    </View>
  )
}
