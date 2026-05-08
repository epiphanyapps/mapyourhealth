import { ReactNode, useCallback, useRef } from "react"
import { Pressable, StyleProp, ViewStyle } from "react-native"

const REQUIRED_TAPS = 5
const WINDOW_MS = 3000

interface SecretEnvTriggerProps {
  children: ReactNode
  onTrigger: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
}

/**
 * Counts taps on its child and fires `onTrigger` once REQUIRED_TAPS happen
 * within WINDOW_MS. Resets on success or after a quiet window. Has no visible
 * UI of its own — it inherits whatever the children draw.
 *
 * Used to gate the hidden staging-backend switch behind a 5-tap gesture so
 * end-users can't trip it accidentally.
 */
export function SecretEnvTrigger({ children, onTrigger, style, testID }: SecretEnvTriggerProps) {
  const tapCount = useRef(0)
  const firstTapAt = useRef(0)

  const handlePress = useCallback(() => {
    const now = Date.now()
    if (tapCount.current === 0 || now - firstTapAt.current > WINDOW_MS) {
      tapCount.current = 1
      firstTapAt.current = now
      return
    }
    tapCount.current += 1
    if (tapCount.current >= REQUIRED_TAPS) {
      tapCount.current = 0
      firstTapAt.current = 0
      onTrigger()
    }
  }, [onTrigger])

  return (
    <Pressable onPress={handlePress} style={style} testID={testID}>
      {children}
    </Pressable>
  )
}
