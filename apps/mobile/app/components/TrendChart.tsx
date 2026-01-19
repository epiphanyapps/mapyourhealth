import { View, ViewStyle, TextStyle, Dimensions } from "react-native"
import { format, parseISO, subMonths, isAfter } from "date-fns"
import { LineChart } from "react-native-chart-kit"

import type { StatHistoryEntry, StatStatus, TrendDirection } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

import { StatusIndicator } from "./StatusIndicator"
import { Text } from "./Text"

export interface TrendChartProps {
  /**
   * The name of the stat being displayed
   */
  statName: string
  /**
   * The unit of measurement
   */
  unit: string
  /**
   * Current value
   */
  currentValue: number
  /**
   * Current status
   */
  currentStatus: StatStatus
  /**
   * Historical data points
   */
  history: StatHistoryEntry[]
  /**
   * Whether higher values are bad (affects trend calculation)
   */
  higherIsBad?: boolean
  /**
   * Last updated timestamp
   */
  lastUpdated: string
}

/**
 * Calculate the trend direction based on historical data
 */
export function calculateTrendDirection(
  history: StatHistoryEntry[],
  currentValue: number,
  higherIsBad: boolean = true,
): TrendDirection {
  if (history.length < 2) return "stable"

  // Get the last 3 data points (or fewer if not available)
  const recentHistory = [...history]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .slice(-3)

  // Calculate average of recent history
  const avgHistorical = recentHistory.reduce((sum, h) => sum + h.value, 0) / recentHistory.length

  // Calculate the percentage change
  const percentChange = ((currentValue - avgHistorical) / avgHistorical) * 100

  // Determine trend direction
  // Use a 5% threshold to avoid noise
  if (Math.abs(percentChange) < 5) return "stable"

  const isIncreasing = percentChange > 0

  // If higher is bad, increasing is worsening
  // If higher is good, increasing is improving
  if (higherIsBad) {
    return isIncreasing ? "worsening" : "improving"
  } else {
    return isIncreasing ? "improving" : "worsening"
  }
}

/**
 * Get color for trend direction
 */
function getTrendColor(trend: TrendDirection): string {
  switch (trend) {
    case "improving":
      return "#10B981" // green
    case "worsening":
      return "#DC2626" // red
    case "stable":
    default:
      return "#6B7280" // gray
  }
}

/**
 * Get display text for trend
 */
function getTrendText(trend: TrendDirection): string {
  switch (trend) {
    case "improving":
      return "Improving"
    case "worsening":
      return "Worsening"
    case "stable":
    default:
      return "Stable"
  }
}

/**
 * Get trend arrow icon
 */
function getTrendArrow(trend: TrendDirection): string {
  switch (trend) {
    case "improving":
      return "↓" // arrow down (better)
    case "worsening":
      return "↑" // arrow up (worse)
    case "stable":
    default:
      return "→" // arrow right (stable)
  }
}

/**
 * A component that displays a trend chart for a stat's historical data.
 */
