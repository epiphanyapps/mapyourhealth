/**
 * LoginScreen
 *
 * User login screen with email and password input.
 * Integrates with Amplify Auth signIn and navigates to dashboard on success.
 */

import { ComponentType, FC, useEffect, useMemo, useRef, useState } from "react"
import {
  Pressable,
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { signIn } from "aws-amplify/auth"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { Icon, PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import { usePendingAction } from "@/context/PendingActionContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { getLoginErrorMessage, isUnconfirmedUserError } from "@/utils/authErrors"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = ({ navigation, route }) => {
  const passwordInput = useRef<TextInput>(null)

  // Get pre-filled email from navigation params (e.g., after email confirmation)
  const prefillEmail = route.params?.email

  const [email, setEmail] = useState(prefillEmail ?? "")
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

  // Update email if prefill changes (e.g., navigating back with new email)
  useEffect(() => {
    if (prefillEmail && prefillEmail !== email) {
      setEmail(prefillEmail)
    }
  }, [prefillEmail, email])

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
        // Execute any pending action (e.g., follow location from guest flow)
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
      const message = getLoginErrorMessage(error)
      setGeneralError(message)

      // If user hasn't confirmed their email, navigate to confirmation
      if (isUnconfirmedUserError(error)) {
        navigation.navigate("ConfirmSignup", { email })
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

      {/* Welcome Icon */}
      <View style={themed($iconContainer)}>
        <Icon icon="lock" size={32} color={colors.tint} />
      </View>

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
        style={themed($subheading)}
        size="sm"
      />

      {generalError ? (
        <View style={themed($errorContainer)}>
          <Text text={generalError} style={themed($errorText)} size="sm" />
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

      {/* Forgot Password Link */}
      <Pressable
        onPress={() => navigation.navigate("ForgotPassword")}
        style={themed($forgotPasswordLink)}
      >
        <Text text="Forgot password?" style={themed($forgotPasswordText)} size="xs" />
      </Pressable>

      {/* Primary Sign In Button */}
      <Button
        text={isSubmitting ? "Signing In..." : "Sign In"}
        style={themed($loginButton)}
        preset="reversed"
        onPress={handleLogin}
        disabled={isSubmitting}
      />

      {/* Divider */}
      <View style={themed($dividerContainer)}>
        <View style={themed($dividerLine)} />
        <Text text="or" style={themed($dividerText)} size="xs" />
        <View style={themed($dividerLine)} />
      </View>

      {/* Magic Link Button */}
      <Button
        text="Sign in with email link"
        style={themed($magicLinkButton)}
        preset="default"
        textStyle={themed($magicLinkText)}
        onPress={() => navigation.navigate("MagicLink")}
      />

      {/* Sign Up Link */}
      <View style={themed($signupContainer)}>
        <Text text="Don't have an account? " style={themed($signupText)} size="sm" />
        <Pressable onPress={() => navigation.navigate("Signup")}>
          <Text text="Sign up" style={themed($signupLink)} size="sm" weight="semiBold" />
        </Pressable>
      </View>
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xxl,
  paddingHorizontal: spacing.lg,
})

const $iconContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: colors.tint + "15",
  justifyContent: "center",
  alignItems: "center",
  alignSelf: "center",
  marginBottom: spacing.lg,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $subheading: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xl,
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

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $forgotPasswordLink: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignSelf: "flex-end",
  marginBottom: spacing.lg,
})

const $forgotPasswordText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $loginButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
  borderRadius: 12,
  minHeight: 52,
})

const $dividerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginVertical: spacing.md,
})

const $dividerLine: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  height: 1,
  backgroundColor: colors.separator,
})

const $dividerText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  paddingHorizontal: spacing.md,
})

const $magicLinkButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderRadius: 12,
  minHeight: 52,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: "transparent",
})

const $magicLinkText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $signupContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: spacing.xl,
})

const $signupText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $signupLink: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})
