/**
 * ProfileScreen
 *
 * Screen for managing user account settings.
 * Displays user email, manage subscriptions link, notification preferences,
 * logout button, and delete account information.
 */

import { FC, useState, useCallback, useEffect } from "react"
import { View, TextStyle, ViewStyle, Pressable, Alert, Switch, ActivityIndicator } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { useAuth } from "@/context/AuthContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { getUserSubscriptions, updateUserSubscription, type AmplifyUserSubscription } from "@/services/amplify/data"

interface ProfileScreenProps extends AppStackScreenProps<"Profile"> {}

export const ProfileScreen: FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout, expoPushToken } = useAuth()
  const { themed, theme } = useAppTheme()

  // Subscriptions and loading state
  const [subscriptions, setSubscriptions] = useState<AmplifyUserSubscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Notification preferences state
  const [enablePush, setEnablePush] = useState(true)
  const [enableEmail, setEnableEmail] = useState(false)
  const [alertOnDanger, setAlertOnDanger] = useState(true)
  const [alertOnWarning, setAlertOnWarning] = useState(false)

  /**
   * Load user's subscriptions and extract notification preferences
   */
  const loadSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true)
      const subs = await getUserSubscriptions()
      setSubscriptions(subs)

      // Use preferences from first subscription as defaults (they should all be the same)
      if (subs.length > 0) {
        const first = subs[0]
        setEnablePush(first.enablePush ?? true)
        setEnableEmail(first.enableEmail ?? false)
        setAlertOnDanger(first.alertOnDanger ?? true)
        setAlertOnWarning(first.alertOnWarning ?? false)
      }
    } catch (error) {
      console.error("Failed to load subscriptions:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load subscriptions on mount
  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  /**
   * Update notification preferences across all subscriptions
   */
  const updateNotificationPreferences = useCallback(async (
    updates: {
      enablePush?: boolean
      enableEmail?: boolean
      alertOnDanger?: boolean
      alertOnWarning?: boolean
    }
  ) => {
    if (subscriptions.length === 0) return

    setIsSaving(true)
    try {
      // Update all subscriptions with new preferences
      await Promise.all(
        subscriptions.map((sub) =>
          updateUserSubscription(sub.id, {
            ...updates,
            // Also update push token if we have one
            ...(expoPushToken && { expoPushToken }),
          })
        )
      )
      // Reload to get updated data
      await loadSubscriptions()
    } catch (error) {
      console.error("Failed to update notification preferences:", error)
      Alert.alert("Error", "Failed to save notification preferences")
    } finally {
      setIsSaving(false)
    }
  }, [subscriptions, expoPushToken, loadSubscriptions])

  /**
   * Handle toggle changes with immediate UI update and background save
   */
  const handleEnablePushChange = useCallback((value: boolean) => {
    setEnablePush(value)
    updateNotificationPreferences({ enablePush: value })
  }, [updateNotificationPreferences])

  const handleEnableEmailChange = useCallback((value: boolean) => {
    setEnableEmail(value)
    updateNotificationPreferences({ enableEmail: value })
  }, [updateNotificationPreferences])

  const handleAlertOnDangerChange = useCallback((value: boolean) => {
    setAlertOnDanger(value)
    updateNotificationPreferences({ alertOnDanger: value })
  }, [updateNotificationPreferences])

  const handleAlertOnWarningChange = useCallback((value: boolean) => {
    setAlertOnWarning(value)
    updateNotificationPreferences({ alertOnWarning: value })
  }, [updateNotificationPreferences])

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
        <View style={$sectionHeader}>
          <Text text="Notifications" preset="subheading" style={themed($sectionTitle)} />
          {isSaving && <ActivityIndicator size="small" color={theme.colors.tint} />}
        </View>

        {subscriptions.length === 0 && !isLoading ? (
          <View style={themed($emptyState)}>
            <Text
              text="Subscribe to a location to enable notifications"
              style={$emptyStateText}
            />
          </View>
        ) : (
          <>
            {/* Push Notifications */}
            <View style={themed($menuItem)}>
              <View style={$menuItemLeft}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={24}
                  color={theme.colors.text}
                />
                <View style={$menuItemTextContainer}>
                  <Text text="Push Notifications" style={$menuItemText} />
                  <Text
                    text="Receive alerts on your device"
                    style={$menuItemDescription}
                  />
                </View>
              </View>
              <Switch
                value={enablePush}
                onValueChange={handleEnablePushChange}
                trackColor={{ false: theme.colors.palette.neutral400, true: theme.colors.tint }}
                thumbColor="#FFFFFF"
                disabled={isLoading || subscriptions.length === 0}
                accessibilityLabel="Toggle push notifications"
              />
            </View>

            {/* Email Notifications */}
            <View style={themed($menuItem)}>
              <View style={$menuItemLeft}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={24}
                  color={theme.colors.text}
                />
                <View style={$menuItemTextContainer}>
                  <Text text="Email Notifications" style={$menuItemText} />
                  <Text
                    text="Receive alerts via email"
                    style={$menuItemDescription}
                  />
                </View>
              </View>
              <Switch
                value={enableEmail}
                onValueChange={handleEnableEmailChange}
                trackColor={{ false: theme.colors.palette.neutral400, true: theme.colors.tint }}
                thumbColor="#FFFFFF"
                disabled={isLoading || subscriptions.length === 0}
                accessibilityLabel="Toggle email notifications"
              />
            </View>

            {/* Alert Level Settings */}
            <Text text="Alert Levels" style={[$menuItemText, { marginTop: 16, marginBottom: 8 }]} />

            {/* Danger Alerts */}
            <View style={themed($menuItem)}>
              <View style={$menuItemLeft}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={24}
                  color={theme.colors.error}
                />
                <View style={$menuItemTextContainer}>
                  <Text text="Danger Alerts" style={$menuItemText} />
                  <Text
                    text="When contaminants exceed safe limits"
                    style={$menuItemDescription}
                  />
                </View>
              </View>
              <Switch
                value={alertOnDanger}
                onValueChange={handleAlertOnDangerChange}
                trackColor={{ false: theme.colors.palette.neutral400, true: theme.colors.error }}
                thumbColor="#FFFFFF"
                disabled={isLoading || subscriptions.length === 0}
                accessibilityLabel="Toggle danger alerts"
              />
            </View>

            {/* Warning Alerts */}
            <View style={themed($menuItem)}>
              <View style={$menuItemLeft}>
                <MaterialCommunityIcons
                  name="alert"
                  size={24}
                  color="#F59E0B"
                />
                <View style={$menuItemTextContainer}>
                  <Text text="Warning Alerts" style={$menuItemText} />
                  <Text
                    text="When contaminants approach limits"
                    style={$menuItemDescription}
                  />
                </View>
              </View>
              <Switch
                value={alertOnWarning}
                onValueChange={handleAlertOnWarningChange}
                trackColor={{ false: theme.colors.palette.neutral400, true: "#F59E0B" }}
                thumbColor="#FFFFFF"
                disabled={isLoading || subscriptions.length === 0}
                accessibilityLabel="Toggle warning alerts"
              />
            </View>
          </>
        )}
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

const $emptyState: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.md,
  borderRadius: 12,
  alignItems: "center",
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

const $menuItemTextContainer: ViewStyle = {
  flex: 1,
}

const $sectionHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
}

const $emptyStateText: TextStyle = {
  fontSize: 14,
  color: "#6B7280",
  textAlign: "center",
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
