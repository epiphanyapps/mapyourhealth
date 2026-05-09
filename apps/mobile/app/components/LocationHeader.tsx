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

  // Pill chip: tinted background with a hairline border, small letter-spaced
  // label preceded by a × glyph. Reads as part of the page's design language
  // rather than a discovered close affordance.
  const $clearButton: ViewStyle = {
    marginLeft: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${theme.colors.tint}40`, // ~25% alpha hairline
    backgroundColor: `${theme.colors.tint}1A`, // ~10% alpha tint wash
  }

  const $clearButtonHover: ViewStyle = {
    backgroundColor: `${theme.colors.tint}33`, // ~20% alpha on hover
    borderColor: `${theme.colors.tint}80`, // ~50% alpha hairline
  }

  const $clearButtonWeb: ViewStyle | null =
    Platform.OS === "web"
      ? ({
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          cursor: "pointer",
          transitionProperty: "background-color, border-color, transform, opacity",
          transitionDuration: "120ms",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
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

  // Compositor-only feedback (transform + opacity) — safe under reduced motion.
  const $clearButtonPressed: ViewStyle = {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  }

  const $clearGlyph: TextStyle = {
    fontSize: 15,
    lineHeight: 15,
    fontWeight: "400",
    color: theme.colors.tint,
  }

  const $clearLabel: TextStyle = {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.4,
    color: theme.colors.tint,
    // Slight optical alignment with the glyph
    lineHeight: 15,
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
      {onClear ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear Location"
          accessibilityHint="Returns to the search screen"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={(state) => {
            const hovered = (state as { hovered?: boolean }).hovered === true
            const focused = (state as { focused?: boolean }).focused === true
            return [
              $clearButton,
              $clearButtonWeb,
              hovered && $clearButtonHover,
              state.pressed && $clearButtonPressed,
              focused && $clearButtonFocusedWeb,
            ]
          }}
        >
          <Text
            style={$clearGlyph}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            ×
          </Text>
          <Text
            style={$clearLabel}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            Clear
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
