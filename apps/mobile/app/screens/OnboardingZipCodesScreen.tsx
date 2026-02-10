/**
 * OnboardingLocationsScreen
 *
 * Screen for new users to select their initial locations during onboarding.
 * Requires at least 1 location to continue to the dashboard.
 */

import { FC, useState } from "react"
import { View, TextStyle, ViewStyle, Alert, Pressable, ScrollView } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Button } from "@/components/Button"
import { PlacesSearchBar } from "@/components/PlacesSearchBar"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { createZipCodeSubscription } from "@/services/amplify/data"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface LocationSelection {
  city: string
  state: string
  country: string
}

interface OnboardingZipCodesScreenProps extends AppStackScreenProps<"OnboardingZipCodes"> {}

export const OnboardingZipCodesScreen: FC<OnboardingZipCodesScreenProps> = ({ navigation }) => {
  const [selectedLocations, setSelectedLocations] = useState<LocationSelection[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const { themed, theme } = useAppTheme()

  const canContinue = selectedLocations.length >= 1

  // Handle location selection from PlacesSearchBar
  const handleLocationSelect = (city: string, state: string, country: string) => {
    // Check if already selected
    if (selectedLocations.some((s) => s.city === city && s.state === state)) {
      setError("This location is already selected")
      return
    }

    // Check max selections
    if (selectedLocations.length >= 10) {
      setError("Maximum 10 locations allowed")
      return
    }

    setError("")
    setSelectedLocations([...selectedLocations, { city, state, country }])
  }

  // Remove a location from selection
  const removeLocation = (index: number) => {
    setSelectedLocations(selectedLocations.filter((_, i) => i !== index))
  }

  async function handleContinue() {
    if (!canContinue) {
      setError("Please select at least 1 location to continue")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const promises = selectedLocations.map((selection) =>
        createZipCodeSubscription(selection.city, selection.state, selection.country),
      )

      await Promise.all(promises)

      navigation.reset({
        index: 0,
        routes: [{ name: "Dashboard" }],
      })
    } catch (err) {
      console.error("Error saving subscriptions:", err)
      Alert.alert("Error", "Failed to save your location subscriptions. Please try again.", [
        { text: "OK" },
      ])
      setError("Failed to save subscriptions. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={themed($headerContainer)}>
        <Text text="Welcome to MapYourHealth!" preset="heading" style={themed($heading)} />
        <Text
          text="Stay informed about safety conditions in the areas that matter to you."
          preset="subheading"
          style={themed($subheading)}
        />
      </View>

      <View style={themed($contentContainer)}>
        <Text text="Select Your Locations" preset="formLabel" style={themed($sectionTitle)} />
        <Text
          text="Add the cities you want to monitor. You can add up to 10 locations including your home, work, and places where family members live."
          style={themed($sectionDescription)}
          size="sm"
        />

        {/* City search */}
        <Text text="Search by city" style={themed($searchLabel)} size="sm" />
        <PlacesSearchBar
          onLocationSelect={handleLocationSelect}
          placeholder="Search city or location..."
        />

        {/* Selected locations */}
        {selectedLocations.length > 0 && (
          <View style={themed($chipsSection)}>
            <Text size="sm" style={{ color: theme.colors.textDim, textAlign: "right" }}>
              {selectedLocations.length} of 10 selected
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {selectedLocations.map((loc, index) => (
                  <View
                    key={`${loc.city}-${loc.state}-${index}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: theme.colors.palette.neutral200,
                      borderRadius: 20,
                      paddingLeft: 12,
                      paddingRight: 8,
                      paddingVertical: 6,
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: theme.colors.text }}>
                      {loc.city}, {loc.state}
                    </Text>
                    <Pressable onPress={() => removeLocation(index)} style={{ padding: 2 }}>
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

        {error ? <Text text={error} style={themed($errorText)} size="sm" /> : null}

        <View style={themed($infoContainer)}>
          <Text
            text="You'll receive alerts when safety conditions change in your selected areas."
            style={themed($infoText)}
            size="xs"
          />
        </View>
      </View>

      <View style={themed($footerContainer)}>
        <Button
          text={isSubmitting ? "Saving..." : "Continue"}
          style={themed($continueButton)}
          preset="reversed"
          onPress={handleContinue}
          disabled={!canContinue || isSubmitting}
        />

        {!canContinue && (
          <Text
            text="Select at least 1 location to continue"
            style={themed($hintText)}
            size="xs"
          />
        )}
      </View>
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
  flexGrow: 1,
})

const $headerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
  textAlign: "center",
})

const $subheading: ThemedStyle<TextStyle> = ({ colors }) => ({
  textAlign: "center",
  color: colors.textDim,
})

const $contentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginBottom: spacing.lg,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $sectionDescription: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.md,
})

const $searchLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.md,
  marginBottom: spacing.xs,
})

const $chipsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  gap: 8,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  marginTop: spacing.sm,
})

const $infoContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  padding: spacing.sm,
  marginTop: spacing.lg,
})

const $infoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})

const $footerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $continueButton: ThemedStyle<ViewStyle> = () => ({})

const $hintText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: "center",
  marginTop: spacing.sm,
})
