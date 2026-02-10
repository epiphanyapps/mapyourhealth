/**
 * SignupScreen
 *
 * User registration screen with email and password input.
 * Triggers Amplify Auth signUp and navigates to confirmation screen.
 */

import { ComponentType, FC, useMemo, useRef, useState } from "react"
import {
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { signUp } from "aws-amplify/auth"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { PressableIcon } from "@/components/Icon"
import { PasswordRequirements, isPasswordValid } from "@/components/PasswordRequirements"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import { usePendingAction, type PendingAction } from "@/context/PendingActionContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { getSignupErrorMessage, isUserExistsError } from "@/utils/authErrors"

interface SignupScreenProps extends AppStackScreenProps<"Signup"> {}

function getContextMessage(action: PendingAction): string {
  switch (action.type) {
    case "notify_when_available":
      return `Sign up to get notified when data for ${action.payload.city || "this location"} becomes available`
    case "follow_location":
      return `Sign up to follow ${action.payload.city ? `${action.payload.city}, ${action.payload.state}` : "this location"} and receive safety alerts`
    case "report_hazard":
      return "Sign up to report a hazard in your area"
    default:
      return "Create an account to complete your action"
  }
}

export const SignupScreen: FC<SignupScreenProps> = ({ navigation }) => {
  const passwordInput = useRef<TextInput>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordHidden, setIsPasswordHidden] = useState(true)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [generalError, setGeneralError] = useState("")
  const [showLoginLink, setShowLoginLink] = useState(false)

  const { pendingAction } = usePendingAction()

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

  function validatePassword(value: string): boolean {
    if (!value) {
      setPasswordError("Password is required")
      return false
    }
    if (!isPasswordValid(value)) {
      setPasswordError("Please meet all password requirements")
      return false
    }
    setPasswordError("")
    return true
  }

  async function handleSignup() {
    setGeneralError("")
    setShowLoginLink(false)
    const isEmailValid = validateEmail(email)
    const isPasswordOk = validatePassword(password)

    if (!isEmailValid || !isPasswordOk) {
      return
    }

    setIsSubmitting(true)
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      })

      navigation.navigate("ConfirmSignup", { email })
    } catch (error) {
      const message = getSignupErrorMessage(error)
      setGeneralError(message)

      // Show login link if user already exists
      if (isUserExistsError(error)) {
        setShowLoginLink(true)
      }
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

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <Header title="" leftIcon="back" onLeftPress={() => navigation.goBack()} safeAreaEdges={[]} />

      <Text text="Create Account" preset="heading" style={themed($heading)} />
      {pendingAction && (
        <Text
          text={getContextMessage(pendingAction)}
          preset="formHelper"
          style={themed($pendingActionHint)}
        />
      )}
      <Text
        text="Sign up to save your subscriptions and get personalized alerts"
        preset="subheading"
        style={themed($subheading)}
      />

      {generalError ? (
        <View style={themed($errorContainer)}>
          <Text text={generalError} style={themed($errorText)} size="sm" />
          {showLoginLink && (
            <Button
              text="Go to Login"
              preset="default"
              style={$errorLoginButton}
              textStyle={themed($errorLoginButtonText)}
              onPress={() => navigation.navigate("Login", { email })}
            />
          )}
        </View>
      ) : null}

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
        onSubmitEditing={() => passwordInput.current?.focus()}
      />

      <TextField
        ref={passwordInput}
        value={password}
        onChangeText={(text) => {
          setPassword(text)
          if (passwordError) validatePassword(text)
        }}
        containerStyle={themed($passwordField)}
        autoCapitalize="none"
        autoComplete="password-new"
        autoCorrect={false}
        secureTextEntry={isPasswordHidden}
        label="Password"
        placeholder="Create a strong password"
        helper={passwordError}
        status={passwordError ? "error" : undefined}
        onSubmitEditing={handleSignup}
        onFocus={() => setIsPasswordFocused(true)}
        onBlur={() => setIsPasswordFocused(false)}
        RightAccessory={PasswordRightAccessory}
      />

      <PasswordRequirements
        password={password}
        visible={isPasswordFocused || password.length > 0}
      />

      <Button
        text={isSubmitting ? "Creating Account..." : "Sign Up"}
        style={themed($signupButton)}
        preset="reversed"
        onPress={handleSignup}
        disabled={isSubmitting}
      />

      <Button
        text="Sign up with email link"
        style={themed($magicLinkButton)}
        preset="default"
        textStyle={themed($magicLinkText)}
        onPress={() => navigation.navigate("MagicLink")}
      />

      <Button
        text="Already have an account? Log in"
        style={themed($loginButton)}
        preset="default"
        onPress={() => navigation.navigate("Login")}
      />
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xxl,
  paddingHorizontal: spacing.lg,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $subheading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $pendingActionHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.xs,
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

const $errorLoginButton: ViewStyle = {
  marginTop: 8,
  minHeight: 36,
}

const $errorLoginButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $passwordField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $signupButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $magicLinkButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
})

const $magicLinkText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
})

const $loginButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})
