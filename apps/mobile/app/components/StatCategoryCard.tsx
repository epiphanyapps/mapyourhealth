import { Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native"

import { useCategories } from "@/context/CategoriesContext"
import type { StatCategory, StatStatus } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

import { CategoryIcon } from "./CategoryIcon"
import { StatusIndicator } from "./StatusIndicator"
import { Text } from "./Text"

export interface StatCategoryCardProps {
  /**
   * The safety category to display (supports both StatCategory enum and string)
   */
  category: StatCategory | string
  /**
   * The display name for the category
   */
  categoryName: string
  /**
   * The overall status for this category
   */
  status: StatStatus
  /**
   * Callback when the card is pressed
   */
  onPress?: () => void
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
}

/**
 * Fallback category names mapping for display when dynamic categories are not available
 */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  water: "Tap Water Quality",
  air: "Air Pollution",
  health: "Pathogens",
  disaster: "Disaster Risk",
}

/**
 * Hook to get category display name from dynamic categories or fallback
 */
export function useCategoryDisplayName(categoryId: string): string {
  const { getCategoryName } = useCategories()
  const dynamicName = getCategoryName(categoryId)

  // If dynamic name is just the categoryId (not found), use fallback
  if (dynamicName === categoryId) {
    return CATEGORY_DISPLAY_NAMES[categoryId] ?? categoryId
  }
  return dynamicName
}

/**
 * A card component that displays a safety category with its status.
 * Shows the category icon on the left, name in the center, and status indicator on the right.
 *
 * @example
 * <StatCategoryCard
 *   category={StatCategory.water}
 *   categoryName="Water Quality"
 *   status="safe"
 *   onPress={() => navigation.navigate("CategoryDetails", { category: "water" })}
 * />
 */
export function StatCategoryCard(props: StatCategoryCardProps) {
  const { category, categoryName, status, onPress, style } = props
  const { theme } = useAppTheme()

  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: theme.colors.palette.neutral800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  }

  const $iconContainer: ViewStyle = {
    marginRight: 12,
  }

  const $textContainer: ViewStyle = {
    flex: 1,
  }

  const $categoryName: TextStyle = {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  }

  const $statusContainer: ViewStyle = {
    marginLeft: 12,
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [$container, pressed && { opacity: 0.8 }, style]}
      accessibilityRole="button"
      accessibilityLabel={`${categoryName}, status: ${status}`}
    >
      <View style={$iconContainer}>
        <CategoryIcon category={category} size={28} />
      </View>
      <View style={$textContainer}>
        <Text style={$categoryName}>{categoryName}</Text>
      </View>
      <View style={$statusContainer}>
        <StatusIndicator status={status} size="medium" />
      </View>
    </Pressable>
  )
}
