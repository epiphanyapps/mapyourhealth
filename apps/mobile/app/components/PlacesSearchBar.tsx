/**
 * PlacesSearchBar
 *
 * A search bar component for city and location search.
 *
 * Features:
 * - City/state/county autocomplete search
 * - Location button for GPS-based lookup
 */

import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { SearchSuggestionsDropdown } from "@/components/SearchSuggestionsDropdown"
import { SearchSuggestion } from "@/data/types/safety"
import { useLocationSearch } from "@/hooks/useLocationSearch"
import { useAppTheme } from "@/theme/context"

export interface PlacesSearchBarProps {
  /**
   * Callback when a location is selected from suggestions
   * @param city The city name
   * @param state The state/province code
   * @param country The country code
   */
  onLocationSelect: (city: string, state: string, country: string) => void
  /**
   * Placeholder text
   * @default "Search city or location..."
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
 * PlacesSearchBar component for searching cities and locations
 */
export function PlacesSearchBar(props: PlacesSearchBarProps) {
  const {
    onLocationSelect,
    placeholder = "Search city or location...",
    style,
    showLocationButton = false,
    onLocationPress,
    isLocating = false,
  } = props

  const { theme } = useAppTheme()
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { suggestions, isSearching, search, clearSuggestions, resolveAddressToNearestCity } =
    useLocationSearch()

  /**
   * Handle text input changes
   */
  const handleChangeText = useCallback(
    (text: string) => {
      setInputValue(text)
      if (text.trim().length >= 2) {
        setShowSuggestions(true)
        search(text)
      } else {
        setShowSuggestions(false)
        clearSuggestions()
      }
    },
    [search, clearSuggestions],
  )

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = useCallback(
    async (suggestion: SearchSuggestion) => {
      setShowSuggestions(false)
      clearSuggestions()
      setInputValue("")

      if (suggestion.type === "address" && suggestion.city) {
        // suggestion.city holds the placeId for address suggestions
        const nearest = await resolveAddressToNearestCity(suggestion.city)
        if (nearest) {
          onLocationSelect(nearest.city, nearest.state, nearest.country)
        }
        return
      }

      if (suggestion.city && suggestion.state && suggestion.country) {
        onLocationSelect(suggestion.city, suggestion.state, suggestion.country)
      } else if (suggestion.state && suggestion.country) {
        // State-level selection - use state as city placeholder
        onLocationSelect("", suggestion.state, suggestion.country)
      }
    },
    [onLocationSelect, clearSuggestions, resolveAddressToNearestCity],
  )

  /**
   * Handle search submission (Enter key)
   */
  const handleSubmit = useCallback(() => {
    // If there are suggestions, select the first one
    if (suggestions.length > 0) {
      handleSuggestionSelect(suggestions[0])
    }
  }, [suggestions, handleSuggestionSelect])

  /**
   * Handle dropdown dismiss
   */
  const handleDismiss = useCallback(() => {
    setShowSuggestions(false)
    clearSuggestions()
  }, [clearSuggestions])

  // Styles
  const $wrapper: ViewStyle = {
    position: "relative",
    zIndex: 10,
    marginHorizontal: 16,
    // Web needs higher z-index to escape scroll container stacking
    ...(Platform.OS === "web" && {
      zIndex: 9999,
    }),
  }

  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
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

  const $loadingIndicator: ViewStyle = {
    marginLeft: 8,
  }

  return (
    <View style={[$wrapper, style]}>
      <View style={$container}>
        <View style={$inputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textDim} />
          <TextInput
            value={inputValue}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textDim}
            style={$input}
            returnKeyType="search"
            keyboardType="default"
            autoCapitalize="characters"
            accessibilityLabel="Search cities and locations"
            accessibilityHint="Enter a city or location name to search"
          />
          {isSearching && (
            <ActivityIndicator
              size="small"
              color={theme.colors.textDim}
              style={$loadingIndicator}
            />
          )}
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
      <SearchSuggestionsDropdown
        suggestions={suggestions}
        visible={showSuggestions && suggestions.length > 0}
        onSelect={handleSuggestionSelect}
        onDismiss={handleDismiss}
      />
    </View>
  )
}
