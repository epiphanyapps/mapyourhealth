/**
 * ZipCodeSearch
 *
 * A component for searching and selecting zip codes.
 * Features text input, "Use my location" geolocation, and removable chips for selections.
 */

import { useState, useCallback } from "react"
import {
  View,
  TextInput,
  ViewStyle,
  TextStyle,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import * as Location from "expo-location"

import { Text } from "@/components/Text"
import { getZipCodeDataByCode, getAvailableZipCodes } from "@/data/mock"
import { useAppTheme } from "@/theme/context"

export interface ZipCodeSelection {
  zipCode: string
  cityName: string
  state: string
}

export interface ZipCodeSearchProps {
  /**
   * Currently selected zip codes
   */
  selectedZipCodes: ZipCodeSelection[]
  /**
   * Callback when selections change
   */
  onSelectionChange: (selections: ZipCodeSelection[]) => void
  /**
   * Maximum number of zip codes that can be selected
   * @default 10
   */
  maxSelections?: number
  /**
   * Placeholder text for the search input
   * @default "Enter zip code..."
   */
  placeholder?: string
}

/**
 * ZipCodeSearch component allows users to search for zip codes by entering them
 * or using their current location. Selected zip codes are displayed as removable chips.
 *
 * @example
 * <ZipCodeSearch
 *   selectedZipCodes={selections}
 *   onSelectionChange={setSelections}
 *   maxSelections={10}
 * />
 */
export function ZipCodeSearch(props: ZipCodeSearchProps) {
  const {
    selectedZipCodes,
    onSelectionChange,
    maxSelections = 10,
    placeholder = "Enter zip code...",
  } = props

  const { theme } = useAppTheme()
  const [inputValue, setInputValue] = useState("")
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState("")

  /**
   * Add a zip code to the selection
   */
  const addZipCode = useCallback(
    (zipCode: string) => {
      setError("")

      // Validate zip code format (5 digits)
      if (!/^\d{5}$/.test(zipCode)) {
        setError("Please enter a valid 5-digit zip code")
        return
      }

      // Check if already selected
      if (selectedZipCodes.some((s) => s.zipCode === zipCode)) {
        setError("This zip code is already selected")
        return
      }

      // Check max selections
      if (selectedZipCodes.length >= maxSelections) {
        setError(`Maximum ${maxSelections} zip codes allowed`)
        return
      }

      // Look up zip code data (from mock data for now)
      const zipData = getZipCodeDataByCode(zipCode)
      if (zipData) {
        onSelectionChange([
          ...selectedZipCodes,
          {
            zipCode: zipData.zipCode,
            cityName: zipData.cityName,
            state: zipData.state,
          },
        ])
      } else {
        // For zip codes not in mock data, add with unknown city
        // In production, this would call an API to validate and get city info
        onSelectionChange([
          ...selectedZipCodes,
          {
            zipCode,
            cityName: "Unknown",
            state: "",
          },
        ])
      }

      setInputValue("")
    },
    [selectedZipCodes, onSelectionChange, maxSelections],
  )

  /**
   * Remove a zip code from the selection
   */
  const removeZipCode = useCallback(
    (zipCode: string) => {
      onSelectionChange(selectedZipCodes.filter((s) => s.zipCode !== zipCode))
    },
    [selectedZipCodes, onSelectionChange],
  )

  /**
   * Handle "Use my location" button press
   * Requests location permission and gets zip code from coordinates
   */
  const handleUseMyLocation = useCallback(async () => {
    setError("")
    setIsLocating(true)

    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please enable location access in your device settings to use this feature.",
          [{ text: "OK" }],
        )
        return
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      // Reverse geocode to get address/zip code
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })

      if (address?.postalCode) {
        addZipCode(address.postalCode)
      } else {
        setError("Could not determine zip code from your location")
      }
    } catch (err) {
      console.error("Location error:", err)
      setError("Failed to get your location. Please try again.")
    } finally {
      setIsLocating(false)
    }
  }, [addZipCode])

  /**
   * Handle search input submission
   */
  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      addZipCode(inputValue.trim())
    }
  }, [inputValue, addZipCode])

  // Styles
  const $container: ViewStyle = {
    gap: 12,
  }

  const $inputRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  }

  const $inputContainer: ViewStyle = {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.palette.neutral200,
    borderRadius: 12,
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

  const $locationButton: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.tint,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  }

  const $locationButtonText: TextStyle = {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  }

  const $errorText: TextStyle = {
    color: theme.colors.error,
    fontSize: 12,
  }

  const $chipsContainer: ViewStyle = {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  }

  const $chip: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.palette.neutral200,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 6,
  }

  const $chipText: TextStyle = {
    fontSize: 14,
    color: theme.colors.text,
  }

  const $chipSubtext: TextStyle = {
    fontSize: 12,
    color: theme.colors.textDim,
  }

  const $removeButton: ViewStyle = {
    padding: 2,
  }

  const $selectionCount: TextStyle = {
    fontSize: 12,
    color: theme.colors.textDim,
    textAlign: "right",
  }

  return (
    <View style={$container}>
      {/* Search input row */}
      <View style={$inputRow}>
        <View style={$inputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textDim} />
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textDim}
            style={$input}
            keyboardType="number-pad"
            maxLength={5}
            returnKeyType="done"
            accessibilityLabel="Enter zip code"
            accessibilityHint="Type a 5-digit zip code and press enter to add"
          />
        </View>

        <Pressable
          onPress={handleUseMyLocation}
          style={$locationButton}
          disabled={isLocating}
          accessibilityLabel="Use my location"
          accessibilityRole="button"
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#FFFFFF" />
              <Text style={$locationButtonText}>My Location</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Error message */}
      {error ? <Text style={$errorText}>{error}</Text> : null}

      {/* Selected zip codes as chips */}
      {selectedZipCodes.length > 0 && (
        <View>
          <Text style={$selectionCount}>
            {selectedZipCodes.length} of {maxSelections} selected
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={$chipsContainer}>
              {selectedZipCodes.map((selection) => (
                <View key={selection.zipCode} style={$chip}>
                  <View>
                    <Text style={$chipText}>{selection.zipCode}</Text>
                    {selection.cityName && selection.cityName !== "Unknown" && (
                      <Text style={$chipSubtext}>
                        {selection.cityName}
                        {selection.state ? `, ${selection.state}` : ""}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => removeZipCode(selection.zipCode)}
                    style={$removeButton}
                    accessibilityLabel={`Remove ${selection.zipCode}`}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={20}
                      color={theme.colors.textDim}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  )
}
