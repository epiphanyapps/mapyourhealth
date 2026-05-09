/**
 * Tests for ExpandableCategoryCard
 *
 * Covers the inline sub-category expansion behavior:
 *   1. Tapping a sub-category row toggles its inner accordion *without*
 *      firing the navigation `onPress` callback.
 *   2. The "View details" link inside the expanded panel calls
 *      `onPress(subCategoryId)` exactly once with the right id.
 *   3. When `getSubCategoryContent` returns an empty array, the panel
 *      renders a placeholder line.
 *
 * The component pulls in `@/theme/context`, which transitively imports
 * `@expo-google-fonts/space-grotesk` (broken in jest in this monorepo),
 * and `@/context/CategoriesContext`, which requires a provider. We mock
 * both directly so the test exercises only the card logic.
 */

import { fireEvent, render } from "@testing-library/react-native"

import { StatCategory } from "@/data/types/safety"

jest.mock("@/theme/context", () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: "#FFFFFF",
        cardSurface: "#FFFFFF",
        text: "#000000",
        textDim: "#666666",
        tint: "#0284C7",
        separator: "#E5E5E5",
        accentBlueBg: "#E0F2FE",
        palette: {
          neutral100: "#F5F5F5",
          neutral200: "#EEEEEE",
          neutral800: "#1F2937",
        },
      },
    },
    themed: (style: unknown) => style,
  }),
}))

jest.mock("@/context/CategoriesContext", () => ({
  useCategories: () => ({
    getCategoryById: () => undefined,
    getSubCategoriesByCategoryId: () => [
      {
        subCategoryId: "fertilizer",
        categoryId: "water",
        name: "Fertilizer",
        sortOrder: 1,
        isActive: true,
      },
      {
        subCategoryId: "pesticide",
        categoryId: "water",
        name: "Pesticide",
        sortOrder: 2,
        isActive: true,
      },
    ],
  }),
}))

// `categoryConfig` is imported at module scope and pulls in icon assets;
// stub it so the legacy fallback path is a no-op.
jest.mock("@/data/categoryConfig", () => ({
  CATEGORY_CONFIG: {},
}))

// Avoid pulling Pinpoint into the test runtime.
jest.mock("@/utils/analytics", () => ({
  trackEvent: jest.fn(),
}))

// Stub the visual children — they pull theme + icons we don't need to
// exercise here. Each renders a recognisable label so queries can find them.
jest.mock("../CategoryIcon", () => {
  const { View } = require("react-native")
  return { CategoryIcon: () => <View testID="category-icon" /> }
})

jest.mock("../CategoryInfoButton", () => {
  const { View } = require("react-native")
  return { CategoryInfoButton: () => <View testID="category-info-button" /> }
})

jest.mock("../StatusIndicator", () => {
  const { View } = require("react-native")
  return { StatusIndicator: () => <View testID="status-indicator" /> }
})

jest.mock("../StatItem", () => {
  const { View, Text } = require("react-native")
  return {
    StatItem: ({ name, value, unit }: { name: string; value: number; unit: string }) => (
      <View testID={`stat-item-${name}`}>
        <Text>{`${name} ${value} ${unit}`}</Text>
      </View>
    ),
  }
})

// Custom Text wrapper just delegates to the RN Text in tests.
jest.mock("../Text", () => {
  const RN = require("react-native")
  return { Text: RN.Text }
})

// eslint-disable-next-line import/first
import { ExpandableCategoryCard } from "../ExpandableCategoryCard"

function setup(overrides: Partial<React.ComponentProps<typeof ExpandableCategoryCard>> = {}) {
  const onPress = jest.fn()
  const getSubCategoryContent = jest.fn((subCategoryId: string) => {
    if (subCategoryId === "fertilizer") {
      return [
        {
          statId: "nitrate",
          name: "Nitrate",
          value: 1.2,
          unit: "mg/L",
          status: "safe" as const,
        },
      ]
    }
    return []
  })

  const utils = render(
    <ExpandableCategoryCard
      category={StatCategory.water}
      categoryName="Water"
      status="safe"
      onPress={onPress}
      getSubCategoryContent={getSubCategoryContent}
      {...overrides}
    />,
  )

  return { ...utils, onPress, getSubCategoryContent }
}

// The parent card renders its content tree twice (a hidden measurement
// copy + the visible animated copy), and each sub-category accordion
// also renders an inner measurement copy. As a result, every pressable
// shows up multiple times in the test tree. The last match in render
// order is the user-facing instance — pick it consistently so taps land
// on the on-screen tree.
function lastByLabel(getAll: (text: string) => any[], label: string) {
  const all = getAll(label)
  return all[all.length - 1]
}

describe("ExpandableCategoryCard - inline sub-category expansion", () => {
  it("tapping a sub-category row toggles inner expansion without calling onPress", () => {
    const { getAllByLabelText, onPress } = setup()

    // Expand the parent card so the sub-category rows are interactive.
    fireEvent.press(lastByLabel(getAllByLabelText, "Water, status: safe, expandable"))

    const fertilizerRow = lastByLabel(getAllByLabelText, "Fertilizer sub-category")
    fireEvent.press(fertilizerRow)

    // The inner accordion toggled — onPress (which would navigate to the
    // detail screen) must NOT have fired.
    expect(onPress).not.toHaveBeenCalled()
    expect(fertilizerRow.props.accessibilityState).toEqual({ expanded: true })

    // Tapping again collapses without navigation.
    fireEvent.press(fertilizerRow)
    expect(onPress).not.toHaveBeenCalled()
    expect(fertilizerRow.props.accessibilityState).toEqual({ expanded: false })
  })

  it("'View details' press fires onPress with the sub-category id exactly once", () => {
    const { getAllByLabelText, onPress } = setup()

    fireEvent.press(lastByLabel(getAllByLabelText, "Water, status: safe, expandable"))
    fireEvent.press(lastByLabel(getAllByLabelText, "Fertilizer sub-category"))

    // The expanded panel renders a "View details" link tied to fertilizer.
    fireEvent.press(lastByLabel(getAllByLabelText, "View details for Fertilizer"))

    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledWith("fertilizer")
  })

  it("renders a placeholder when getSubCategoryContent returns an empty array", () => {
    const { getAllByLabelText, getAllByText } = setup()

    fireEvent.press(lastByLabel(getAllByLabelText, "Water, status: safe, expandable"))
    // Pesticide returns [] from the mocked content callback.
    fireEvent.press(lastByLabel(getAllByLabelText, "Pesticide sub-category"))

    // Placeholder appears at least once in the rendered tree.
    expect(
      getAllByText("No measurements for this sub-category at this location.").length,
    ).toBeGreaterThan(0)
  })
})
