/**
 * ObservationCard Component
 *
 * Displays an O&M observation with its property info, value, status, and metadata.
 * Used to show radon zones, Lyme disease status, and other location-based observations.
 */

import { Linking, Pressable, StyleProp, View, ViewStyle, TextStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import {
  type ObservationWithStatus,
  formatObservationValue,
  getObservedPropertyCategoryDisplayName,
} from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"
import { getCategoryIcon, formatObservationDate, getStatusColorKey } from "@/utils/observations"

import { StatusIndicator } from "./StatusIndicator"
import { Text } from "./Text"

export interface ObservationCardProps {
  /**
   * The observation with computed status
   */
  observation: ObservationWithStatus
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
  /**
   * Callback when the card is pressed
   */
  onPress?: () => void
}

/**
 * A card component that displays an O&M observation with its property info,
 * current value, safety status, and source attribution.
 *
 * @example
 * <ObservationCard
 *   observation={observationWithStatus}
 *   onPress={() => navigation.navigate('ObservationDetail', { ... })}
 * />
 */
export function ObservationCard(props: ObservationCardProps) {
  const { observation, style, onPress } = props
  const { theme } = useAppTheme()

  const property = observation.property
  if (!property) return null

  const value = formatObservationValue(observation, property)
  const categoryName = getObservedPropertyCategoryDisplayName(property.category)
  const iconName = getCategoryIcon(property.category)

  const handleSourcePress = () => {
    if (observation.sourceUrl) {
      Linking.openURL(observation.sourceUrl)
    }
  }

  const statusColorKey = getStatusColorKey(observation.status)

  const $container: ViewStyle = {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.palette.neutral800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors[statusColorKey],
  }

  const $header: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  }

  const $iconContainer: ViewStyle = {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.palette.neutral200,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  }

  const $headerText: ViewStyle = {
    flex: 1,
  }

  const $propertyName: TextStyle = {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  }

  const $categoryText: TextStyle = {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 2,
  }

  const $valueRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  }

  const $valueText: TextStyle = {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  }

  const $statusLabel: TextStyle = {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
    color: theme.colors[statusColorKey],
    marginLeft: 6,
  }

  const $statusContainer: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
  }

  const $description: TextStyle = {
    fontSize: 14,
    color: theme.colors.textDim,
    lineHeight: 20,
    marginBottom: 8,
  }

  const $footer: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: theme.colors.palette.neutral200,
    paddingTop: 8,
    marginTop: 4,
  }

  const $sourceButton: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
  }

  const $sourceText: TextStyle = {
    fontSize: 12,
    color: theme.colors.tint,
  }

  const $dateText: TextStyle = {
    fontSize: 12,
    color: theme.colors.textDim,
  }

  const $sourceIcon: ViewStyle = {
    marginRight: 4,
  }

  const Wrapper = onPress ? Pressable : View
  const wrapperProps = onPress
    ? { onPress, style: [$container, style], accessibilityRole: "button" as const }
    : { style: [$container, style] }

  return (
    <Wrapper {...wrapperProps}>
      <View style={$header}>
        <View style={$iconContainer}>
          <MaterialCommunityIcons name={iconName} size={20} color={theme.colors.tint} />
        </View>
        <View style={$headerText}>
          <Text style={$propertyName}>{property.name}</Text>
          <Text style={$categoryText}>{categoryName}</Text>
        </View>
      </View>

      <View style={$valueRow}>
        <Text style={$valueText}>{value}</Text>
        <View style={$statusContainer}>
          <StatusIndicator status={observation.status} size="medium" />
          <Text style={$statusLabel}>{observation.status}</Text>
        </View>
      </View>

      {property.description ? <Text style={$description}>{property.description}</Text> : null}

      <View style={$footer}>
        {observation.source ? (
          observation.sourceUrl ? (
            <Pressable
              style={$sourceButton}
              onPress={handleSourcePress}
              accessibilityLabel={`Open source: ${observation.source}`}
              accessibilityRole="link"
            >
              <MaterialCommunityIcons
                name="open-in-new"
                size={14}
                color={theme.colors.tint}
                style={$sourceIcon}
              />
              <Text style={$sourceText}>{observation.source}</Text>
            </Pressable>
          ) : (
            <Text style={$dateText}>Source: {observation.source}</Text>
          )
        ) : (
          <View />
        )}
        <Text style={$dateText}>Updated: {formatObservationDate(observation.observedAt)}</Text>
      </View>
    </Wrapper>
  )
}
