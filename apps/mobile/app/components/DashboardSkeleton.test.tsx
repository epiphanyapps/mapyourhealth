import { render } from "@testing-library/react-native"

import { DashboardSkeleton } from "./DashboardSkeleton"
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

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated/mock")
  return {
    ...actual,
    useReducedMotion: () => false,
  }
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

describe("DashboardSkeleton", () => {
  it("renders with the default accessibility label", () => {
    const { getByLabelText } = render(
      <Wrapper>
        <DashboardSkeleton />
      </Wrapper>,
    )
    expect(getByLabelText("Loading dashboard")).toBeTruthy()
  })

  it("accepts a custom accessibility label", () => {
    const { getByLabelText } = render(
      <Wrapper>
        <DashboardSkeleton accessibilityLabel="Loading water quality data" />
      </Wrapper>,
    )
    expect(getByLabelText("Loading water quality data")).toBeTruthy()
  })

  it("announces via accessibilityLiveRegion=polite", () => {
    const { getByLabelText } = render(
      <Wrapper>
        <DashboardSkeleton />
      </Wrapper>,
    )
    const root = getByLabelText("Loading dashboard")
    expect(root.props.accessibilityLiveRegion).toBe("polite")
    expect(root.props.accessibilityRole).toBe("progressbar")
  })
})
