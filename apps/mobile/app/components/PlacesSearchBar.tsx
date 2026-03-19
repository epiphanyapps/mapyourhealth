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
  } = props

  const { theme } = useAppTheme()
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  // Track whether user is actively editing (to hide selected location display)
  const [isEditing, setIsEditing] = useState(false)
  // Track state drill-down mode: when a state is selected, show its cities
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null)
  const [stateCities, setStateCities] = useState<SearchSuggestion[]>([])

  // Display value: show input when editing, otherwise show selected location
  const displayValue = isEditing
    ? inputValue
    : selectedLocation?.city
      ? `${selectedLocation.city}, ${selectedLocation.state}`
      : ""

  const {
    suggestions,
    isSearching,
    search,
    clearSuggestions,
    resolveAddressToNearestCity,
    getCitiesForState,
    error,
  } = useLocationSearch()

  // Determine which suggestions to show: state cities or normal search results
  const activeSuggestions = selectedStateName ? stateCities : suggestions

  /**
   * Handle text input changes
   */
  const handleChangeText = useCallback(
    (text: string) => {
      setIsEditing(true)
      setInputValue(text)
      // Exit state drill-down mode when user types
      if (selectedStateName) {
        setSelectedStateName(null)
        setStateCities([])
      }
      if (text.trim().length >= 2) {
        setShowSuggestions(true)
        search(text)
      } else {
        setShowSuggestions(false)
        clearSuggestions()
      }
    },
    [search, clearSuggestions, selectedStateName],
  )

  /**
   * Handle back button press in state drill-down mode
   */
  const handleStateBackPress = useCallback(() => {
    setSelectedStateName(null)
    setStateCities([])
    // Restore normal search suggestions if there's input
    if (inputValue.trim().length >= 2) {
      search(inputValue)
    }
  }, [inputValue, search])

  const handleSuggestionSelect = useCallback(
    async (suggestion: SearchSuggestion) => {
      // When a state is selected, show its cities instead of navigating
      if (suggestion.type === "state" && suggestion.state) {
        const cities = getCitiesForState(suggestion.state)
        setSelectedStateName(suggestion.displayText)
        setStateCities(cities)
        setShowSuggestions(true)
        clearSuggestions()
        return
      }

      setShowSuggestions(false)
      clearSuggestions()
      setSelectedStateName(null)
      setStateCities([])
      // Exit editing mode - the selected location will be shown via displayValue
      setIsEditing(false)
      setInputValue("")

      if (suggestion.type === "address" && suggestion.placeId) {
        // Use placeId to resolve address to nearest city in our database
        const nearest = await resolveAddressToNearestCity(suggestion.placeId)
        if (nearest) {
          // Pass the original searched address for display
          onLocationSelect(nearest.city, nearest.state, nearest.country, suggestion.displayText)
        } else {
          // Resolution failed — re-enter editing so user can retry
          setIsEditing(true)
          setInputValue(suggestion.displayText)
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
    [onLocationSelect, clearSuggestions, resolveAddressToNearestCity, getCitiesForState],
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
    setSelectedStateName(null)
    setStateCities([])
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
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        )}
      </View>
      <SearchSuggestionsDropdown
        suggestions={activeSuggestions}
        visible={showSuggestions || !!selectedStateName}
        onSelect={handleSuggestionSelect}
        onDismiss={handleDismiss}
        isLoading={isSearching && !selectedStateName}
        error={selectedStateName ? null : error}
        headerText={selectedStateName ? `Cities in ${selectedStateName}` : null}
        onBackPress={handleStateBackPress}
      />
    </View>
  )
}
