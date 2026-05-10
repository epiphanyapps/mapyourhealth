/* eslint-disable react-native/no-inline-styles, react/no-unescaped-entities */
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { View, ViewStyle, Pressable, TextStyle, Alert, RefreshControl, Share } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { CommonActions } from "@react-navigation/native"
import { formatDistanceToNow } from "date-fns"

import { AdminWarningBanner } from "@/components/AdminWarningBanner"
import { DashboardSkeleton } from "@/components/DashboardSkeleton"
import {
  ExpandableCategoryCard,
  SubCategoryStatusResult,
} from "@/components/ExpandableCategoryCard"
import { LocationHeader } from "@/components/LocationHeader"
import { LocationScopeBadge } from "@/components/LocationScopeBadge"
import { NavHeader } from "@/components/NavHeader"
import { PlacesSearchBar } from "@/components/PlacesSearchBar"
import { ProfileMenu } from "@/components/ProfileMenu"
import { Screen } from "@/components/Screen"
import { CATEGORY_DISPLAY_NAMES } from "@/components/StatCategoryCard"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import { useCategories } from "@/context/CategoriesContext"
import { useContaminants } from "@/context/ContaminantsContext"
import { usePendingAction } from "@/context/PendingActionContext"
import { useStatDefinitions } from "@/context/StatDefinitionsContext"
import { useSubscriptions } from "@/context/SubscriptionsContext"
import { StatCategory } from "@/data/types/safety"
import { useLocation } from "@/hooks/useLocation"
import {
  useLocationData,
  getWorstStatusForCategory,
  getRiskStatsForCategory,
} from "@/hooks/useLocationData"
import { useMinimumDuration } from "@/hooks/useMinimumDuration"
import { useWarningBanners } from "@/hooks/useWarningBanners"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { recordLocationVisit } from "@/services/amplify/data"
import { useAppTheme } from "@/theme/context"
import { trackEvent } from "@/utils/analytics"
// jurisdiction resolution now uses ContaminantsContext.getJurisdictionForLocation
// postalCode utilities removed - using city-level granularity

/** Orange color for WHO-only exceedances */
const WHO_EXCEEDANCE_COLOR = "#F97316"

// Survives the screen remount that `CommonActions.reset` triggers on every
// city change. `useLocationData` rehydrates from MMKV via `initialData`, so
// cached cities land in `success` state with `isLoading: false` and the
// skeleton would otherwise never show. `resetDashboardToLocation` stamps
// this on dispatch; the next mount consumes it to seed an initial loading
// state. All city-changing reset paths (search, GPS, primarySubscription
// auto-redirect) must go through the helper to stay consistent — the bare
// "clear location" path intentionally bypasses it.
let pendingSearchAt: number | null = null
const SEARCH_HANDOFF_WINDOW_MS = 1000
const SEARCH_SKELETON_HOLD_MS = 400

interface DashboardResetParams {
  city: string
  state: string
  country: string
  address?: string
}

