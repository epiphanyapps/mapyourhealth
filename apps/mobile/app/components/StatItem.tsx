import { View, ViewStyle, TextStyle, StyleProp, Pressable } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import type { StatStatus, StatHistoryEntry } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

import { StatusIndicator } from "./StatusIndicator"
import { Text } from "./Text"

export interface StatItemProps {
  /**
   * The name of the stat
   */
  name: string
  /**
   * The current value
   */
  value: number
  /**
   * The unit of measurement
   */
  unit: string
  /**
   * The status level
   */
  status: StatStatus
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
  /**
   * Historical data for trend display
   */
  history?: StatHistoryEntry[]
  /**
   * Callback when View Trends button is pressed
   */
  onViewTrends?: () => void
}

/**
 * A component that displays an individual stat with its name, value, unit, and status.
 *
 * @example
 * <StatItem
 *   name="Lead Levels"
 *   value={2.5}
 *   unit="ppb"
 *   status="safe"
 *   history={[...]}
 *   onViewTrends={() => navigation.navigate('StatTrend', { ... })}
 * />
 */
export function StatItem(props: StatItemProps) {
  const { name, value, unit, status, style, history, onViewTrends } = props
  const { theme } = useAppTheme()

  const hasHistory = history && history.length > 0

  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.palette.neutral200,
  }

  const $nameContainer: ViewStyle = {
    flex: 1,
  }

  const $nameText: TextStyle = {
    fontSize: 15,
    color: theme.colors.text,
  }

  const $valueContainer: ViewStyle = {
    flexDirection: "row",
    alignItems: "baseline",
    marginRight: 12,
  }

  const $valueText: TextStyle = {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  }

  const $unitText: TextStyle = {
    fontSize: 13,
    color: theme.colors.textDim,
    marginLeft: 4,
  }

  const $trendsButton: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.palette.neutral100,
  }

  const $trendsButtonText: TextStyle = {
    fontSize: 12,
    color: theme.colors.tint,
    marginLeft: 4,
  }

  return (
    <View style={[$container, style]}>
      <View style={$nameContainer}>
        <Text style={$nameText}>{name}</Text>
      </View>
      <View style={$valueContainer}>
        <Text style={$valueText}>{value}</Text>
        <Text style={$unitText}>{unit}</Text>
      </View>
      {hasHistory && onViewTrends && (
        <Pressable
          style={$trendsButton}
          onPress={onViewTrends}
          accessibilityLabel={`View trends for ${name}`}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="chart-line" size={14} color={theme.colors.tint} />
          <Text style={$trendsButtonText}>Trends</Text>
        </Pressable>
      )}
      <StatusIndicator status={status} size="medium" />
    </View>
  )
}
