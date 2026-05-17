/**
 * PollutionSourcesScreen — list view of pollution sources for a location.
 *
 * Cascade-aware via `usePollutionSources`: walks city → state → country and
 * renders the first non-empty scope. A `LocationScopeBadge` surfaces
 * provenance for state/country fallbacks.
 *
 * MVP scope: text-only list, no map. Adding `react-native-maps` was
 * deliberately deferred — the data model still tracks lat/lng /
 * impactRadius so a map view can be a follow-up PR. See plan in
 * docs-cascade-work-handoff-2026-05-10-md-clever-peacock.md.
 */

import { useState, useCallback } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
  ViewStyle,
  TextStyle,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

import { Header } from "@/components/Header"
import { LocationScopeBadge } from "@/components/LocationScopeBadge"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { usePollutionSources } from "@/hooks/usePollutionSources"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import type { AmplifyPollutionSource } from "@/services/amplify/data"
import { useAppTheme } from "@/theme/context"

type PollutionSourcesRouteProp = RouteProp<AppStackParamList, "PollutionSources">
type NavigationProp = NativeStackNavigationProp<AppStackParamList>

const SEVERITY_COLORS: Record<string, string> = {
  low: "#10B981",
  moderate: "#F59E0B",
  high: "#F97316",
  critical: "#DC2626",
}

const STATUS_COLORS: Record<string, string> = {
  active: "#DC2626",
  monitored: "#F59E0B",
  remediated: "#10B981",
  closed: "#6B7280",
}

function formatRadius(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

function formatSourceType(type: string | null | undefined): string {
  if (!type) return "Unknown"
  // industrial → Industrial; waste_site → Waste site
  return type
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
}

function formatTitleCase(value: string | null | undefined): string {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function PollutionSourcesScreen() {
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<PollutionSourcesRouteProp>()
  const { theme } = useAppTheme()
  const { city, state, country } = route.params

  const { sources, isLoading, error, scope, refresh } = usePollutionSources(city, state, country)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [refresh])

  return (
    <Screen safeAreaEdges={["top"]} preset="fixed" contentContainerStyle={$root}>
      <Header title="Pollution Sources" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={$scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <View style={$locationRow}>
          <Text preset="subheading" style={$locationText}>
            {city || state || country}
          </Text>
          <LocationScopeBadge scope={scope} state={state} country={country} style={$scopeBadge} />
        </View>

        {isLoading ? (
          <View style={$centered}>
            <ActivityIndicator size="large" color={theme.colors.tint} />
          </View>
        ) : error ? (
          <View style={$centered}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={40}
              color={theme.colors.error}
            />
            <Text style={$errorText}>{error}</Text>
          </View>
        ) : sources.length === 0 ? (
          <View style={$centered}>
            <MaterialCommunityIcons name="factory" size={40} color={theme.colors.textDim} />
            <Text style={$emptyText}>No pollution sources reported for this area.</Text>
            <Text style={$emptyHint}>
              Sources can be entered by admins for any city, state/province, or country. We&apos;ll
              show whichever level has data.
            </Text>
          </View>
        ) : (
          <View style={$listContainer}>
            {sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

function SourceCard({ source }: { source: AmplifyPollutionSource }) {
  const { theme } = useAppTheme()
  const severityColor = source.severityLevel
    ? (SEVERITY_COLORS[source.severityLevel] ?? theme.colors.textDim)
    : theme.colors.textDim
  const statusColor = source.status
    ? (STATUS_COLORS[source.status] ?? theme.colors.textDim)
    : theme.colors.textDim

  return (
    <View
      style={[
        $card,
        // eslint-disable-next-line react-native/no-inline-styles
        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
      ]}
    >
      <View style={$cardHeader}>
        <MaterialCommunityIcons name="factory" size={24} color={severityColor} style={$cardIcon} />
        <View style={$cardTitleContainer}>
          <Text preset="bold" style={$cardTitle} numberOfLines={2}>
            {source.name}
          </Text>
        </View>
      </View>

      <View style={$badgesRow}>
        <Badge label={formatSourceType(source.sourceType)} color={theme.colors.tint} />
        {source.severityLevel && (
          <Badge label={formatTitleCase(source.severityLevel)} color={severityColor} />
        )}
        {source.status && <Badge label={formatTitleCase(source.status)} color={statusColor} />}
      </View>

      <View style={$detailsRow}>
        <View style={$detailItem}>
          <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.textDim} />
          <Text style={$detailText}>
            {[source.city, source.state].filter(Boolean).join(", ") || source.country || "—"}
          </Text>
        </View>
        <View style={$detailItem}>
          <MaterialCommunityIcons name="radar" size={14} color={theme.colors.textDim} />
          <Text style={$detailText}>{formatRadius(source.impactRadius)}</Text>
        </View>
      </View>

      <Text style={$coordsText}>
        {source.latitude.toFixed(4)}, {source.longitude.toFixed(4)}
      </Text>

      {source.description ? (
        <Text style={$descText} numberOfLines={2}>
          {source.description}
        </Text>
      ) : null}
    </View>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={[
        $badge,
        // eslint-disable-next-line react-native/no-inline-styles
        { borderColor: color, backgroundColor: `${color}15` },
      ]}
    >
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <Text style={[$badgeText, { color }]}>{label}</Text>
    </View>
  )
}

const $root: ViewStyle = {
  flex: 1,
}

const $scrollContent: ViewStyle = {
  paddingHorizontal: 16,
  paddingBottom: 32,
}

const $locationRow: ViewStyle = {
  marginTop: 12,
  marginBottom: 16,
  gap: 8,
}

const $locationText: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
}

const $scopeBadge: ViewStyle = {
  marginTop: 4,
}

const $centered: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 48,
  gap: 12,
}

const $errorText: TextStyle = {
  textAlign: "center",
  fontSize: 14,
  color: "#DC2626",
}

const $emptyText: TextStyle = {
  textAlign: "center",
  fontSize: 16,
  fontWeight: "600",
}

const $emptyHint: TextStyle = {
  textAlign: "center",
  fontSize: 13,
  opacity: 0.7,
  paddingHorizontal: 24,
}

const $listContainer: ViewStyle = {
  gap: 12,
}

const $card: ViewStyle = {
  borderRadius: 12,
  borderWidth: 1,
  padding: 16,
  gap: 8,
}

const $cardHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 8,
}

const $cardIcon: ViewStyle = {
  marginTop: 2,
}

const $cardTitleContainer: ViewStyle = {
  flex: 1,
}

const $cardTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
}

const $badgesRow: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 6,
}

const $badge: ViewStyle = {
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 8,
  borderWidth: 1,
}

const $badgeText: TextStyle = {
  fontSize: 11,
  fontWeight: "600",
}

const $detailsRow: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 16,
  marginTop: 4,
}

const $detailItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
}

const $detailText: TextStyle = {
  fontSize: 13,
  opacity: 0.8,
}

const $coordsText: TextStyle = {
  fontSize: 12,
  opacity: 0.6,
  fontVariant: ["tabular-nums"],
}

const $descText: TextStyle = {
  fontSize: 13,
  lineHeight: 18,
  marginTop: 4,
}
