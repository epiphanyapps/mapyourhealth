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
   * City name
   */
  city: string
  /**
   * State abbreviation
   */
  state: string
  /**
   * Country code
   */
  country: string
  /**
   * County/region (optional)
   */
  county?: string
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
 *   city="Beverly Hills"
 *   state="CA"
 *   country="US"
 *   onDelete={() => handleDelete(subscription.id)}
 * />
 */
export function SubscriptionCard(props: SubscriptionCardProps) {
  const { city, state, country, county, onDelete, isDeleting = false } = props

  const { theme } = useAppTheme()

  const locationName = `${city}, ${state}`

  function handleDeletePress() {
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

  const $cityText: TextStyle = {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  }

  const $stateCountry: TextStyle = {
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
        <Text style={$cityText}>{locationName}</Text>
        {county && <Text style={$stateCountry}>{county}</Text>}
        <Text style={$stateCountry}>{country === "CA" ? "Canada" : "United States"}</Text>
      </View>

      <Pressable
        onPress={handleDeletePress}
        style={$deleteButton}
        disabled={isDeleting}
        accessibilityLabel={`Remove ${locationName} subscription`}
        accessibilityRole="button"
        accessibilityHint="Double tap to remove this location from your subscriptions"
      >
        <MaterialCommunityIcons name="trash-can-outline" size={24} color={theme.colors.error} />
      </Pressable>
    </View>
  )
}
