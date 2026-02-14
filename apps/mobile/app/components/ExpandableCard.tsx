import { ReactNode, useCallback, useState } from "react"
import { LayoutChangeEvent, Pressable, StyleProp, View, ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"

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

const ANIMATION_DURATION = 300
const EASING = Easing.bezier(0.4, 0, 0.2, 1)

/**
 * An expandable card component with smooth Reanimated accordion animation.
 * The header is always visible, and the content toggles visibility with
 * a height animation. Includes a chevron icon that rotates on expand/collapse.
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
  const [measured, setMeasured] = useState(false)
  const contentHeight = useSharedValue(0)
  const progress = useSharedValue(initiallyExpanded ? 1 : 0)

  const handleMeasured = useCallback(() => {
    setMeasured(true)
  }, [])

  const onContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height
      if (height > 0 && contentHeight.value === 0) {
        contentHeight.value = height
        runOnJS(handleMeasured)()
      }
    },
    [contentHeight, handleMeasured],
  )

  const toggleExpand = useCallback(() => {
    const newExpanded = !expanded

    // Animate
    progress.value = withTiming(newExpanded ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: EASING,
    })

    setExpanded(newExpanded)
    onToggle?.(newExpanded)
  }, [expanded, progress, onToggle])

  // Animated style for content container
  const animatedContentStyle = useAnimatedStyle(() => {
    // Before measurement, use auto height for initial render
    if (contentHeight.value === 0) {
      return {
        height: "auto" as unknown as number,
        opacity: 1,
      }
    }

    const height = interpolate(progress.value, [0, 1], [0, contentHeight.value])

    return {
      height,
      opacity: interpolate(progress.value, [0, 0.3, 1], [0, 0.8, 1]),
    }
  })

  // Animated style for chevron rotation (right → down)
  const animatedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${interpolate(progress.value, [0, 1], [0, 90])}deg`,
        },
      ],
    }
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

  const $contentOuter: ViewStyle = {
    overflow: "hidden",
  }

  const $contentInner: ViewStyle = {
    paddingHorizontal: 16,
    paddingBottom: 14,
  }

  // For initial measurement, we render content invisibly first
  const $measureContainer: ViewStyle = {
    position: "absolute",
    opacity: 0,
    pointerEvents: "none",
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
        <Animated.View style={animatedChevronStyle}>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textDim} />
        </Animated.View>
      </Pressable>

      {/* Hidden measurement view - renders once to get height */}
      {!measured && (
        <View style={$measureContainer}>
          <View style={$contentInner} onLayout={onContentLayout}>
            {children}
          </View>
        </View>
      )}

      {/* Animated content wrapper */}
      <Animated.View style={[$contentOuter, animatedContentStyle]}>
        <View style={$contentInner}>{children}</View>
      </Animated.View>
    </View>
  )
}
