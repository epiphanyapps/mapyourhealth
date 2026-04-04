import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { ContaminantInfoButton } from "../ContaminantInfoButton"

jest.mock("@/data/contaminantHealthEffects", () => ({
  hasHealthEffectsData: jest.fn((id: string) => id === "bendiocarb"),
  getContaminantHealthEffects: jest.fn(),
}))

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

describe("ContaminantInfoButton", () => {
  it("renders info button for known contaminant", () => {
    const { getByLabelText } = renderWithTheme(<ContaminantInfoButton contaminantId="bendiocarb" />)

    expect(getByLabelText("Health effects for bendiocarb")).toBeTruthy()
  })
})
