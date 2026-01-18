import { useState, useRef, ReactNode } from "react"
import {
  View,
  ViewStyle,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleProp,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useAppTheme } from "@/theme/context"

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export interface ExpandableCardProps {
  /**
   * The header content that is always visible
   */
  header: ReactNode
  /**
   * The content that shows/hides on expand/collapse
   */
  children: ReactNode
  /**
   * Whether the card starts expanded
   * @default false
   */
  initiallyExpanded?: boolean
  /**
   * Callback when expand state changes
   */
  onToggle?: (expanded: boolean) => void
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
}

/**
 * An expandable card component with animated expand/collapse.
 * The header is always visible, and the content toggles visibility.
 * Includes a chevron icon that rotates on expand/collapse.
 *
 * @example
 * <ExpandableCard
 *   header={<Text>Water Quality</Text>}
 *   initiallyExpanded={false}
 * >
 *   <Text>Detailed water quality information...</Text>
 * </ExpandableCard>
 */
export function ExpandableCard(props: ExpandableCardProps) {
  const { header, children, initiallyExpanded = false, onToggle, style } = props
  const { theme } = useAppTheme()

  const [expanded, setExpanded] = useState(initiallyExpanded)
  const rotateAnim = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current

  const toggleExpand = () => {
    const newExpanded = !expanded

    // Animate chevron rotation
    Animated.timing(rotateAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()

    // Animate content expand/collapse
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)

    setExpanded(newExpanded)
    onToggle?.(newExpanded)
  }

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  })

  const $container: ViewStyle = {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: theme.colors.palette.neutral800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  }

  const $header: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  }

  const $headerContent: ViewStyle = {
    flex: 1,
  }

  const $content: ViewStyle = {
    paddingHorizontal: 16,
    paddingBottom: 14,
  }

  return (
    <View style={[$container, style]}>
      <Pressable
        onPress={toggleExpand}
        style={$header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Toggle card expansion"
      >
        <View style={$headerContent}>{header}</View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <MaterialCommunityIcons
            name="chevron-down"
            size={24}
            color={theme.colors.textDim}
          />
        </Animated.View>
      </Pressable>

      {expanded && <View style={$content}>{children}</View>}
    </View>
  )
}
