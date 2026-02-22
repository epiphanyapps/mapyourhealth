import { MaterialCommunityIcons } from "@expo/vector-icons"

import { useCategories } from "@/context/CategoriesContext"
import type { StatCategory } from "@/data/types/safety"

/**
 * Fallback icon mapping for each safety category
 * Used when dynamic categories are not available
 */
const FALLBACK_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  water: "water",
  air: "weather-cloudy",
  health: "heart",
  disaster: "fire",
}

/**
 * Fallback colors for each category
 * Used when dynamic categories are not available
 */
export const CATEGORY_COLORS: Record<string, string> = {
  water: "#3B82F6", // blue
  air: "#8B5CF6", // purple
  health: "#EF4444", // red
  disaster: "#F97316", // orange
}

export interface CategoryIconProps {
  /**
   * The category ID to display (e.g., "water", "air")
   * Supports both StatCategory enum values and string category IDs
   */
  category: StatCategory | string
  /**
   * Size of the icon
   * @default 24
   */
  size?: number
  /**
   * Color of the icon. If not provided, uses the category's color from backend or fallback.
   */
  color?: string
}

/**
 * A component that displays an icon for a category.
 * Uses MaterialCommunityIcons from @expo/vector-icons.
 *
 * Supports dynamic categories from the backend while maintaining
 * backward compatibility with hardcoded StatCategory enum values.
 *
 * @example
 * <CategoryIcon category="water" size={32} />
 * <CategoryIcon category={StatCategory.health} color="#FF0000" />
 */
export function CategoryIcon(props: CategoryIconProps) {
  const { category, size = 24, color } = props

  // Get category ID as string (handles both enum and string)
  const categoryId = String(category)

  // Try to get icon/color from context (dynamic categories)
  const { getCategoryIcon, getCategoryColor } = useCategories()
  const dynamicIcon = getCategoryIcon(categoryId)
  const dynamicColor = getCategoryColor(categoryId)

  // Use dynamic values if available, otherwise fallback to hardcoded values
  const iconName =
    dynamicIcon !== "help-circle"
      ? (dynamicIcon as keyof typeof MaterialCommunityIcons.glyphMap)
      : (FALLBACK_ICONS[categoryId] ?? "help-circle")

  const iconColor =
    color ?? (dynamicColor !== "#6B7280" ? dynamicColor : CATEGORY_COLORS[categoryId]) ?? "#6B7280"

  return (
    <MaterialCommunityIcons
      name={iconName}
      size={size}
      color={iconColor}
      accessibilityLabel={`${categoryId} category`}
    />
  )
}

/**
 * Hook to get category icon and color without rendering
 * Useful for components that need these values for styling
 */
export function useCategoryIconProps(categoryId: string): {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  color: string
} {
  const { getCategoryIcon, getCategoryColor } = useCategories()
  const dynamicIcon = getCategoryIcon(categoryId)
  const dynamicColor = getCategoryColor(categoryId)

  const icon =
    dynamicIcon !== "help-circle"
      ? (dynamicIcon as keyof typeof MaterialCommunityIcons.glyphMap)
      : (FALLBACK_ICONS[categoryId] ??
        ("help-circle" as keyof typeof MaterialCommunityIcons.glyphMap))

  const color =
    dynamicColor !== "#6B7280" ? dynamicColor : (CATEGORY_COLORS[categoryId] ?? "#6B7280")

  return { icon, color }
}
