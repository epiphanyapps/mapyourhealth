/**
 * MagicLinkSentScreen
 *
 * Confirmation screen shown after a magic link has been sent.
 * Displays email address, hints about expiration, and options to resend or use different email.
 */

import { FC } from "react"
import { TextStyle, ViewStyle, Linking, Platform } from "react-native"

import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { Icon } from "@/components/Icon"
import { ResendButton } from "@/components/ResendButton"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface MagicLinkSentScreenProps extends AppStackScreenProps<"MagicLinkSent"> {}

export const MagicLinkSentScreen: FC<MagicLinkSentScreenProps> = ({ navigation, route }) => {
  const { email } = route.params

  const { requestMagicLink } = useAuth()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  async function handleResend() {
    const success = await requestMagicLink(email)
    if (!success) {
      throw new Error("Failed to resend. Please try again.")
    }
  }

  function handleOpenEmailApp() {
    // Open the default email app
    const mailUrl = Platform.OS === "ios" ? "message://" : "mailto:"
    Linking.canOpenURL(mailUrl).then((canOpen) => {
      if (canOpen) {
        Linking.openURL(mailUrl)
      }
    })
  }

  function handleUseDifferentEmail() {
    navigation.navigate("MagicLink")
  }

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <Header title="" leftIcon="back" onLeftPress={() => navigation.goBack()} safeAreaEdges={[]} />

      <Icon icon="check" size={64} color={colors.tint} containerStyle={themed($iconContainer)} />

      <Text text="Check Your Email" preset="heading" style={themed($heading)} />

      <Text
        text={`We've sent a sign-in link to:`}
        preset="subheading"
        style={themed($subheading)}
      />

      <Text text={email} preset="bold" style={themed($emailText)} />

      <Text
        text="Click the link in the email to sign in. The link will expire in 15 minutes."
        preset="formHelper"
        style={themed($hintText)}
      />

      <Button
        text="Open Email App"
        style={themed($primaryButton)}
        preset="reversed"
        onPress={handleOpenEmailApp}
      />

      <ResendButton
        label="Resend Link"
        onResend={handleResend}
        successMessage="A new link has been sent to your email"
        cooldownSeconds={60}
        style={themed($secondaryButton)}
      />

      <Button
        text="Use a Different Email"
        style={themed($secondaryButton)}
        preset="default"
        onPress={handleUseDifferentEmail}
      />
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xxl,
  paddingHorizontal: spacing.lg,
  alignItems: "center",
})

const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  backgroundColor: "rgba(59, 130, 246, 0.1)",
  borderRadius: 32,
  padding: spacing.md,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $subheading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
  textAlign: "center",
})

const $emailText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.md,
  textAlign: "center",
})

const $hintText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xl,
  textAlign: "center",
})

const $primaryButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  width: "100%",
})

const $secondaryButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  width: "100%",
})
