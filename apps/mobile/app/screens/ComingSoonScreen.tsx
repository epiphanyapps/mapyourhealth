/**
 * ComingSoonScreen
 *
 * Gate screen shown to unauthenticated users. Displays MapYourHealth branding
 * Authenticated users bypass this screen entirely via the navigator.
 */

import { FC } from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

const appLogo = require("@assets/images/logo.png")

interface ComingSoonScreenProps {}

export const ComingSoonScreen: FC<ComingSoonScreenProps> = function ComingSoonScreen() {
  const { themed } = useAppTheme()

  return (
    <Screen preset="fixed" safeAreaEdges={["top", "bottom"]} contentContainerStyle={themed($root)}>
      <View style={themed($topSection)}>
        <Image source={appLogo} style={themed($logo)} resizeMode="contain" />
        <Text tx="comingSoonScreen:heading" preset="heading" style={themed($heading)} />
        <Text tx="comingSoonScreen:preparing" style={themed($preparing)} size="md" />
      </View>

      <View style={themed($bottomSection)}>
        <Text tx="comingSoonScreen:description" style={themed($description)} size="sm" />
      </View>
    </Screen>
  )
}

const $root: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.lg,
  justifyContent: "space-between",
})

const $topSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: spacing.xxl,
})

const $logo: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: 120,
  height: 120,
  marginBottom: spacing.lg,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  textAlign: "center",
  marginBottom: spacing.sm,
})

const $preparing: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  textAlign: "center",
  color: colors.textDim,
  marginBottom: spacing.md,
})

const $bottomSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xl,
})

const $description: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  textAlign: "center",
  color: colors.textDim,
  marginBottom: spacing.xl,
})
