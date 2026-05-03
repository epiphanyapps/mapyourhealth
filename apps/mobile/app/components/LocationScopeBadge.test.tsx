/**
 * Tests for LocationScopeBadge
 *
 * Verifies the cascade-scope badge (#123) renders only for non-city scopes,
 * exposes an accessible label, and falls back to a generic label when the
 * caller doesn't supply state/country names.
 *
 * The component normally pulls in `@/theme/context`, which transitively
 * imports `@expo-google-fonts/space-grotesk` (a known broken-in-jest
 * dependency in this monorepo). We mock `useAppTheme` directly so the
 * test exercises only the badge logic, not the theme loader.
 */

import { render } from "@testing-library/react-native"

jest.mock("@/theme/context", () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        accentBlueBg: "#E0F2FE",
        tint: "#0284C7",
      },
    },
    // Ignite's `useAppTheme` returns a `themed()` helper used by Text;
    // pass styles through unchanged so render doesn't blow up.
    themed: (style: unknown) => style,
  }),
}))

// eslint-disable-next-line import/first
import { LocationScopeBadge } from "./LocationScopeBadge"

describe("LocationScopeBadge", () => {
  it("renders nothing for city scope (no badge clutter for the common case)", () => {
    const { queryByTestId } = render(<LocationScopeBadge scope="city" state="QC" country="CA" />)
    expect(queryByTestId("location-scope-badge")).toBeNull()
  })

  it("renders nothing when no cascade resolved (scope=none)", () => {
    const { queryByTestId } = render(<LocationScopeBadge scope="none" state="QC" country="CA" />)
    expect(queryByTestId("location-scope-badge")).toBeNull()
  })

  it("renders the state label for state-scope fallback", () => {
    const { getByTestId, getByText } = render(
      <LocationScopeBadge scope="state" state="QC" country="CA" />,
    )
    expect(getByTestId("location-scope-badge")).toBeTruthy()
    expect(getByText("Showing QC data")).toBeTruthy()
  })

  it("renders the country label for country-scope fallback", () => {
    const { getByTestId, getByText } = render(
      <LocationScopeBadge scope="country" state="QC" country="CA" />,
    )
    expect(getByTestId("location-scope-badge")).toBeTruthy()
    expect(getByText("Showing CA data")).toBeTruthy()
  })

  it("falls back to a generic label when state name is missing for state scope", () => {
    const { getByText } = render(<LocationScopeBadge scope="state" />)
    expect(getByText("Showing state-level data")).toBeTruthy()
  })

  it("falls back to a generic label when country name is missing for country scope", () => {
    const { getByText } = render(<LocationScopeBadge scope="country" />)
    expect(getByText("Showing country-level data")).toBeTruthy()
  })

  it("exposes an accessibility label that screen readers will announce", () => {
    const { getByLabelText } = render(<LocationScopeBadge scope="state" state="QC" country="CA" />)
    expect(getByLabelText("Showing QC data")).toBeTruthy()
  })
})
