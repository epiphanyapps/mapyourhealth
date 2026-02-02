/**
 * NotificationBanner
 *
 * An animated in-app notification banner that slides down from the top.
 * Used to show push notifications when the app is in the foreground.
 */

import { useEffect, useRef, useCallback } from "react"
import {
  Animated,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "./Text"

interface NotificationBannerProps {
  title: string
  body: string
  onPress: () => void
  onDismiss: () => void
  autoDismissMs?: number
}

export function NotificationBanner({
  title,
  body,
  onPress,
  onDismiss,
  autoDismissMs = 5000,
}: NotificationBannerProps) {
  const insets = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(-150)).current

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss())
  }, [translateY, onDismiss])

  useEffect(() => {
    // Slide in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start()

    // Auto dismiss after specified time
    const timer = setTimeout(() => {
      dismiss()
    }, autoDismissMs)

    return () => clearTimeout(timer)
  }, [translateY, autoDismissMs, dismiss])

  const handlePress = useCallback(() => {
    dismiss()
    // Small delay to let animation start before navigation
    setTimeout(onPress, 100)
  }, [dismiss, onPress])

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          top: insets.top + 8,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Notification: ${title}. ${body}. Tap to view.`}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="water" size={24} color="#3B82F6" />
        </View>

        <View style={styles.textContainer}>
          <Text text={title} style={styles.title} numberOfLines={1} />
          <Text text={body} style={styles.body} numberOfLines={2} />
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  } as ViewStyle,

  content: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  } as ViewStyle,

  textContainer: {
    flex: 1,
    marginRight: 8,
  } as ViewStyle,

  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  } as TextStyle,

  body: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  } as TextStyle,

  closeButton: {
    padding: 4,
  } as ViewStyle,
})
