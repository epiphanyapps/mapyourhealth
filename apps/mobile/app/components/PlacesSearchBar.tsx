/**
 * PlacesSearchBar
 *
 * A search bar component for postal code and city search.
 *
 * Features:
 * - Direct postal code entry (US and Canadian formats)
 * - City/state autocomplete search
 * - Location button for GPS-based lookup
 */

import { useState, useCallback, useEffect } from "react"
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

import { SearchSuggestionsDropdown } from "@/components/SearchSuggestionsDropdown"
import { SearchSuggestion } from "@/data/types/safety"
import { useLocationSearch } from "@/hooks/useLocationSearch"
import { useAppTheme } from "@/theme/context"
import { isValidPostalCode, normalizePostalCode } from "@/utils/postalCode"

export interface PlacesSearchBarProps {
  /**
   * Callback when a postal code is entered directly
   * @param postalCode The normalized postal code
   */
  onPostalCodeSelect: (postalCode: string, cityName?: string, state?: string) => void
  /**
   * Callback when a city is selected from suggestions
   * @param city The city name
   * @param state The state/province code
   * @param postalCodes Array of postal codes in this city
   */
  onCitySelect?: (city: string, state: string, postalCodes: string[]) => void
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
  /**
   * Top offset for the dropdown (from top of screen)
   * Accounts for safe area, nav header, and search bar height
   * @default 160
   */
  dropdownTopOffset?: number
}

/**
 * PlacesSearchBar component for searching postal codes and cities
 */
export function PlacesSearchBar(props: PlacesSearchBarProps) {
  const {
    onPostalCodeSelect,
    onCitySelect,
    placeholder = "Enter postal code...",
    style,
    showLocationButton = false,
    onLocationPress,
    isLocating = false,
    dropdownTopOffset = 160,
  } = props

  const { theme } = useAppTheme()
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { suggestions, isSearching, search, clearSuggestions } = useLocationSearch()

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
    (suggestion: SearchSuggestion) => {
      setShowSuggestions(false)
      clearSuggestions()
      setInputValue("")

      if (suggestion.type === "postalCode") {
        // Direct postal code selection
        onPostalCodeSelect(suggestion.postalCodes[0], suggestion.city, suggestion.state)
      } else if (suggestion.type === "city" || suggestion.type === "state") {
        // City or state selection
        if (onCitySelect && suggestion.state) {
          onCitySelect(suggestion.city || "", suggestion.state, suggestion.postalCodes)
        } else if (suggestion.postalCodes.length === 1) {
          // Single location - treat as postal code selection
          onPostalCodeSelect(suggestion.postalCodes[0], suggestion.city, suggestion.state)
        } else {
          // Multiple locations but no onCitySelect - use first postal code
          onPostalCodeSelect(suggestion.postalCodes[0], suggestion.city, suggestion.state)
        }
      }
    },
    [onPostalCodeSelect, onCitySelect, clearSuggestions],
  )

  /**
   * Handle direct postal code submission (Enter key)
   */
  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim()
    if (isValidPostalCode(trimmed)) {
      setShowSuggestions(false)
      clearSuggestions()
      onPostalCodeSelect(normalizePostalCode(trimmed))
      setInputValue("")
    }
  }, [inputValue, onPostalCodeSelect, clearSuggestions])

  /**
   * Handle dropdown dismiss
   */
  const handleDismiss = useCallback(() => {
    setShowSuggestions(false)
    clearSuggestions()
  }, [clearSuggestions])

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

  const $loadingIndicator: ViewStyle = {
    marginLeft: 8,
  }

  return (
    <>
      <View style={[$container, style]}>
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
            accessibilityLabel="Search postal codes and cities"
            accessibilityHint="Enter a postal code or city name to search"
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
        topOffset={dropdownTopOffset}
      />
    </>
  )
}
