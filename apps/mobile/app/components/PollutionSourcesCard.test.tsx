/**
 * Tests for PollutionSourcesCard.
 *
 * Verifies the dashboard surface:
 *  - empty cascade → renders nothing
 *  - collapsed view shows count + worst-severity dot
 *  - tap toggles expanded state (announced via accessibilityState)
 *  - expanded view sorts by severity desc, caps at 3 rows, hides remediated/closed
 *  - "View all N sources" navigates to the detail screen (no sourceId)
 *  - row tap navigates with sourceId
 *  - LocationScopeBadge is hidden on city scope, shown on state scope
 *
 * Mocks: theme, the cascade hook, and `useNavigation` so the test focuses on
 * the card's rendering logic and navigation contract. The `LocationScopeBadge`
 * is left real but its theme dependency is satisfied by the theme mock.
 */

import { fireEvent, render } from "@testing-library/react-native"

const mockNavigate = jest.fn()

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}))

jest.mock("@/theme/context", () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: "#FFFFFF",
        text: "#000000",
        textDim: "#666666",
        tint: "#0284C7",
        border: "#E5E5E5",
        separator: "#E5E5E5",
        accentBlueBg: "#E0F2FE",
        error: "#DC2626",
        palette: { neutral800: "#1F2937" },
      },
    },
    themed: (style: unknown) => style,
  }),
}))

const mockHookResult = {
  sources: [] as Array<Record<string, unknown>>,
  isLoading: false,
  error: null as string | null,
  scope: "none" as "city" | "state" | "country" | "none",
  refresh: jest.fn().mockResolvedValue(undefined),
}

jest.mock("@/hooks/usePollutionSources", () => ({
  usePollutionSources: () => mockHookResult,
}))

// eslint-disable-next-line import/first
import { PollutionSourcesCard } from "./PollutionSourcesCard"

function makeSource(overrides: Record<string, unknown>) {
  return {
    id: "src-id",
    sourceId: "seed",
    name: "Test Source",
    sourceType: "industrial",
    latitude: 0,
    longitude: 0,
    impactRadius: 1000,
    city: null,
    state: null,
    country: "CA",
    severityLevel: "low",
    status: "active",
    ...overrides,
  }
}

function resetHook(partial: Partial<typeof mockHookResult>) {
  mockHookResult.sources = (partial.sources ?? []) as typeof mockHookResult.sources
  mockHookResult.isLoading = partial.isLoading ?? false
  mockHookResult.error = partial.error ?? null
  mockHookResult.scope = partial.scope ?? "none"
}

beforeEach(() => {
  mockNavigate.mockClear()
  mockHookResult.refresh.mockClear()
  resetHook({})
})

