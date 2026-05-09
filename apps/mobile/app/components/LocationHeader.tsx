import { Platform, Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native"
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
   * Optional callback. When provided, renders a clear (×) button on the
   * trailing edge of the row that invokes this callback. Used to reset the
   * dashboard to its empty / search state.
   */
  onClear?: () => void
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
  const { locationName, secondaryText, onClear, style } = props
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

  const $clearButton: ViewStyle = {
    marginLeft: 8,
    padding: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  }

  const $clearButtonWeb: ViewStyle | null =
    Platform.OS === "web"
      ? ({
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          cursor: "pointer",
        } as ViewStyle)
      : null

  const $clearButtonFocusedWeb: ViewStyle | null =
    Platform.OS === "web"
      ? ({
          outlineWidth: 2,
          outlineStyle: "solid",
          outlineColor: theme.colors.tint,
          outlineOffset: 2,
        } as ViewStyle)
      : null

  const $clearButtonPressed: ViewStyle = { opacity: 0.6 }

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
      {onClear ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear location"
          accessibilityHint="Returns to the search screen"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={(state) => {
            const focused = (state as { focused?: boolean }).focused === true
            return [
              $clearButton,
              $clearButtonWeb,
              state.pressed && $clearButtonPressed,
              focused && $clearButtonFocusedWeb,
            ]
          }}
        >
          {(state) => {
            const hovered = (state as { hovered?: boolean }).hovered === true
            const focused = (state as { focused?: boolean }).focused === true
            return (
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={hovered || focused ? theme.colors.text : theme.colors.textDim}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            )
          }}
        </Pressable>
      ) : null}
    </View>
  )
}
