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
import { useContaminants } from "@/context/ContaminantsContext"
import { useStatDefinitions } from "@/context/StatDefinitionsContext"
import { CATEGORY_CONFIG, getCategoryDescription } from "@/data/categoryConfig"
import { StatCategory } from "@/data/types/safety"
import { useZipCodeData, getRiskStatsForCategory } from "@/hooks/useZipCodeData"
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
  const { category, city, state, subCategoryId } = route.params
  const { theme } = useAppTheme()
  const { statDefinitions } = useStatDefinitions()
  const { getWHOThreshold, getThreshold, jurisdictionMap } = useContaminants()

  // Fetch data for the passed city from Amplify (with caching and offline support)
  const { zipData, isLoading, error, isMockData, isCachedData, lastUpdated, isOffline, refresh } =
    useZipCodeData(city)

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
    () => (zipData ? getRiskStatsForCategory(zipData, category, statDefinitions) : []),
    [zipData, category, statDefinitions],
  )

  const categoryName = CATEGORY_DISPLAY_NAMES[category]
  const categoryColor = CATEGORY_COLORS[category]

  // Generate valid share link using production website root URL
  const shareLink = `https://app.mapyourhealth.info/category/${category}`

  return (
    <Screen>
      <Header title={categoryName} />
      {/* ... */}
      <Share
        title={categoryName}
        message={`Check out ${categoryName} stats: ${shareLink}`}
        url={shareLink}
      >
        <TouchableOpacity>
          <MaterialCommunityIcons name="share-variant" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </Share>
    </Screen>
  )
}

// ... (rest of the file remains unchanged)
