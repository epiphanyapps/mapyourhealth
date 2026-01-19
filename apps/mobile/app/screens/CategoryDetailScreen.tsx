import { FC } from "react"
import { View, ViewStyle, TextStyle, ScrollView } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { CategoryIcon, CATEGORY_COLORS } from "@/components/CategoryIcon"
import { StatItem } from "@/components/StatItem"
import { Header } from "@/components/Header"
import { useAppTheme } from "@/theme/context"
import { StatCategory } from "@/data/types/safety"
import { getZipCodeData, getStatsForCategory } from "@/data/helpers"
import { CATEGORY_DISPLAY_NAMES } from "@/components/StatCategoryCard"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

interface CategoryDetailScreenProps extends AppStackScreenProps<"CategoryDetail"> {}

/**
 * Category Detail Screen - Shows all stats for a specific safety category.
 *
 * Displays a header with the category icon and name, followed by a list
 * of all individual stats with their values and status indicators.
 */
export const CategoryDetailScreen: FC<CategoryDetailScreenProps> = function CategoryDetailScreen(
  props,
) {
  const { navigation, route } = props
  const { category, zipCode } = route.params
  const { theme } = useAppTheme()

  // Load data for the passed zip code
  const zipData = getZipCodeData(zipCode)
  const stats = zipData ? getStatsForCategory(zipData, category) : []

  const categoryName = CATEGORY_DISPLAY_NAMES[category]
  const categoryColor = CATEGORY_COLORS[category]

  const $contentContainer: ViewStyle = {
    flexGrow: 1,
    paddingBottom: 24,
  }

  const $categoryHeader: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.palette.neutral200,
  }

  const $categoryIcon: ViewStyle = {
    marginRight: 12,
  }

  const $categoryName: TextStyle = {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
  }

  const $statsContainer: ViewStyle = {
    paddingHorizontal: 16,
    paddingTop: 8,
  }

  const $emptyText: TextStyle = {
    fontSize: 16,
    color: theme.colors.textDim,
    textAlign: "center",
    marginTop: 40,
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]}>
      <Header
        title={categoryName}
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={$contentContainer}>
        {/* Category Header */}
        <View style={$categoryHeader}>
          <View style={$categoryIcon}>
            <CategoryIcon category={category} size={40} color={categoryColor} />
          </View>
          <Text style={$categoryName}>{categoryName}</Text>
        </View>

        {/* Stats List */}
        <View style={$statsContainer}>
          {stats.length > 0 ? (
            stats.map(({ stat, definition }) => (
              <StatItem
                key={stat.statId}
                name={definition.name}
                value={stat.value}
                unit={definition.unit}
                status={stat.status}
              />
            ))
          ) : (
            <Text style={$emptyText}>No stats available for this category.</Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}
