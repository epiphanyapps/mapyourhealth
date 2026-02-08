/**
 * SubscriptionCard
 *
 * Displays a zip code subscription as a card with delete functionality.
 * Shows zip code prominently with city/state info and a remove button.
 */

import { Alert, Pressable, TextStyle, View, ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export interface SubscriptionCardProps {
  /**
   * The zip code for this subscription
   */
  zipCode: string
  /**
   * City name for the zip code
   */
  cityName?: string
  /**
   * State abbreviation
   */
  state?: string
  /**
   * Callback when the delete button is pressed (after confirmation)
   */
  onDelete: () => void
  /**
   * Whether the card is in a loading/deleting state
   */
  isDeleting?: boolean
}

/**
 * SubscriptionCard displays a user's zip code subscription with the ability to remove it.
 *
 * @example
 * <SubscriptionCard
 *   zipCode="90210"
 *   cityName="Beverly Hills"
 *   state="CA"
 *   onDelete={() => handleDelete(subscription.id)}
 * />
 */
export function SubscriptionCard(props: SubscriptionCardProps) {
  const { zipCode, cityName, state, onDelete, isDeleting = false } = props

  const { theme } = useAppTheme()

  function handleDeletePress() {
    const locationName =
      cityName && cityName !== "Unknown" ? `${cityName}${state ? `, ${state}` : ""}` : zipCode

    Alert.alert(
      "Remove Subscription",
      `Are you sure you want to stop monitoring ${locationName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: onDelete,
        },
      ],
    )
  }

  // Styles
  const $card: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.palette.neutral100,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.palette.neutral300,
  }

  const $locationIcon: ViewStyle = {
    marginRight: 12,
  }

  const $contentContainer: ViewStyle = {
    flex: 1,
  }

  const $zipCode: TextStyle = {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  }

  const $cityState: TextStyle = {
    fontSize: 14,
    color: theme.colors.textDim,
    marginTop: 2,
  }

  const $deleteButton: ViewStyle = {
    padding: 8,
    marginLeft: 8,
    opacity: isDeleting ? 0.5 : 1,
  }

  return (
    <View style={$card}>
      <View style={$locationIcon}>
        <MaterialCommunityIcons
          name="map-marker"
          size={28}
          color={theme.colors.tint}
          accessibilityLabel="Location"
        />
      </View>

      <View style={$contentContainer}>
        <Text style={$zipCode}>{zipCode}</Text>
        {cityName && cityName !== "Unknown" && (
          <Text style={$cityState}>
            {cityName}
            {state ? `, ${state}` : ""}
          </Text>
        )}
      </View>

      <Pressable
        onPress={handleDeletePress}
        style={$deleteButton}
        disabled={isDeleting}
        accessibilityLabel={`Remove ${zipCode} subscription`}
        accessibilityRole="button"
        accessibilityHint="Double tap to remove this zip code from your subscriptions"
      >
        <MaterialCommunityIcons name="trash-can-outline" size={24} color={theme.colors.error} />
      </Pressable>
    </View>
  )
}
