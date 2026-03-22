import { useMemo } from "react"
import { ActivityIndicator, View, ViewStyle, TextStyle, ScrollView } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { format, parseISO } from "date-fns"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TrendChart, calculateTrendDirection } from "@/components/TrendChart"
import { useContaminants } from "@/context/ContaminantsContext"
import type { StatStatus, TrendDirection } from "@/data/types/safety"
import { useLocationData } from "@/hooks/useLocationData"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

type StatTrendRouteProp = RouteProp<AppStackParamList, "StatTrend">
type NavigationProp = NativeStackNavigationProp<AppStackParamList>

/**
 * Get icon for trend direction
 */
function getTrendIcon(trend: TrendDirection): string {
  switch (trend) {
    case "improving":
      return "trending-down"
    case "worsening":
      return "trending-up"
    case "stable":
    default:
      return "trending-neutral"
  }
}

/**
 * Get color for trend direction
 */
function getTrendColor(trend: TrendDirection): string {
  switch (trend) {
    case "improving":
      return "#10B981"
    case "worsening":
      return "#DC2626"
    case "stable":
    default:
      return "#6B7280"
  }
}

/**
 * Get color for status
 */
function getStatusColor(status: StatStatus): string {
  switch (status) {
    case "danger":
      return "#DC2626"
    case "warning":
      return "#F59E0B"
    case "safe":
    default:
      return "#10B981"
  }
}

/**
 * Get description for trend direction
 */
function getTrendDescription(trend: TrendDirection, higherIsBad: boolean): string {
  switch (trend) {
    case "improving":
      return higherIsBad
        ? "Values have been decreasing over time, indicating conditions are getting better."
        : "Values have been increasing over time, indicating conditions are getting better."
    case "worsening":
      return higherIsBad
        ? "Values have been increasing over time, indicating conditions may be deteriorating."
        : "Values have been decreasing over time, indicating conditions may be deteriorating."
    case "stable":
    default:
      return "Values have remained relatively consistent over time with no significant trend."
  }
}

