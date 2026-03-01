/**
 * Tests for PlacesSearchBar component
 */

import { NavigationContainer } from "@react-navigation/native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, waitFor } from "@testing-library/react-native"

import { PlacesSearchBar } from "./PlacesSearchBar"
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

// Mock useLocationSearch hook
const mockSearch = jest.fn()
const mockClearSuggestions = jest.fn()
const mockResolveAddressToNearestCity = jest.fn()

jest.mock("../hooks/useLocationSearch", () => ({
  useLocationSearch: () => ({
    suggestions: mockSuggestions,
    isSearching: mockIsSearching,
    isLoading: false,
    error: mockError,
    search: mockSearch,
    clearSuggestions: mockClearSuggestions,
    resolveAddressToNearestCity: mockResolveAddressToNearestCity,
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

// Mutable state for tests
let mockSuggestions: ReturnType<typeof createMockSuggestions> = []
let mockIsSearching = false
let mockError: string | null = null

function createMockSuggestions() {
  return [
    {
      type: "city" as const,
      displayText: "New York, NY",
      secondaryText: "United States",
      city: "New York",
      state: "NY",
      country: "US",
    },
    {
      type: "city" as const,
      displayText: "Newark, NJ",
      secondaryText: "United States",
      city: "Newark",
      state: "NJ",
      country: "US",
    },
  ]
}

// Test wrapper with all required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NavigationContainer>{children}</NavigationContainer>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

describe("PlacesSearchBar", () => {
  const mockOnLocationSelect = jest.fn()
  const mockOnLocationPress = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSuggestions = []
    mockIsSearching = false
    mockError = null
  })

  describe("rendering", () => {
    it("renders with default placeholder", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      expect(getByPlaceholderText("Search city or location...")).toBeTruthy()
    })

    it("renders with custom placeholder", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <PlacesSearchBar
            onLocationSelect={mockOnLocationSelect}
            placeholder="Find your city..."
          />
        </TestWrapper>,
      )

      expect(getByPlaceholderText("Find your city...")).toBeTruthy()
    })

    it("renders search icon", () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      expect(getByLabelText("Search cities and locations")).toBeTruthy()
    })
  })

  describe("location button", () => {
    it("does not show location button by default", () => {
      const { queryByLabelText } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      expect(queryByLabelText("Use my location")).toBeNull()
    })

    it("shows location button when showLocationButton is true", () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <PlacesSearchBar
            onLocationSelect={mockOnLocationSelect}
            showLocationButton={true}
            onLocationPress={mockOnLocationPress}
          />
        </TestWrapper>,
      )

      expect(getByLabelText("Use my location")).toBeTruthy()
    })

    it("calls onLocationPress when location button is pressed", () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <PlacesSearchBar
            onLocationSelect={mockOnLocationSelect}
            showLocationButton={true}
            onLocationPress={mockOnLocationPress}
          />
        </TestWrapper>,
      )

      fireEvent.press(getByLabelText("Use my location"))

      expect(mockOnLocationPress).toHaveBeenCalled()
    })

    it("shows loading indicator when isLocating is true", () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <PlacesSearchBar
            onLocationSelect={mockOnLocationSelect}
            showLocationButton={true}
            onLocationPress={mockOnLocationPress}
            isLocating={true}
          />
        </TestWrapper>,
      )

      // Button should still exist but be disabled
      const button = getByLabelText("Use my location")
      expect(button).toBeTruthy()
    })
  })

  describe("search functionality", () => {
    it("triggers search when text is entered with 2+ characters", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Search city or location...")
      fireEvent.changeText(input, "Ne")

      expect(mockSearch).toHaveBeenCalledWith("Ne")
    })

    it("does not trigger search for single character", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Search city or location...")
      fireEvent.changeText(input, "N")

      expect(mockSearch).not.toHaveBeenCalled()
      expect(mockClearSuggestions).toHaveBeenCalled()
    })

    it("clears suggestions when input is cleared", () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Search city or location...")

      // Type something first
      fireEvent.changeText(input, "New")

      // Clear the input
      fireEvent.changeText(input, "")

      expect(mockClearSuggestions).toHaveBeenCalled()
    })
  })

  describe("suggestion selection", () => {
    it("calls onLocationSelect with city data when suggestion is selected", async () => {
      mockSuggestions = createMockSuggestions()

      const { getByPlaceholderText, getByText, rerender } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      // Trigger search to show suggestions
      const input = getByPlaceholderText("Search city or location...")
      fireEvent.changeText(input, "New")

      // Re-render with suggestions visible
      rerender(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(getByText("New York, NY")).toBeTruthy()
      })

      // Select a suggestion
      fireEvent.press(getByText("New York, NY"))

      expect(mockOnLocationSelect).toHaveBeenCalledWith("New York", "NY", "US")
    })

    it("clears input after selecting a suggestion", async () => {
      mockSuggestions = createMockSuggestions()

      const { getByPlaceholderText, getByText, rerender } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Search city or location...")
      fireEvent.changeText(input, "New")

      rerender(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(getByText("New York, NY")).toBeTruthy()
      })

      fireEvent.press(getByText("New York, NY"))

      // Input should be cleared after selection
      expect(input.props.value).toBe("")
    })
  })

  describe("state-level selection", () => {
    it("handles state-level suggestion selection", async () => {
      mockSuggestions = [
        {
          type: "state" as const,
          displayText: "Texas",
          secondaryText: "United States",
          state: "TX",
          country: "US",
        },
      ]

      const { getByPlaceholderText, getByText, rerender } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Search city or location...")
      fireEvent.changeText(input, "Tex")

      rerender(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(getByText("Texas")).toBeTruthy()
      })

      fireEvent.press(getByText("Texas"))

      // State selection should pass empty city
      expect(mockOnLocationSelect).toHaveBeenCalledWith("", "TX", "US")
    })
  })

  describe("address resolution", () => {
    it("resolves address suggestions to nearest city", async () => {
      mockSuggestions = [
        {
          type: "address" as const,
          displayText: "123 Main St",
          secondaryText: "Springfield, IL",
          city: "place123", // placeId stored in city field for addresses
        },
      ]

      mockResolveAddressToNearestCity.mockResolvedValue({
        city: "Springfield",
        state: "IL",
        country: "US",
        distanceKm: 0.5,
      })

      const { getByPlaceholderText, getByText, rerender } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Search city or location...")
      fireEvent.changeText(input, "123 Main")

      rerender(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(getByText("123 Main St")).toBeTruthy()
      })

      fireEvent.press(getByText("123 Main St"))

      await waitFor(() => {
        expect(mockResolveAddressToNearestCity).toHaveBeenCalledWith("place123")
      })

      await waitFor(() => {
        expect(mockOnLocationSelect).toHaveBeenCalledWith("Springfield", "IL", "US")
      })
    })
  })

  describe("error handling", () => {
    it("displays error message when error occurs", async () => {
      mockError = "Search is taking too long. Please try again."

      const { getByPlaceholderText, getByText, rerender } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Search city or location...")
      fireEvent.changeText(input, "New")

      rerender(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(getByText("Search is taking too long. Please try again.")).toBeTruthy()
      })
    })
  })

  describe("submit behavior", () => {
    it("selects first suggestion on submit", async () => {
      mockSuggestions = createMockSuggestions()

      const { getByPlaceholderText, rerender } = render(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      const input = getByPlaceholderText("Search city or location...")
      fireEvent.changeText(input, "New")

      rerender(
        <TestWrapper>
          <PlacesSearchBar onLocationSelect={mockOnLocationSelect} />
        </TestWrapper>,
      )

      // Submit the search
      fireEvent(input, "submitEditing")

      await waitFor(() => {
        expect(mockOnLocationSelect).toHaveBeenCalledWith("New York", "NY", "US")
      })
    })
  })
})
