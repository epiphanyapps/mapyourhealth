/**
 * ConfirmSignupScreen
 *
 * Email verification screen with 6-digit code input.
 * Confirms signup and navigates to dashboard.
 */

import { FC, useState } from "react"
import { TextStyle, ViewStyle } from "react-native"
import { confirmSignUp, resendSignUpCode, autoSignIn } from "aws-amplify/auth"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ConfirmSignupScreenProps extends AppStackScreenProps<"ConfirmSignup"> {}

export const ConfirmSignupScreen: FC<ConfirmSignupScreenProps> = ({ route, navigation }) => {
  const { email } = route.params

  const [code, setCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [resendSuccess, setResendSuccess] = useState(false)

  const { refreshAuthState } = useAuth()
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

      // Try to auto sign in after confirmation
      try {
        await autoSignIn()
        // Refresh auth state to update the navigator
        await refreshAuthState()
        // Navigate new users to onboarding to select zip codes
        navigation.reset({
          index: 0,
          routes: [{ name: "OnboardingZipCodes" }],
        })
      } catch {
        // Auto sign in not enabled, user will need to log in manually
        // Refresh auth state anyway - navigation will show login screen
        await refreshAuthState()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed. Please try again."
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendCode() {
    setIsResending(true)
    setError("")
    setResendSuccess(false)

    try {
      await resendSignUpCode({ username: email })
      setResendSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend code. Please try again."
      setError(message)
    } finally {
      setIsResending(false)
    }
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

      {error ? <Text text={error} style={themed($errorText)} size="sm" /> : null}
      {resendSuccess ? (
        <Text text="A new code has been sent to your email" style={themed($successText)} size="sm" />
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

      <Button
        text={isResending ? "Sending..." : "Resend Code"}
        style={themed($resendButton)}
        preset="default"
        onPress={handleResendCode}
        disabled={isResending}
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
  marginBottom: spacing.lg,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  marginBottom: spacing.md,
})

const $successText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "#10B981",
  marginBottom: spacing.md,
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
