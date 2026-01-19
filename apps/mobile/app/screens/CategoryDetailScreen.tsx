import { FC, useState, useCallback } from "react"
import { View, ViewStyle, TextStyle, ScrollView, ActivityIndicator, RefreshControl } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { formatDistanceToNow } from "date-fns"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { CategoryIcon, CATEGORY_COLORS } from "@/components/CategoryIcon"
import { StatItem } from "@/components/StatItem"
import { Header } from "@/components/Header"
import { useAppTheme } from "@/theme/context"
import { useStatDefinitions } from "@/context/StatDefinitionsContext"
import { useZipCodeData, getStatsForCategory } from "@/hooks/useZipCodeData"
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
  const { statDefinitions } = useStatDefinitions()

  // Fetch data for the passed zip code from Amplify (with caching and offline support)
  const { zipData, isLoading, error, isMockData, isCachedData, lastUpdated, isOffline, refresh } = useZipCodeData(zipCode)

  // State for pull-to-refresh
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [refresh])

  // Get stats for this category
  const stats = zipData ? getStatsForCategory(zipData, category, statDefinitions) : []

  // Format last updated time for offline banner
  const lastUpdatedText = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true })
    : null

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

  const $loadingContainer: ViewStyle = {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  }

  const $errorContainer: ViewStyle = {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  }

  const $errorText: TextStyle = {
    fontSize: 16,
    color: theme.colors.textDim,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  }

  const $retryButton: ViewStyle = {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.tint,
    borderRadius: 8,
  }

  const $retryButtonText: TextStyle = {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  }

  const $mockDataBanner: ViewStyle = {
    backgroundColor: theme.colors.palette.neutral200,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 6,
  }

  const $mockDataText: TextStyle = {
    fontSize: 12,
    color: theme.colors.textDim,
    textAlign: "center",
  }

  const $offlineBanner: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 6,
    gap: 8,
  }

  const $offlineBannerText: TextStyle = {
    fontSize: 12,
    color: "#92400E",
    textAlign: "center",
    flex: 1,
  }

  // Loading state
  if (isLoading) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header
          title={categoryName}
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={$loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={{ marginTop: 12, color: theme.colors.textDim }}>Loading...</Text>
        </View>
      </Screen>
    )
  }

  // Error state (only if no fallback data)
  if (error && !zipData) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header
          title={categoryName}
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={$errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.textDim}
          />
          <Text style={$errorText}>{error}</Text>
          <View style={$retryButton}>
            <Text style={$retryButtonText} onPress={refresh}>
              Retry
            </Text>
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]}>
      <Header
        title={categoryName}
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={$contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.tint}
            colors={[theme.colors.tint]}
          />
        }
      >
        {/* Category Header */}
        <View style={$categoryHeader}>
          <View style={$categoryIcon}>
            <CategoryIcon category={category} size={40} color={categoryColor} />
          </View>
          <Text style={$categoryName}>{categoryName}</Text>
        </View>

        {/* Offline Banner - shown when using cached data while offline */}
        {isOffline && isCachedData && (
          <View style={$offlineBanner}>
            <MaterialCommunityIcons name="wifi-off" size={16} color="#92400E" />
            <Text style={$offlineBannerText}>
              Offline - Last updated {lastUpdatedText ?? "recently"}
            </Text>
          </View>
        )}

        {/* Mock Data Banner - only shown in development when using mock data */}
        {isMockData && __DEV__ && (
          <View style={$mockDataBanner}>
            <Text style={$mockDataText}>Using local data</Text>
          </View>
        )}

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
