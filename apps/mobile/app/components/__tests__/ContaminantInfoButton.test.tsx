import React from "react"
import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"
import { ContaminantInfoButton } from "../ContaminantInfoButton"

// Mock the health effects data
jest.mock("@/data/contaminantHealthEffects", () => ({
  hasHealthInfo: jest.fn((id: string) => id === "bendiocarb"),
  getContaminantHealthInfo: jest.fn(),
}))

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe("ContaminantInfoButton", () => {
  it("renders info button when health info is available", () => {
    const { getByLabelText } = renderWithTheme(
      <ContaminantInfoButton
        contaminantId="bendiocarb"
        contaminantName="Bendiocarb"
      />
    )

    expect(getByLabelText("Get health information about Bendiocarb")).toBeTruthy()
  })

  it("does not render when health info is not available", () => {
    const { queryByLabelText } = renderWithTheme(
      <ContaminantInfoButton
        contaminantId="unknown-contaminant"
        contaminantName="Unknown"
      />
    )

    expect(queryByLabelText(/Get health information/)).toBeNull()
  })

  it("has proper accessibility attributes", () => {
    const { getByLabelText } = renderWithTheme(
      <ContaminantInfoButton
        contaminantId="bendiocarb"
        contaminantName="Bendiocarb"
      />
    )

    const button = getByLabelText("Get health information about Bendiocarb")
    expect(button).toHaveProp("accessibilityRole", "button")
  })
})