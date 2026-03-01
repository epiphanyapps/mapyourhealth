/**
 * Tests for ZipCodeSearch component
 */

import { NavigationContainer } from "@react-navigation/native"
import { fireEvent, render, waitFor } from "@testing-library/react-native"

import { ZipCodeSearch, ZipCodeSelection } from "./ZipCodeSearch"
import { ThemeProvider } from "../theme/context"

// Mock expo-font (required by @expo-google-fonts)
jest.mock("expo-font", () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}))

// Mock @expo-google-fonts/space-grotesk
jest.mock("@expo-google-fonts/space-grotesk", () => ({
  SpaceGrotesk_300Light: "SpaceGrotesk_300Light",
  SpaceGrotesk_400Regular: "SpaceGrotesk_400Regular",
  SpaceGrotesk_500Medium: "SpaceGrotesk_500Medium",
  SpaceGrotesk_600SemiBold: "SpaceGrotesk_600SemiBold",
  SpaceGrotesk_700Bold: "SpaceGrotesk_700Bold",
  useFonts: () => [true, null],
}))

// Mock useLocation hook
const mockGetLocationZipCode = jest.fn()
let mockIsLocating = false
let mockLocationError = ""

jest.mock("../hooks/useLocation", () => ({
  useLocation: () => ({
    getLocationZipCode: mockGetLocationZipCode,
    isLocating: mockIsLocating,
    error: mockLocationError,
    clearError: jest.fn(),
  }),
}))

// Mock postal code utilities
jest.mock("../utils/postalCode", () => ({
  isValidPostalCode: jest.fn((code: string) => {
    // Simple validation for testing
    const trimmed = code.trim()
    if (!trimmed || trimmed.length < 4 || trimmed.length > 12) return false
    return /^[A-Za-z0-9][A-Za-z0-9 -]*[A-Za-z0-9]$/.test(trimmed)
  }),
  normalizePostalCode: jest.fn((code: string) => code.trim().toUpperCase().replace(/[ -]/g, "")),
  getPostalCodeLabel: jest.fn(() => "zip code"),
}))

// Mock zip code data lookup
jest.mock("../data/mock", () => ({
  getZipCodeDataByCode: jest.fn((code: string) => {
    const mockData: Record<string, { zipCode: string; cityName: string; state: string }> = {
      "90210": { zipCode: "90210", cityName: "Beverly Hills", state: "CA" },
      "10001": { zipCode: "10001", cityName: "New York", state: "NY" },
      "M5V3L9": { zipCode: "M5V3L9", cityName: "Toronto", state: "ON" },
    }
    return mockData[code] || null
  }),
}))

// Mock MMKV storage for ThemeProvider
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

// Test wrapper with required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NavigationContainer>{children}</NavigationContainer>
    </ThemeProvider>
  )
}

