/**
 * PollutionSourcesCard — collapsible dashboard surface for pollution sources
 * affecting the current location.
 *
 * Mirrors `ExpandableCategoryCard`'s chrome and Reanimated accordion so it
 * sits visually inside the Water/Air rhythm above it. Hidden entirely when
 * the cascade returns no sources, so the dashboard stays uncluttered for
 * cities that have no nearby industrial / agricultural / waste-site data.
 */

import { useCallback, useState } from "react"
import { LayoutChangeEvent, Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { LocationScopeBadge } from "@/components/LocationScopeBadge"
import { Text } from "@/components/Text"
import { usePollutionSources } from "@/hooks/usePollutionSources"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import type { AmplifyPollutionSource } from "@/services/amplify/data"
import { useAppTheme } from "@/theme/context"
import {
  SEVERITY_COLORS,
  isPollutionSeverity,
  sortBySeverityDesc,
  worstSeverity,
  type PollutionSeverity,
} from "@/theme/pollutionColors"

const ANIMATION_DURATION = 300
const EASING = Easing.bezier(0.4, 0, 0.2, 1)
const INLINE_ROW_LIMIT = 3
const INLINE_STATUSES = new Set<string>(["active", "monitored"])

type NavigationProp = NativeStackNavigationProp<AppStackParamList>

export interface PollutionSourcesCardProps {
  city: string
  state: string
  country: string
  style?: StyleProp<ViewStyle>
}

function titleCase(value: string): string {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatSourceType(type: string | null | undefined): string {
  if (!type) return "Unknown"
  return type
    .split("_")
    .map((part, index) => (index === 0 ? titleCase(part) : part))
    .join(" ")
}

function formatRadius(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

function summariseCounts(sources: AmplifyPollutionSource[]): {
  total: number
  worst: PollutionSeverity | null
} {
  return {
    total: sources.length,
    worst: worstSeverity(sources),
  }
}

export function PollutionSourcesCard(props: PollutionSourcesCardProps) {
  const { city, state, country, style } = props
  const { theme } = useAppTheme()
  const navigation = useNavigation<NavigationProp>()
  const { sources, isLoading, error, scope, refresh } = usePollutionSources(city, state, country)

  const inlineSources = sources.filter((source) => INLINE_STATUSES.has(source.status ?? ""))
  const orderedInline = sortBySeverityDesc(inlineSources).slice(0, INLINE_ROW_LIMIT)
  const totalCount = sources.length
  const inlineCount = inlineSources.length
  const { worst } = summariseCounts(inlineSources)
  const worstColor = worst ? SEVERITY_COLORS[worst] : theme.colors.tint

  const [expanded, setExpanded] = useState(false)
  const [, setMeasured] = useState(false)
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
    const next = !expanded
    progress.value = withTiming(next ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: EASING,
    })
    setExpanded(next)
  }, [expanded, progress])

  const handleRetry = useCallback(() => {
    void refresh()
  }, [refresh])

  const handleRowPress = useCallback(
    (sourceId: string) => {
      navigation.navigate("PollutionSources", { city, state, country, sourceId })
    },
    [navigation, city, state, country],
  )

  const handleViewAll = useCallback(() => {
    navigation.navigate("PollutionSources", { city, state, country })
  }, [navigation, city, state, country])

  const animatedContentStyle = useAnimatedStyle(() => {
    if (contentHeight.value === 0) {
      return { height: 0, opacity: 0 }
    }
    return {
      height: interpolate(progress.value, [0, 1], [0, contentHeight.value]),
      opacity: interpolate(progress.value, [0, 0.3, 1], [0, 0.8, 1]),
    }
  })

  const animatedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 90])}deg` }],
    }
  })

  // After the hook has settled, hide the card entirely on truly empty
  // cascades — keeps the dashboard tidy for locations with no nearby data.
  if (!isLoading && !error && totalCount === 0) {
    return null
  }

  const summaryLine = (() => {
    if (isLoading) return "Loading sources…"
    if (error) return "Could not load — tap to retry"
    if (inlineCount === 0 && totalCount > 0) {
      return `${totalCount} reported · all remediated or closed`
    }
    const noun = inlineCount === 1 ? "active source" : "active sources"
    if (!worst) return `${inlineCount} ${noun} nearby`
    return `${inlineCount} ${noun} nearby`
  })()

  const collapsedAccessibilityLabel = error
    ? "Pollution sources, could not load, double tap to retry"
    : `Pollution sources, ${inlineCount} ${inlineCount === 1 ? "active source" : "active sources"} nearby${
        worst ? `, worst severity ${worst}` : ""
      }`

  return (
    <View
      style={[
        $container,
        // eslint-disable-next-line react-native/no-inline-styles
        {
          backgroundColor: theme.colors.background,
          shadowColor: theme.colors.palette.neutral800,
        },
        style,
      ]}
      testID="pollution-sources-card"
    >
      <Pressable
        onPress={error ? handleRetry : toggleExpand}
        style={({ pressed }) => [$mainRow, pressed && $mainRowPressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={collapsedAccessibilityLabel}
        accessibilityHint={
          error
            ? "Retry loading pollution sources"
            : "Expand to see pollution sources affecting this area"
        }
      >
        <View style={$iconContainer}>
          <MaterialCommunityIcons name="factory" size={22} color={worstColor} />
        </View>
        <View style={$textContainer}>
          <Text style={[$titleText, { color: theme.colors.text }]}>Pollution sources</Text>
          <View style={$summaryRow}>
            <Text
              style={[$summaryText, { color: error ? theme.colors.error : theme.colors.textDim }]}
              numberOfLines={1}
            >
              {summaryLine}
            </Text>
            {worst && !isLoading && !error ? (
              <>
                <Text style={[$summaryDivider, { color: theme.colors.textDim }]}> · </Text>
                <Text style={[$severityDot, { color: SEVERITY_COLORS[worst] }]}>●</Text>
                <Text style={[$severityLabel, { color: theme.colors.textDim }]}> {worst}</Text>
              </>
            ) : null}
          </View>
        </View>
        <Animated.View style={[$chevronContainer, animatedChevronStyle]}>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textDim} />
        </Animated.View>
      </Pressable>

      <Animated.View style={[$contentOuter, animatedContentStyle]}>
        <View onLayout={onContentLayout} style={$panel}>
          <View style={[$divider, { backgroundColor: theme.colors.separator }]} />
          <View style={$panelHeader}>
            <LocationScopeBadge
              scope={scope}
              state={state}
              country={country}
              testID="pollution-sources-scope-badge"
            />
          </View>
          {orderedInline.map((source) => (
            <SourceRow key={source.id} source={source} onPress={() => handleRowPress(source.id)} />
          ))}
          <Pressable
            onPress={handleViewAll}
            style={({ pressed }) => [$footer, pressed && $footerPressed]}
            accessibilityRole="button"
            accessibilityLabel={`View all ${totalCount} pollution ${
              totalCount === 1 ? "source" : "sources"
            }`}
          >
            <Text style={[$footerText, { color: theme.colors.tint }]}>
              View all {totalCount} {totalCount === 1 ? "source" : "sources"}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.tint} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  )
}

interface SourceRowProps {
  source: AmplifyPollutionSource
  onPress: () => void
}

function SourceRow({ source, onPress }: SourceRowProps) {
  const { theme } = useAppTheme()
  const rawLevel: string | null | undefined = source.severityLevel
  const severity: PollutionSeverity | null = isPollutionSeverity(rawLevel) ? rawLevel : null
  const severityColor = severity ? SEVERITY_COLORS[severity] : theme.colors.textDim
  const accessibilityLabel = [
    source.name,
    severity ? `${severity} severity` : null,
    source.sourceType ? formatSourceType(source.sourceType) : null,
    `${formatRadius(source.impactRadius)} radius`,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [$row, pressed && $rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={$rowSeverityCol}>
        <Text style={[$rowDot, { color: severityColor }]}>●</Text>
        <Text style={[$rowSeverityLabel, { color: theme.colors.textDim }]} numberOfLines={1}>
          {severity ?? "unknown"}
        </Text>
      </View>
      <View style={$rowMain}>
        <Text style={[$rowName, { color: theme.colors.text }]} numberOfLines={1}>
          {source.name}
        </Text>
        <Text style={[$rowMeta, { color: theme.colors.textDim }]} numberOfLines={1}>
          {formatSourceType(source.sourceType)} ·{" "}
          <Text style={[$rowMeta, $rowMetaNum, { color: theme.colors.textDim }]}>
            {formatRadius(source.impactRadius)}
          </Text>{" "}
          radius
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textDim} />
    </Pressable>
  )
}

const $container: ViewStyle = {
  borderRadius: 12,
  marginHorizontal: 16,
  marginVertical: 4,
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

const $mainRowPressed: ViewStyle = {
  opacity: 0.75,
}

const $iconContainer: ViewStyle = {
  marginRight: 12,
}

const $textContainer: ViewStyle = {
  flex: 1,
}

const $titleText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
}

const $summaryRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 2,
  flexWrap: "wrap",
}

const $summaryText: TextStyle = {
  fontSize: 13,
}

const $summaryDivider: TextStyle = {
  fontSize: 13,
}

const $severityDot: TextStyle = {
  fontSize: 12,
}

const $severityLabel: TextStyle = {
  fontSize: 13,
  textTransform: "capitalize",
}

const $chevronContainer: ViewStyle = {
  marginLeft: 8,
}

const $contentOuter: ViewStyle = {
  overflow: "hidden",
}

const $panel: ViewStyle = {
  paddingBottom: 8,
}

const $divider: ViewStyle = {
  height: 1,
  marginHorizontal: 16,
  marginBottom: 8,
}

const $panelHeader: ViewStyle = {
  paddingHorizontal: 16,
  paddingBottom: 8,
}

const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 10,
  gap: 12,
}

const $rowPressed: ViewStyle = {
  opacity: 0.75,
}

const $rowSeverityCol: ViewStyle = {
  width: 76,
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
}

const $rowDot: TextStyle = {
  fontSize: 12,
}

const $rowSeverityLabel: TextStyle = {
  fontSize: 12,
  textTransform: "capitalize",
}

const $rowMain: ViewStyle = {
  flex: 1,
  minWidth: 0,
}

const $rowName: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
}

const $rowMeta: TextStyle = {
  fontSize: 12,
  marginTop: 1,
}

const $rowMetaNum: TextStyle = {
  fontVariant: ["tabular-nums"],
}

const $footer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 12,
  marginTop: 4,
  gap: 4,
}

const $footerPressed: ViewStyle = {
  opacity: 0.75,
}

const $footerText: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
}