export function TrendChart(props: TrendChartProps) {
  const {
    statName,
    unit,
    currentValue,
    currentStatus,
    history,
    higherIsBad = true,
    lastUpdated,
  } = props
  const { theme } = useAppTheme()

  // Filter history to last 12 months
  const twelveMonthsAgo = subMonths(new Date(), 12)
  const filteredHistory = history.filter((h) => isAfter(parseISO(h.recordedAt), twelveMonthsAgo))

  // Sort by date
  const sortedHistory = [...filteredHistory].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  )

  // Include current value in the data
  const allDataPoints = [
    ...sortedHistory,
    { value: currentValue, status: currentStatus, recordedAt: lastUpdated },
  ]

  // Calculate trend
  const trend = calculateTrendDirection(sortedHistory, currentValue, higherIsBad)
  const trendColor = getTrendColor(trend)

  // Prepare chart data
  const chartData = {
    labels: allDataPoints.map((p, i) => {
      // Only show labels for first, middle, and last points to avoid crowding
      if (i === 0 || i === allDataPoints.length - 1 || i === Math.floor(allDataPoints.length / 2)) {
        return format(parseISO(p.recordedAt), "MMM")
      }
      return ""
    }),
    datasets: [
      {
        data: allDataPoints.map((p) => p.value),
        color: () => theme.colors.tint,
        strokeWidth: 2,
      },
    ],
  }

  const screenWidth = Dimensions.get("window").width
  const chartWidth = screenWidth - 48 // accounting for padding

  const $container: ViewStyle = {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
  }

  const $header: ViewStyle = {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  }

  const $titleContainer: ViewStyle = {
    flex: 1,
  }

  const $title: TextStyle = {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  }

  const $currentValue: TextStyle = {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
  }

  const $unit: TextStyle = {
    fontSize: 14,
    color: theme.colors.textDim,
    marginLeft: 4,
  }

  const $trendContainer: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${trendColor}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  }

  const $trendArrow: TextStyle = {
    fontSize: 16,
    fontWeight: "700",
    color: trendColor,
    marginRight: 4,
  }

  const $trendText: TextStyle = {
    fontSize: 14,
    fontWeight: "500",
    color: trendColor,
  }

  const $chartContainer: ViewStyle = {
    marginHorizontal: -16,
    marginBottom: 8,
  }

  const $footer: ViewStyle = {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  }

  const $statusRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  }

  const $statusLabel: TextStyle = {
    fontSize: 14,
    color: theme.colors.textDim,
  }

  const $dateText: TextStyle = {
    fontSize: 12,
    color: theme.colors.textDim,
  }

  const $noDataContainer: ViewStyle = {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  }

  const $noDataText: TextStyle = {
    fontSize: 14,
    color: theme.colors.textDim,
    textAlign: "center",
  }

  const $valueRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "baseline",
  }

  const $chartStyle: ViewStyle = {
    borderRadius: 16,
  }

  const $statusText: TextStyle = {
    fontSize: 14,
    color: theme.colors.text,
    textTransform: "capitalize",
  }

  // If no history data, show message
  if (allDataPoints.length < 2) {
    return (
      <View style={$container}>
        <View style={$header}>
          <View style={$titleContainer}>
            <Text style={$title}>{statName}</Text>
            <View style={$valueRow}>
              <Text style={$currentValue}>{currentValue}</Text>
              <Text style={$unit}>{unit}</Text>
            </View>
          </View>
          <View style={$statusRow}>
            <StatusIndicator status={currentStatus} size="medium" />
          </View>
        </View>
        <View style={$noDataContainer}>
          <Text style={$noDataText}>
            Not enough historical data to display trends.{"\n"}
            Check back after more measurements are recorded.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={$container}>
      <View style={$header}>
        <View style={$titleContainer}>
          <Text style={$title}>{statName}</Text>
          <View style={$valueRow}>
            <Text style={$currentValue}>{currentValue}</Text>
            <Text style={$unit}>{unit}</Text>
          </View>
        </View>
        <View style={$trendContainer}>
          <Text style={$trendArrow}>{getTrendArrow(trend)}</Text>
          <Text style={$trendText}>{getTrendText(trend)}</Text>
        </View>
      </View>

      <View style={$chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={180}
          chartConfig={{
            backgroundColor: theme.colors.background,
            backgroundGradientFrom: theme.colors.background,
            backgroundGradientTo: theme.colors.background,
            decimalPlaces: 1,
            color: () => theme.colors.tint,
            labelColor: () => theme.colors.textDim,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: theme.colors.tint,
            },
            propsForBackgroundLines: {
              strokeDasharray: "",
              stroke: theme.colors.palette.neutral200,
              strokeWidth: 1,
            },
          }}
          bezier
          style={$chartStyle}
          withVerticalLines={false}
          withHorizontalLines={true}
          withInnerLines={true}
          withOuterLines={false}
          fromZero={false}
        />
      </View>

      <View style={$footer}>
        <View style={$statusRow}>
          <Text style={$statusLabel}>Current Status:</Text>
          <StatusIndicator status={currentStatus} size="small" />
          <Text style={$statusText}>{currentStatus}</Text>
        </View>
        <Text style={$dateText}>Last updated: {format(parseISO(lastUpdated), "MMM d, yyyy")}</Text>
      </View>
    </View>
  )
}
