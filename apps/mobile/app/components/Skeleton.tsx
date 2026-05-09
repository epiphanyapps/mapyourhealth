import { useEffect } from "react"
import { ViewStyle } from "react-native"
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"

interface SkeletonBlockProps {
  width?: ViewStyle["width"]
  height?: ViewStyle["height"]
  borderRadius?: number
  style?: ViewStyle
}

const PULSE_DURATION_MS = 900
const PULSE_MIN_OPACITY = 0.55
const PULSE_MAX_OPACITY = 1

/**
 * SkeletonBlock — animated placeholder block.
 *
 * Pulses opacity between 0.55 and 1 on a 900ms ease-in-out loop. Honors
 * useReducedMotion(): when the OS accessibility setting is on, the block
 * stays at full opacity with no animation.
 *
 * Color is driven by the theme's neutral200 token, matching the shadcn
 * Skeleton aesthetic used in the admin app.
 */
export function SkeletonBlock(props: SkeletonBlockProps) {
  const { width = "100%", height = 16, borderRadius = 6, style } = props
  const { theme } = useAppTheme()
  const reduceMotion = useReducedMotion()
  const opacity = useSharedValue(PULSE_MIN_OPACITY)

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = PULSE_MAX_OPACITY
      return
    }
    opacity.value = withRepeat(
      withTiming(PULSE_MAX_OPACITY, { duration: PULSE_DURATION_MS }),
      -1,
      true,
    )
  }, [reduceMotion, opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.palette.neutral200,
        },
        style,
        animatedStyle,
      ]}
    />
  )
}
