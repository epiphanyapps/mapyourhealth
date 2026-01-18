import { FC, useState } from "react"
import { View, ViewStyle, TextStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Header } from "@/components/Header"
import { HazardReportForm, HazardReportFormData } from "@/components/HazardReportForm"
import { useAppTheme } from "@/theme/context"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

interface ReportScreenProps extends AppStackScreenProps<"Report"> {}

/**
 * Report Screen - Dedicated screen for submitting hazard reports.
 *
 * Displays a header with app branding and the hazard report form.
 * Shows loading state during submission and success message after.
 */
export const ReportScreen: FC<ReportScreenProps> = function ReportScreen(props) {
  const { navigation } = props
  const { theme } = useAppTheme()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (data: HazardReportFormData) => {
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    console.log("Hazard report submitted:", data)
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const handleNewReport = () => {
    setIsSubmitted(false)
  }

  const $contentContainer: ViewStyle = {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  }

  const $titleText: TextStyle = {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8,
  }

  const $subtitleText: TextStyle = {
    fontSize: 16,
    color: theme.colors.textDim,
    marginBottom: 24,
    lineHeight: 22,
  }

  const $successContainer: ViewStyle = {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  }

  const $successTitle: TextStyle = {
    fontSize: 24,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 12,
    textAlign: "center",
  }

  const $successMessage: TextStyle = {
    fontSize: 16,
    color: theme.colors.textDim,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  }

  const $newReportButton: ViewStyle = {
    backgroundColor: theme.colors.tint,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  }

  const $newReportButtonText: TextStyle = {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  }

  if (isSubmitted) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header
          title="Report Submitted"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={$successContainer}>
          <Text style={$successTitle}>Thank You!</Text>
          <Text style={$successMessage}>
            Your hazard report has been submitted successfully. Our team will review it
            and take appropriate action.
          </Text>
          <View style={$newReportButton}>
            <Text style={$newReportButtonText} onPress={handleNewReport}>
              Submit Another Report
            </Text>
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
      <Header
        title="Report a Hazard"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <Text style={$titleText}>Report a Hazard</Text>
      <Text style={$subtitleText}>
        Help keep your community safe by reporting environmental hazards or health
        concerns in your area.
      </Text>

      <HazardReportForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </Screen>
  )
}
