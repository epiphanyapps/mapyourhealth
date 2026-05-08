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
import { confirmSignIn, signIn } from "aws-amplify/auth"

import { Button } from "@/components/Button"
import { EnvBadge } from "@/components/EnvBadge"
import { EnvSwitchDialog } from "@/components/EnvSwitchDialog"
import { Header } from "@/components/Header"
import { Icon, PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { SecretEnvTrigger } from "@/components/SecretEnvTrigger"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import { usePendingAction } from "@/context/PendingActionContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import {
  getLoginErrorMessage,
  getNewPasswordErrorMessage,
  isUnconfirmedUserError,
} from "@/utils/authErrors"

/**
 * Auth flow phase. Most users only see SIGN_IN; admin-invited users land
 * on NEW_PASSWORD_REQUIRED after their first sign-in with a Cognito
 * temp password (Cognito user state FORCE_CHANGE_PASSWORD).
 */
type AuthStep = "SIGN_IN" | "NEW_PASSWORD_REQUIRED"

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

  // New-password sub-form state. Only meaningful when authStep is
  // NEW_PASSWORD_REQUIRED (after Cognito raises the
  // CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED challenge).
  const [authStep, setAuthStep] = useState<AuthStep>("SIGN_IN")
  const [envDialogOpen, setEnvDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isNewPasswordHidden, setIsNewPasswordHidden] = useState(true)
  const [isConfirmPasswordHidden, setIsConfirmPasswordHidden] = useState(true)
  const [newPasswordError, setNewPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const confirmPasswordInput = useRef<TextInput>(null)

  const { refreshAuthState } = useAuth()
  const { pendingAction, executePendingAction } = usePendingAction()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  // Update email if prefill changes (e.g., navigating back with new email)
  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only react to prefillEmail changes, not user input
  }, [prefillEmail])

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

  // Shared post-sign-in side effects. Used after the standard signIn()
  // returns isSignedIn=true and again after confirmSignIn resolves the
  // FORCE_CHANGE_PASSWORD challenge with nextStep="DONE".
  async function finishSignIn() {
    await refreshAuthState()
    await executePendingAction()
    navigation.navigate("Dashboard")
  }

  // Reset the new-password sub-form back to the sign-in form. Triggered
  // by the "Back to sign in" link and by the Header back button so the
  // user can't escape mid-challenge into a half-completed state.
  function resetToSignIn() {
    setAuthStep("SIGN_IN")
    setNewPassword("")
    setConfirmPassword("")
    setNewPasswordError("")
    setConfirmPasswordError("")
    setGeneralError("")
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
        await finishSignIn()
      } else if (result.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        // User hasn't confirmed their email yet
        navigation.navigate("ConfirmSignup", { email })
      } else if (result.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        // Admin-invited user (FORCE_CHANGE_PASSWORD): switch to the
        // new-password sub-form. Clear the password field so the temp
        // password isn't reused or visible. Mirrors the admin portal
        // flow at apps/admin/src/app/login/page.tsx:157-158.
        setPassword("")
        setAuthStep("NEW_PASSWORD_REQUIRED")
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

  function validateNewPassword(): boolean {
    let ok = true
    if (newPassword.length < 8) {
      setNewPasswordError("Password must be at least 8 characters")
      ok = false
    } else {
      setNewPasswordError("")
    }
    if (confirmPassword !== newPassword) {
      setConfirmPasswordError("Passwords do not match")
      ok = false
    } else {
      setConfirmPasswordError("")
    }
    return ok
  }

  async function handleNewPassword() {
    setGeneralError("")
    if (!validateNewPassword()) return

    setIsSubmitting(true)
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword })
      if (result.nextStep?.signInStep === "DONE") {
        await finishSignIn()
      } else {
        setGeneralError(`Additional step required: ${result.nextStep?.signInStep}`)
      }
    } catch (error) {
      setGeneralError(getNewPasswordErrorMessage(error))
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

  const NewPasswordRightAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function NewPasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isNewPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsNewPasswordHidden(!isNewPasswordHidden)}
          />
        )
      },
    [isNewPasswordHidden, colors.palette.neutral800],
  )

  const ConfirmPasswordRightAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function ConfirmPasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isConfirmPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsConfirmPasswordHidden(!isConfirmPasswordHidden)}
          />
        )
      },
    [isConfirmPasswordHidden, colors.palette.neutral800],
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
        onLeftPress={() => {
          // While on the new-password sub-form, the back button must
          // reset the local state instead of navigating away — otherwise
          // the user is left in a half-completed FORCE_CHANGE_PASSWORD
          // session with no way to recover other than killing the app.
          if (authStep === "NEW_PASSWORD_REQUIRED") {
            resetToSignIn()
          } else {
            navigation.goBack()
          }
        }}
        safeAreaEdges={[]}
      />

      <EnvBadge />

      {/* Welcome Icon — hidden 5-tap gesture opens the staging-backend switcher.
          Mounted above the authStep branch so the same trigger covers both the
          SIGN_IN form and the NEW_PASSWORD_REQUIRED admin gate. */}
      <SecretEnvTrigger
        onTrigger={() => setEnvDialogOpen(true)}
        style={themed($iconContainer)}
        testID="login-secret-env-trigger"
      >
        <Icon icon="lock" size={32} color={colors.tint} />
      </SecretEnvTrigger>

      {authStep === "NEW_PASSWORD_REQUIRED" ? (
        <>
          <Text text="Set a new password" preset="heading" style={themed($heading)} />
          <Text
            text="Your account requires a password change to continue. Choose a password you'll use from now on."
            style={themed($subheading)}
            size="sm"
          />

          {generalError ? (
            <View style={themed($errorContainer)}>
              <Text text={generalError} style={themed($errorText)} size="sm" />
            </View>
          ) : null}

          <TextField
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text)
              if (newPasswordError) setNewPasswordError("")
            }}
            containerStyle={themed($textField)}
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect={false}
            secureTextEntry={isNewPasswordHidden}
            label="New password"
            placeholder="At least 8 characters"
            helper={newPasswordError}
            status={newPasswordError ? "error" : undefined}
            onSubmitEditing={() => confirmPasswordInput.current?.focus()}
            RightAccessory={NewPasswordRightAccessory}
            testID="new-password-input"
          />

          <TextField
            ref={confirmPasswordInput}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text)
              if (confirmPasswordError) setConfirmPasswordError("")
            }}
            containerStyle={themed($textField)}
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect={false}
            secureTextEntry={isConfirmPasswordHidden}
            label="Confirm new password"
            placeholder="Re-enter the new password"
            helper={confirmPasswordError}
            status={confirmPasswordError ? "error" : undefined}
            onSubmitEditing={handleNewPassword}
            RightAccessory={ConfirmPasswordRightAccessory}
            testID="confirm-new-password-input"
          />

          <Button
            text={isSubmitting ? "Setting password..." : "Set password and continue"}
            style={themed($loginButton)}
            preset="reversed"
            onPress={handleNewPassword}
            disabled={isSubmitting}
            testID="new-password-submit-button"
          />

          <Pressable onPress={resetToSignIn} style={themed($forgotPasswordLink)}>
            <Text
              text="Back to sign in"
              style={themed($forgotPasswordText)}
              size="xs"
              testID="new-password-back-to-sign-in"
            />
          </Pressable>
        </>
      ) : (
        <>
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
            testID="login-email-input"
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
            testID="login-password-input"
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
            testID="login-submit-button"
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
        </>
      )}

      {/* Sign Up Link — hidden during NEW_PASSWORD_REQUIRED so the
          user isn't tempted to abandon a forced-change session. */}
      {authStep === "SIGN_IN" && (
        <View style={themed($signupContainer)}>
          <Text text="Don't have an account? " style={themed($signupText)} size="sm" />
          <Pressable onPress={() => navigation.navigate("Signup")}>
            <Text text="Sign up" style={themed($signupLink)} size="sm" weight="semiBold" />
          </Pressable>
        </View>
      )}

      <EnvSwitchDialog visible={envDialogOpen} onClose={() => setEnvDialogOpen(false)} />
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
