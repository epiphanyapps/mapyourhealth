import { FC, useState } from "react"
import { View, ViewStyle, TextStyle } from "react-native"

import { HazardReportForm, HazardReportFormData } from "@/components/HazardReportForm"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { createHazardReport } from "@/services/amplify/data"
import { useAppTheme } from "@/theme/context"

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
  const { isAuthenticated } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (data: HazardReportFormData) => {
    // Require authentication for submitting reports
    if (!isAuthenticated) {
      navigation.navigate("Login")
      return
    }

    if (!data.category) {
      setSubmitError("Please select a category")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await createHazardReport({
        category: data.category,
        description: data.description,
        location: data.location,
      })

      setIsSubmitted(true)
    } catch (error) {
      console.error("Failed to submit hazard report:", error)
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit report. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewReport = () => {
    setIsSubmitted(false)
    setSubmitError(null)
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

  const $errorContainer: ViewStyle = {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  }

  const $errorText: TextStyle = {
    fontSize: 14,
    color: "#DC2626",
    textAlign: "center",
  }

  const $loginPromptContainer: ViewStyle = {
    backgroundColor: theme.colors.palette.neutral200,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  }

  const $loginPromptText: TextStyle = {
    fontSize: 14,
    color: theme.colors.textDim,
    textAlign: "center",
    marginBottom: 12,
  }

  const $loginButton: ViewStyle = {
    backgroundColor: theme.colors.tint,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  }

  const $loginButtonText: TextStyle = {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  }

  if (isSubmitted) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header title="Report Submitted" leftIcon="back" onLeftPress={() => navigation.goBack()} />
        <View style={$successContainer}>
          <Text style={$successTitle}>Thank You!</Text>
          <Text style={$successMessage}>
            Your hazard report has been submitted successfully. Our team will review it and take
            appropriate action.
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
      <Header title="Report a Hazard" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      <Text style={$titleText}>Report a Hazard</Text>
      <Text style={$subtitleText}>
        Help keep your community safe by reporting environmental hazards or health concerns in your
        area.
      </Text>

      {!isAuthenticated && (
        <View style={$loginPromptContainer}>
          <Text style={$loginPromptText}>
            Sign in to submit hazard reports and track their status.
          </Text>
          <View style={$loginButton}>
            <Text style={$loginButtonText} onPress={() => navigation.navigate("Login")}>
              Sign In
            </Text>
          </View>
        </View>
      )}

      {submitError && (
        <View style={$errorContainer}>
          <Text style={$errorText}>{submitError}</Text>
        </View>
      )}

      <HazardReportForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </Screen>
  )
}
