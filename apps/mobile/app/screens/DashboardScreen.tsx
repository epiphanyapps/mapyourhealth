import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { LocationHeader } from "@/components/LocationHeader"
import { Screen } from "@/components/Screen"
import { SearchBar } from "@/components/SearchBar"
import { StatCategoryCard, CATEGORY_DISPLAY_NAMES } from "@/components/StatCategoryCard"
import { WarningBanner } from "@/components/WarningBanner"
import { getZipCodeData, getWorstStatusForCategory, getAlertStats } from "@/data/helpers"
import { StatCategory } from "@/data/types/safety"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

interface DashboardScreenProps extends AppStackScreenProps<"Dashboard"> {}

/**
 * Dashboard Screen - Main screen showing safety overview for a location.
 *
 * Displays:
 * - Location header with zip code and city name
 * - Search bar for looking up different zip codes
 * - Category cards showing status for water, air, health, and disaster
 */
export const DashboardScreen: FC<DashboardScreenProps> = function DashboardScreen(props) {
  const { navigation } = props
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

  const $warningBannerContainer: ViewStyle = {
    marginBottom: 16,
  }

  // Get alert stats (danger/warning) for the warning banner
  const alertStats = zipData ? getAlertStats(zipData) : []
  // Show the first danger stat, or first warning if no danger
  const priorityAlert = alertStats.find((a) => a.stat.status === "danger") ?? alertStats[0]

  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
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

      {/* Warning Banner - shows for danger/warning stats */}
      {priorityAlert && (
        <View style={$warningBannerContainer}>
          <WarningBanner
            statDefinition={priorityAlert.definition}
            stat={priorityAlert.stat}
            onViewDetails={() => {
              // TODO: Navigate to stat detail or category detail screen
              console.log("View details for:", priorityAlert.definition.name)
            }}
          />
        </View>
      )}

      {/* Category Cards */}
      <View style={$categoriesContainer}>
        {categories.map((category) => (
          <StatCategoryCard
            key={category}
            category={category}
            categoryName={CATEGORY_DISPLAY_NAMES[category]}
            status={getStatusForCategory(category)}
            onPress={() => {
              navigation.navigate("CategoryDetail", { category })
            }}
          />
        ))}
      </View>
    </Screen>
  )
}
