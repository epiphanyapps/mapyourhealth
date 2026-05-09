import { render } from "@testing-library/react-native"

import { SkeletonBlock } from "./Skeleton"
import { ThemeProvider } from "../theme/context"

jest.mock("expo-font", () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}))

jest.mock("@expo-google-fonts/space-grotesk", () => ({
  SpaceGrotesk_300Light: "SpaceGrotesk_300Light",
  SpaceGrotesk_400Regular: "SpaceGrotesk_400Regular",
  SpaceGrotesk_500Medium: "SpaceGrotesk_500Medium",
  SpaceGrotesk_600SemiBold: "SpaceGrotesk_600SemiBold",
  SpaceGrotesk_700Bold: "SpaceGrotesk_700Bold",
  useFonts: () => [true, null],
}))

jest.mock("react-native-mmkv", () => ({
  useMMKVString: jest.fn(() => [undefined, jest.fn()]),
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
  })),
}))

jest.mock("../utils/storage", () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
  },
}))

const mockUseReducedMotion = jest.fn().mockReturnValue(false)
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated/mock")
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  }
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

describe("SkeletonBlock", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false)
  })

  it("renders with default dimensions", () => {
    const { toJSON } = render(
      <Wrapper>
        <SkeletonBlock />
      </Wrapper>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("accepts width, height, and borderRadius props", () => {
    const { toJSON } = render(
      <Wrapper>
        <SkeletonBlock width={200} height={24} borderRadius={12} />
      </Wrapper>,
    )
    const tree = toJSON()
    const flatStyle = Array.isArray(tree?.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree?.props.style
    expect(flatStyle.width).toBe(200)
    expect(flatStyle.height).toBe(24)
    expect(flatStyle.borderRadius).toBe(12)
  })

  it("is hidden from accessibility tree", () => {
    const { toJSON } = render(
      <Wrapper>
        <SkeletonBlock />
      </Wrapper>,
    )
    expect(toJSON()?.props.accessibilityElementsHidden).toBe(true)
    expect(toJSON()?.props.importantForAccessibility).toBe("no-hide-descendants")
  })

  it("renders without animation when reduce motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { toJSON } = render(
      <Wrapper>
        <SkeletonBlock />
      </Wrapper>,
    )
    expect(toJSON()).toBeTruthy()
  })
})
