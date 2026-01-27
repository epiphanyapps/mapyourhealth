import { View, ViewStyle, TextStyle, Pressable } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import type { ZipCodeStat } from "@/data/types/safety"

/**
 * Warning banner background color (amber/yellow)
 */
const WARNING_BACKGROUND = "#FEF3C7"

/**
 * Warning icon and text accent color (amber)
 */
const WARNING_ACCENT = "#D97706"

/**
 * Generic definition type for warning banner (supports both legacy StatDefinition and new Contaminant)
 */
interface WarningStatDefinition {
  name: string
  unit: string
  category: string
}

export interface WarningBannerProps {
  /**
   * The stat definition for the warning (supports both legacy and new types)
   */
  statDefinition: WarningStatDefinition
  /**
   * The stat value data
   */
  stat: ZipCodeStat
  /**
   * Callback when "Full Report" is pressed
   */
  onViewDetails?: () => void
}

/**
 * A prominent warning banner for dangerous/warning conditions.
 * Displays a yellow/amber banner with alert icon, stat name, and link to details.
 *
 * @example
 * <WarningBanner
 *   statDefinition={leadStatDef}
 *   stat={leadStat}
 *   onViewDetails={() => navigation.navigate("Details")}
 * />
 */
export function WarningBanner(props: WarningBannerProps) {
  const { statDefinition, stat, onViewDetails } = props

  return (
    <View style={$container} accessibilityRole="alert">
      {/* Left section: Icon and warning text */}
      <View style={$contentRow}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={24}
          color={WARNING_ACCENT}
          style={$icon}
        />
        <View style={$textContainer}>
          <Text style={$labelText}>Special Warning</Text>
          <Text style={$statName}>{statDefinition.name}</Text>
          <Text style={$valueText}>
            {stat.value} {statDefinition.unit}
          </Text>
        </View>
      </View>

      {/* Right section: Full Report link */}
      <Pressable
        onPress={onViewDetails}
        style={$linkContainer}
        accessibilityRole="button"
        accessibilityLabel={`View full report for ${statDefinition.name}`}
      >
        <Text style={$linkText}>Full Report</Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={WARNING_ACCENT} />
      </Pressable>
    </View>
  )
}

const $container: ViewStyle = {
  backgroundColor: WARNING_BACKGROUND,
  borderRadius: 12,
  padding: 16,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $contentRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
}

const $icon: ViewStyle = {
  marginRight: 12,
}

const $textContainer: ViewStyle = {
  flex: 1,
}

const $labelText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  color: WARNING_ACCENT,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 2,
}

const $statName: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: "#92400E",
  marginBottom: 2,
}

const $valueText: TextStyle = {
  fontSize: 14,
  color: "#B45309",
}

const $linkContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $linkText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: WARNING_ACCENT,
}
