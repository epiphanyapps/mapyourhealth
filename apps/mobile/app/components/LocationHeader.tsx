import { View, ViewStyle, TextStyle, StyleProp } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Text } from "./Text"
import { useAppTheme } from "@/theme/context"

export interface LocationHeaderProps {
  /**
   * The zip code to display prominently
   */
  zipCode: string
  /**
   * The city/area name to display below the zip code
   */
  cityName: string
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
 * <LocationHeader zipCode="90210" cityName="Beverly Hills, CA" />
 */
export function LocationHeader(props: LocationHeaderProps) {
  const { zipCode, cityName, style } = props
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

  const $zipCodeText: TextStyle = {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    lineHeight: 34,
  }

  const $cityNameText: TextStyle = {
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
        <Text style={$zipCodeText} accessibilityRole="header">
          {zipCode}
        </Text>
        <Text style={$cityNameText}>{cityName}</Text>
      </View>
    </View>
  )
}
