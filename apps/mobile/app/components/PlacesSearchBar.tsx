/**
 * PlacesSearchBar
 *
 * A search bar component for city and location search.
 * Uses Google Places API as the primary search mechanism.
 *
 * Features:
 * - Google Places autocomplete via backend proxy
 * - Location button for GPS-based lookup
 * - Resolves places to city/state/country with jurisdiction and data availability
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
import { Text } from "@/components/Text"
import { SearchSuggestion } from "@/data/types/safety"
import { useLocationSearch } from "@/hooks/useLocationSearch"
import { useAppTheme } from "@/theme/context"

export interface PlacesSearchBarProps {
  /**
   * Callback when a location is selected from suggestions
   * @param city The city name
   * @param state The state/province code
   * @param country The country code
   * @param searchedAddress Optional - the original address searched (for address suggestions)
   */
  onLocationSelect: (city: string, state: string, country: string, searchedAddress?: string) => void
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
  /**
   * Currently selected location to display in the input
   * Shows as the input value when not actively searching
   */
  selectedLocation?: { city: string; state: string } | null
  /**
   * Location error message to display below the search bar
   */
  locationError?: string
  /**
   * Callback to dismiss the location error
   */
  onLocationErrorDismiss?: () => void
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
    selectedLocation,
    locationError,
    onLocationErrorDismiss,
  } = props

  const { theme } = useAppTheme()
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  // Track whether user is actively editing (to hide selected location display)
  const [isEditing, setIsEditing] = useState(false)
  // While resolvePlace is in flight after a tap, show the suggestion label so
  // the user gets immediate feedback instead of an empty/frozen-feeling input.
  const [resolvingLabel, setResolvingLabel] = useState<string | null>(null)

  // Display value: resolving label > active input > selected location
  const displayValue =
    resolvingLabel ??
    (isEditing
      ? inputValue
      : selectedLocation?.city
        ? `${selectedLocation.city}, ${selectedLocation.state}`
        : "")

  const { suggestions, isSearching, search, clearSuggestions, resolvePlace, prefetchPlace, error } =
    useLocationSearch()

  /**
   * Handle text input changes
   */
  const handleChangeText = useCallback(
    (text: string) => {
      setIsEditing(true)
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

  // Fire a background resolve on press-in so the result is ready (or in flight)
  // by the time the user releases the press.
  const handleSuggestionPrefetch = useCallback(
    (suggestion: SearchSuggestion) => {
      if (suggestion.placeId) {
        prefetchPlace(suggestion.placeId)
      }
    },
    [prefetchPlace],
  )

  const handleSuggestionSelect = useCallback(
    async (suggestion: SearchSuggestion) => {
      setShowSuggestions(false)
      clearSuggestions()
      // Exit editing mode - the selected location will be shown via displayValue
      setIsEditing(false)
      setInputValue("")

      if (suggestion.placeId) {
        // Show the suggestion text in the input while we wait so the tap
        // does not feel like a freeze.
        setResolvingLabel(suggestion.displayText)
        const resolved = await resolvePlace(suggestion.placeId)
        setResolvingLabel(null)
        if (resolved) {
          onLocationSelect(resolved.city, resolved.state, resolved.country, suggestion.displayText)
        } else {
          // Resolution failed — re-enter editing so user can retry
          setIsEditing(true)
          setInputValue(suggestion.displayText)
        }
        return
      }

      // Fallback for suggestions that already have city/state/country
      if (suggestion.city && suggestion.state && suggestion.country) {
        onLocationSelect(suggestion.city, suggestion.state, suggestion.country)
      } else if (suggestion.state && suggestion.country) {
        // State-level selection
        onLocationSelect("", suggestion.state, suggestion.country)
      }
    },
    [onLocationSelect, clearSuggestions, resolvePlace],
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

  const $errorBanner: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  }

  const $errorText: TextStyle = {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
    marginLeft: 8,
  }

  const $errorDismiss: ViewStyle = {
    padding: 4,
    marginLeft: 4,
  }

  return (
    <View style={[$wrapper, style]}>
      <View style={$container}>
        <View style={$inputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textDim} />
          <TextInput
            value={displayValue}
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
            onFocus={() => setIsEditing(true)}
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
              <ActivityIndicator size="small" color={theme.colors.palette.neutral100} />
            ) : (
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={20}
                color={theme.colors.palette.neutral100}
              />
            )}
          </Pressable>
        )}
      </View>
      {locationError ? (
        <View style={$errorBanner}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={18}
            color={theme.colors.error}
          />
          <Text style={$errorText}>{locationError}</Text>
          {onLocationErrorDismiss && (
            <Pressable onPress={onLocationErrorDismiss} style={$errorDismiss}>
              <MaterialCommunityIcons name="close" size={16} color={theme.colors.error} />
            </Pressable>
          )}
        </View>
      ) : null}
      <SearchSuggestionsDropdown
        suggestions={suggestions}
        visible={showSuggestions}
        onSelect={handleSuggestionSelect}
        onPrefetch={handleSuggestionPrefetch}
        onDismiss={handleDismiss}
        isLoading={isSearching}
        error={error}
      />
    </View>
  )
}
