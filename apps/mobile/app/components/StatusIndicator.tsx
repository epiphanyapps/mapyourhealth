import { StyleProp, View, ViewStyle } from "react-native"

import type { StatStatus } from "@/data/types/safety"

/**
 * Color mapping for status levels
 */
const STATUS_COLORS: Record<StatStatus, string> = {
  danger: "#DC2626",
  warning: "#F59E0B",
  safe: "#10B981",
}

/**
 * Size presets for the indicator
 */
type IndicatorSize = "small" | "medium" | "large"

const SIZE_DIMENSIONS: Record<IndicatorSize, number> = {
  small: 8,
  medium: 12,
  large: 16,
}

export interface StatusIndicatorProps {
  /**
   * The safety status to display
   */
  status: StatStatus
  /**
   * Size of the indicator
   * @default "medium"
   */
  size?: IndicatorSize
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A visual indicator for safety status levels.
 * Displays a colored circle: red for danger, yellow for warning, green for safe.
 *
 * @example
 * <StatusIndicator status="danger" size="large" />
 */
export function StatusIndicator(props: StatusIndicatorProps) {
  const { status, size = "medium", style } = props

  const dimension = SIZE_DIMENSIONS[size]
  const backgroundColor = STATUS_COLORS[status]

  const $indicatorStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    backgroundColor,
  }

  return <View style={[$indicatorStyle, style]} accessibilityLabel={`Status: ${status}`} />
}
