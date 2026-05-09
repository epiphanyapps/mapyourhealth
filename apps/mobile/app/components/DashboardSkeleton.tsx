import { View, ViewStyle } from "react-native"

import { SkeletonBlock } from "@/components/Skeleton"

interface DashboardSkeletonProps {
  /**
   * Optional accessibility label announced by screen readers when the skeleton
   * appears. Defaults to "Loading dashboard". The wrapping View has
   * accessibilityLiveRegion="polite" so VoiceOver / TalkBack picks it up.
   */
  accessibilityLabel?: string
}

/**
 * DashboardSkeleton — placeholder that mirrors DashboardScreen's loaded layout
 * (LocationHeader, scope badge, action buttons, two category cards, Report
 * Hazard CTA). Rendered in the loading branch in place of the previous
 * ActivityIndicator + "Loading safety data..." text.
 *
 * All blocks pulse via SkeletonBlock; reduced-motion is honored at the
 * primitive level so callers don't need to handle it.
 */
export function DashboardSkeleton(props: DashboardSkeletonProps) {
  const { accessibilityLabel = "Loading dashboard" } = props

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={$root}
    >
      <View style={$locationHeader}>
        <SkeletonBlock width="60%" height={28} />
        <SkeletonBlock width="35%" height={14} style={$locationSecondary} />
      </View>

      <SkeletonBlock width={120} height={20} borderRadius={10} style={$scopeBadge} />

      <View style={$actionRow}>
        <SkeletonBlock height={44} borderRadius={12} style={$flex} />
        <SkeletonBlock height={44} borderRadius={12} style={$flex} />
      </View>

      <View style={$categoriesContainer}>
        <SkeletonBlock height={120} borderRadius={12} style={$categoryCard} />
        <View style={$categorySeparator} />
        <SkeletonBlock height={120} borderRadius={12} style={$categoryCard} />
      </View>

      <SkeletonBlock height={48} borderRadius={12} style={$reportButton} />
    </View>
  )
}

const $root: ViewStyle = {
  flex: 1,
}

const $locationHeader: ViewStyle = {
  paddingHorizontal: 16,
  paddingVertical: 12,
  gap: 8,
}

const $locationSecondary: ViewStyle = {
  marginTop: 4,
}

const $scopeBadge: ViewStyle = {
  marginHorizontal: 16,
  marginBottom: 12,
}

const $actionRow: ViewStyle = {
  flexDirection: "row",
  marginHorizontal: 16,
  marginBottom: 16,
  gap: 12,
}

const $flex: ViewStyle = {
  flex: 1,
}

const $categoriesContainer: ViewStyle = {
  marginTop: 4,
}

const $categoryCard: ViewStyle = {
  marginHorizontal: 16,
}

const $categorySeparator: ViewStyle = {
  height: 16,
}

const $reportButton: ViewStyle = {
  marginHorizontal: 16,
  marginTop: 24,
}
