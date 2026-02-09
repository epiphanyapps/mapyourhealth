/**
 * OnboardingZipCodesScreen
 *
 * Screen for new users to select their initial zip codes during onboarding.
 * Requires at least 1 zip code to continue to the dashboard.
 */

import { FC, useState } from "react"
import { View, TextStyle, ViewStyle, Alert } from "react-native"

import { Button } from "@/components/Button"
import { PlacesSearchBar } from "@/components/PlacesSearchBar"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { ZipCodeSearch, ZipCodeSelection } from "@/components/ZipCodeSearch"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { createZipCodeSubscription } from "@/services/amplify/data"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface OnboardingZipCodesScreenProps extends AppStackScreenProps<"OnboardingZipCodes"> {}

export const OnboardingZipCodesScreen: FC<OnboardingZipCodesScreenProps> = ({ navigation }) => {
  const [selectedZipCodes, setSelectedZipCodes] = useState<ZipCodeSelection[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const { themed } = useAppTheme()

  const canContinue = selectedZipCodes.length >= 1

  // Handle postal code selection from PlacesSearchBar
  const handlePostalCodeSelect = (postalCode: string, cityName?: string, state?: string) => {
    // Check if already selected
    if (selectedZipCodes.some((s) => s.zipCode === postalCode)) {
      setError("This postal code is already selected")
      return
    }

    // Check max selections
    if (selectedZipCodes.length >= 10) {
      setError("Maximum 10 postal codes allowed")
      return
    }

    setError("")
    setSelectedZipCodes([
      ...selectedZipCodes,
      {
        zipCode: postalCode,
        cityName: cityName || "Unknown",
        state: state || "",
      },
    ])
  }

  async function handleContinue() {
    if (!canContinue) {
      setError("Please select at least 1 zip code to continue")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Save all selected zip codes as subscriptions
      const promises = selectedZipCodes.map((selection) =>
        createZipCodeSubscription(selection.zipCode, selection.cityName, selection.state),
      )

      await Promise.all(promises)

      // Navigate to dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: "Dashboard" }],
      })
    } catch (err) {
      console.error("Error saving subscriptions:", err)
      Alert.alert("Error", "Failed to save your zip code subscriptions. Please try again.", [
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
          text="Add the locations you want to monitor. You can add up to 10 locations including your home, work, and places where family members live."
          style={themed($sectionDescription)}
          size="sm"
        />

        {/* City search with Google Places */}
        <Text text="Search by city" style={themed($searchLabel)} size="sm" />
        <PlacesSearchBar
          onPostalCodeSelect={handlePostalCodeSelect}
          placeholder="Search city or postal code..."
        />

        {/* Manual postal code entry */}
        <Text text="Or enter postal code directly" style={themed($searchLabelAlt)} size="sm" />
        <View style={themed($searchContainer)}>
          <ZipCodeSearch
            selectedZipCodes={selectedZipCodes}
            onSelectionChange={setSelectedZipCodes}
            maxSelections={10}
            placeholder="Enter postal code..."
          />
        </View>

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
          <Text text="Select at least 1 zip code to continue" style={themed($hintText)} size="xs" />
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

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
})

const $searchLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.md,
  marginBottom: spacing.xs,
})

const $searchLabelAlt: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.lg,
  marginBottom: spacing.xs,
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
