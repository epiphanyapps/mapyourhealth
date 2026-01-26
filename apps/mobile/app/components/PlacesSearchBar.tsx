/**
 * PlacesSearchBar
 *
 * A search bar component that provides Google Places Autocomplete for city/postal code search.
 * Falls back to direct postal code entry if Google Places API is not configured.
 *
 * Features:
 * - City autocomplete (e.g., "Miami" → "Miami, FL")
 * - Postal code autocomplete (e.g., "33139" → "33139, Miami Beach, FL")
 * - Direct postal code entry fallback
 * - Location button for GPS-based lookup
 */

import { useRef, useState, useCallback } from "react"
import {
  View,
  TextInput,
  ViewStyle,
  TextStyle,
  StyleProp,
  Pressable,
  ActivityIndicator,
  Platform,
  Keyboard,
} from "react-native"
import { GooglePlacesAutocomplete, GooglePlaceData, GooglePlaceDetail } from "react-native-google-places-autocomplete"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { getGooglePlacesApiKey, isGooglePlacesEnabled, GooglePlacesConfig } from "@/config/google"
import { useAppTheme } from "@/theme/context"
import { isValidPostalCode, normalizePostalCode } from "@/utils/postalCode"

export interface PlacesSearchBarProps {
  /**
   * Callback when a postal code is selected or entered
   * @param postalCode The normalized postal code
   * @param cityName Optional city name from the selected place
   * @param state Optional state/province code from the selected place
   */
  onPostalCodeSelect: (postalCode: string, cityName?: string, state?: string) => void
  /**
   * Placeholder text
   * @default "Search city or postal code..."
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
 * Extract postal code from Google Places result
 * Looks for postal_code in address_components
 */
function extractPostalCode(details: GooglePlaceDetail | null): string | null {
  if (!details?.address_components) return null

  const postalCodeComponent = details.address_components.find((component) =>
    component.types.includes("postal_code"),
  )

  return postalCodeComponent?.long_name || null
}

/**
 * Extract city name from Google Places result
 */
function extractCityName(details: GooglePlaceDetail | null): string | null {
  if (!details?.address_components) return null

  // Try locality first, then sublocality, then administrative_area_level_2
  const cityComponent =
    details.address_components.find((c) => c.types.includes("locality")) ||
    details.address_components.find((c) => c.types.includes("sublocality")) ||
    details.address_components.find((c) => c.types.includes("administrative_area_level_2"))

  return cityComponent?.long_name || null
}

/**
 * Extract state/province code from Google Places result
 */
function extractState(details: GooglePlaceDetail | null): string | null {
  if (!details?.address_components) return null

  const stateComponent = details.address_components.find((c) =>
    c.types.includes("administrative_area_level_1"),
  )

  return stateComponent?.short_name || null
}

/**
 * PlacesSearchBar component for searching cities and postal codes
 */
export function PlacesSearchBar(props: PlacesSearchBarProps) {
  const {
    onPostalCodeSelect,
    placeholder = "Search city or postal code...",
    style,
    showLocationButton = false,
    onLocationPress,
    isLocating = false,
  } = props

  const { theme } = useAppTheme()
  const googlePlacesRef = useRef<any>(null)
  const [directInputValue, setDirectInputValue] = useState("")
  const [showFallbackInput, setShowFallbackInput] = useState(!isGooglePlacesEnabled())

  const apiKey = getGooglePlacesApiKey()

  // Debug logging for Google Places API
  if (__DEV__ || Platform.OS === "web") {
    console.log("[PlacesSearchBar] Google Places enabled:", isGooglePlacesEnabled())
    console.log("[PlacesSearchBar] API key present:", apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : "No")
  }

  /**
   * Handle selection from Google Places autocomplete
   */
  const handlePlaceSelect = useCallback(
    (data: GooglePlaceData, details: GooglePlaceDetail | null) => {
      const postalCode = extractPostalCode(details)
      const cityName = extractCityName(details)
      const state = extractState(details)

      if (postalCode) {
        // We found a postal code in the result
        onPostalCodeSelect(normalizePostalCode(postalCode), cityName || undefined, state || undefined)
        googlePlacesRef.current?.setAddressText("")
      } else if (data.description) {
        // No postal code found - check if the input itself is a postal code
        const inputText = googlePlacesRef.current?.getAddressText() || ""
        if (isValidPostalCode(inputText)) {
          onPostalCodeSelect(normalizePostalCode(inputText), cityName || undefined, state || undefined)
          googlePlacesRef.current?.setAddressText("")
        } else {
          // Selected a city without postal code - user may want to browse
          // For now, just clear and let them refine their search
          googlePlacesRef.current?.setAddressText("")
        }
      }
      Keyboard.dismiss()
    },
    [onPostalCodeSelect],
  )

  /**
   * Handle direct postal code entry (fallback or manual submit)
   */
  const handleDirectSubmit = useCallback(() => {
    const trimmed = directInputValue.trim()
    if (isValidPostalCode(trimmed)) {
      onPostalCodeSelect(normalizePostalCode(trimmed))
      setDirectInputValue("")
    }
  }, [directInputValue, onPostalCodeSelect])

  /**
   * Handle text change in Google Places input
   * Check if user typed a valid postal code directly
   */
  const handleTextChange = useCallback(
    (text: string) => {
      console.log("[PlacesSearchBar] Text changed:", text, "Length:", text.length)
      // If user entered a valid postal code and presses space/enter, submit it
      if (isValidPostalCode(text.trim()) && (text.endsWith(" ") || text.endsWith("\n"))) {
        onPostalCodeSelect(normalizePostalCode(text.trim()))
        googlePlacesRef.current?.setAddressText("")
        Keyboard.dismiss()
      }
    },
    [onPostalCodeSelect],
  )

  // Styles
  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  }

