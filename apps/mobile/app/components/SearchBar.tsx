import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { useAppTheme } from "@/theme/context"

export interface SearchBarProps {
  /**
   * Current value of the search input
   */
  value?: string
  /**
   * Callback when the search text changes
   */
  onChangeText?: (text: string) => void
  /**
   * Callback when the search is submitted
   */
  onSubmit?: () => void
  /**
   * Placeholder text
   * @default "Search locations..."
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
 * A search bar component for searching zip codes.
 *
 * @example
 * <SearchBar
 *   value={searchText}
 *   onChangeText={setSearchText}
 * />
 */
export function SearchBar(props: SearchBarProps) {
  const {
    value,
    onChangeText,
    onSubmit,
    placeholder = "Search locations...",
    style,
    showLocationButton = false,
    onLocationPress,
    isLocating = false,
  } = props
  const { theme } = useAppTheme()

  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  }

  const $searchInputContainer: ViewStyle = {
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

  const $searchIcon: ViewStyle = {
    marginRight: 8,
  }

  const $input: TextStyle = {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    padding: 0,
  }

  const $locationButton: ViewStyle = {
    padding: 10,
    marginLeft: 8,
    backgroundColor: theme.colors.tint,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  }

  return (
    <View style={[$container, style]}>
      <View style={$searchInputContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={theme.colors.textDim}
          style={$searchIcon}
          accessibilityLabel="Search"
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textDim}
          style={$input}
          returnKeyType="search"
          keyboardType="default"
          autoCapitalize="characters"
          accessibilityLabel="Search locations"
          accessibilityHint="Enter a city or location name to search"
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
          accessibilityHint="Get location from your current GPS position"
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
