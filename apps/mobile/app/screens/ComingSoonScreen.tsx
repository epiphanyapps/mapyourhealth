/**
 * ComingSoonScreen
 *
 * Gate screen shown to unauthenticated users. Displays MapYourHealth branding
 * Authenticated users bypass this screen entirely via the navigator.
 */

import { FC, useState } from "react"
import { TextStyle, View, ViewStyle } from "react-native"

import { AnimatedLogo } from "@/components/AnimatedLogo"
import { EnvBadge } from "@/components/EnvBadge"
import { EnvSwitchDialog } from "@/components/EnvSwitchDialog"
import { Screen } from "@/components/Screen"
import { SecretEnvTrigger } from "@/components/SecretEnvTrigger"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ComingSoonScreenProps {}

export const ComingSoonScreen: FC<ComingSoonScreenProps> = function ComingSoonScreen() {
  const { themed } = useAppTheme()
  const [envDialogOpen, setEnvDialogOpen] = useState(false)

  return (
    <Screen preset="fixed" safeAreaEdges={["top", "bottom"]} contentContainerStyle={themed($root)}>
      <View style={themed($topSection)}>
        <EnvBadge />
        {/* Hidden 5-tap gesture on the logo opens the staging-backend switcher.
            Critical for QA on prod-feature-gated builds where the rest of the
            app is hidden behind this screen. */}
        <SecretEnvTrigger
          onTrigger={() => setEnvDialogOpen(true)}
          style={themed($logo)}
          testID="coming-soon-secret-env-trigger"
        >
          <AnimatedLogo size={140} />
        </SecretEnvTrigger>
        <Text tx="comingSoonScreen:heading" preset="heading" style={themed($heading)} />
        <Text tx="comingSoonScreen:preparing" style={themed($preparing)} size="md" />
      </View>

      <View style={themed($bottomSection)}>
        <Text tx="comingSoonScreen:description" style={themed($description)} size="sm" />
      </View>

      <EnvSwitchDialog visible={envDialogOpen} onClose={() => setEnvDialogOpen(false)} />
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
  alignItems: "stretch",
  paddingTop: spacing.xxl,
})

const $logo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignSelf: "center",
  marginBottom: spacing.lg,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  alignSelf: "stretch",
  textAlign: "center",
  marginBottom: spacing.sm,
})

const $preparing: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  width: "100%",
  textAlign: "center",
  color: colors.textDim,
  marginBottom: spacing.md,
})

const $bottomSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xl,
})

const $description: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  width: "100%",
  textAlign: "center",
  color: colors.textDim,
  marginBottom: spacing.xl,
})
