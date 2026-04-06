/* eslint-disable react-native/no-inline-styles */
import { FC, useCallback, useMemo, useState } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Share,
  TouchableOpacity,
  Linking,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { formatDistanceToNow } from "date-fns"

import { CategoryIcon, CATEGORY_COLORS } from "@/components/CategoryIcon"
import { ContaminantTable, ContaminantTableRow } from "@/components/ContaminantTable"
import { ExpandableCard } from "@/components/ExpandableCard"
import { Header } from "@/components/Header"
import { LinkedText } from "@/components/LinkedText"
import { Screen } from "@/components/Screen"
import { CATEGORY_DISPLAY_NAMES } from "@/components/StatCategoryCard"
import { StatItem } from "@/components/StatItem"
import { Text } from "@/components/Text"
import { useCategories } from "@/context/CategoriesContext"
import { useContaminants } from "@/context/ContaminantsContext"
import { useStatDefinitions } from "@/context/StatDefinitionsContext"
import { CATEGORY_CONFIG, getCategoryDescription } from "@/data/categoryConfig"
import { StatCategory } from "@/data/types/safety"
import { useLocationData, getRiskStatsForCategory } from "@/hooks/useLocationData"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

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
  const { category, city, state, country, subCategoryId } = route.params
  const { theme } = useAppTheme()
  const { statDefinitions } = useStatDefinitions()
  const { getWHOThreshold, getThreshold, getJurisdictionForLocation } = useContaminants()
  const { getCategoryName, getCategoryColor } = useCategories()

  // Fetch data for the passed city from Amplify (with caching and offline support)
  const { cityData, isLoading, error, isMockData, isCachedData, lastUpdated, isOffline, refresh } =
    useLocationData(city)

  // State for pull-to-refresh
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get category config for description and links
  const categoryConfig = CATEGORY_CONFIG[category]

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [refresh])

  // Get risk stats for this category (only warning/danger, no safe stats)
  const stats = useMemo(
    () => (cityData ? getRiskStatsForCategory(cityData, category, statDefinitions) : []),
    [cityData, category, statDefinitions],
  )

  // Get category display info - try dynamic first, then fallback to hardcoded
  const categoryId = String(category)
  const dynamicName = getCategoryName(categoryId)
  const categoryName =
    dynamicName !== categoryId ? dynamicName : (CATEGORY_DISPLAY_NAMES[category] ?? categoryId)
  const categoryColor = getCategoryColor(categoryId) ?? CATEGORY_COLORS[category] ?? "#6B7280"

  // Get jurisdiction name for display
  const localJurisdiction = getJurisdictionForLocation(
    cityData?.state ?? state ?? "",
    country ?? "",
  )
  const localJurisdictionCode = localJurisdiction?.code ?? "WHO"
  const localJurisdictionName =
    localJurisdiction?.name?.toUpperCase() || cityData?.state?.toUpperCase() || "LOCAL"

  // Build table rows for water category
  const tableRows: ContaminantTableRow[] = useMemo(() => {
    if (category !== StatCategory.water || !stats.length) return []

    return stats.map(({ stat, definition }) => {
      const whoThreshold = getWHOThreshold(stat.statId)
      const localThreshold = getThreshold(stat.statId, localJurisdictionCode)

      return {
        name: definition.name,
        contaminantId: stat.statId,
        value: stat.value,
        unit: definition.unit,
        whoLimit: whoThreshold?.limitValue ?? null,
        localLimit: localThreshold?.limitValue ?? null,
        localJurisdictionName,
        status: stat.status,
        isUnregulated: localThreshold?.status === "not_controlled",
      }
    })
  }, [stats, category, getWHOThreshold, getThreshold, localJurisdictionCode, localJurisdictionName])

  // Count of risk contaminants (all stats shown are already risks)
  const exceedingCount = useMemo(() => {
    return tableRows.length
  }, [tableRows])

  // Get category description with dynamic values
  const categoryDescription = getCategoryDescription(category, { count: exceedingCount })

  // Handle link press
  const handleLinkPress = useCallback((url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open URL:", err)
    })
  }, [])

  // Handle Share button press - share category-specific risk data
  const handleShare = useCallback(async () => {
    if (!cityData) return

    // Build risk details for this category (only warning/danger stats)
    const riskDetails = stats
      .map(({ stat, definition }) => {
        const statusEmoji = stat.status === "danger" ? "🔴" : "🟡"
        return `${statusEmoji} ${definition.name}: ${stat.value} ${definition.unit}`
      })
      .join("\n")

    const locationName =
      cityData.cityName && cityData.state
        ? `${cityData.cityName}, ${cityData.state}`
        : cityData.cityName || cityData.state || "Unknown Location"

    const shareUrl = `https://app.mapyourhealth.info/location/${encodeURIComponent(city)}/${encodeURIComponent(state)}/${encodeURIComponent(country)}/category/${encodeURIComponent(category)}`

    const shareMessage = `${categoryName} Risk Report for ${locationName}

${riskDetails || "No risks detected"}

View details: ${shareUrl}`

    try {
      await Share.share({
        message: shareMessage,
        title: `${categoryName} Risk Report - ${cityData.city}`,
      })
    } catch (error) {
      // User cancelled or share failed - no need to show error
      console.log("Share cancelled or failed:", error)
    }
  }, [cityData, stats, categoryName, city, state, country, category])

  // Custom share button component for header
  const ShareButton = (
    <TouchableOpacity
      onPress={handleShare}
      style={$headerShareButton}
      accessibilityRole="button"
      accessibilityLabel="Share category data"
    >
      <MaterialCommunityIcons name="share-variant-outline" size={24} color={theme.colors.tint} />
    </TouchableOpacity>
  )

  // Format last updated time for offline banner
  const lastUpdatedText = lastUpdated ? formatDistanceToNow(lastUpdated, { addSuffix: true }) : null

  const $contentContainer: ViewStyle = {
    flexGrow: 1,
    paddingBottom: 48,
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

  const $descriptionContainer: ViewStyle = {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  }

  const $descriptionText: TextStyle = {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  }

  const $linksContainer: ViewStyle = {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  }

  const $linkButton: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  }

  const $linkText: TextStyle = {
    fontSize: 14,
    color: theme.colors.tint,
    textDecorationLine: "underline",
    marginLeft: 6,
  }

  const $subCategoriesContainer: ViewStyle = {
    paddingHorizontal: 0,
    paddingTop: 8,
    gap: 8,
  }

  const $subCategoryHeader: TextStyle = {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  }

  const $subCategoryDescription: TextStyle = {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 12,
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
          safeAreaEdges={[]}
        />
        <View style={$loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={{ marginTop: 12, color: theme.colors.textDim }}>Loading...</Text>
        </View>
      </Screen>
    )
  }

  // Error state (only if no fallback data)
  if (error && !cityData) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header
          title={categoryName}
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
          safeAreaEdges={[]}
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

  // No data state - location exists but no measurements available yet
  if (!cityData) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header
          title={categoryName}
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
          safeAreaEdges={[]}
        />
        <View style={$categoryHeader}>
          <View style={$categoryIcon}>
            <CategoryIcon category={category} size={40} color={categoryColor} />
          </View>
          <Text style={$categoryName}>{categoryName}</Text>
        </View>
        <View style={$errorContainer}>
          <MaterialCommunityIcons
            name="database-off-outline"
            size={48}
            color={theme.colors.textDim}
          />
          <Text style={[$categoryName, $noDataTitle]}>No data available yet</Text>
          <Text style={$errorText}>
            We do not have {categoryName.toLowerCase()} data for {city}
            {state ? `, ${state}` : ""} yet. Check back later as we expand our coverage.
          </Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$screenContent}>
      <Header
        title={categoryName}
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        RightActionComponent={ShareButton}
        safeAreaEdges={[]}
      />

      <ScrollView
        style={$scrollView}
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

        {/* Category Description */}
        <View style={$descriptionContainer}>
          <LinkedText
            text={categoryDescription}
            style={$descriptionText}
            linkStyle={{ color: theme.colors.tint }}
          />
        </View>

        {/* Links to external resources */}
        {categoryConfig.links.length > 0 && (
          <View style={$linksContainer}>
            {categoryConfig.links.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={$linkButton}
                onPress={() => handleLinkPress(link.url)}
                accessibilityRole="link"
                accessibilityLabel={`Open ${link.label}`}
              >
                <MaterialCommunityIcons name="open-in-new" size={16} color={theme.colors.tint} />
                <Text style={$linkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sub-categories (expandable dropdowns) */}
        {categoryConfig.subCategories && categoryConfig.subCategories.length > 0 && (
          <View style={$subCategoriesContainer}>
            {categoryConfig.subCategories.map((subCategory) => (
              <ExpandableCard
                key={subCategory.id}
                header={<Text style={$subCategoryHeader}>{subCategory.name}</Text>}
                initiallyExpanded={subCategoryId === subCategory.id}
              >
                <Text style={$subCategoryDescription}>{subCategory.description}</Text>
                {subCategory.links?.map((link, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={$linkButton}
                    onPress={() => handleLinkPress(link.url)}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${link.label}`}
                  >
                    <MaterialCommunityIcons
                      name="open-in-new"
                      size={16}
                      color={theme.colors.tint}
                    />
                    <Text style={$linkText}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </ExpandableCard>
            ))}
          </View>
        )}

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

        {/* Stats List - Table for water, list for others */}
        <View style={$statsContainer}>
          {stats.length > 0 ? (
            category === StatCategory.water && categoryConfig.showStandardsTable ? (
              // Water category: Show contaminant table with WHO/Local standards
              <ContaminantTable rows={tableRows} />
            ) : (
              // Other categories: Show stat items
              stats.map(({ stat, definition }) => (
                <StatItem
                  key={stat.statId}
                  name={definition.name}
                  value={stat.value}
                  unit={definition.unit}
                  status={stat.status}
                  history={stat.history}
                  onViewTrends={
                    stat.history && stat.history.length > 0
                      ? () =>
                          navigation.navigate("StatTrend", {
                            statId: stat.statId,
                            city,
                            state,
                            country,
                          })
                      : undefined
                  }
                />
              ))
            )
          ) : (
            <View style={$safeStateContainer}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={48}
                color={theme.colors.tint}
              />
              <Text style={[$emptyText, $safeStateText]}>
                No contaminants exceed safety thresholds for this category.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const $screenContent: ViewStyle = {
  flex: 1,
}

const $scrollView: ViewStyle = {
  flex: 1,
}

const $headerShareButton: ViewStyle = {
  paddingHorizontal: 16,
  paddingVertical: 8,
  justifyContent: "center",
  alignItems: "center",
}

const $noDataTitle: TextStyle = {
  fontSize: 20,
  marginTop: 16,
  textAlign: "center",
}

const $safeStateContainer: ViewStyle = {
  alignItems: "center",
  paddingVertical: 32,
  paddingHorizontal: 16,
}

const $safeStateText: TextStyle = {
  marginTop: 12,
}
