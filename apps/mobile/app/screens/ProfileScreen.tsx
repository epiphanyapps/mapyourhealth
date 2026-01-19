/**
 * ProfileScreen
 *
 * Screen for managing user account settings.
 * Displays user email, manage subscriptions link, notification preferences,
 * logout button, and delete account information.
 */

import { FC, useState, useCallback } from "react"
import { View, TextStyle, ViewStyle, Pressable, Alert, Switch } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ProfileScreenProps extends AppStackScreenProps<"Profile"> {}

export const ProfileScreen: FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth()
  const { themed, theme } = useAppTheme()

  // Notification preferences state (local only for now)
  const [emailNotifications, setEmailNotifications] = useState(true)

  /**
   * Handle logout with confirmation
   */
  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout()
          // Navigation will automatically redirect to Dashboard since isAuthenticated changes
        },
      },
    ])
  }, [logout])

  /**
   * Handle delete account press - shows info about contacting support
   */
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "To delete your account and all associated data, please contact our support team at support@mapyourhealth.com.\n\nThis action is irreversible and will remove all your subscriptions and data.",
      [
        {
          text: "OK",
          style: "default",
        },
      ],
    )
  }, [])

  /**
   * Navigate to subscriptions settings
   */
  const handleManageSubscriptions = useCallback(() => {
    navigation.navigate("SubscriptionsSettings")
  }, [navigation])

  // Get user email from Amplify user object
  const userEmail = user?.signInDetails?.loginId ?? user?.username ?? "Unknown"

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={themed($titleContainer)}>
        <Pressable onPress={() => navigation.goBack()} style={themed($backButton)}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text text="Profile" preset="heading" style={themed($title)} />
      </View>

      {/* User Email Section */}
      <View style={themed($section)}>
        <View style={$emailContainer}>
          <MaterialCommunityIcons
            name="account-circle"
            size={48}
            color={theme.colors.tint}
          />
          <View style={$emailTextContainer}>
            <Text text="Signed in as" style={$labelText} />
            <Text text={userEmail} style={$emailText} />
          </View>
        </View>
      </View>

      {/* Manage Subscriptions */}
      <View style={themed($section)}>
        <Text text="Subscriptions" preset="subheading" style={themed($sectionTitle)} />
        <Pressable
          onPress={handleManageSubscriptions}
          style={({ pressed }) => [
            themed($menuItem),
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Manage subscriptions"
        >
          <View style={$menuItemLeft}>
            <MaterialCommunityIcons
              name="map-marker-multiple"
              size={24}
              color={theme.colors.text}
            />
            <Text text="Manage Subscriptions" style={$menuItemText} />
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.textDim}
          />
        </Pressable>
      </View>

      {/* Notification Preferences */}
      <View style={themed($section)}>
        <Text text="Notifications" preset="subheading" style={themed($sectionTitle)} />
        <View style={themed($menuItem)}>
          <View style={$menuItemLeft}>
            <MaterialCommunityIcons
              name="email-outline"
              size={24}
              color={theme.colors.text}
            />
            <View>
              <Text text="Email Notifications" style={$menuItemText} />
              <Text
                text="Receive alerts about safety conditions"
                style={$menuItemDescription}
              />
            </View>
          </View>
          <Switch
            value={emailNotifications}
            onValueChange={setEmailNotifications}
            trackColor={{ false: theme.colors.palette.neutral400, true: theme.colors.tint }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Toggle email notifications"
          />
        </View>
      </View>

      {/* Account Actions */}
      <View style={themed($section)}>
        <Text text="Account" preset="subheading" style={themed($sectionTitle)} />

        {/* Logout Button */}
        <Button
          text="Logout"
          preset="default"
          style={themed($logoutButton)}
          onPress={handleLogout}
          LeftAccessory={() => (
            <MaterialCommunityIcons
              name="logout"
              size={20}
              color={theme.colors.text}
              style={{ marginRight: 8 }}
            />
          )}
        />

        {/* Delete Account Link */}
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            themed($deleteAccountLink),
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={20}
            color={theme.colors.error}
          />
          <Text text="Delete Account" style={[$deleteAccountText, { color: theme.colors.error }]} />
        </Pressable>
      </View>

      {/* App Version */}
      <View style={$versionContainer}>
        <Text text="MapYourHealth v1.0.0" style={$versionText} />
      </View>
    </Screen>
  )
}

// Themed styles
const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  paddingHorizontal: spacing.lg,
})

const $titleContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.lg,
  marginTop: spacing.sm,
})

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
  padding: spacing.xs,
})

const $title: ThemedStyle<TextStyle> = () => ({
  flex: 1,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $menuItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.palette.neutral100,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  borderRadius: 12,
  marginBottom: spacing.xs,
})

const $logoutButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $deleteAccountLink: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.sm,
  gap: 8,
})

// Non-themed styles
const $emailContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 16,
}

const $emailTextContainer: ViewStyle = {
  flex: 1,
}

const $labelText: TextStyle = {
  fontSize: 12,
  color: "#6B7280",
  marginBottom: 2,
}

const $emailText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
}

const $menuItemLeft: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  flex: 1,
}

const $menuItemText: TextStyle = {
  fontSize: 16,
}

const $menuItemDescription: TextStyle = {
  fontSize: 12,
  color: "#6B7280",
  marginTop: 2,
}

const $deleteAccountText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
}

const $versionContainer: ViewStyle = {
  alignItems: "center",
  marginTop: "auto",
  paddingVertical: 16,
}

const $versionText: TextStyle = {
  fontSize: 12,
  color: "#9CA3AF",
}
