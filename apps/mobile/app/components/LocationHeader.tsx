import { StyleProp, TextStyle, View, ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { useAppTheme } from "@/theme/context"

import { Text } from "./Text"

export interface LocationHeaderProps {
  /**
   * The location name to display prominently (city, state)
   */
  locationName: string
  /**
   * Secondary text (e.g., county, country)
   */
  secondaryText: string
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A header component that displays the current location (zip code and city name)
 * with a location pin icon.
 *
 * @example
 * <LocationHeader locationName="Beverly Hills, CA" secondaryText="Los Angeles County" />
 */
export function LocationHeader(props: LocationHeaderProps) {
  const { locationName, secondaryText, style } = props
  const { theme } = useAppTheme()

  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  }

  const $iconContainer: ViewStyle = {
    marginRight: 12,
  }

  const $textContainer: ViewStyle = {
    flex: 1,
  }

  const $locationNameText: TextStyle = {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    lineHeight: 30,
  }

  const $secondaryTextStyle: TextStyle = {
    fontSize: 16,
    color: theme.colors.textDim,
    marginTop: 2,
  }

  return (
    <View style={[$container, style]}>
      <View style={$iconContainer}>
        <MaterialCommunityIcons
          name="map-marker"
          size={32}
          color={theme.colors.tint}
          accessibilityLabel="Location"
        />
      </View>
      <View style={$textContainer}>
        <Text style={$locationNameText} accessibilityRole="header">
          {locationName}
        </Text>
        <Text style={$secondaryTextStyle}>{secondaryText}</Text>
      </View>
    </View>
  )
}
