/**
 * ObservationCard Component
 *
 * Displays an O&M observation with its property info, value, status, and metadata.
 * Used to show radon zones, Lyme disease status, and other location-based observations.
 */

import { useCallback } from "react"
import { Linking, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
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
  /**
   * Test ID for E2E testing
   */
  testID?: string
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
  const { observation, style, onPress, testID } = props
  const { theme } = useAppTheme()

  const property = observation.property
  const sourceUrl = observation.sourceUrl

  const handleSourcePress = useCallback(async () => {
    if (sourceUrl) {
      try {
        const canOpen = await Linking.canOpenURL(sourceUrl)
        if (canOpen) {
          await Linking.openURL(sourceUrl)
        }
      } catch {
        // Silently fail if URL cannot be opened
      }
    }
  }, [sourceUrl])

  if (!property) return null

  const value = formatObservationValue(observation, property)
  const categoryName = getObservedPropertyCategoryDisplayName(property.category)
  const iconName = getCategoryIcon(property.category)
  const statusColorKey = getStatusColorKey(observation.status)

  const Wrapper = onPress ? Pressable : View
  const wrapperProps = onPress
    ? {
        onPress,
        style: [
          styles.container,
          {
            backgroundColor: theme.colors.background,
            borderLeftColor: theme.colors[statusColorKey],
            shadowColor: theme.colors.palette.neutral800,
          },
          style,
        ],
        accessibilityRole: "button" as const,
        testID,
      }
    : {
        style: [
          styles.container,
          {
            backgroundColor: theme.colors.background,
            borderLeftColor: theme.colors[statusColorKey],
            shadowColor: theme.colors.palette.neutral800,
          },
          style,
        ],
        testID,
      }

  return (
    <Wrapper {...wrapperProps}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.palette.neutral200 }]}>
          <MaterialCommunityIcons name={iconName} size={20} color={theme.colors.tint} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.propertyName, { color: theme.colors.text }]}>{property.name}</Text>
          <Text style={[styles.categoryText, { color: theme.colors.textDim }]}>{categoryName}</Text>
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.valueText, { color: theme.colors.text }]}>{value}</Text>
        <View style={styles.statusContainer}>
          <StatusIndicator status={observation.status} size="medium" />
          <Text style={[styles.statusLabel, { color: theme.colors[statusColorKey] }]}>
            {observation.status}
          </Text>
        </View>
      </View>

      {property.description ? (
        <Text style={[styles.description, { color: theme.colors.textDim }]}>
          {property.description}
        </Text>
      ) : null}

      <View style={[styles.footer, { borderTopColor: theme.colors.palette.neutral200 }]}>
        {observation.source ? (
          observation.sourceUrl ? (
            <Pressable
              style={styles.sourceButton}
              onPress={handleSourcePress}
              accessibilityLabel={`Open source: ${observation.source}`}
              accessibilityRole="link"
              testID={testID ? `${testID}-source-link` : undefined}
            >
              <MaterialCommunityIcons
                name="open-in-new"
                size={14}
                color={theme.colors.tint}
                style={styles.sourceIcon}
              />
              <Text style={[styles.sourceText, { color: theme.colors.tint }]}>
                {observation.source}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.dateText, { color: theme.colors.textDim }]}>
              Source: {observation.source}
            </Text>
          )
        ) : (
          <View />
        )}
        <Text style={[styles.dateText, { color: theme.colors.textDim }]}>
          Updated: {formatObservationDate(observation.observedAt)}
        </Text>
      </View>
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  categoryText: {
    fontSize: 12,
    marginTop: 2,
  },
  container: {
    borderLeftWidth: 4,
    borderRadius: 12,
    elevation: 2,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dateText: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginRight: 12,
    width: 36,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: "600",
  },
  sourceButton: {
    alignItems: "center",
    flexDirection: "row",
  },
  sourceIcon: {
    marginRight: 4,
  },
  sourceText: {
    fontSize: 12,
  },
  statusContainer: {
    alignItems: "center",
    flexDirection: "row",
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
    textTransform: "capitalize",
  },
  valueRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  valueText: {
    fontSize: 20,
    fontWeight: "700",
  },
})