  const $searchContainer: ViewStyle = {
    flex: 1,
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

  const $fallbackInputContainer: ViewStyle = {
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

  const $fallbackInput: TextStyle = {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    padding: 0,
    marginLeft: 8,
  }

  // Fallback to simple TextInput if Google Places is not configured
  if (showFallbackInput) {
    return (
      <View style={[$container, style]}>
        <View style={$fallbackInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textDim} />
          <TextInput
            value={directInputValue}
            onChangeText={setDirectInputValue}
            onSubmitEditing={handleDirectSubmit}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textDim}
            style={$fallbackInput}
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

  // Google Places Autocomplete
  return (
    <View style={[$container, style]}>
      <View style={$searchContainer}>
        <GooglePlacesAutocomplete
          ref={googlePlacesRef}
          placeholder={placeholder}
          onPress={handlePlaceSelect}
          textInputProps={{
            onChangeText: handleTextChange,
            autoCapitalize: "characters",
            returnKeyType: "search",
            onSubmitEditing: () => {
              const text = googlePlacesRef.current?.getAddressText() || ""
              if (isValidPostalCode(text.trim())) {
                onPostalCodeSelect(normalizePostalCode(text.trim()))
                googlePlacesRef.current?.setAddressText("")
                Keyboard.dismiss()
              }
            },
          }}
          query={{
            key: apiKey,
            language: GooglePlacesConfig.language,
            components: GooglePlacesConfig.countries.map((c) => `country:${c}`).join("|"),
            types: GooglePlacesConfig.types.join("|"),
          }}
          onFail={(error) => {
            console.error("[PlacesSearchBar] Google Places API error:", error)
          }}
          onNotFound={() => {
            console.log("[PlacesSearchBar] No results found")
          }}
          onTimeout={() => {
            console.error("[PlacesSearchBar] Request timed out")
          }}
          fetchDetails={true}
          enablePoweredByContainer={false}
          debounce={300}
          minLength={2}
          nearbyPlacesAPI="GooglePlacesSearch"
          styles={{
            container: {
              flex: 1,
            },
            textInputContainer: {
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.palette.neutral200,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              paddingHorizontal: 12,
            },
            textInput: {
              flex: 1,
              fontSize: 16,
              color: theme.colors.text,
              backgroundColor: "transparent",
              paddingVertical: Platform.OS === "ios" ? 10 : 8,
              marginTop: 0,
              marginBottom: 0,
              marginLeft: 0,
              marginRight: 0,
            },
            listView: {
              position: "absolute",
              top: 48,
              left: 0,
              right: 0,
              backgroundColor: theme.colors.background,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              zIndex: 1000,
              elevation: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            row: {
              backgroundColor: theme.colors.background,
              paddingVertical: 12,
              paddingHorizontal: 16,
            },
            separator: {
              height: 1,
              backgroundColor: theme.colors.border,
            },
            description: {
              color: theme.colors.text,
              fontSize: 14,
            },
            predefinedPlacesDescription: {
              color: theme.colors.tint,
            },
          }}
          renderLeftButton={() => (
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={theme.colors.textDim}
              style={{ marginRight: 8 }}
            />
          )}
          keyboardShouldPersistTaps="handled"
          listViewDisplayed="auto"
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
