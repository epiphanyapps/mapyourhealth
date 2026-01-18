import { FC } from "react"
import { ScrollView, View, ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { LocationHeader } from "@/components/LocationHeader"
import { SearchBar } from "@/components/SearchBar"
import { StatCategoryCard, CATEGORY_DISPLAY_NAMES } from "@/components/StatCategoryCard"
import { useAppTheme } from "@/theme/context"
import { StatCategory } from "@/data/types/safety"
import { getZipCodeData, getWorstStatusForCategory } from "@/data/helpers"

/**
 * Dashboard Screen - Main screen showing safety overview for a location.
 *
 * Displays:
 * - Location header with zip code and city name
 * - Search bar for looking up different zip codes
 * - Category cards showing status for water, air, health, and disaster
 */
export const DashboardScreen: FC = function DashboardScreen() {
  const { theme } = useAppTheme()

  // Load mock data for hardcoded zip code 90210
  const zipData = getZipCodeData("90210")

  // Get the worst status for each category
  const getStatusForCategory = (category: StatCategory) => {
    if (!zipData) return "safe" as const
    return getWorstStatusForCategory(zipData, category)
  }

  // All four categories to display
  const categories = [
    StatCategory.water,
    StatCategory.air,
    StatCategory.health,
    StatCategory.disaster,
  ]

  const $contentContainer: ViewStyle = {
    flexGrow: 1,
    paddingBottom: 24,
  }

  const $searchBarContainer: ViewStyle = {
    marginBottom: 16,
  }

  const $categoriesContainer: ViewStyle = {
    gap: 8,
  }

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top"]}
      contentContainerStyle={$contentContainer}
    >
      {/* Location Header */}
      <LocationHeader
        zipCode={zipData?.zipCode ?? "-----"}
        cityName={zipData ? `${zipData.cityName}, ${zipData.state}` : "Loading..."}
      />

      {/* Search Bar */}
      <View style={$searchBarContainer}>
        <SearchBar
          onChangeText={(text) => {
            // TODO: Implement search functionality
            console.log("Search:", text)
          }}
          onSettingsPress={() => {
            // TODO: Navigate to settings
            console.log("Settings pressed")
          }}
        />
      </View>

      {/* Category Cards */}
      <View style={$categoriesContainer}>
        {categories.map((category) => (
          <StatCategoryCard
            key={category}
            category={category}
            categoryName={CATEGORY_DISPLAY_NAMES[category]}
            status={getStatusForCategory(category)}
            onPress={() => {
              // TODO: Navigate to category detail screen
              console.log("Category pressed:", category)
            }}
          />
        ))}
      </View>
    </Screen>
  )
}
