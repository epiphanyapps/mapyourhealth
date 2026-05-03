/**
 * LocationScopeBadge — small inline pill that surfaces the source level of
 * cascaded data (#123). Renders nothing for "city" and "none" scopes so the
 * common case (city-specific data) stays uncluttered.
 *
 * Used by every screen that consumes a cascading hook — DashboardScreen,
 * CategoryDetailScreen, PollutionSourcesScreen, LocationObservationsScreen.
 */

import { FC } from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { describeScope, type LocationScope } from "@/lib/locationFallback"
import { useAppTheme } from "@/theme/context"

interface LocationScopeBadgeProps {
  scope: LocationScope
  state?: string
  country?: string
  /** Optional style override (e.g. margins). */
  style?: ViewStyle
  /**
   * Optional testID override. Defaults to "location-scope-badge". Screens
   * pass scope-specific values (e.g. "state-fallback-banner",
   * "country-fallback-banner") so E2E selectors can distinguish provenance
   * without inspecting copy.
   */
  testID?: string
}

export const LocationScopeBadge: FC<LocationScopeBadgeProps> = ({
  scope,
  state,
  country,
  style,
  testID = "location-scope-badge",
}) => {
  const { theme } = useAppTheme()
  const label = describeScope(scope, { state, country })

  if (!label) {
    return null
  }

  return (
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={[
        $container,
        { backgroundColor: theme.colors.accentBlueBg, borderColor: theme.colors.tint },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
      testID={testID}
    >
      <MaterialCommunityIcons
        name="map-marker-radius-outline"
        size={14}
        color={theme.colors.tint}
      />
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <Text style={[$label, { color: theme.colors.tint }]}>{label}</Text>
    </View>
  )
}

const $container: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  borderWidth: 1,
  gap: 6,
}

const $label: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
}
