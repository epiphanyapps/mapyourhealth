/**
 * ForgotPasswordScreen
 *
 * Password reset screen with two-step flow:
 * 1. Request reset code via email
 * 2. Enter code and new password to reset
 */

import { ComponentType, FC, useMemo, useRef, useState } from "react"
import { TextInput, TextStyle, ViewStyle } from "react-native"
import { resetPassword, confirmResetPassword } from "aws-amplify/auth"

import { Button } from "@/components/Button"
import { PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ForgotPasswordScreenProps extends AppStackScreenProps<"ForgotPassword"> {}

type Step = "request" | "confirm"

export const ForgotPasswordScreen: FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const codeInput = useRef<TextInput>(null)
  const passwordInput = useRef<TextInput>(null)

  const [step, setStep] = useState<Step>("request")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [isPasswordHidden, setIsPasswordHidden] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [codeError, setCodeError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [generalError, setGeneralError] = useState("")

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  function validateEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value.trim()) {
      setEmailError("Email is required")
      return false
    }
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address")
      return false
    }
    setEmailError("")
    return true
  }

  function validateCode(value: string): boolean {
    if (!value.trim()) {
      setCodeError("Verification code is required")
      return false
    }
    if (value.length !== 6) {
      setCodeError("Please enter the 6-digit code")
      return false
    }
    if (!/^\d{6}$/.test(value)) {
      setCodeError("Code must be 6 digits")
      return false
    }
    setCodeError("")
    return true
  }

  function validatePassword(value: string): boolean {
    if (!value) {
      setPasswordError("Password is required")
      return false
    }
    if (value.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return false
    }
    setPasswordError("")
    return true
  }

  async function handleRequestCode() {
    setGeneralError("")
    if (!validateEmail(email)) {
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword({ username: email })
      setStep("confirm")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send reset code. Please try again."
      setGeneralError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetPassword() {
    setGeneralError("")
    const isCodeValid = validateCode(code)
    const isPasswordValid = validatePassword(newPassword)

    if (!isCodeValid || !isPasswordValid) {
      return
    }

    setIsSubmitting(true)
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      })

      navigation.navigate("Login")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reset password. Please try again."
      setGeneralError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const PasswordRightAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function PasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsPasswordHidden(!isPasswordHidden)}
          />
        )
      },
    [isPasswordHidden, colors.palette.neutral800],
  )

  if (step === "request") {
    return (
      <Screen
        preset="auto"
        contentContainerStyle={themed($screenContentContainer)}
        safeAreaEdges={["top", "bottom"]}
      >
        <Text text="Reset Password" preset="heading" style={themed($heading)} />
        <Text
          text="Enter your email address and we'll send you a code to reset your password"
          preset="subheading"
          style={themed($subheading)}
        />

        {generalError ? <Text text={generalError} style={themed($errorText)} size="sm" /> : null}

        <TextField
          value={email}
          onChangeText={(text) => {
            setEmail(text)
            if (emailError) validateEmail(text)
          }}
          containerStyle={themed($textField)}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          label="Email"
          placeholder="Enter your email"
          helper={emailError}
          status={emailError ? "error" : undefined}
          onSubmitEditing={handleRequestCode}
        />

        <Button
          text={isSubmitting ? "Sending Code..." : "Send Reset Code"}
          style={themed($submitButton)}
          preset="reversed"
          onPress={handleRequestCode}
          disabled={isSubmitting}
        />

        <Button
          text="Back to Login"
          style={themed($backButton)}
          preset="default"
          onPress={() => navigation.navigate("Login")}
        />
      </Screen>
    )
  }

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <Text text="Enter New Password" preset="heading" style={themed($heading)} />
      <Text
        text={`We sent a verification code to ${email}`}
        preset="subheading"
        style={themed($subheading)}
      />

      {generalError ? <Text text={generalError} style={themed($errorText)} size="sm" /> : null}

      <TextField
        ref={codeInput}
        value={code}
        onChangeText={(text) => {
          const cleaned = text.replace(/\D/g, "").slice(0, 6)
          setCode(cleaned)
          if (codeError) validateCode(cleaned)
        }}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="one-time-code"
        autoCorrect={false}
        keyboardType="number-pad"
        label="Verification Code"
        placeholder="Enter 6-digit code"
        helper={codeError}
        status={codeError ? "error" : undefined}
        maxLength={6}
        onSubmitEditing={() => passwordInput.current?.focus()}
      />

      <TextField
        ref={passwordInput}
        value={newPassword}
        onChangeText={(text) => {
          setNewPassword(text)
          if (passwordError) validatePassword(text)
        }}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="password-new"
        autoCorrect={false}
        secureTextEntry={isPasswordHidden}
        label="New Password"
        placeholder="At least 8 characters"
        helper={passwordError}
        status={passwordError ? "error" : undefined}
        onSubmitEditing={handleResetPassword}
        RightAccessory={PasswordRightAccessory}
      />

      <Button
        text={isSubmitting ? "Resetting Password..." : "Reset Password"}
        style={themed($submitButton)}
        preset="reversed"
        onPress={handleResetPassword}
        disabled={isSubmitting}
      />

      <Button
        text="Back to Login"
        style={themed($backButton)}
        preset="default"
        onPress={() => navigation.navigate("Login")}
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

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $submitButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})
