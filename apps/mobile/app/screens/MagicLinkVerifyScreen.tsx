/**
 * MagicLinkVerifyScreen
 *
 * Screen that handles magic link verification from deep link.
 * Shows loading state during verification and success/error states.
 */

import { FC, useEffect, useState } from "react"
import { ActivityIndicator, TextStyle, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import { usePendingAction } from "@/context/PendingActionContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface MagicLinkVerifyScreenProps extends AppStackScreenProps<"MagicLinkVerify"> {}

type VerificationState = "verifying" | "success" | "error"

export const MagicLinkVerifyScreen: FC<MagicLinkVerifyScreenProps> = ({ navigation, route }) => {
  const { email, token } = route.params
  const [state, setState] = useState<VerificationState>("verifying")
  const [errorMessage, setErrorMessage] = useState("")

  const { verifyMagicLink, refreshAuthState } = useAuth()
  const { executePendingAction } = usePendingAction()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  useEffect(() => {
    async function verify() {
      if (!email || !token) {
        setState("error")
        setErrorMessage("Invalid magic link. Please request a new one.")
        return
      }

      try {
        const success = await verifyMagicLink(email, token)

        if (success) {
          setState("success")
          // Refresh auth state to update the navigator
          await refreshAuthState()
          // Execute any pending action (e.g., follow zip code from guest flow)
          await executePendingAction()
          // Auto-redirect to Dashboard after a short delay
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: "Dashboard" }],
            })
          }, 1500)
        } else {
          setState("error")
          setErrorMessage("Verification failed. The link may have expired.")
        }
      } catch (error) {
        setState("error")
        const message =
          error instanceof Error ? error.message : "An error occurred. Please try again."
        setErrorMessage(message)
      }
    }

    verify()
  }, [email, token, verifyMagicLink, refreshAuthState, executePendingAction, navigation])

  function handleRequestNewLink() {
    navigation.navigate("MagicLink")
  }

  function handleGoToLogin() {
    navigation.navigate("Login")
  }

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      {state === "verifying" && (
        <>
          <ActivityIndicator size="large" color={colors.tint} style={themed($spinner)} />
          <Text text="Verifying your magic link..." preset="subheading" style={themed($message)} />
        </>
      )}

      {state === "success" && (
        <>
          <Icon
            icon="check"
            size={64}
            color={colors.palette.secondary500}
            containerStyle={themed($successIcon)}
          />
          <Text text="You're signed in!" preset="heading" style={themed($heading)} />
          <Text
            text="Redirecting to your dashboard..."
            preset="subheading"
            style={themed($message)}
          />
        </>
      )}

      {state === "error" && (
        <>
          <Icon icon="x" size={64} color={colors.error} containerStyle={themed($errorIcon)} />
          <Text text="Verification Failed" preset="heading" style={themed($heading)} />
          <Text text={errorMessage} preset="subheading" style={themed($errorMessage)} />

          <Button
            text="Request New Link"
            style={themed($primaryButton)}
            preset="reversed"
            onPress={handleRequestNewLink}
          />

          <Button
            text="Sign in with Password"
            style={themed($secondaryButton)}
            preset="default"
            onPress={handleGoToLogin}
          />
        </>
      )}
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
  alignItems: "center",
  justifyContent: "center",
})

const $spinner: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $successIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  backgroundColor: "rgba(16, 185, 129, 0.1)",
  borderRadius: 32,
  padding: spacing.md,
})

const $errorIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  backgroundColor: "rgba(220, 38, 38, 0.1)",
  borderRadius: 32,
  padding: spacing.md,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $message: ThemedStyle<TextStyle> = ({ spacing }) => ({
  textAlign: "center",
  marginBottom: spacing.lg,
})

const $errorMessage: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  textAlign: "center",
  marginBottom: spacing.xl,
})

const $primaryButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  width: "100%",
})

const $secondaryButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  width: "100%",
})
