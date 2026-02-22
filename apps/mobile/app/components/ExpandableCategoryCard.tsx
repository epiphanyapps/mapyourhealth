import { useCallback, useState } from "react"
import { LayoutChangeEvent, Pressable, View, ViewStyle, TextStyle, StyleProp } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from "react-native-reanimated"

import { useCategories } from "@/context/CategoriesContext"
import { CATEGORY_CONFIG, SubCategory as LegacySubCategory } from "@/data/categoryConfig"
import type { StatCategory, StatStatus, SubCategory } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

import { CategoryIcon } from "./CategoryIcon"
import { StatusIndicator } from "./StatusIndicator"
import { Text } from "./Text"

const ANIMATION_DURATION = 300
const EASING = Easing.bezier(0.4, 0, 0.2, 1)

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
 * An expandable category card with smooth Reanimated accordion animation.
 * Categories without sub-categories behave like a regular pressable card.
 *
 * For categories with sub-categories:
 * - Tapping the card expands/collapses to show sub-categories with animation
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
  const { getSubCategoriesByCategoryId } = useCategories()

  // Get category ID as string (handles both enum and string)
  const categoryId = String(category)

  // Try dynamic sub-categories first, fallback to legacy config
  const dynamicSubCategories = getSubCategoriesByCategoryId(categoryId)
  const legacyConfig = CATEGORY_CONFIG[category as StatCategory]
  const legacySubCategories: LegacySubCategory[] = legacyConfig?.subCategories || []

  // Use dynamic if available, otherwise fallback to legacy
  const subCategories: Array<SubCategory | LegacySubCategory> =
    dynamicSubCategories.length > 0 ? dynamicSubCategories : legacySubCategories
  const hasSubCategories = subCategories.length > 0

  const [expanded, setExpanded] = useState(false)
  const [measured, setMeasured] = useState(false)
  const contentHeight = useSharedValue(0)
  const progress = useSharedValue(0)

  const handleMeasured = useCallback(() => {
    setMeasured(true)
  }, [])

  const onContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height
      if (height > 0 && contentHeight.value === 0) {
        contentHeight.value = height
        runOnJS(handleMeasured)()
      }
    },
    [contentHeight, handleMeasured],
  )

  const toggleExpand = useCallback(() => {
    const newExpanded = !expanded

    // Animate
    progress.value = withTiming(newExpanded ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: EASING,
    })

    setExpanded(newExpanded)
  }, [expanded, progress])

  const handlePress = () => {
    if (hasSubCategories) {
      toggleExpand()
    } else {
      onPress()
    }
  }

  const handleSubCategoryPress = (subCategory: SubCategory | LegacySubCategory) => {
    // Handle both dynamic SubCategory (subCategoryId) and legacy SubCategory (id)
    const subCategoryId =
      "subCategoryId" in subCategory ? subCategory.subCategoryId : subCategory.id
    onPress(subCategoryId)
  }

  // Animated style for content container
  const animatedContentStyle = useAnimatedStyle(() => {
    // Before measurement, use auto height for initial render
    if (contentHeight.value === 0) {
      return {
        height: "auto" as unknown as number,
        opacity: 1,
      }
    }

    const height = interpolate(progress.value, [0, 1], [0, contentHeight.value])

    return {
      height,
      opacity: interpolate(progress.value, [0, 0.3, 1], [0, 0.8, 1]),
    }
  })

  // Animated style for chevron rotation (right → down)
  const animatedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${interpolate(progress.value, [0, 1], [0, 90])}deg`,
        },
      ],
    }
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

  const $contentOuter: ViewStyle = {
    overflow: "hidden",
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

  // For initial measurement
  const $measureContainer: ViewStyle = {
    position: "absolute",
    opacity: 0,
    pointerEvents: "none",
  }

  const renderSubCategories = () => (
    <View style={$subCategoriesContainer}>
      <View style={$divider} />
      {subCategories.map((subCategory) => {
        // Handle both dynamic SubCategory (subCategoryId) and legacy SubCategory (id)
        const key = "subCategoryId" in subCategory ? subCategory.subCategoryId : subCategory.id
        return (
          <Pressable
            key={key}
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
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textDim} />
            </View>
          </Pressable>
        )
      })}
    </View>
  )

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
        {hasSubCategories ? (
          <Animated.View style={[$chevronContainer, animatedChevronStyle]}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textDim} />
          </Animated.View>
        ) : (
          <View style={$chevronContainer}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textDim} />
          </View>
        )}
      </Pressable>

      {hasSubCategories && (
        <>
          {/* Hidden measurement view - renders once to get height */}
          {!measured && (
            <View style={$measureContainer}>
              <View onLayout={onContentLayout}>{renderSubCategories()}</View>
            </View>
          )}

          {/* Animated content wrapper */}
          <Animated.View style={[$contentOuter, animatedContentStyle]}>
            {renderSubCategories()}
          </Animated.View>
        </>
      )}
    </View>
  )
}