function resetDashboardToLocation(
  navigation: AppStackScreenProps<"Dashboard">["navigation"],
  params: DashboardResetParams,
): void {
  pendingSearchAt = Date.now()
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "Dashboard", params }],
    }),
  )
}

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
  const { isAuthenticated, user, logout } = useAuth()
  const { setPendingAction } = usePendingAction()
  const { statDefinitions } = useStatDefinitions()
  const { contaminants, getThreshold, getWHOThreshold, getJurisdictionForLocation } =
    useContaminants()
  const { primarySubscription, addSubscription, isLoading: subsLoading } = useSubscriptions()
  const {
    getLocationFromGPS,
    isLocating,
    error: locationError,
    clearError: clearLocationError,
  } = useLocation()
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
      resetDashboardToLocation(navigation, {
        city: primarySubscription.city,
        state: primarySubscription.state,
        country: primarySubscription.country,
      })
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

  // Fetch data for current location from Amplify (with caching, offline support,
  // and city → state → country cascading per #123).
  const locationData = useLocationData(
    currentLocation?.city || "",
    currentLocation?.state || "",
    currentLocation?.country || "",
  )

  const {
    cityData,
    isLoading: isLoadingRaw,
    error,
    isMockData = false,
    isCachedData = false,
    lastUpdated = null,
    isOffline,
    scope,
    refresh,
  } = locationData

  // Force-show the skeleton on every search. MMKV-cached cities rehydrate
  // through `initialData` with `isLoading: false`, which otherwise leaves
  // search with no visual feedback. Two paths cover both navigation modes:
  //   1. Module-level handoff for `CommonActions.reset` (remounts the screen).
  //   2. City-change ref for the same-instance case (e.g., setParams).
  const [isSearching, setIsSearching] = useState<boolean>(() => {
    if (pendingSearchAt !== null && Date.now() - pendingSearchAt < SEARCH_HANDOFF_WINDOW_MS) {
      pendingSearchAt = null
      return true
    }
    return false
  })
  const prevCityRef = useRef<string | undefined>(currentLocation?.city)

  useEffect(() => {
    const newCity = currentLocation?.city
    if (newCity && newCity !== prevCityRef.current) {
      setIsSearching(true)
    }
    prevCityRef.current = newCity
  }, [currentLocation?.city])

  useEffect(() => {
    if (!isSearching) return
    const timer = setTimeout(() => setIsSearching(false), SEARCH_SKELETON_HOLD_MS)
    return () => clearTimeout(timer)
  }, [isSearching])

  // Hold the loading state for at least 250ms so the skeleton does not flash
  // on warm-cache rehydration (where isLoading flips false in <50ms).
  const isLoading = useMinimumDuration(isLoadingRaw || isSearching, 250)

  // Track city view for analytics
  useEffect(() => {
    if (currentLocation?.city) {
      trackEvent("CityViewed", {
        city: currentLocation.city,
        state: currentLocation.state,
        country: currentLocation.country,
      })
      recordLocationVisit(currentLocation.city, currentLocation.state, currentLocation.country)
    }
  }, [currentLocation?.city, currentLocation?.state, currentLocation?.country])

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

  // Build the contaminant rows shown when a sub-category is expanded inline
  // on the dashboard. Joins `cityData.stats` to the contaminant catalog by
  // statId and filters by `contaminant.category === subCategoryId`.
  const getSubCategoryContent = useCallback(
    (subCategoryId: string) => {
      if (!cityData) return []

      const subCategoryContaminantIds = new Set(
        contaminants.filter((c) => c.category === subCategoryId).map((c) => c.id),
      )
      if (subCategoryContaminantIds.size === 0) return []

      return cityData.stats
        .filter((stat) => subCategoryContaminantIds.has(stat.statId))
        .map((stat) => {
          const definition = statDefinitions.find((d) => d.id === stat.statId)
          return {
            statId: stat.statId,
            name: definition?.name ?? stat.statId,
            value: stat.value,
            unit: definition?.unit ?? "",
            status: stat.status,
          }
        })
    },
    [cityData, contaminants, statDefinitions],
  )

  // Categories to display (water and air only - health and disaster removed per issue #126)
  const categories = useMemo(() => [StatCategory.water, StatCategory.air], [])

  // Handle location selection from PlacesSearchBar — updates URL via route params
  const handleLocationSelect = useCallback(
    (city: string, state: string, country: string, addr?: string) => {
      resetDashboardToLocation(navigation, { city, state, country, address: addr })
    },
    [navigation],
  )

  // Clear the selected location — drops route params so the dashboard falls
  // back to its empty state and (on web) the ?city=… query param is removed.
  const handleClearLocation = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Dashboard", params: undefined }],
      }),
    )
  }, [navigation])

  // Handle location button press - get location from GPS
  const handleLocationPress = useCallback(async () => {
    const location = await getLocationFromGPS()
    if (location) {
      resetDashboardToLocation(navigation, {
        city: location.city,
        state: location.state,
        country: location.country,
      })
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

  // Admin warning banners — rendered in every branch (populated, empty-data,
  // error) so emergency advisories reach users for cities that haven't been
  // seeded with measurement data yet, not just on populated dashboards.
  const adminBannersJsx =
    adminBanners.length > 0
      ? adminBanners.map((banner) => (
          <View key={banner.id} style={$warningBannerContainer}>
            <AdminWarningBanner banner={banner} />
          </View>
        ))
      : null

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
            locationError={locationError}
            onLocationErrorDismiss={clearLocationError}
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
            locationError={locationError}
            onLocationErrorDismiss={clearLocationError}
          />
        </View>
        <DashboardSkeleton />
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
            locationError={locationError}
            onLocationErrorDismiss={clearLocationError}
          />
        </View>
        <LocationHeader
          locationName={
            currentLocation
              ? [currentLocation.city, currentLocation.state].filter(Boolean).join(", ") ||
                currentLocation.country ||
                "Unknown"
              : "Unknown"
          }
          secondaryText={currentLocation?.country === "CA" ? "Canada" : "United States"}
          onClear={handleClearLocation}
        />
        {adminBannersJsx}
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
            locationError={locationError}
            onLocationErrorDismiss={clearLocationError}
          />
        </View>
        <LocationHeader
          locationName={
            currentLocation
              ? [currentLocation.city, currentLocation.state].filter(Boolean).join(", ") ||
                currentLocation.country ||
                "Unknown"
              : "Unknown"
          }
          secondaryText={currentLocation?.country === "CA" ? "Canada" : "United States"}
          onClear={handleClearLocation}
        />
        {adminBannersJsx}
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
          locationError={locationError}
          onLocationErrorDismiss={clearLocationError}
        />
      </View>

      {/* Location Header. Tolerates missing city/state for country-only
          cascade inputs (#123) — joining ", " when both are blank would
          render a stray comma. */}
      <LocationHeader
        locationName={
          currentLocation
            ? [currentLocation.city, currentLocation.state].filter(Boolean).join(", ") ||
              currentLocation.country ||
              "Unknown"
            : "Unknown"
        }
        secondaryText={currentLocation?.country === "CA" ? "Canada" : "United States"}
        onClear={handleClearLocation}
      />

      {/* Cascade-scope provenance: only renders for state/country fallback (#123) */}
      <LocationScopeBadge
        scope={scope}
        state={currentLocation?.state}
        country={currentLocation?.country}
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ marginHorizontal: 16, marginBottom: 8 }}
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
      {adminBannersJsx}

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
              riskCount={
                cityData ? getRiskStatsForCategory(cityData, category, statDefinitions).length : 0
              }
              getSubCategoryContent={getSubCategoryContent}
              onPress={(subCategoryId) => {
                navigation.navigate("CategoryDetail", {
                  category,
                  city: currentLocation?.city || "",
                  state: currentLocation?.state || "",
                  country: currentLocation?.country || "",
                  ...(subCategoryId ? { subCategoryId } : {}),
                })
              }}
            />
          </View>
        ))}
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
