import { MaterialCommunityIcons } from "@expo/vector-icons"
import type { StatCategory } from "@/data/types/safety"

/**
 * Icon mapping for each safety category
 */
const CATEGORY_ICONS: Record<StatCategory, keyof typeof MaterialCommunityIcons.glyphMap> = {
  water: "water",
  air: "weather-cloudy",
  health: "heart",
  disaster: "fire",
}

/**
 * Default colors for each category (optional usage)
 */
export const CATEGORY_COLORS: Record<StatCategory, string> = {
  water: "#3B82F6", // blue
  air: "#8B5CF6", // purple
  health: "#EF4444", // red
  disaster: "#F97316", // orange
}

export interface CategoryIconProps {
  /**
   * The safety category to display
   */
  category: StatCategory
  /**
   * Size of the icon
   * @default 24
   */
  size?: number
  /**
   * Color of the icon. If not provided, uses the default category color.
   */
  color?: string
}

/**
 * A component that displays an icon for a safety category.
 * Uses MaterialCommunityIcons from @expo/vector-icons.
 *
 * @example
 * <CategoryIcon category={StatCategory.water} size={32} />
 * <CategoryIcon category={StatCategory.health} color="#FF0000" />
 */
export function CategoryIcon(props: CategoryIconProps) {
  const { category, size = 24, color } = props

  const iconName = CATEGORY_ICONS[category]
  const iconColor = color ?? CATEGORY_COLORS[category]

  return (
    <MaterialCommunityIcons
      name={iconName}
      size={size}
      color={iconColor}
      accessibilityLabel={`${category} category`}
    />
  )
}
