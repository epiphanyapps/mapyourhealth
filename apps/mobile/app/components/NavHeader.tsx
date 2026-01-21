import { View, ViewStyle, TextStyle, Pressable } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export interface NavHeaderProps {
  /**
   * Callback when the profile icon is pressed
   */
  onProfilePress?: () => void
  /**
   * Whether the user is authenticated (affects profile icon style)
   */
  isAuthenticated?: boolean
}

/**
 * Navigation header with app branding on the left and profile icon on the right.
 *
 * @example
 * <NavHeader
 *   onProfilePress={() => setIsProfileMenuVisible(true)}
 *   isAuthenticated={isAuthenticated}
 * />
 */
export function NavHeader(props: NavHeaderProps) {
  const { onProfilePress, isAuthenticated = false } = props
  const { theme } = useAppTheme()

  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  }

  const $brandContainer: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  }

  const $logoIcon: ViewStyle = {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  }

  const $brandText: TextStyle = {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  }

  const $profileButton: ViewStyle = {
    padding: 4,
  }

  return (
    <View style={$container}>
      <View style={$brandContainer}>
        <View style={$logoIcon}>
          <MaterialCommunityIcons name="shield-check" size={20} color="#FFFFFF" />
        </View>
        <Text style={$brandText}>MapYourHealth</Text>
      </View>
      <Pressable
        onPress={onProfilePress}
        style={({ pressed }) => [$profileButton, pressed && { opacity: 0.7 }]}
        accessibilityLabel="Open profile menu"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons
          name={isAuthenticated ? "account-circle" : "account-circle-outline"}
          size={32}
          color={theme.colors.text}
        />
      </Pressable>
    </View>
  )
}
