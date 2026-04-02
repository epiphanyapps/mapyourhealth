/* eslint-disable react-native/no-inline-styles, react/no-unescaped-entities */
import { FC, useCallback, useEffect, useMemo, useState } from "react"
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
import { CommonActions } from "@react-navigation/native"
import { formatDistanceToNow } from "date-fns"

import { AdminWarningBanner } from "@/components/AdminWarningBanner"
import { Card } from "@/components/Card"
import {
  ExpandableCategoryCard,
  SubCategoryStatusResult,
} from "@/components/ExpandableCategoryCard"
import { LocationHeader } from "@/components/LocationHeader"
import { NavHeader } from "@/components/NavHeader"
import { PlacesSearchBar } from "@/components/PlacesSearchBar"
import { ProfileMenu } from "@/components/ProfileMenu"
import { Screen } from "@/components/Screen"
import { CATEGORY_DISPLAY_NAMES } from "@/components/StatCategoryCard"
import { Text } from "@/components/Text"
import { WarningBanner } from "@/components/WarningBanner"
import { useAuth } from "@/context/AuthContext"
import { useCategories } from "@/context/CategoriesContext"
import { useContaminants } from "@/context/ContaminantsContext"
import { usePendingAction } from "@/context/PendingActionContext"
import { useStatDefinitions } from "@/context/StatDefinitionsContext"
import { useSubscriptions } from "@/context/SubscriptionsContext"
import { StatCategory } from "@/data/types/safety"
import { useLocation } from "@/hooks/useLocation"
import { useLocationData, getWorstStatusForCategory, getAlertStats } from "@/hooks/useLocationData"
import { useWarningBanners } from "@/hooks/useWarningBanners"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
// jurisdiction resolution now uses ContaminantsContext.getJurisdictionForLocation
// postalCode utilities removed - using city-level granularity

/** Orange color for WHO-only exceedances */
const WHO_EXCEEDANCE_COLOR = "#F97316"

interface DashboardScreenProps extends AppStackScreenProps<"Dashboard"> {}

/**
 * Map any category string to a StatCategory for navigation.
 * ContaminantCategory types (fertilizer, pesticide, etc.) all map to water.
 */
