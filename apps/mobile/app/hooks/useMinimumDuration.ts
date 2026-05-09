import { useEffect, useRef, useState } from "react"

/**
 * Holds a boolean true for at least `ms` milliseconds after it first becomes
 * true. Prevents loading states from flashing on warm-cache hits where the
 * underlying value flips false in 30-50ms, which would otherwise cause a
 * one-frame skeleton blip that reads as jank.
 *
 * Returns the held value. When the input goes false but the minimum duration
 * has not elapsed, the returned value stays true until the deadline.
 */
export function useMinimumDuration(value: boolean, ms: number): boolean {
  const [held, setHeld] = useState(value)
  const startedAt = useRef<number | null>(value ? Date.now() : null)

  useEffect(() => {
    if (value) {
      if (startedAt.current === null) {
        startedAt.current = Date.now()
      }
      setHeld(true)
      return
    }

    if (startedAt.current === null) {
      setHeld(false)
      return
    }

    const elapsed = Date.now() - startedAt.current
    const remaining = Math.max(0, ms - elapsed)

    if (remaining === 0) {
      startedAt.current = null
      setHeld(false)
      return
    }

    const timer = setTimeout(() => {
      startedAt.current = null
      setHeld(false)
    }, remaining)
    return () => clearTimeout(timer)
  }, [value, ms])

  return held
}
