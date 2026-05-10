import { act, renderHook } from "@testing-library/react-native"

import { useMinimumDuration } from "./useMinimumDuration"

describe("useMinimumDuration", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("returns the input value when it stays false", () => {
    const { result } = renderHook(({ v }) => useMinimumDuration(v, 250), {
      initialProps: { v: false },
    })
    expect(result.current).toBe(false)
  })

  it("flips to true immediately when input goes true", () => {
    const { result, rerender } = renderHook(({ v }) => useMinimumDuration(v, 250), {
      initialProps: { v: false },
    })
    rerender({ v: true })
    expect(result.current).toBe(true)
  })

  it("holds true for at least the minimum duration after input flips false", () => {
    const { result, rerender } = renderHook(({ v }) => useMinimumDuration(v, 250), {
      initialProps: { v: true },
    })
    expect(result.current).toBe(true)

    // Flip false after 50ms — much less than the 250ms minimum
    act(() => {
      jest.advanceTimersByTime(50)
    })
    rerender({ v: false })
    expect(result.current).toBe(true)

    // Halfway through the hold window
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(result.current).toBe(true)

    // Past the 250ms minimum (50 + 100 + 110 = 260ms total elapsed)
    act(() => {
      jest.advanceTimersByTime(110)
    })
    expect(result.current).toBe(false)
  })

  it("releases immediately when input flips false after the minimum has already elapsed", () => {
    const { result, rerender } = renderHook(({ v }) => useMinimumDuration(v, 250), {
      initialProps: { v: true },
    })

    // Hold true for longer than the minimum
    act(() => {
      jest.advanceTimersByTime(500)
    })
    rerender({ v: false })
    // No remaining hold time — should release on next tick
    act(() => {
      jest.advanceTimersByTime(0)
    })
    expect(result.current).toBe(false)
  })

  it("does not hold when value started false and never went true", () => {
    const { result, rerender } = renderHook(({ v }) => useMinimumDuration(v, 250), {
      initialProps: { v: false },
    })
    rerender({ v: false })
    expect(result.current).toBe(false)
  })
})
