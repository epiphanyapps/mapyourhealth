import { View, ViewStyle, TextStyle, StyleProp } from "react-native"
import { Text } from "./Text"
import { StatusIndicator } from "./StatusIndicator"
import { useAppTheme } from "@/theme/context"
import type { StatStatus } from "@/data/types/safety"

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
 * />
 */
export function StatItem(props: StatItemProps) {
  const { name, value, unit, status, style } = props
  const { theme } = useAppTheme()

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

  return (
    <View style={[$container, style]}>
      <View style={$nameContainer}>
        <Text style={$nameText}>{name}</Text>
      </View>
      <View style={$valueContainer}>
        <Text style={$valueText}>{value}</Text>
        <Text style={$unitText}>{unit}</Text>
      </View>
      <StatusIndicator status={status} size="medium" />
    </View>
  )
}
