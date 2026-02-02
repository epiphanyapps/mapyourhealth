/**
 * ResendButton Component
 *
 * Reusable button with cooldown timer for resend operations.
 * Prevents spam by showing countdown and handling rate limits gracefully.
 */

import { FC, useState, useEffect, useCallback } from "react"
import { View, ViewStyle, TextStyle, ActivityIndicator } from "react-native"

import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { isRateLimitError } from "@/utils/authErrors"

interface ResendButtonProps {
  /**
   * Async function to call when resending
   */
  onResend: () => Promise<void>
  /**
   * Cooldown duration in seconds after successful resend
   * @default 60
   */
  cooldownSeconds?: number
  /**
   * Penalty cooldown when rate limited (in seconds)
   * @default 300 (5 minutes)
   */
  rateLimitPenaltySeconds?: number
  /**
   * Button label when active
   * @default "Resend Code"
   */
  label?: string
  /**
   * Message shown on successful resend
   */
  successMessage?: string
  /**
   * Additional button style
   */
  style?: ViewStyle
  /**
   * Called when resend succeeds
   */
  onSuccess?: () => void
}

/**
 * ResendButton - A button with built-in cooldown timer
 *
 * Features:
 * - Shows countdown after each resend
 * - Handles rate limit errors with longer penalty
 * - Shows success/error messages
 */
export const ResendButton: FC<ResendButtonProps> = ({
  onResend,
  cooldownSeconds = 60,
  rateLimitPenaltySeconds = 300,
  label = "Resend Code",
  successMessage = "Code sent successfully",
  style,
  onSuccess,
}) => {
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const { themed, theme } = useAppTheme()

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  // Clear message when countdown ends
  useEffect(() => {
    if (countdown === 0 && message && !message.isError) {
      setMessage(null)
    }
  }, [countdown, message])

  const handlePress = useCallback(async () => {
    if (countdown > 0 || isLoading) return

    setIsLoading(true)
    setMessage(null)

    try {
      await onResend()
      setCountdown(cooldownSeconds)
      setMessage({ text: successMessage, isError: false })
      onSuccess?.()
    } catch (error) {
      if (isRateLimitError(error)) {
        setMessage({ text: "Too many attempts. Please wait a few minutes.", isError: true })
        setCountdown(rateLimitPenaltySeconds)
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to resend. Please try again."
        setMessage({ text: errorMessage, isError: true })
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    countdown,
    isLoading,
    onResend,
    cooldownSeconds,
    rateLimitPenaltySeconds,
    successMessage,
    onSuccess,
  ])

  const isDisabled = countdown > 0 || isLoading

  // Format countdown display
  const formatCountdown = (seconds: number): string => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    }
    return `${seconds}s`
  }

  // Determine button text
  const buttonText = isLoading
    ? "Sending..."
    : countdown > 0
      ? `Resend in ${formatCountdown(countdown)}`
      : label

  return (
    <View style={[themed($container), style]}>
      <Button
        text={buttonText}
        preset="default"
        onPress={handlePress}
        disabled={isDisabled}
        style={themed($button)}
        textStyle={[themed($buttonText), isDisabled && themed($buttonTextDisabled)]}
        LeftAccessory={
          isLoading
            ? () => (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.tint}
                  style={$loadingIndicator}
                />
              )
            : undefined
        }
      />

      {message && (
        <Text
          text={message.text}
          size="xs"
          style={[
            themed($messageText),
            message.isError ? themed($errorText) : themed($successText),
          ]}
        />
      )}
    </View>
  )
}

// Styles
const $container: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
})

const $button: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight: 44,
  paddingHorizontal: spacing.lg,
})

const $buttonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $buttonTextDisabled: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $loadingIndicator: ViewStyle = {
  marginRight: 8,
}

const $messageText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  textAlign: "center",
})

const $successText: ThemedStyle<TextStyle> = () => ({
  color: "#10B981",
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})
