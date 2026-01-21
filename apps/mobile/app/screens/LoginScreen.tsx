/**
 * LoginScreen
 *
 * User login screen with email and password input.
 * Integrates with Amplify Auth signIn and navigates to dashboard on success.
 */

import { ComponentType, FC, useMemo, useRef, useState } from "react"
import { TextInput, TextStyle, ViewStyle } from "react-native"
import { signIn } from "aws-amplify/auth"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import { usePendingAction } from "@/context/PendingActionContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = ({ navigation }) => {
  const passwordInput = useRef<TextInput>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordHidden, setIsPasswordHidden] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [generalError, setGeneralError] = useState("")

  const { refreshAuthState } = useAuth()
  const { pendingAction, executePendingAction } = usePendingAction()

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
    setPasswordError("")
    return true
  }

  async function handleLogin() {
    setGeneralError("")
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signIn({ username: email, password })

      if (result.isSignedIn) {
        // Refresh auth state to update the navigator
        await refreshAuthState()
        // Execute any pending action (e.g., follow zip code from guest flow)
        await executePendingAction()
        // Navigate back to Dashboard
        navigation.navigate("Dashboard")
      } else if (result.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        // User hasn't confirmed their email yet
        navigation.navigate("ConfirmSignup", { email })
      } else {
        // Handle other sign-in steps if needed
        setGeneralError(`Additional step required: ${result.nextStep?.signInStep}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed. Please try again."
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

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <Header
        title=""
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <Text text="Welcome Back" preset="heading" style={themed($heading)} />
      {pendingAction && (
        <Text
          text="Sign in to complete your action"
          preset="formHelper"
          style={themed($pendingActionHint)}
        />
      )}
      <Text
        text="Sign in to access your safety alerts and subscriptions"
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
        onSubmitEditing={() => passwordInput.current?.focus()}
      />

      <TextField
        ref={passwordInput}
        value={password}
        onChangeText={(text) => {
          setPassword(text)
          if (passwordError) validatePassword(text)
        }}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="password"
        autoCorrect={false}
        secureTextEntry={isPasswordHidden}
        label="Password"
        placeholder="Enter your password"
        helper={passwordError}
        status={passwordError ? "error" : undefined}
        onSubmitEditing={handleLogin}
        RightAccessory={PasswordRightAccessory}
      />

      <Button
        text="Forgot Password?"
        style={themed($forgotPasswordButton)}
        preset="default"
        textStyle={themed($forgotPasswordText)}
        onPress={() => navigation.navigate("ForgotPassword")}
      />

      <Button
        text={isSubmitting ? "Signing In..." : "Sign In"}
        style={themed($loginButton)}
        preset="reversed"
        onPress={handleLogin}
        disabled={isSubmitting}
      />

      <Button
        text="Email me a link instead"
        style={themed($magicLinkButton)}
        preset="default"
        textStyle={themed($magicLinkText)}
        onPress={() => navigation.navigate("MagicLink")}
      />

      <Button
        text="Don't have an account? Sign up"
        style={themed($signupButton)}
        preset="default"
        onPress={() => navigation.navigate("Signup")}
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

const $pendingActionHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.xs,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  marginBottom: spacing.md,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $forgotPasswordButton: ThemedStyle<ViewStyle> = () => ({
  alignSelf: "flex-end",
  marginTop: -8,
  marginBottom: 16,
})

const $forgotPasswordText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
})

const $loginButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $magicLinkButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
})

const $magicLinkText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
})

const $signupButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})