export function StatTrendScreen() {
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<StatTrendRouteProp>()
  const { theme } = useAppTheme()
  const { contaminantMap } = useContaminants()

  const { statId, city, state, country } = route.params

  // Fetch data for this location (uses React Query caching — likely already cached from CategoryDetail)
  const { cityData, isLoading } = useLocationData(city)

  // Look up the contaminant definition
  const definition = contaminantMap.get(statId)
  const statName = definition?.name ?? statId
  const unit = definition?.unit ?? ""
  const higherIsBad = definition?.higherIsBad ?? true

  // Find this stat in the zip data
  const stat = cityData?.stats.find((s) => s.statId === statId)
  const currentValue = stat?.value ?? 0
  const currentStatus = stat?.status ?? "safe"
  const history = useMemo(() => stat?.history ?? [], [stat?.history])
  const lastUpdated = stat?.lastUpdated ?? ""

  const trend = calculateTrendDirection(history, currentValue, higherIsBad)
  const trendColor = getTrendColor(trend)

  // Memoize theme-dependent styles to avoid recreation on every render
  const themedStyles = useMemo(
    () => ({
      $container: {
        flex: 1,
        backgroundColor: theme.colors.background,
      } as ViewStyle,
      $content: {
        flex: 1,
        padding: 16,
      } as ViewStyle,
      $chartCard: {
        backgroundColor: theme.colors.palette.neutral100,
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
      } as ViewStyle,
      $section: {
        backgroundColor: theme.colors.palette.neutral100,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      } as ViewStyle,
      $sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 12,
      } as TextStyle,
      $historyItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.palette.neutral200,
      } as ViewStyle,
      $historyDate: {
        fontSize: 14,
        color: theme.colors.textDim,
      } as TextStyle,
      $historyValue: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      } as ViewStyle,
      $historyValueText: {
        fontSize: 15,
        fontWeight: "500",
        color: theme.colors.text,
      } as TextStyle,
      $infoCard: {
        flexDirection: "row",
        backgroundColor: theme.colors.palette.neutral100,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        gap: 12,
      } as ViewStyle,
      $infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${trendColor}15`,
        justifyContent: "center",
        alignItems: "center",
      } as ViewStyle,
      $infoContent: {
        flex: 1,
      } as ViewStyle,
      $infoTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 4,
      } as TextStyle,
      $infoDescription: {
        fontSize: 14,
        color: theme.colors.textDim,
        lineHeight: 20,
      } as TextStyle,
      $locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      } as ViewStyle,
      $locationText: {
        fontSize: 14,
        color: theme.colors.text,
      } as TextStyle,
      $historyItemLast: {
        borderBottomWidth: 0,
      } as ViewStyle,
      $statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
      } as ViewStyle,
    }),
    [theme, trendColor],
  )

  // Sort history by date (newest first) for display
  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      ),
    [history],
  )

  // Loading state
  if (isLoading && !cityData) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header title={statName} leftIcon="back" onLeftPress={() => navigation.goBack()} />
        <View style={$loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={[$loadingText, { color: theme.colors.textDim }]}>Loading trend data...</Text>
        </View>
      </Screen>
    )
  }

  // No data state
  if (!stat) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header title={statName} leftIcon="back" onLeftPress={() => navigation.goBack()} />
        <View style={$loadingContainer}>
          <MaterialCommunityIcons name="chart-line" size={64} color={theme.colors.textDim} />
          <Text style={[$emptyTitle, { color: theme.colors.text }]}>No data available</Text>
          <Text style={[$emptySubtitle, { color: theme.colors.textDim }]}>
            No measurements found for {statName} in {city}, {state}, {country}.
          </Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen style={themedStyles.$container} preset="fixed" safeAreaEdges={["top"]}>
      <Header title={statName} leftIcon="back" onLeftPress={() => navigation.goBack()} />

      <ScrollView style={themedStyles.$content} showsVerticalScrollIndicator={false}>
        {/* Trend Chart */}
        <View style={themedStyles.$chartCard}>
          <TrendChart
            statName={statName}
            unit={unit}
            currentValue={currentValue}
            currentStatus={currentStatus}
            history={history}
            higherIsBad={higherIsBad}
            lastUpdated={lastUpdated}
          />
        </View>

        {/* Trend Info Card */}
        <View style={themedStyles.$infoCard}>
          <View style={themedStyles.$infoIcon}>
            <MaterialCommunityIcons
              name={getTrendIcon(trend) as any}
              size={24}
              color={trendColor}
            />
          </View>
          <View style={themedStyles.$infoContent}>
            <Text style={themedStyles.$infoTitle}>
              {trend === "improving"
                ? "Trend: Improving"
                : trend === "worsening"
                  ? "Trend: Worsening"
                  : "Trend: Stable"}
            </Text>
            <Text style={themedStyles.$infoDescription}>
              {getTrendDescription(trend, higherIsBad)}
            </Text>
          </View>
        </View>

        {/* Historical Data List */}
        {sortedHistory.length > 0 && (
          <View style={themedStyles.$section}>
            <Text style={themedStyles.$sectionTitle}>Historical Readings</Text>
            {sortedHistory.slice(0, 12).map((entry, index) => (
              <View
                key={entry.recordedAt}
                style={[
                  themedStyles.$historyItem,
                  index === Math.min(sortedHistory.length, 12) - 1 && themedStyles.$historyItemLast,
                ]}
              >
                <Text style={themedStyles.$historyDate}>
                  {format(parseISO(entry.recordedAt), "MMM d, yyyy")}
                </Text>
                <View style={themedStyles.$historyValue}>
                  <Text style={themedStyles.$historyValueText}>
                    {entry.value} {unit}
                  </Text>
                  <View
                    style={[
                      themedStyles.$statusDot,
                      { backgroundColor: getStatusColor(entry.status) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Location Info */}
        <View style={themedStyles.$section}>
          <Text style={themedStyles.$sectionTitle}>Location</Text>
          <View style={themedStyles.$locationRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.textDim} />
            <Text style={themedStyles.$locationText}>
              {city}, {state}, {country}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 40,
}

const $loadingText: TextStyle = {
  marginTop: 12,
}

const $emptyTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  textAlign: "center",
  marginTop: 16,
}

const $emptySubtitle: TextStyle = {
  fontSize: 14,
  textAlign: "center",
  marginTop: 8,
  paddingHorizontal: 32,
}
