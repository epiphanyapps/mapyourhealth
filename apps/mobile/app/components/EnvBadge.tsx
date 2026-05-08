import { TextStyle, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { getEnvOverride } from "@/utils/envOverride"

import { Text } from "./Text"

/**
 * Renders a small "STAGING" chip when the in-app env override is active.
 * Reads MMKV synchronously on render, which is fine because the override
 * only changes via a full bundle reload.
 */
export function EnvBadge() {
  const { themed } = useAppTheme()

  if (getEnvOverride() !== "staging") return null

  return (
    <Text
      text="STAGING BACKEND"
      style={themed($badge)}
      size="xxs"
      weight="semiBold"
      testID="env-badge"
    />
  )
}

const $badge: ThemedStyle<ViewStyle & TextStyle> = ({ colors, spacing }) => ({
  alignSelf: "center",
  backgroundColor: colors.palette.statusWarningBg,
  borderRadius: 6,
  color: colors.palette.offlineText,
  letterSpacing: 1,
  marginBottom: spacing.sm,
  overflow: "hidden",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
})
