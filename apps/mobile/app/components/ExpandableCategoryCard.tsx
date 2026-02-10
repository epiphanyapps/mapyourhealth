import { useState, useRef } from "react"
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  UIManager,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { CATEGORY_CONFIG, SubCategory } from "@/data/categoryConfig"
import type { StatCategory, StatStatus } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

import { CategoryIcon } from "./CategoryIcon"
import { StatusIndicator } from "./StatusIndicator"
import { Text } from "./Text"

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export interface ExpandableCategoryCardProps {
  /**
   * The safety category to display
   */
  category: StatCategory
  /**
   * The display name for the category
   */
  categoryName: string
  /**
   * The overall status for this category
   */
  status: StatStatus
  /**
   * Callback when the card (or a sub-category) should navigate to details
   */
  onPress: (subCategoryId?: string) => void
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
}

/**
 * An expandable category card that shows sub-categories when expanded.
 * Categories without sub-categories behave like a regular pressable card.
 *
 * For categories with sub-categories:
 * - Tapping the card expands/collapses to show sub-categories
 * - Tapping a sub-category navigates to the category detail with that sub-category focused
 *
 * @example
 * <ExpandableCategoryCard
 *   category={StatCategory.air}
 *   categoryName="Air Pollution"
 *   status="warning"
 *   onPress={(subCategoryId) => navigation.navigate("CategoryDetail", { category: "air", subCategoryId })}
 * />
 */
export function ExpandableCategoryCard(props: ExpandableCategoryCardProps) {
  const { category, categoryName, status, onPress, style } = props
  const { theme } = useAppTheme()

  const categoryConfig = CATEGORY_CONFIG[category]
  const subCategories = categoryConfig.subCategories || []
  const hasSubCategories = subCategories.length > 0

  const [expanded, setExpanded] = useState(false)
  const rotateAnim = useRef(new Animated.Value(0)).current

  const toggleExpand = () => {
    const newExpanded = !expanded

    // Animate chevron rotation
    Animated.timing(rotateAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()

    // Animate content expand/collapse
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)

    setExpanded(newExpanded)
  }

  const handlePress = () => {
    if (hasSubCategories) {
      toggleExpand()
    } else {
      onPress()
    }
  }

  const handleSubCategoryPress = (subCategory: SubCategory) => {
    onPress(subCategory.id)
  }

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  })

  const $container: ViewStyle = {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: theme.colors.palette.neutral800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  }

  const $mainRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  }

  const $iconContainer: ViewStyle = {
    marginRight: 12,
  }

  const $textContainer: ViewStyle = {
    flex: 1,
  }

  const $categoryNameText: TextStyle = {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  }

  const $statusContainer: ViewStyle = {
    marginLeft: 12,
  }

  const $chevronContainer: ViewStyle = {
    marginLeft: 8,
  }

  const $subCategoriesContainer: ViewStyle = {
    paddingBottom: 8,
  }

  const $subCategoryRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 56, // Indent: icon (28) + iconMarginRight (12) + extra indent (16)
    paddingRight: 16,
  }

  const $subCategoryText: TextStyle = {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  }

  const $subCategoryChevron: ViewStyle = {
    marginLeft: 8,
  }

  const $divider: ViewStyle = {
    height: 1,
    backgroundColor: theme.colors.separator,
    marginHorizontal: 16,
  }

  return (
    <View style={[$container, style]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [$mainRow, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={`${categoryName}, status: ${status}${hasSubCategories ? ", expandable" : ""}`}
        accessibilityState={hasSubCategories ? { expanded } : undefined}
      >
        <View style={$iconContainer}>
          <CategoryIcon category={category} size={28} />
        </View>
        <View style={$textContainer}>
          <Text style={$categoryNameText}>{categoryName}</Text>
        </View>
        <View style={$statusContainer}>
          <StatusIndicator status={status} size="medium" />
        </View>
        {hasSubCategories && (
          <Animated.View style={[$chevronContainer, { transform: [{ rotate: chevronRotation }] }]}>
            <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.textDim} />
          </Animated.View>
        )}
      </Pressable>

      {expanded && hasSubCategories && (
        <View style={$subCategoriesContainer}>
          <View style={$divider} />
          {subCategories.map((subCategory) => (
            <Pressable
              key={subCategory.id}
              onPress={() => handleSubCategoryPress(subCategory)}
              style={({ pressed }) => [
                $subCategoryRow,
                pressed && { backgroundColor: theme.colors.palette.neutral100 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${subCategory.name} sub-category`}
            >
              <Text style={$subCategoryText}>{subCategory.name}</Text>
              <View style={$subCategoryChevron}>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.textDim}
                />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
