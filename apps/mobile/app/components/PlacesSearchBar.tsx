/**
 * PlacesSearchBar
 *
 * A search bar component for postal code entry.
 *
 * Features:
 * - Direct postal code entry (US and Canadian formats)
 * - Location button for GPS-based lookup
 */

import { useState, useCallback } from "react"
import {
  View,
  TextInput,
  ViewStyle,
  TextStyle,
  StyleProp,
  Pressable,
  ActivityIndicator,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { useAppTheme } from "@/theme/context"
import { isValidPostalCode, normalizePostalCode } from "@/utils/postalCode"

export interface PlacesSearchBarProps {
  /**
   * Callback when a postal code is entered
   * @param postalCode The normalized postal code
   */
  onPostalCodeSelect: (postalCode: string, cityName?: string, state?: string) => void
  /**
   * Placeholder text
   * @default "Enter postal code..."
   */
  placeholder?: string
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
  /**
   * Whether to show the location button
   * @default false
   */
  showLocationButton?: boolean
  /**
   * Callback when location button is pressed
   */
  onLocationPress?: () => void
  /**
   * Whether location is currently being fetched
   * @default false
   */
  isLocating?: boolean
}

/**
 * PlacesSearchBar component for searching postal codes
 */
export function PlacesSearchBar(props: PlacesSearchBarProps) {
  const {
    onPostalCodeSelect,
    placeholder = "Enter postal code...",
    style,
    showLocationButton = false,
    onLocationPress,
    isLocating = false,
  } = props

  const { theme } = useAppTheme()
  const [inputValue, setInputValue] = useState("")

  /**
   * Handle postal code submission
   */
  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim()
    if (isValidPostalCode(trimmed)) {
      onPostalCodeSelect(normalizePostalCode(trimmed))
      setInputValue("")
    }
  }, [inputValue, onPostalCodeSelect])

  // Styles
  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  }

  const $locationButton: ViewStyle = {
    padding: 10,
    marginLeft: 8,
    backgroundColor: theme.colors.tint,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  }

  const $inputContainer: ViewStyle = {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.palette.neutral200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  }

  const $input: TextStyle = {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    padding: 0,
    marginLeft: 8,
  }

  return (
    <View style={[$container, style]}>
      <View style={$inputContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textDim} />
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textDim}
          style={$input}
          returnKeyType="search"
          keyboardType="default"
          autoCapitalize="characters"
          accessibilityLabel="Search postal codes"
          accessibilityHint="Enter a postal code (US or Canadian) to search"
        />
      </View>
      {showLocationButton && (
        <Pressable
          onPress={onLocationPress}
          disabled={isLocating}
          style={({ pressed }) => [
            $locationButton,
            pressed && { opacity: 0.8 },
            isLocating && { opacity: 0.6 },
          ]}
          accessibilityLabel="Use my location"
          accessibilityRole="button"
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      )}
    </View>
  )
}
