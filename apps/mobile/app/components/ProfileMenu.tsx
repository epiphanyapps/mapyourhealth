import { Modal, Pressable, TextStyle, View, ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export interface ProfileMenuProps {
  /**
   * Whether the menu is visible
   */
  visible: boolean
  /**
   * Callback when the menu is closed
   */
  onClose: () => void
  /**
   * Callback when a navigation item is pressed
   */
  onNavigate: (screen: string) => void
  /**
   * Callback when sign out is pressed
   */
  onSignOut: () => void
  /**
   * Whether the user is authenticated
   */
  isAuthenticated: boolean
  /**
   * User's email (for authenticated users)
   */
  userEmail?: string
}

interface MenuItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  label: string
  onPress: () => void
  color?: string
}

function MenuItem({ icon, label, onPress, color }: MenuItemProps) {
  const { theme } = useAppTheme()
  const textColor = color || theme.colors.text

  const $menuItem: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 16,
  }

  const $menuItemText: TextStyle = {
    fontSize: 16,
    color: textColor,
    flex: 1,
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [$menuItem, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons name={icon} size={24} color={textColor} />
      <Text style={$menuItemText}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textDim} />
    </Pressable>
  )
}

/**
 * Profile menu bottom sheet with navigation options.
 *
 * Shows different options based on authentication state:
 * - Authenticated: My Subscriptions, Settings, Sign Out
 * - Guest: Sign In, Create Account
 */
export function ProfileMenu(props: ProfileMenuProps) {
  const { visible, onClose, onNavigate, onSignOut, isAuthenticated, userEmail } = props
  const { theme } = useAppTheme()

  const $modalOverlay: ViewStyle = {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  }

  const $modalContent: ViewStyle = {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  }

  const $handleBar: ViewStyle = {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.palette.neutral400,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  }

  const $header: ViewStyle = {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  }

  const $userInfoContainer: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  }

  const $userInfoText: ViewStyle = {
    flex: 1,
  }

  const $userEmail: TextStyle = {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  }

  const $userSubtext: TextStyle = {
    fontSize: 14,
    color: theme.colors.textDim,
    marginTop: 2,
  }

  const $divider: ViewStyle = {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  }

  const $signOutItem: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 16,
  }

  const $signOutText: TextStyle = {
    fontSize: 16,
    color: theme.colors.error,
  }

  const $headerSpacer: ViewStyle = {
    width: 24,
  }

  const $headerTitle: TextStyle = {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={$modalOverlay} onPress={onClose}>
        <Pressable style={$modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Handle bar for visual affordance */}
          <View style={$handleBar} />

          {/* Header with close button */}
          <View style={$header}>
            <View style={$headerSpacer} />
            <Text style={$headerTitle}>Menu</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close menu" accessibilityRole="button">
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* User info section */}
          <View style={$userInfoContainer}>
            <MaterialCommunityIcons
              name={isAuthenticated ? "account-circle" : "account-circle-outline"}
              size={48}
              color={theme.colors.tint}
            />
            <View style={$userInfoText}>
              {isAuthenticated ? (
                <>
                  <Text style={$userEmail}>{userEmail || "User"}</Text>
                  <Text style={$userSubtext}>Signed in</Text>
                </>
              ) : (
                <>
                  <Text style={$userEmail}>Welcome, Guest</Text>
                  <Text style={$userSubtext}>Sign in to save your data</Text>
                </>
              )}
            </View>
          </View>

          <View style={$divider} />

          {/* Menu items based on auth state */}
          {isAuthenticated ? (
            <>
              <MenuItem
                icon="map-marker-multiple"
                label="My Subscriptions"
                onPress={() => onNavigate("SubscriptionsSettings")}
              />
              <MenuItem icon="cog" label="Settings" onPress={() => onNavigate("Profile")} />
              <View style={$divider} />
              <Pressable
                onPress={onSignOut}
                style={({ pressed }) => [$signOutItem, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <MaterialCommunityIcons name="logout" size={24} color={theme.colors.error} />
                <Text style={$signOutText}>Sign Out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <MenuItem icon="login" label="Sign In" onPress={() => onNavigate("Login")} />
              <MenuItem
                icon="account-plus"
                label="Create Account"
                onPress={() => onNavigate("Signup")}
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
