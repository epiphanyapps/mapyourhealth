import { FC, useEffect } from "react"
import { ViewStyle } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import Svg, { Circle, Path } from "react-native-svg"

interface AnimatedLogoProps {
  size?: number
  style?: ViewStyle
}

export const AnimatedLogo: FC<AnimatedLogoProps> = ({ size = 120, style }) => {
  const rotation = useSharedValue(0)

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1, // infinite
      false, // no reverse
    )
  }, [rotation])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <Animated.View style={[{ width: size, height: size }, style, animatedStyle]}>
      <Svg viewBox="0 0 1024 1024" width={size} height={size} fill="none">
        {/* Shield Outline */}
        <Path
          d="M512 96 C512 96 760 170 864 216 V520 C864 694 736 824 512 928 C288 824 160 694 160 520 V216 C264 170 512 96 512 96Z"
          stroke="#059669"
          strokeWidth={72}
          strokeLinejoin="round"
        />
        {/* Map Pin */}
        <Path
          d="M512 240 C400 240 312 328 312 440 C312 581 512 744 512 744 C512 744 712 581 712 440 C712 328 624 240 512 240Z"
          fill="#10B981"
        />
        {/* Pin inner circle */}
        <Circle cx={512} cy={440} r={96} fill="#059669" />
        {/* Medical Plus */}
        <Path
          d="M512 376 C526 376 536 386 536 400 V416 H552 C566 416 576 426 576 440 C576 454 566 464 552 464 H536 V480 C536 494 526 504 512 504 C498 504 488 494 488 480 V464 H472 C458 464 448 454 448 440 C448 426 458 416 472 416 H488 V400 C488 386 498 376 512 376Z"
          fill="#FFFFFF"
        />
      </Svg>
    </Animated.View>
  )
}
