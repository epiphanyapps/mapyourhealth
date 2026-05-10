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
import { trackEvent } from "@/utils/analytics"

import { CategoryIcon } from "./CategoryIcon"
import { CategoryInfoButton } from "./CategoryInfoButton"
import { StatItem } from "./StatItem"
import { StatusIndicator } from "./StatusIndicator"
import { Text } from "./Text"

const ANIMATION_DURATION = 300
const EASING = Easing.bezier(0.4, 0, 0.2, 1)

/**
 * Result from getSubCategoryStatus callback
 */
export interface SubCategoryStatusResult {
  /** The safety status for the sub-category */
  status: StatStatus
  /** Optional color override (e.g., orange for WHO-only exceedances) */
  color?: string
}

/**
 * A single contaminant row rendered inside an expanded sub-category panel.
 */
export interface SubCategoryStatRow {
  statId: string
  name: string
  value: number
  unit: string
  status: StatStatus
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
   * @deprecated No longer displayed on the main row; kept for accessibility label
   */
  status: StatStatus
  /**
   * Callback when the card (or a sub-category's "View details" link) should
   * navigate to a full detail screen.
   */
  onPress: (subCategoryId?: string) => void
  /**
   * Callback to determine status and color for a sub-category.
   * Returns status and optional color override.
   */
  getSubCategoryStatus?: (subCategoryId: string) => SubCategoryStatusResult
  /**
   * Number of contaminants exceeding thresholds for this category. Used to
   * interpolate the `{count}` placeholder in the info-button description.
   */
  riskCount?: number
  /**
   * Optional callback to provide the contaminant rows shown when a
   * sub-category is expanded inline. If omitted (or returns an empty array)
   * the sub-category panel renders a placeholder line plus a "View details"
   * link.
   */
  getSubCategoryContent?: (subCategoryId: string) => SubCategoryStatRow[]
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
 * - Each sub-category row is itself an accordion: tapping it expands inline
 *   to show the contaminant rows that belong to that sub-category, plus a
 *   "View details" link that calls `onPress(subCategoryId)`.
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
  const {
    category,
    categoryName,
    status,
    onPress,
    getSubCategoryStatus,
    riskCount,
    getSubCategoryContent,
    style,
  } = props
  const { theme } = useAppTheme()
  const { getCategoryById, getSubCategoriesByCategoryId, getCategoryDescription } = useCategories()

  // Get category ID as string (handles both enum and string)
  const categoryId = String(category)
  const categoryData = getCategoryById(categoryId)
  // Resolve the {count} placeholder when we know the risk count for this category;
  // otherwise fall back to the raw template so we don't render "{count}" verbatim
  // for callers that haven't been updated.
  const resolvedDescription =
    riskCount !== undefined
      ? getCategoryDescription(categoryId, { count: riskCount })
      : categoryData?.description

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
  // Tracks the steady "fully open" state. The measured contentHeight is
  // captured once with all sub-category accordions collapsed, so once the
  // open animation completes we switch to height:"auto" so a child accordion
  // expanding (and growing the natural height) is not clipped by the parent's
  // overflow:hidden.
  const fullyOpenShared = useSharedValue(0)

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

    if (!newExpanded) {
      // Closing: drop the steady-open flag immediately so the height
      // interpolation animates from the measured value rather than "auto".
      fullyOpenShared.value = 0
    }

    progress.value = withTiming(
      newExpanded ? 1 : 0,
      { duration: ANIMATION_DURATION, easing: EASING },
      (finished) => {
        if (finished && newExpanded) {
          fullyOpenShared.value = 1
        }
      },
    )