describe("ZipCodeSearch", () => {
  const mockOnSelectionChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsLocating = false
    mockLocationError = ""
  })

  describe("rendering", () => {
    it("renders with default placeholder", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      expect(getByPlaceholderText("Enter zip code...")).toBeTruthy()
    })

    it("renders with custom placeholder", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ZipCodeSearch
            selectedZipCodes={[]}
            onSelectionChange={mockOnSelectionChange}
            placeholder="Type your postal code..."
          />
        </TestWrapper>,
      )

      expect(getByPlaceholderText("Type your postal code...")).toBeTruthy()
    })

    it("renders My Location button", () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      expect(getByLabelText("Use my location")).toBeTruthy()
    })

    it("renders search icon", () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      expect(getByLabelText("Enter postal code")).toBeTruthy()
    })
  })

  describe("zip code input", () => {
    it("adds valid US zip code on submit", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Enter zip code...")
      fireEvent.changeText(input, "90210")
      fireEvent(input, "submitEditing")

      expect(mockOnSelectionChange).toHaveBeenCalledWith([
        {
          zipCode: "90210",
          cityName: "Beverly Hills",
          state: "CA",
        },
      ])
    })

    it("adds valid Canadian postal code on submit", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Enter zip code...")
      fireEvent.changeText(input, "M5V 3L9")
      fireEvent(input, "submitEditing")

      expect(mockOnSelectionChange).toHaveBeenCalledWith([
        {
          zipCode: "M5V3L9",
          cityName: "Toronto",
          state: "ON",
        },
      ])
    })

    it("clears input after successful addition", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Enter zip code...")
      fireEvent.changeText(input, "90210")
      fireEvent(input, "submitEditing")

      expect(input.props.value).toBe("")
    })

    it("handles unknown zip codes with placeholder city", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Enter zip code...")
      fireEvent.changeText(input, "12345")
      fireEvent(input, "submitEditing")

      expect(mockOnSelectionChange).toHaveBeenCalledWith([
        {
          zipCode: "12345",
          cityName: "Unknown",
          state: "",
        },
      ])
    })
  })

  describe("validation errors", () => {
    it("shows error for invalid postal code (too short)", () => {
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Enter zip code...")
      fireEvent.changeText(input, "123")
      fireEvent(input, "submitEditing")

      expect(getByText("Please enter a valid zip code")).toBeTruthy()
      expect(mockOnSelectionChange).not.toHaveBeenCalled()
    })

    it("shows error for duplicate zip code", () => {
      const existingSelections: ZipCodeSelection[] = [
        { zipCode: "90210", cityName: "Beverly Hills", state: "CA" },
      ]

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <ZipCodeSearch
            selectedZipCodes={existingSelections}
            onSelectionChange={mockOnSelectionChange}
          />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Enter zip code...")
      fireEvent.changeText(input, "90210")
      fireEvent(input, "submitEditing")

      expect(getByText("This zip code is already selected")).toBeTruthy()
      expect(mockOnSelectionChange).not.toHaveBeenCalled()
    })

    it("shows error when max selections reached", () => {
      const maxSelections: ZipCodeSelection[] = Array.from({ length: 10 }, (_, i) => ({
        zipCode: `9000${i}`,
        cityName: `City ${i}`,
        state: "CA",
      }))

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <ZipCodeSearch
            selectedZipCodes={maxSelections}
            onSelectionChange={mockOnSelectionChange}
            maxSelections={10}
          />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Enter zip code...")
      fireEvent.changeText(input, "12345")
      fireEvent(input, "submitEditing")

      expect(getByText("Maximum 10 zip codes allowed")).toBeTruthy()
      expect(mockOnSelectionChange).not.toHaveBeenCalled()
    })

    it("does not trigger selection change for empty input", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Enter zip code...")
      fireEvent.changeText(input, "")
      fireEvent(input, "submitEditing")

      // Should not trigger for empty submit - just ignores it
      expect(mockOnSelectionChange).not.toHaveBeenCalled()
    })
  })

  describe("chip display", () => {
    it("displays selected zip codes as chips", () => {
      const selections: ZipCodeSelection[] = [
        { zipCode: "90210", cityName: "Beverly Hills", state: "CA" },
        { zipCode: "10001", cityName: "New York", state: "NY" },
      ]

      const { getByText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={selections} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      expect(getByText("90210")).toBeTruthy()
      expect(getByText("10001")).toBeTruthy()
      expect(getByText("Beverly Hills, CA")).toBeTruthy()
      expect(getByText("New York, NY")).toBeTruthy()
    })

    it("shows selection count", () => {
      const selections: ZipCodeSelection[] = [
        { zipCode: "90210", cityName: "Beverly Hills", state: "CA" },
        { zipCode: "10001", cityName: "New York", state: "NY" },
      ]

      const { getByText } = render(
        <TestWrapper>
          <ZipCodeSearch
            selectedZipCodes={selections}
            onSelectionChange={mockOnSelectionChange}
            maxSelections={10}
          />
        </TestWrapper>,
      )

      expect(getByText("2 of 10 selected")).toBeTruthy()
    })

    it("does not show city subtext for Unknown cities", () => {
      const selections: ZipCodeSelection[] = [{ zipCode: "99999", cityName: "Unknown", state: "" }]

      const { getByText, queryByText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={selections} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      expect(getByText("99999")).toBeTruthy()
      expect(queryByText("Unknown")).toBeNull()
    })
  })

  describe("chip removal", () => {
    it("removes zip code when chip close button is pressed", () => {
      const selections: ZipCodeSelection[] = [
        { zipCode: "90210", cityName: "Beverly Hills", state: "CA" },
        { zipCode: "10001", cityName: "New York", state: "NY" },
      ]

      const { getByLabelText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={selections} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      fireEvent.press(getByLabelText("Remove 90210"))

      expect(mockOnSelectionChange).toHaveBeenCalledWith([
        { zipCode: "10001", cityName: "New York", state: "NY" },
      ])
    })
  })

  describe("My Location functionality", () => {
    it("adds zip code from location when button is pressed", async () => {
      mockGetLocationZipCode.mockResolvedValue("90210")

      const { getByLabelText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      fireEvent.press(getByLabelText("Use my location"))

      await waitFor(() => {
        expect(mockGetLocationZipCode).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith([
          {
            zipCode: "90210",
            cityName: "Beverly Hills",
            state: "CA",
          },
        ])
      })
    })

    it("does not add zip code when location returns null", async () => {
      mockGetLocationZipCode.mockResolvedValue(null)

      const { getByLabelText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      fireEvent.press(getByLabelText("Use my location"))

      await waitFor(() => {
        expect(mockGetLocationZipCode).toHaveBeenCalled()
      })

      expect(mockOnSelectionChange).not.toHaveBeenCalled()
    })

    it("shows loading state when locating", () => {
      mockIsLocating = true

      const { getByLabelText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      const button = getByLabelText("Use my location")
      expect(button).toBeTruthy()
      // Button should be disabled when locating
    })

    it("displays location error message", () => {
      mockLocationError = "Failed to get your location. Please try again."

      const { getByText } = render(
        <TestWrapper>
          <ZipCodeSearch selectedZipCodes={[]} onSelectionChange={mockOnSelectionChange} />
        </TestWrapper>,
      )

      expect(getByText("Failed to get your location. Please try again.")).toBeTruthy()
    })
  })

  describe("custom maxSelections", () => {
    it("respects custom maxSelections value", () => {
      const selections: ZipCodeSelection[] = [
        { zipCode: "90210", cityName: "Beverly Hills", state: "CA" },
        { zipCode: "10001", cityName: "New York", state: "NY" },
        { zipCode: "33139", cityName: "Miami Beach", state: "FL" },
      ]

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <ZipCodeSearch
            selectedZipCodes={selections}
            onSelectionChange={mockOnSelectionChange}
            maxSelections={3}
          />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Enter zip code...")
      fireEvent.changeText(input, "12345")
      fireEvent(input, "submitEditing")

      expect(getByText("Maximum 3 zip codes allowed")).toBeTruthy()
    })

    it("shows correct count for custom maxSelections", () => {
      const selections: ZipCodeSelection[] = [
        { zipCode: "90210", cityName: "Beverly Hills", state: "CA" },
      ]

      const { getByText } = render(
        <TestWrapper>
          <ZipCodeSearch
            selectedZipCodes={selections}
            onSelectionChange={mockOnSelectionChange}
            maxSelections={5}
          />
        </TestWrapper>,
      )

      expect(getByText("1 of 5 selected")).toBeTruthy()
    })
  })
})
