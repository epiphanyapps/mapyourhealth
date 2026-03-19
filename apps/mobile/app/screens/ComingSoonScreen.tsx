/**
 * ComingSoonScreen
 *
 * Gate screen shown to unauthenticated users. Displays MapYourHealth branding
 * and prompts the user to sign up or log in. Authenticated users bypass this
 * screen entirely via the navigator.
 */

import { FC, useMemo } from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

const appLogo = require("@assets/images/logo.png")

interface ComingSoonScreenProps extends AppStackScreenProps<"ComingSoon"> {}

export const ComingSoonScreen: FC<ComingSoonScreenProps> = function ComingSoonScreen({
  navigation,
}) {
  const { themed } = useAppTheme()

  const themedStyles = useMemo(
    () => ({
      signUpButton: themed($signUpButton),
      signUpButtonText: themed($signUpButtonText),
      logInButton: themed($logInButton),
    }),
    [themed],
  )

  return (
    <Screen preset="fixed" safeAreaEdges={["top", "bottom"]} contentContainerStyle={themed($root)}>
      <View style={themed($topSection)}>
        <Image source={appLogo} style={themed($logo)} resizeMode="contain" />
        <Text tx="comingSoonScreen:heading" preset="heading" style={themed($heading)} />
        <Text tx="comingSoonScreen:preparing" style={themed($preparing)} size="md" />
      </View>

      <View style={themed($bottomSection)}>
        <Text tx="comingSoonScreen:description" style={themed($description)} size="sm" />

        <View style={themed($buttonContainer)}>
          <Button
            tx="comingSoonScreen:signUp"
            style={themedStyles.signUpButton}
            textStyle={themedStyles.signUpButtonText}
            preset="reversed"
            onPress={() => navigation.navigate("Signup")}
            testID="coming-soon-signup-button"
          />
          <Button
            tx="comingSoonScreen:logIn"
            style={themedStyles.logInButton}
            preset="default"
            onPress={() => navigation.navigate("Login")}
            testID="coming-soon-login-button"
          />
        </View>
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

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $signUpButton: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 12,
  minHeight: 52,
})

const $signUpButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $logInButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderRadius: 12,
  minHeight: 52,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.transparent,
})
