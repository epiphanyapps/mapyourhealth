import { FC, useState, useCallback, useEffect } from "react"
import {
  View,
  ViewStyle,
  Pressable,
  TextStyle,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { formatDistanceToNow } from "date-fns"

import { LocationHeader } from "@/components/LocationHeader"
import { RecommendationsSection } from "@/components/RecommendationsSection"
import { Screen } from "@/components/Screen"
import { SearchBar } from "@/components/SearchBar"
import { StatCategoryCard, CATEGORY_DISPLAY_NAMES } from "@/components/StatCategoryCard"
import { Text } from "@/components/Text"
import { WarningBanner } from "@/components/WarningBanner"
import { useAuth } from "@/context/AuthContext"
import { usePendingAction } from "@/context/PendingActionContext"
import { useStatDefinitions } from "@/context/StatDefinitionsContext"
import { useSubscriptions } from "@/context/SubscriptionsContext"
import { StatCategory } from "@/data/types/safety"
import { useZipCodeData, getWorstStatusForCategory, getAlertStats } from "@/hooks/useZipCodeData"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

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
  const { navigation, route } = props
  const { theme } = useAppTheme()
  const { isAuthenticated } = useAuth()
  const { setPendingAction } = usePendingAction()
  const { statDefinitions } = useStatDefinitions()
  const { primarySubscription, addSubscription, isLoading: subsLoading } = useSubscriptions()

  // Determine the default zip code:
  // 1. Route param takes priority (for navigation from other screens)
  // 2. For authenticated users, use their primary subscription
  // 3. For guests, show empty state to prompt zip code lookup
  const getDefaultZipCode = () => {
    if (route.params?.zipCode) return route.params.zipCode
    if (isAuthenticated && primarySubscription) return primarySubscription.zipCode
    return ""
  }

  // State for current zip code
  const [currentZipCode, setCurrentZipCode] = useState(getDefaultZipCode())
  const [searchText, setSearchText] = useState("")
  const [isFollowing, setIsFollowing] = useState(false)

  // Update zip code when primary subscription loads (for authenticated users)
  useEffect(() => {
    // Only auto-update if no route param was provided
    if (!route.params?.zipCode && isAuthenticated && primarySubscription && !subsLoading) {
      setCurrentZipCode(primarySubscription.zipCode)
    }
  }, [primarySubscription, isAuthenticated, subsLoading, route.params?.zipCode])

  // Fetch data for current zip code from Amplify (with caching and offline support)
  const { zipData, isLoading, error, isMockData, isCachedData, lastUpdated, isOffline, refresh } =
    useZipCodeData(currentZipCode)

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

  // Get the worst status for each category
  const getStatusForCategory = (category: StatCategory) => {
    if (!zipData) return "safe" as const
    return getWorstStatusForCategory(zipData, category, statDefinitions)
  }

  // All four categories to display
  const categories = [
    StatCategory.water,
    StatCategory.air,
    StatCategory.health,
    StatCategory.disaster,
  ]

  // Handle search - validate and update current zip code
  const handleSearch = useCallback((text: string) => {
    setSearchText(text)
    // Simple 5-digit zip code validation
    if (/^\d{5}$/.test(text.trim())) {
      const newZipCode = text.trim()
      setCurrentZipCode(newZipCode)
      setSearchText("")
    }
  }, [])

  // Handle Follow button press - auth gated
  const handleFollow = useCallback(async () => {
    if (!zipData) return

    if (isAuthenticated) {
      // User is authenticated - create subscription via context
      setIsFollowing(true)
      try {
        await addSubscription(zipData.zipCode, zipData.cityName, zipData.state)
        Alert.alert("Success", `You are now following ${zipData.zipCode}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to follow zip code"
        Alert.alert("Error", message)
      } finally {
        setIsFollowing(false)
      }
    } else {
      // Guest user - set pending action and navigate to login
      setPendingAction({
        type: "follow_zip_code",
        payload: {
          zipCode: zipData.zipCode,
          cityName: zipData.cityName,
          state: zipData.state,
        },
      })
      navigation.navigate("Login")
    }
  }, [isAuthenticated, zipData, setPendingAction, navigation, addSubscription])

  // Handle Report Hazard press - auth gated
  const handleReportHazard = useCallback(() => {
    if (isAuthenticated) {
      navigation.navigate("Report")
    } else {
      setPendingAction({
        type: "report_hazard",
        payload: {
          zipCode: currentZipCode,
        },
      })
      navigation.navigate("Login")
    }
  }, [isAuthenticated, currentZipCode, setPendingAction, navigation])

  // Handle Notify Me press - for zip codes without data
  const [isSettingNotify, setIsSettingNotify] = useState(false)
  const handleNotifyMe = useCallback(async () => {
    if (isAuthenticated) {
      setIsSettingNotify(true)
      try {
        await addSubscription(currentZipCode, undefined, undefined, { notifyWhenDataAvailable: true })
        Alert.alert("You're on the list!", `We'll notify you when data for ${currentZipCode} becomes available.`)
      } catch (error) {
        Alert.alert("Error", "Failed to set up notification. Please try again.")
      } finally {
        setIsSettingNotify(false)
      }
    } else {
      setPendingAction({
        type: "notify_when_available",
        payload: { zipCode: currentZipCode },
      })
      navigation.navigate("Login")
    }
  }, [isAuthenticated, currentZipCode, addSubscription, setPendingAction, navigation])

  // Handle Share button press - share safety data
  const handleShare = useCallback(async () => {
    if (!zipData) return

    // Build status summary for all categories
    const categoryStatuses = categories
      .map((category) => {
        const status = getStatusForCategory(category)
        const statusEmoji = status === "danger" ? "🔴" : status === "warning" ? "🟡" : "🟢"
        return `${statusEmoji} ${CATEGORY_DISPLAY_NAMES[category]}: ${status.charAt(0).toUpperCase() + status.slice(1)}`
      })
      .join("\n")

    const locationName =
      zipData.cityName && zipData.state
        ? `${zipData.cityName}, ${zipData.state}`
        : zipData.cityName || zipData.state || "Unknown Location"

    const shareMessage = `Safety Alert for ${zipData.zipCode} (${locationName})

${categoryStatuses}

Check MapYourHealth for details.
mapyourhealth://zip/${zipData.zipCode}`

    try {
      await Share.share({
        message: shareMessage,
        title: `Safety Report - ${zipData.zipCode}`,
      })
    } catch (error) {
      // User cancelled or share failed - no need to show error
      console.log("Share cancelled or failed:", error)
    }
  }, [zipData, categories, getStatusForCategory])

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

  const $loadingContainer: ViewStyle = {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
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
    marginBottom: 8,
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
    marginBottom: 8,
    borderRadius: 6,
    gap: 8,
  }

  const $offlineBannerText: TextStyle = {
    fontSize: 12,
    color: "#92400E",
    textAlign: "center",
    flex: 1,
  }

  // Get alert stats (danger/warning) for the warning banner
  const alertStats = zipData ? getAlertStats(zipData, statDefinitions) : []
  // Show the first danger stat, or first warning if no danger
  const priorityAlert = alertStats.find((a) => a.stat.status === "danger") ?? alertStats[0]

  const $emptyStateContainer: ViewStyle = {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  }

  const $emptyStateTitle: TextStyle = {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginTop: 16,
  }

  const $emptyStateSubtitle: TextStyle = {
    fontSize: 16,
    color: theme.colors.textDim,
    textAlign: "center",
    marginTop: 8,
  }

  // Empty state for guests - prompt to look up a zip code
  if (!currentZipCode) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
        <View style={$searchBarContainer}>
          <SearchBar
            value={searchText}
            onChangeText={handleSearch}
            onSettingsPress={() => {
              navigation.navigate("Login")
            }}
          />
        </View>
        <View style={$emptyStateContainer}>
          <MaterialCommunityIcons name="shield-search" size={64} color={theme.colors.tint} />
          <Text style={$emptyStateTitle}>Find out how safe your zip code is</Text>
          <Text style={$emptyStateSubtitle}>
            Search above to get safety insights on water quality, air pollution, health risks, and
            natural disasters in any area
          </Text>
        </View>
      </Screen>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
        <LocationHeader zipCode={currentZipCode} cityName="Loading..." />
        <View style={$searchBarContainer}>
          <SearchBar
            value={searchText}
            onChangeText={handleSearch}
            onSettingsPress={() => {
              if (isAuthenticated) {
                navigation.navigate("Profile")
              } else {
                navigation.navigate("Login")
              }
            }}
          />
        </View>
        <View style={$loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={{ marginTop: 12, color: theme.colors.textDim }}>Loading safety data...</Text>
        </View>
      </Screen>
    )
  }

  // Error state with retry
  if (error && !zipData) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
        <View style={$searchBarContainer}>
          <SearchBar
            value={searchText}
            onChangeText={handleSearch}
            onSettingsPress={() => {
              if (isAuthenticated) {
                navigation.navigate("Profile")
              } else {
                navigation.navigate("Login")
              }
            }}
          />
        </View>
        <View style={$emptyStateContainer}>
          <MaterialCommunityIcons name="wifi-off" size={64} color={theme.colors.textDim} />
          <Text style={$emptyStateTitle}>Unable to load data</Text>
          <Text style={$emptyStateSubtitle}>
            We couldn't fetch safety data for {currentZipCode}. Check your connection and try again.
          </Text>
          <Pressable
            style={[
              $retryButton,
              { marginTop: 24, backgroundColor: theme.colors.tint, paddingHorizontal: 32 },
            ]}
            onPress={refresh}
          >
            <Text style={$retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </Screen>
    )
  }

  // No data state - zip code exists but no safety data available yet
  if (!zipData) {
    return (
      <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
        <View style={$searchBarContainer}>
          <SearchBar
            value={searchText}
            onChangeText={handleSearch}
            onSettingsPress={() => {
              if (isAuthenticated) {
                navigation.navigate("Profile")
              } else {
                navigation.navigate("Login")
              }
            }}
          />
        </View>
        <View style={$emptyStateContainer}>
          <MaterialCommunityIcons name="map-marker-question" size={64} color={theme.colors.textDim} />
          <Text style={$emptyStateTitle}>No data for {currentZipCode} yet</Text>
          <Text style={$emptyStateSubtitle}>
            We're working on expanding our coverage. Want to know when safety data becomes available?
          </Text>
          <Pressable
            onPress={handleNotifyMe}
            disabled={isSettingNotify}
            style={({ pressed }) => [
              $notifyButton,
              { backgroundColor: theme.colors.tint },
              pressed && { opacity: 0.8 },
              isSettingNotify && { opacity: 0.6 },
            ]}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color="#FFFFFF" />
            <Text style={$notifyButtonText}>{isSettingNotify ? "Setting up..." : "Notify Me"}</Text>
          </Pressable>
        </View>
      </Screen>
    )
  }

  // Format last updated time for offline banner
  const lastUpdatedText = lastUpdated ? formatDistanceToNow(lastUpdated, { addSuffix: true }) : null

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top"]}
      contentContainerStyle={$contentContainer}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.tint}
            colors={[theme.colors.tint]}
          />
        ),
      }}
    >
      {/* Location Header */}
      <LocationHeader
        zipCode={zipData.zipCode}
        cityName={
          zipData.cityName && zipData.state
            ? `${zipData.cityName}, ${zipData.state}`
            : zipData.cityName || zipData.state || "United States"
        }
      />

      {/* Search Bar */}
      <View style={$searchBarContainer}>
        <SearchBar
          value={searchText}
          onChangeText={handleSearch}
          onSettingsPress={() => {
            if (isAuthenticated) {
              navigation.navigate("SubscriptionsSettings")
            } else {
              navigation.navigate("Login")
            }
          }}
        />
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
          <Text style={$mockDataText}>Using local data (offline or no backend data)</Text>
        </View>
      )}

      {/* Action Buttons Row: Follow, Share, and Compare */}
      <View style={$actionButtonsRow}>
        {/* Follow Button */}
        <Pressable
          onPress={handleFollow}
          disabled={isFollowing}
          style={({ pressed }) => [
            $actionButton,
            { borderColor: theme.colors.tint },
            pressed && { opacity: 0.8 },
            isFollowing && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Follow ${currentZipCode}`}
        >
          <MaterialCommunityIcons name="heart-plus-outline" size={20} color={theme.colors.tint} />
          <Text style={[$actionButtonText, { color: theme.colors.tint }]}>
            {isFollowing ? "Following..." : "Follow"}
          </Text>
        </Pressable>

        {/* Share Button */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            $actionButton,
            { borderColor: theme.colors.tint },
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share safety data"
        >
          <MaterialCommunityIcons
            name="share-variant-outline"
            size={20}
            color={theme.colors.tint}
          />
          <Text style={[$actionButtonText, { color: theme.colors.tint }]}>Share</Text>
        </Pressable>

        {/* Compare Button */}
        <Pressable
          onPress={() => navigation.navigate("Compare")}
          style={({ pressed }) => [
            $actionButton,
            { borderColor: theme.colors.tint },
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Compare zip codes"
        >
          <MaterialCommunityIcons name="compare" size={20} color={theme.colors.tint} />
          <Text style={[$actionButtonText, { color: theme.colors.tint }]}>Compare</Text>
        </Pressable>
      </View>

      {/* Warning Banner - shows for danger/warning stats */}
      {priorityAlert && (
        <View style={$warningBannerContainer}>
          <WarningBanner
            statDefinition={priorityAlert.definition}
            stat={priorityAlert.stat}
            onViewDetails={() => {
              // Navigate to category detail for this stat
              navigation.navigate("CategoryDetail", {
                category: priorityAlert.definition.category,
                zipCode: currentZipCode,
              })
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
              navigation.navigate("CategoryDetail", { category, zipCode: currentZipCode })
            }}
          />
        ))}
      </View>

      {/* Recommendations Section */}
      {zipData && <RecommendationsSection zipData={zipData} />}

      {/* Report Hazard Button */}
      <Pressable
        onPress={handleReportHazard}
        style={({ pressed }) => [
          $reportButton,
          { backgroundColor: theme.colors.tint },
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Report a hazard"
      >
        <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FFFFFF" />
        <Text style={$reportButtonText}>Report Hazard</Text>
      </Pressable>
    </Screen>
  )
}

const $actionButtonsRow: ViewStyle = {
  flexDirection: "row",
  marginHorizontal: 16,
  marginBottom: 16,
  gap: 12,
}

const $actionButton: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 10,
  borderRadius: 12,
  borderWidth: 2,
  gap: 4,
}

const $actionButtonText: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
}

const $reportButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginHorizontal: 16,
  marginTop: 24,
  paddingVertical: 14,
  borderRadius: 12,
  gap: 8,
}

const $reportButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: "#FFFFFF",
}

const $notifyButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 24,
  paddingVertical: 14,
  paddingHorizontal: 24,
  borderRadius: 12,
  gap: 8,
}

const $notifyButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: "#FFFFFF",
}