    setExpanded(newExpanded)
  }, [expanded, progress, fullyOpenShared])

  const handlePress = () => {
    if (hasSubCategories) {
      toggleExpand()
    } else {
      onPress()
    }
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

    // Once the open animation has settled, let height grow naturally so a
    // nested sub-category accordion expanding doesn't get clipped.
    if (fullyOpenShared.value === 1) {
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

  const $chevronContainer: ViewStyle = {
    marginLeft: 8,
  }

  const $contentOuter: ViewStyle = {
    overflow: "hidden",
  }

  const $subCategoriesContainer: ViewStyle = {
    paddingBottom: 8,
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
          <SubCategoryAccordion
            key={key}
            subCategoryId={key}
            name={subCategory.name}
            description={"description" in subCategory ? subCategory.description : undefined}
            statusResult={getSubCategoryStatus?.(key)}
            content={getSubCategoryContent?.(key)}
            onViewDetails={() => onPress(key)}
          />
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
        {resolvedDescription && (
          <CategoryInfoButton name={categoryName} description={resolvedDescription} />
        )}
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

interface SubCategoryAccordionProps {
  subCategoryId: string
  name: string
  description?: string
  statusResult?: SubCategoryStatusResult
  /** Contaminant rows to show when expanded. Empty array = placeholder. */
  content?: SubCategoryStatRow[]
  /** Called when the user taps "View details" inside the expanded panel. */
  onViewDetails: () => void
}

/**
 * One sub-category row inside `ExpandableCategoryCard`. Tapping the row
 * toggles an inner accordion that reveals the contaminants belonging to
 * the sub-category plus a "View details" link to the full detail screen.
 *
 * Re-implements the same Reanimated height-measurement pattern used by
 * `ExpandableCard` instead of composing it directly, because the header
 * needs to embed `StatusIndicator` and `CategoryInfoButton` next to the
 * chevron — which the generic `ExpandableCard` doesn't expose.
 */
function SubCategoryAccordion(props: SubCategoryAccordionProps) {
  const { subCategoryId, name, description, statusResult, content, onViewDetails } = props
  const { theme } = useAppTheme()

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

    progress.value = withTiming(newExpanded ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: EASING,
    })

    setExpanded(newExpanded)

    if (newExpanded) {
      trackEvent("SubCategoryExpanded", { subCategoryId })
    }
  }, [expanded, progress, subCategoryId])

  const animatedContentStyle = useAnimatedStyle(() => {
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

  const animatedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${interpolate(progress.value, [0, 1], [0, 90])}deg`,
        },
      ],
    }
  })

  const $row: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 56, // Indent: icon (28) + iconMarginRight (12) + extra indent (16)
    paddingRight: 16,
  }

  const $rowText: TextStyle = {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  }

  const $rowStatusContainer: ViewStyle = {
    marginLeft: 8,
  }

  const $rowChevron: ViewStyle = {
    marginLeft: 8,
  }

  const $contentOuter: ViewStyle = {
    overflow: "hidden",
  }

  const $innerContent: ViewStyle = {
    paddingLeft: 56,
    paddingRight: 16,
    paddingBottom: 12,
  }

  const $emptyText: TextStyle = {
    fontSize: 13,
    color: theme.colors.textDim,
    fontStyle: "italic",
    paddingVertical: 8,
  }

  const $viewDetailsRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  }

  const $viewDetailsText: TextStyle = {
    fontSize: 14,
    color: theme.colors.tint,
    fontWeight: "500",
  }

  const $viewDetailsChevron: ViewStyle = {
    marginLeft: 4,
  }

  const $measureContainer: ViewStyle = {
    position: "absolute",
    opacity: 0,
    pointerEvents: "none",
  }

  const renderInnerContent = () => (
    <View style={$innerContent}>
      {content && content.length > 0 ? (
        content.map((row) => (
          <StatItem
            key={row.statId}
            name={row.name}
            value={row.value}
            unit={row.unit}
            status={row.status}
          />
        ))
      ) : (
        <Text style={$emptyText}>No measurements for this sub-category at this location.</Text>
      )}
      <Pressable
        onPress={onViewDetails}
        style={({ pressed }) => [$viewDetailsRow, pressed && { opacity: 0.6 }]}
        accessibilityRole="link"
        accessibilityLabel={`View details for ${name}`}
      >
        <Text style={$viewDetailsText}>View details</Text>
        <View style={$viewDetailsChevron}>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.tint} />
        </View>
      </Pressable>
    </View>
  )

  return (
    <View>
      <Pressable
        onPress={toggleExpand}
        style={({ pressed }) => [
          $row,
          pressed && { backgroundColor: theme.colors.palette.neutral100 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${name} sub-category${statusResult ? `, status: ${statusResult.status}` : ""}`}
        accessibilityState={{ expanded }}
      >
        <Text style={$rowText}>{name}</Text>
        {description && <CategoryInfoButton name={name} description={description} />}
        {statusResult && (
          <View style={$rowStatusContainer}>
            <StatusIndicator status={statusResult.status} size="small" color={statusResult.color} />
          </View>
        )}
        <Animated.View style={[$rowChevron, animatedChevronStyle]}>
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textDim} />
        </Animated.View>
      </Pressable>

      {/* Hidden measurement view - renders once to get height */}
      {!measured && (
        <View style={$measureContainer}>
          <View onLayout={onContentLayout}>{renderInnerContent()}</View>
        </View>
      )}

      <Animated.View style={[$contentOuter, animatedContentStyle]}>
        {renderInnerContent()}
      </Animated.View>
    </View>
  )
}
