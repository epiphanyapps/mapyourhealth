/**
 * ConfirmSignupScreen
 *
 * Email verification screen with 6-digit code input.
 * Confirms signup and navigates to dashboard.
 */

import { FC, useState } from "react"
import { TextStyle, ViewStyle, View, ActivityIndicator } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { confirmSignUp, resendSignUpCode, autoSignIn } from "aws-amplify/auth"

import { Button } from "@/components/Button"
import { ResendButton } from "@/components/ResendButton"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import { usePendingAction } from "@/context/PendingActionContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { getConfirmErrorMessage, isExpiredCodeError } from "@/utils/authErrors"

interface ConfirmSignupScreenProps extends AppStackScreenProps<"ConfirmSignup"> {}

export const ConfirmSignupScreen: FC<ConfirmSignupScreenProps> = ({ route, navigation }) => {
  const { email } = route.params

  const [code, setCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [autoSignInFailed, setAutoSignInFailed] = useState(false)
  const [isAutoSigningIn, setIsAutoSigningIn] = useState(false)

  const { refreshAuthState } = useAuth()
  const { executePendingAction } = usePendingAction()
  const { themed } = useAppTheme()

  function validateCode(value: string): boolean {
    if (!value.trim()) {
      setError("Verification code is required")
      return false
    }
    if (value.length !== 6) {
      setError("Please enter the 6-digit code")
      return false
    }
    if (!/^\d{6}$/.test(value)) {
      setError("Code must be 6 digits")
      return false
    }
    setError("")
    return true
  }

  async function handleConfirm() {
    if (!validateCode(code)) {
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      })

      // Email confirmed successfully
      setIsConfirmed(true)
      setIsAutoSigningIn(true)

      // Try to auto sign in after confirmation
      try {
        await autoSignIn()
        // Refresh auth state to update the navigator
        await refreshAuthState()
        // Execute any pending action (e.g., follow zip code from guest flow)
        const hadPendingAction = await executePendingAction()
        if (hadPendingAction) {
          // Navigate back to Dashboard if we had a pending action
          navigation.navigate("Dashboard")
        } else {
          // Navigate new users to onboarding to select zip codes
          navigation.reset({
            index: 0,
            routes: [{ name: "OnboardingZipCodes" }],
          })
        }
      } catch {
        // Auto sign in not enabled, user will need to log in manually
        console.log("Auto sign-in not available, user needs to log in manually")
        setAutoSignInFailed(true)
      } finally {
        setIsAutoSigningIn(false)
      }
    } catch (err) {
      const message = getConfirmErrorMessage(err)
      setError(message)

      // If code expired, show hint that they should request a new one
      if (isExpiredCodeError(err)) {
        setError("This code has expired. Please request a new one below.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoToLogin() {
    navigation.navigate("Login", { email })
  }

  async function handleResendCode() {
    await resendSignUpCode({ username: email })
    // Clear any previous code to prompt fresh entry
    setCode("")
    setError("")
  }

  const { theme } = useAppTheme()

  // Show success state after email is confirmed
  if (isConfirmed) {
    return (
      <Screen
        preset="auto"
        contentContainerStyle={themed($screenContentContainer)}
        safeAreaEdges={["top", "bottom"]}
      >
        <View style={$successContainer}>
          <View style={[$successIconContainer, { backgroundColor: theme.colors.tint + "15" }]}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#10B981" />
          </View>

          <Text text="Email Verified!" preset="heading" style={themed($successHeading)} />

          {isAutoSigningIn ? (
            <>
              <Text text="Signing you in..." style={themed($successSubtext)} size="sm" />
              <ActivityIndicator size="large" color={theme.colors.tint} style={$loadingIndicator} />
            </>
          ) : autoSignInFailed ? (
            <>
              <Text
                text="Your account is ready! Please log in to continue."
                style={themed($successSubtext)}
                size="sm"
              />
              <Button
                text="Go to Login"
                style={themed($goToLoginButton)}
                preset="reversed"
                onPress={handleGoToLogin}
              />
            </>
          ) : null}
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <Text text="Verify Email" preset="heading" style={themed($heading)} />
      <Text
        text={`We sent a verification code to ${email}`}
        preset="subheading"
        style={themed($subheading)}
      />
      <Text text="The code will expire in 24 hours" style={themed($expirationHint)} size="xs" />

      {error ? (
        <View style={themed($errorContainer)}>
          <Text text={error} style={themed($errorText)} size="sm" />
        </View>
      ) : null}

      <TextField
        value={code}
        onChangeText={(text) => {
          // Only allow digits, max 6 characters
          const cleaned = text.replace(/\D/g, "").slice(0, 6)
          setCode(cleaned)
          if (error) validateCode(cleaned)
        }}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="one-time-code"
        autoCorrect={false}
        keyboardType="number-pad"
        label="Verification Code"
        placeholder="Enter 6-digit code"
        helper={error && !resendSuccess ? undefined : undefined}
        status={error ? "error" : undefined}
        maxLength={6}
        onSubmitEditing={handleConfirm}
      />

      <Button
        text={isSubmitting ? "Verifying..." : "Confirm"}
        style={themed($confirmButton)}
        preset="reversed"
        onPress={handleConfirm}
        disabled={isSubmitting}
      />

      <ResendButton
        label="Resend Code"
        onResend={handleResendCode}
        successMessage="A new code has been sent to your email"
        cooldownSeconds={60}
        style={themed($resendButton)}
      />
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $subheading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $expirationHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.lg,
})

const $errorContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.error + "15",
  borderRadius: 8,
  padding: spacing.sm,
  marginBottom: spacing.md,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $confirmButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $resendButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

// Success state styles
const $successContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 24,
}

const $successIconContainer: ViewStyle = {
  width: 100,
  height: 100,
  borderRadius: 50,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 24,
}

const $successHeading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $successSubtext: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: "center",
  marginBottom: spacing.lg,
})

const $loadingIndicator: ViewStyle = {
  marginTop: 16,
}

const $goToLoginButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  minWidth: 200,
})
