/**
 * Tests for ContaminantTable
 *
 * Pins the per-row unit rendering introduced for EPI-18 sub-bug C.
 * Pre-fix, the table read `rows[0].unit` once and reused it for every
 * cell — so a table with Strontium-90 (Bq/L) sorted first would label
 * Lead's threshold "5 Bq/L" instead of "5 μg/L". The new behavior is to
 * use each row's own `unit` field; the optional `unit` prop on the table
 * remains as an explicit override.
 *
 * The component pulls in `@/theme/context`, which transitively imports
 * `@expo-google-fonts/space-grotesk` (broken in jest in this monorepo).
 * Mock `useAppTheme` directly. Same pattern as LocationScopeBadge.test.tsx.
 */

import { render } from "@testing-library/react-native"

jest.mock("@/theme/context", () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        text: "#000",
        textDim: "#666",
        background: "#fff",
        tint: "#0284C7",
        palette: {
          neutral100: "#F5F5F5",
          neutral200: "#E5E5E5",
          neutral300: "#D4D4D4",
        },
      },
    },
    themed: (style: unknown) => style,
  }),
}))

// Avoid pulling in the auto-generated health-effects table. If a row has
// no contaminantId, the info button is never rendered and this lookup
// never runs — but keep the mock for safety.
jest.mock("@/data/contaminantHealthEffects", () => ({
  hasHealthEffectsData: () => false,
}))

// eslint-disable-next-line import/first
import { ContaminantTable, type ContaminantTableRow } from "./ContaminantTable"

const baseRow = {
  contaminantId: undefined,
  localJurisdictionName: "QUEBEC",
  status: "danger" as const,
  isUnregulated: false,
}

describe("ContaminantTable", () => {
  describe("EPI-18 sub-bug C: per-row unit rendering", () => {
    it("renders each row's own unit, even when units differ across rows", () => {
      const rows: ContaminantTableRow[] = [
        // Tritium sorts first — pre-fix, its Bq/L unit was reused for
        // every other row. The fix uses each row's `unit`.
        {
          ...baseRow,
          name: "Tritium",
          value: 7000,
          unit: "Bq/L",
          whoLimit: 10000,
          localLimit: 7000,
        },
        { ...baseRow, name: "Lead", value: 5, unit: "μg/L", whoLimit: 10, localLimit: 5 },
      ]

      const { queryByText } = render(<ContaminantTable rows={rows} />)

      // Tritium row should still read in Bq/L — the original behavior
      // for radioactives was correct.
      expect(queryByText("10000 Bq/L")).toBeTruthy()
      expect(queryByText("7000 Bq/L")).toBeTruthy()

      // Lead row must read in μg/L. Pre-fix, this would have rendered
      // as "10 Bq/L" / "5 Bq/L" because Tritium's unit leaked across.
      expect(queryByText("10 μg/L")).toBeTruthy()
      expect(queryByText("5 μg/L")).toBeTruthy()

      // Lead's thresholds must NOT carry Tritium's unit label.
      expect(queryByText("10 Bq/L")).toBeNull()
      expect(queryByText("5 Bq/L")).toBeNull()
    })

    it("respects the explicit `unit` prop as a global override", () => {
      const rows: ContaminantTableRow[] = [
        { ...baseRow, name: "Lead", value: 5, unit: "μg/L", whoLimit: 10, localLimit: 5 },
      ]

      const { queryByText } = render(<ContaminantTable rows={rows} unit="ng/L" />)

      // The override wins over the row's own unit.
      expect(queryByText("10 ng/L")).toBeTruthy()
      expect(queryByText("5 ng/L")).toBeTruthy()
      expect(queryByText("10 μg/L")).toBeNull()
    })

    it("formats absent thresholds without a unit", () => {
      const rows: ContaminantTableRow[] = [
        {
          ...baseRow,
          name: "Glyphosate",
          value: 280,
          unit: "μg/L",
          whoLimit: null,
          localLimit: null,
        },
      ]

      const { queryByText } = render(<ContaminantTable rows={rows} />)

      // Local cell renders "N/A" when localLimit is null; WHO cell
      // renders "NO STANDARD". Neither should append a unit.
      expect(queryByText("N/A")).toBeTruthy()
      expect(queryByText("NO STANDARD")).toBeTruthy()
    })
  })
})
