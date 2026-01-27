/**
 * MagicLinkScreen
 *
 * Screen for requesting a magic link (passwordless authentication).
 * User enters their email address and requests a sign-in link.
 */

import { FC, useState } from "react"
import { TextStyle, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import { usePendingAction } from "@/context/PendingActionContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface MagicLinkScreenProps extends AppStackScreenProps<"MagicLink"> {}

export const MagicLinkScreen: FC<MagicLinkScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [generalError, setGeneralError] = useState("")

  const { requestMagicLink } = useAuth()
  const { pendingAction } = usePendingAction()

  const { themed } = useAppTheme()

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

  async function handleRequestMagicLink() {
    setGeneralError("")
    const isEmailValid = validateEmail(email)

    if (!isEmailValid) {
      return
    }

    setIsSubmitting(true)
    try {
      const success = await requestMagicLink(email)

      if (success) {
        navigation.navigate("MagicLinkSent", { email })
      } else {
        setGeneralError("Failed to send magic link. Please try again.")
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An error occurred. Please try again."
      setGeneralError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <Header title="" leftIcon="back" onLeftPress={() => navigation.goBack()} safeAreaEdges={[]} />

      <Text text="Sign in with Email Link" preset="heading" style={themed($heading)} />
      {pendingAction && (
        <Text
          text="Sign in to complete your action"
          preset="formHelper"
          style={themed($pendingActionHint)}
        />
      )}
      <Text
        text="Enter your email address and we'll send you a link to sign in instantly - no password needed."
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
        onSubmitEditing={handleRequestMagicLink}
      />

      <Button
        text={isSubmitting ? "Sending Link..." : "Send Magic Link"}
        style={themed($sendButton)}
        preset="reversed"
        onPress={handleRequestMagicLink}
        disabled={isSubmitting}
      />

      <Button
        text="Sign in with password instead"
        style={themed($passwordButton)}
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

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  marginBottom: spacing.md,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $sendButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $passwordButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})