describe("PollutionSourcesCard", () => {
  it("renders nothing when the cascade returns no sources", () => {
    resetHook({ sources: [], scope: "none" })
    const { queryByTestId } = render(
      <PollutionSourcesCard city="Tokyo" state="Tokyo" country="JP" />,
    )
    expect(queryByTestId("pollution-sources-card")).toBeNull()
  })

  it("shows the count and worst-severity dot in the collapsed summary", () => {
    resetHook({
      sources: [
        makeSource({ id: "a", severityLevel: "moderate" }),
        makeSource({ id: "b", severityLevel: "critical" }),
        makeSource({ id: "c", severityLevel: "low" }),
      ],
      scope: "city",
    })
    const { getByLabelText } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    // Worst severity is "critical" — appears in the accessibility label.
    expect(getByLabelText(/3 active sources nearby, worst severity critical/i)).toBeTruthy()
  })

  it("uses singular noun when only one active source is nearby", () => {
    resetHook({
      sources: [makeSource({ id: "only", severityLevel: "high" })],
      scope: "city",
    })
    const { getByLabelText } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    expect(getByLabelText(/1 active source nearby/i)).toBeTruthy()
  })

  it("toggles accessibilityState.expanded on tap", () => {
    resetHook({
      sources: [makeSource({ id: "a", severityLevel: "moderate" })],
      scope: "city",
    })
    const { getByLabelText } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    const header = getByLabelText(/Pollution sources/)
    expect(header.props.accessibilityState).toMatchObject({ expanded: false })
    fireEvent.press(header)
    expect(header.props.accessibilityState).toMatchObject({ expanded: true })
  })

  it("excludes status: remediated/closed from inline rows", () => {
    resetHook({
      sources: [
        makeSource({ id: "active", name: "Active Plant", status: "active" }),
        makeSource({ id: "closed", name: "Closed Plant", status: "closed" }),
        makeSource({ id: "remediated", name: "Cleaned Up", status: "remediated" }),
      ],
      scope: "city",
    })
    const { queryByText } = render(<PollutionSourcesCard city="Montreal" state="QC" country="CA" />)
    expect(queryByText("Active Plant")).toBeTruthy()
    expect(queryByText("Closed Plant")).toBeNull()
    expect(queryByText("Cleaned Up")).toBeNull()
  })

  it("sorts inline rows by severity descending and caps at three", () => {
    resetHook({
      sources: [
        makeSource({ id: "1", name: "Low Plant", severityLevel: "low" }),
        makeSource({ id: "2", name: "Critical Plant", severityLevel: "critical" }),
        makeSource({ id: "3", name: "Moderate Plant", severityLevel: "moderate" }),
        makeSource({ id: "4", name: "High Plant", severityLevel: "high" }),
        makeSource({ id: "5", name: "Extra Plant", severityLevel: "low" }),
      ],
      scope: "city",
    })
    const { queryByText } = render(<PollutionSourcesCard city="Montreal" state="QC" country="CA" />)
    // Top 3 by severity desc: critical, high, moderate. "Extra Plant" should be excluded.
    expect(queryByText("Critical Plant")).toBeTruthy()
    expect(queryByText("High Plant")).toBeTruthy()
    expect(queryByText("Moderate Plant")).toBeTruthy()
    expect(queryByText("Extra Plant")).toBeNull()
  })

  it("navigates to the detail screen without sourceId on 'View all' tap", () => {
    resetHook({
      sources: [makeSource({ id: "a", severityLevel: "moderate" })],
      scope: "city",
    })
    const { getByLabelText } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    fireEvent.press(getByLabelText("View all 1 pollution source"))
    expect(mockNavigate).toHaveBeenCalledWith("PollutionSources", {
      city: "Montreal",
      state: "QC",
      country: "CA",
    })
  })

  it("navigates with sourceId when a row is tapped", () => {
    resetHook({
      sources: [
        makeSource({ id: "target-id", name: "Montreal Landfill", severityLevel: "moderate" }),
      ],
      scope: "city",
    })
    const { getByLabelText } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    fireEvent.press(getByLabelText(/Montreal Landfill, moderate severity/))
    expect(mockNavigate).toHaveBeenCalledWith("PollutionSources", {
      city: "Montreal",
      state: "QC",
      country: "CA",
      sourceId: "target-id",
    })
  })

  it("hides LocationScopeBadge on city scope", () => {
    resetHook({
      sources: [makeSource({ id: "a", severityLevel: "moderate" })],
      scope: "city",
    })
    const { queryByTestId } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    expect(queryByTestId("pollution-sources-scope-badge")).toBeNull()
  })

  it("renders LocationScopeBadge on state-scope fallback", () => {
    resetHook({
      sources: [makeSource({ id: "qc", state: "QC", severityLevel: "moderate" })],
      scope: "state",
    })
    const { getByTestId } = render(
      <PollutionSourcesCard city="Sorel-Tracy" state="QC" country="CA" />,
    )
    expect(getByTestId("pollution-sources-scope-badge")).toBeTruthy()
  })

  it("renders loading state and announces it on the header", () => {
    resetHook({ isLoading: true, sources: [], scope: "none" })
    const { getByLabelText, getByText } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    expect(getByText("Loading sources…")).toBeTruthy()
    expect(getByLabelText("Pollution sources, loading")).toBeTruthy()
  })

  it("renders error state and retries on header tap", () => {
    resetHook({ error: "boom", scope: "none" })
    const { getByLabelText, getByText } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    expect(getByText("Could not load — tap to retry")).toBeTruthy()
    fireEvent.press(getByLabelText(/could not load/i))
    expect(mockHookResult.refresh).toHaveBeenCalledTimes(1)
  })

  it("renders 'all remediated' summary when every source is inactive", () => {
    resetHook({
      sources: [
        makeSource({ id: "r1", status: "remediated", severityLevel: "high" }),
        makeSource({ id: "c1", status: "closed", severityLevel: "moderate" }),
      ],
      scope: "city",
    })
    const { getByText, getByLabelText } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    expect(getByText("2 reported · all remediated or closed")).toBeTruthy()
    // Severity dot is hidden when no inline (active/monitored) sources exist —
    // the worst-severity affordance only applies to currently-active sources.
    expect(
      getByLabelText("Pollution sources, 2 sources reported, all remediated or closed"),
    ).toBeTruthy()
  })

  it("pluralises the footer for one vs many sources", () => {
    resetHook({
      sources: [makeSource({ id: "only", severityLevel: "moderate" })],
      scope: "city",
    })
    const { getByText, rerender } = render(
      <PollutionSourcesCard city="Montreal" state="QC" country="CA" />,
    )
    expect(getByText("View all 1 source")).toBeTruthy()

    resetHook({
      sources: [
        makeSource({ id: "a", severityLevel: "moderate" }),
        makeSource({ id: "b", severityLevel: "low" }),
      ],
      scope: "city",
    })
    rerender(<PollutionSourcesCard city="Montreal" state="QC" country="CA" />)
    expect(getByText("View all 2 sources")).toBeTruthy()
  })
})