function mapToStatCategory(category: string): StatCategory {
  // If it's already a StatCategory, return it
  if (Object.values(StatCategory).includes(category as StatCategory)) {
    return category as StatCategory
  }
  // ContaminantCategory types are all water-related
  const contaminantCategories = [
    "fertilizer",
    "pesticide",
    "radioactive",
    "disinfectant",
    "inorganic",
    "organic",
    "microbiological",
  ]
  if (contaminantCategories.includes(category)) {
    return StatCategory.water
  }
  // Default fallback
  return StatCategory.water
}

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
  const { isAuthenticated, user, logout } = useAuth()
  const { setPendingAction } = usePendingAction()
  const { statDefinitions } = useStatDefinitions()
  const { contaminants, getThreshold, getWHOThreshold, getJurisdictionForLocation } =
    useContaminants()
  const { primarySubscription, addSubscription, isLoading: subsLoading } = useSubscriptions()
  const { getLocationFromGPS, isLocating } = useLocation()
  const { getCategoryName } = useCategories()
  const { banners: adminBanners } = useWarningBanners({
    city: route.params?.city,
    state: route.params?.state,
    country: route.params?.country,
  })

  // Helper to get display name from dynamic categories with fallback
  const getCategoryDisplayName = useCallback(
    (categoryId: string) => {
      const dynamicName = getCategoryName(categoryId)
      // If dynamic name is the same as categoryId (not found), use fallback
      if (dynamicName === categoryId) {
        return CATEGORY_DISPLAY_NAMES[categoryId] ?? categoryId
      }
      return dynamicName
    },
    [getCategoryName],
  )

  const [isFollowing, setIsFollowing] = useState(false)
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false)

  // Sync primary subscription to route params when no location is set yet
  useEffect(() => {
    if (!route.params?.city && isAuthenticated && primarySubscription && !subsLoading) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "Dashboard",
              params: {
                city: primarySubscription.city,
                state: primarySubscription.state,
                country: primarySubscription.country,
              },
            },
          ],
        }),
      )
    }
  }, [primarySubscription, isAuthenticated, subsLoading, route.params?.city, navigation])

  // Derive current location from route params (single source of truth — keeps URL in sync)
  const currentLocation = useMemo(() => {
    if (route.params?.city && route.params?.state) {
      return {
        city: route.params.city,
        state: route.params.state,
        country: route.params.country || "",
        searchedAddress: route.params.address,
      }
    }
    return null
  }, [route.params?.city, route.params?.state, route.params?.country, route.params?.address])

  // Fetch data for current location from Amplify (with caching and offline support)
  const locationData = useLocationData(currentLocation?.city || "")

  const {
    cityData,
    isLoading,
    error,
    isMockData = false,
    isCachedData = false,
    lastUpdated = null,
    isOffline,
    refresh,
  } = locationData

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
  const getStatusForCategory = useCallback(
    (category: StatCategory) => {
      if (!cityData) return "safe" as const
      return getWorstStatusForCategory(cityData, category, statDefinitions)
    },
    [cityData, statDefinitions],
  )

  // Determine the jurisdiction code for the current location
  const currentJurisdictionCode = useMemo(() => {
    if (!currentLocation) return "WHO"
    return getJurisdictionForLocation(currentLocation.state, currentLocation.country)?.code || "WHO"
  }, [currentLocation, getJurisdictionForLocation])

  // Get sub-category status with WHO-vs-national color coding
  const getSubCategoryStatusForCategory = useCallback(
    (subCategoryId: string): SubCategoryStatusResult => {
      if (!cityData) return { status: "safe" }

      // Find contaminants that belong to this sub-category
      const subCategoryContaminants = contaminants.filter((c) => c.category === subCategoryId)
      const subCategoryContaminantIds = new Set(subCategoryContaminants.map((c) => c.id))

      // Filter measurements for this sub-category
      const relevantStats = cityData.stats.filter((stat) =>
        subCategoryContaminantIds.has(stat.statId),
      )

      if (relevantStats.length === 0) return { status: "safe" }

      let hasNationalExceedance = false
      let hasWHOOnlyExceedance = false

      for (const stat of relevantStats) {
        if (stat.status === "safe") continue

        // Check if this exceedance is against national/state threshold or WHO-only
        const nationalThreshold = getThreshold(stat.statId, currentJurisdictionCode)
        const whoThreshold = getWHOThreshold(stat.statId)
        const contaminant = subCategoryContaminants.find((c) => c.id === stat.statId)
        const higherIsBad = contaminant?.higherIsBad ?? true

        // Check if the measurement exceeds the national/state threshold
        let exceedsNational = false
        if (
          nationalThreshold &&
          nationalThreshold.jurisdictionCode !== "WHO" &&
          nationalThreshold.limitValue !== null
        ) {
          const limit = nationalThreshold.limitValue
          exceedsNational = higherIsBad ? stat.value >= limit : stat.value <= limit
        }

        // Check if the measurement exceeds the WHO threshold
        let exceedsWHO = false
        if (whoThreshold && whoThreshold.limitValue !== null) {
          const limit = whoThreshold.limitValue
          exceedsWHO = higherIsBad ? stat.value >= limit : stat.value <= limit
        }

        if (exceedsNational) {
          hasNationalExceedance = true
        } else if (exceedsWHO) {
          hasWHOOnlyExceedance = true
        }
      }

      if (hasNationalExceedance) {
        return { status: "danger" }
      }
      if (hasWHOOnlyExceedance) {
        return { status: "danger", color: WHO_EXCEEDANCE_COLOR }
      }

      // Check for warnings (non-exceedance but above warning threshold)
      const hasWarning = relevantStats.some((stat) => stat.status === "warning")
      if (hasWarning) {
        return { status: "warning" }
      }

      return { status: "safe" }
    },
    [cityData, contaminants, getThreshold, getWHOThreshold, currentJurisdictionCode],
  )

  // Categories to display (water and air only - health and disaster removed per issue #126)
  const categories = useMemo(() => [StatCategory.water, StatCategory.air], [])

  // Handle location selection from PlacesSearchBar — updates URL via route params
  const handleLocationSelect = useCallback(
    (city: string, state: string, country: string, addr?: string) => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Dashboard", params: { city, state, country, address: addr } }],
        }),
      )
    },
    [navigation],
  )

  // Handle location button press - get location from GPS
  const handleLocationPress = useCallback(async () => {
    const location = await getLocationFromGPS()
    if (location) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "Dashboard",
              params: {
                city: location.city,
                state: location.state,
                country: location.country,
              },
            },
          ],
        }),
      )
    }
  }, [getLocationFromGPS, navigation])

  // Handle Follow button press - auth gated
  const handleFollow = useCallback(async () => {
    if (!currentLocation) return

    if (isAuthenticated) {
      setIsFollowing(true)
      try {
        await addSubscription(currentLocation.city, currentLocation.state, currentLocation.country)
        Alert.alert(
          "Success",
          `You are now following ${currentLocation.city}, ${currentLocation.state}`,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to follow location"
        Alert.alert("Error", message)
      } finally {
        setIsFollowing(false)
      }
    } else {
      setPendingAction({
        type: "follow_location",
        payload: {
          city: currentLocation.city,
          state: currentLocation.state,
          country: currentLocation.country,
        },
      })
      navigation.navigate("Login")
    }
  }, [isAuthenticated, currentLocation, setPendingAction, navigation, addSubscription])

  // Handle Report Hazard press - auth gated
  const handleReportHazard = useCallback(() => {
    if (isAuthenticated) {
      navigation.navigate("Report")
    } else {
      setPendingAction({
        type: "report_hazard",
        payload: {
          city: currentLocation?.city,
          state: currentLocation?.state,
        },
      })
      navigation.navigate("Login")
    }
  }, [isAuthenticated, currentLocation, setPendingAction, navigation])

  // Handle Notify Me press - for locations without data
  const [isSettingNotify, setIsSettingNotify] = useState(false)
  const handleNotifyMe = useCallback(async () => {
    if (!currentLocation) return
    if (isAuthenticated) {
      setIsSettingNotify(true)
      try {
        await addSubscription(
          currentLocation.city,
          currentLocation.state,
          currentLocation.country,
          {
            notifyWhenDataAvailable: true,
          },
        )
        Alert.alert(
          "You're on the list!",
          `We'll notify you when data for ${currentLocation.city}, ${currentLocation.state} becomes available.`,
        )
      } catch {
        Alert.alert("Error", "Failed to set up notification. Please try again.")
      } finally {
        setIsSettingNotify(false)
      }
    } else {
      setPendingAction({
        type: "notify_when_available",
        payload: { city: currentLocation.city, state: currentLocation.state },
      })
      navigation.navigate("Signup")
    }
  }, [isAuthenticated, currentLocation, addSubscription, setPendingAction, navigation])

  // Handle Sign Out from profile menu
  const handleSignOut = useCallback(async () => {
    setIsProfileMenuVisible(false)
    await logout()
  }, [logout])

  // Handle navigation from profile menu
  const handleProfileMenuNavigate = useCallback(
    (screen: string) => {
      setIsProfileMenuVisible(false)
      navigation.navigate(screen as any)
    },
    [navigation],
  )

  // Handle Share button press - share risk data (only categories with risks)
  const handleShare = useCallback(async () => {
    if (!cityData) return

    // Build risk summary - only include categories with warning or danger status
    const categoryRisks = categories
      .map((category) => {
        const status = getStatusForCategory(category)
        if (status === "safe") return null // Skip safe categories
        const statusEmoji = status === "danger" ? "🔴" : "🟡"
        return `${statusEmoji} ${getCategoryDisplayName(category)}: ${status.charAt(0).toUpperCase() + status.slice(1)}`
      })
      .filter(Boolean)
      .join("\n")

    const locationName = currentLocation
      ? `${currentLocation.city}, ${currentLocation.state}`
      : "Unknown Location"

    const shareUrl = currentLocation
      ? `https://app.mapyourhealth.info/location/${encodeURIComponent(currentLocation.city)}/${encodeURIComponent(currentLocation.state)}/${encodeURIComponent(currentLocation.country)}`
      : "https://app.mapyourhealth.info"

    const shareMessage = `Safety Alert for ${locationName}

${categoryRisks || "No risks detected"}

View details: ${shareUrl}`

    try {
      await Share.share({
        message: shareMessage,
        title: `Safety Report - ${currentLocation?.city || "Location"}`,
      })
    } catch (error) {
      // User cancelled or share failed - no need to show error
      console.log("Share cancelled or failed:", error)
    }
  }, [cityData, categories, getStatusForCategory, getCategoryDisplayName, currentLocation])

  const $contentContainer: ViewStyle = {
    flexGrow: 1,
    paddingBottom: 24,
  }

  const $searchBarContainer: ViewStyle = {
    marginBottom: 16,
    // Ensure dropdown appears above content below
    zIndex: 10,
  }

  const $categoriesContainer: ViewStyle = {
    // No gap - separators handle spacing
  }

  const $categorySeparator: ViewStyle = {
    height: 1,
    backgroundColor: theme.colors.separator,
    marginHorizontal: 16,
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

  const $searchedAddressBanner: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 8,
    gap: 6,
  }

  const $searchedAddressText: TextStyle = {
    fontSize: 12,
    flex: 1,
  }

  // Get alert stats (danger/warning) for the warning banner
  const alertStats = cityData ? getAlertStats(cityData, statDefinitions) : []
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

  // Empty state for guests - prompt to search for a location
  if (!currentLocation) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
        <NavHeader
          onProfilePress={() => setIsProfileMenuVisible(true)}
          isAuthenticated={isAuthenticated}
        />
        <View style={$searchBarContainer}>
          <PlacesSearchBar
            onLocationSelect={handleLocationSelect}
            placeholder="Search city or location..."
            showLocationButton
            onLocationPress={handleLocationPress}
            isLocating={isLocating}
            selectedLocation={currentLocation}
          />
        </View>
        <View style={$emptyStateContainer}>
          <MaterialCommunityIcons name="shield-search" size={64} color={theme.colors.tint} />
          <Text style={$emptyStateTitle}>Find out how safe your location is</Text>
          <Text style={$emptyStateSubtitle}>
            Search above to get safety insights on water quality and air pollution in any area
          </Text>
        </View>
        <ProfileMenu
          visible={isProfileMenuVisible}
          onClose={() => setIsProfileMenuVisible(false)}
          onNavigate={handleProfileMenuNavigate}
          onSignOut={handleSignOut}
          isAuthenticated={isAuthenticated}
          userEmail={user?.signInDetails?.loginId}
        />
      </Screen>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
        <NavHeader
          onProfilePress={() => setIsProfileMenuVisible(true)}
          isAuthenticated={isAuthenticated}
        />
        <View style={$searchBarContainer}>
          <PlacesSearchBar
            onLocationSelect={handleLocationSelect}
            placeholder="Search city or location..."
            showLocationButton
            onLocationPress={handleLocationPress}
            isLocating={isLocating}
            selectedLocation={currentLocation}
          />
        </View>
        <View style={$loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={{ marginTop: 12, color: theme.colors.textDim }}>Loading safety data...</Text>
        </View>
        <ProfileMenu
          visible={isProfileMenuVisible}
          onClose={() => setIsProfileMenuVisible(false)}
          onNavigate={handleProfileMenuNavigate}
          onSignOut={handleSignOut}
          isAuthenticated={isAuthenticated}
          userEmail={user?.signInDetails?.loginId}
        />
      </Screen>
    )
  }

  // Error state with retry
  if (error && !cityData) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
        <NavHeader
          onProfilePress={() => setIsProfileMenuVisible(true)}
          isAuthenticated={isAuthenticated}
        />
        <View style={$searchBarContainer}>
          <PlacesSearchBar
            onLocationSelect={handleLocationSelect}
            placeholder="Search city or location..."
            showLocationButton
            onLocationPress={handleLocationPress}
            isLocating={isLocating}
            selectedLocation={currentLocation}
          />
        </View>
        <View style={$emptyStateContainer}>
          <MaterialCommunityIcons name="wifi-off" size={64} color={theme.colors.textDim} />
          <Text style={$emptyStateTitle}>Unable to load data</Text>
          <Text style={$emptyStateSubtitle}>
            We couldn't fetch safety data for{" "}
            {currentLocation ? `${currentLocation.city}, ${currentLocation.state}` : "Unknown"}.
            Check your connection and try again.
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
        <ProfileMenu
          visible={isProfileMenuVisible}
          onClose={() => setIsProfileMenuVisible(false)}
          onNavigate={handleProfileMenuNavigate}
          onSignOut={handleSignOut}
          isAuthenticated={isAuthenticated}
          userEmail={user?.signInDetails?.loginId}
        />
      </Screen>
    )
  }

  // No data state - zip code exists but no safety data available yet
  if (!cityData) {
    return (
      <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
        <NavHeader
          onProfilePress={() => setIsProfileMenuVisible(true)}
          isAuthenticated={isAuthenticated}
        />
        <View style={$searchBarContainer}>
          <PlacesSearchBar
            onLocationSelect={handleLocationSelect}
            placeholder="Search city or location..."
            showLocationButton
            onLocationPress={handleLocationPress}
            isLocating={isLocating}
            selectedLocation={currentLocation}
          />
        </View>
        <View style={$emptyStateContainer}>
          <MaterialCommunityIcons
            name="map-marker-question"
            size={64}
            color={theme.colors.textDim}
          />
          <Text style={$emptyStateTitle}>
            No data for{" "}
            {currentLocation ? `${currentLocation.city}, ${currentLocation.state}` : "Unknown"} yet
          </Text>
          <Text style={$emptyStateSubtitle}>
            We're working on expanding our coverage. Want to know when safety data becomes
            available?
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
        <ProfileMenu
          visible={isProfileMenuVisible}
          onClose={() => setIsProfileMenuVisible(false)}
          onNavigate={handleProfileMenuNavigate}
          onSignOut={handleSignOut}
          isAuthenticated={isAuthenticated}
          userEmail={user?.signInDetails?.loginId}
        />
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
      {/* Navigation Header */}
      <NavHeader
        onProfilePress={() => setIsProfileMenuVisible(true)}
        isAuthenticated={isAuthenticated}
      />

      {/* Search Bar */}
      <View style={$searchBarContainer}>
        <PlacesSearchBar
          onLocationSelect={handleLocationSelect}
          placeholder="Search city or location..."
          showLocationButton
          onLocationPress={handleLocationPress}
          isLocating={isLocating}
          selectedLocation={currentLocation}
        />
      </View>

      {/* Location Header */}
      <LocationHeader
        locationName={
          currentLocation ? `${currentLocation.city}, ${currentLocation.state}` : "Unknown"
        }
        secondaryText={currentLocation?.country === "CA" ? "Canada" : "United States"}
      />

      {/* Searched Address Banner - shown when user searched for a specific address */}
      {currentLocation?.searchedAddress && (
        <View style={$searchedAddressBanner}>
          <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.textDim} />
          <Text style={[$searchedAddressText, { color: theme.colors.textDim }]}>
            Showing data for nearest city to: {currentLocation.searchedAddress}
          </Text>
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
          <Text style={$mockDataText}>Using local data (offline or no backend data)</Text>
        </View>
      )}

      {/* Action Buttons Row: Follow and Share */}
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
          accessibilityLabel={
            currentLocation ? `Follow ${currentLocation.city}, ${currentLocation.state}` : "Follow"
          }
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
      </View>

      {/* Admin Warning Banners */}
      {adminBanners.length > 0 &&
        adminBanners.map((banner) => (
          <View key={banner.id} style={$warningBannerContainer}>
            <AdminWarningBanner banner={banner} />
          </View>
        ))}

      {/* Warning Banner - shows for danger/warning stats */}
      {priorityAlert && priorityAlert.definition && (
        <View style={$warningBannerContainer}>
          <WarningBanner
            statDefinition={priorityAlert.definition}
            stat={priorityAlert.stat}
            onViewDetails={() => {
              // Navigate to category detail for this stat
              navigation.navigate("CategoryDetail", {
                category: mapToStatCategory(priorityAlert.definition.category),
                city: currentLocation?.city || "",
                state: currentLocation?.state || "",
                country: currentLocation?.country || "",
              })
            }}
          />
        </View>
      )}

      {/* Category Cards */}
      <View style={$categoriesContainer}>
        {categories.map((category, index) => (
          <View key={category}>
            {index > 0 && <View style={$categorySeparator} />}
            <ExpandableCategoryCard
              category={category}
              categoryName={getCategoryDisplayName(category)}
              status={getStatusForCategory(category)}
              getSubCategoryStatus={getSubCategoryStatusForCategory}
              onPress={(subCategoryId) => {
                navigation.navigate("CategoryDetail", {
                  category,
                  city: currentLocation?.city || "",
                  state: currentLocation?.state || "",
                  country: currentLocation?.country || "",
                  subCategoryId,
                })
              }}
            />
          </View>
        ))}
      </View>

      {/* Environmental Observations Card */}
      <View style={$observationsCardContainer}>
        <Card
          heading="Environmental Health"
          content="View radon zones, disease endemic status, and other environmental health observations for this area."
          onPress={() => {
            const jurisdictionCode =
              getJurisdictionForLocation(
                currentLocation?.state || "",
                currentLocation?.country || "",
              )?.code || "WHO"
            navigation.navigate("LocationObservations", {
              city: currentLocation?.city || "",
              state: currentLocation?.state || "",
              country: currentLocation?.country || "",
              jurisdictionCode,
            })
          }}
          RightComponent={
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textDim} />
          }
          LeftComponent={
            <View
              style={[$observationsIconContainer, { backgroundColor: theme.colors.accentBlueBg }]}
            >
              <MaterialCommunityIcons name="leaf" size={24} color={theme.colors.tint} />
            </View>
          }
        />
      </View>

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

      {/* Profile Menu */}
      <ProfileMenu
        visible={isProfileMenuVisible}
        onClose={() => setIsProfileMenuVisible(false)}
        onNavigate={handleProfileMenuNavigate}
        onSignOut={handleSignOut}
        isAuthenticated={isAuthenticated}
        userEmail={user?.signInDetails?.loginId}
      />
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

const $observationsCardContainer: ViewStyle = {
  marginHorizontal: 16,
  marginTop: 16,
}

const $observationsIconContainer: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: "center",
  justifyContent: "center",
}
