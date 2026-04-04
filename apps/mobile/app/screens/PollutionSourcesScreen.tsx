/**
 * PollutionSourcesScreen
 *
 * Displays pollution sources near a location with severity,
 * type, status, and impact radius information.
 */

import { FC, useCallback, useState } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Pressable,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { EmptyState } from "@/components/EmptyState"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { usePollutionSources } from "@/hooks/usePollutionSources"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { AmplifyPollutionSource } from "@/services/amplify/data"
import { useAppTheme } from "@/theme/context"

interface PollutionSourcesScreenProps extends AppStackScreenProps<"PollutionSources"> {}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  industrial: "Industrial",
  agricultural: "Agricultural",
  waste_site: "Waste Site",
  spill: "Spill",
  mining: "Mining",
  transportation: "Transportation",
  construction: "Construction",
  other: "Other",
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  monitored: "Monitored",
  remediated: "Remediated",
  closed: "Closed",
}

const SEVERITY_ICONS: Record<string, string> = {
  low: "shield-check-outline",
  moderate: "alert-outline",
  high: "alert",
  critical: "alert-octagon",
}

function formatRadius(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

function SourceCard({
  source,
  theme,
}: {
  source: AmplifyPollutionSource
  theme: ReturnType<typeof useAppTheme>["theme"]
}) {
  const severity = source.severityLevel ?? "moderate"
  const status = source.status ?? "active"

  const severityColorMap: Record<string, { text: string; bg: string }> = {
    low: { text: theme.colors.statusSafe, bg: theme.colors.statusSafeBg },
    moderate: { text: theme.colors.statusWarning, bg: theme.colors.statusWarningBg },
    high: { text: theme.colors.statusDanger, bg: theme.colors.statusDangerBg },
    critical: { text: theme.colors.statusDanger, bg: theme.colors.statusDangerBg },
  }

  const severityColor = severityColorMap[severity] ?? severityColorMap.moderate

  return (
    <View
      style={[
        styles.$cardContainer,
        { backgroundColor: theme.colors.background, shadowColor: theme.colors.text },
      ]}
      testID={`pollution-source-card-${source.id}`}
    >
      {/* Header row */}
      <View style={styles.$cardHeader}>
        <MaterialCommunityIcons
          name={(SEVERITY_ICONS[severity] ?? "alert-outline") as "alert-outline"}
          size={20}
          color={severityColor.text}
        />
        <Text style={[styles.$cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {source.name}
        </Text>
      </View>

      {/* Badges row */}
      <View style={styles.$badgesRow}>
        {/* Source type badge */}
        <View style={[styles.$badge, { backgroundColor: theme.colors.separator }]}>
          <Text style={[styles.$badgeText, { color: theme.colors.textDim }]}>
            {SOURCE_TYPE_LABELS[source.sourceType ?? "other"] ?? "Other"}
          </Text>
        </View>

        {/* Severity badge */}
        <View style={[styles.$badge, { backgroundColor: severityColor.bg }]}>
          <Text style={[styles.$badgeText, { color: severityColor.text }]}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Text>
        </View>

        {/* Status badge */}
        <View style={[styles.$badge, { backgroundColor: theme.colors.separator }]}>
          <Text style={[styles.$badgeText, { color: theme.colors.textDim }]}>
            {STATUS_LABELS[status] ?? status}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.$detailsRow}>
        <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.textDim} />
        <Text style={[styles.$detailText, { color: theme.colors.textDim }]}>
          {source.city}, {source.state}
        </Text>
        <MaterialCommunityIcons name="radius-outline" size={14} color={theme.colors.textDim} />
        <Text style={[styles.$detailText, { color: theme.colors.textDim }]}>
          {formatRadius(source.impactRadius)}
        </Text>
      </View>

      {/* Description */}
      {source.description ? (
        <Text style={[styles.$description, { color: theme.colors.textDim }]} numberOfLines={2}>
          {source.description}
        </Text>
      ) : null}
    </View>
  )
}

export const PollutionSourcesScreen: FC<PollutionSourcesScreenProps> =
  function PollutionSourcesScreen(props) {
    const { navigation, route } = props
    const { city, state } = route.params
    const { theme } = useAppTheme()

    const { sources, isLoading, error, refresh } = usePollutionSources({ city, state })
    const [isRefreshing, setIsRefreshing] = useState(false)

    const onRefresh = useCallback(async () => {
      setIsRefreshing(true)
      try {
        await refresh()
      } finally {
        setIsRefreshing(false)
      }
    }, [refresh])

    // Loading state
    if (isLoading) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]}>
          <Header
            title="Pollution Sources"
            leftIcon="back"
            onLeftPress={() => navigation.goBack()}
          />
          <View style={styles.$centerContainer} testID="loading-indicator">
            <ActivityIndicator size="large" color={theme.colors.tint} />
            <Text style={[styles.$loadingText, { color: theme.colors.textDim }]}>
              Loading pollution sources...
            </Text>
          </View>
        </Screen>
      )
    }

    // Error state
    if (error && sources.length === 0) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]}>
          <Header
            title="Pollution Sources"
            leftIcon="back"
            onLeftPress={() => navigation.goBack()}
          />
          <View style={styles.$centerContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={theme.colors.statusDanger}
            />
            <Text style={[styles.$errorText, { color: theme.colors.text }]}>
              Failed to load pollution sources
            </Text>
            <Text style={[styles.$errorSubtext, { color: theme.colors.textDim }]}>{error}</Text>
            <Pressable
              onPress={onRefresh}
              style={[styles.$retryButton, { backgroundColor: theme.colors.tint }]}
              testID="retry-button"
            >
              <Text style={[styles.$retryButtonText, { color: theme.colors.background }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        </Screen>
      )
    }

    // Empty state
    if (sources.length === 0) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]}>
          <Header
            title="Pollution Sources"
            leftIcon="back"
            onLeftPress={() => navigation.goBack()}
          />
          <EmptyState
            heading="No Pollution Sources"
            content={`No known pollution sources found near ${city || "this location"}.`}
            imageStyle={styles.$emptyImage}
          />
        </Screen>
      )
    }

    // Success state
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header title="Pollution Sources" leftIcon="back" onLeftPress={() => navigation.goBack()} />
        <ScrollView
          contentContainerStyle={styles.$scrollContent}
          testID="pollution-sources-list"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.tint}
            />
          }
        >
          <Text style={[styles.$subtitle, { color: theme.colors.textDim }]}>
            {sources.length} source{sources.length !== 1 ? "s" : ""} near {city}
          </Text>
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} theme={theme} />
          ))}
        </ScrollView>
      </Screen>
    )
  }

const styles = StyleSheet.create({
  $badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  } as ViewStyle,
  $badgeText: {
    fontSize: 12,
    fontWeight: "600",
  } as TextStyle,
  $badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  } as ViewStyle,
  $cardContainer: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  } as ViewStyle,
  $cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  } as ViewStyle,
  $cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  $centerContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  } as ViewStyle,
  $description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  } as TextStyle,
  $detailText: {
    fontSize: 12,
    marginRight: 12,
  } as TextStyle,
  $detailsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  } as ViewStyle,
  $emptyImage: {
    height: 200,
  } as ImageStyle,
  $errorSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  } as TextStyle,
  $errorText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  } as TextStyle,
  $loadingText: {
    fontSize: 14,
    marginTop: 12,
  } as TextStyle,
  $retryButton: {
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
  } as ViewStyle,
  $retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  } as TextStyle,
  $scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
    paddingTop: 8,
  } as ViewStyle,
  $subtitle: {
    fontSize: 13,
    marginBottom: 12,
    marginHorizontal: 16,
  } as TextStyle,
})
