import { FC, useState, useCallback, useEffect } from "react"
import { View, ViewStyle, Pressable, TextStyle, Alert, ActivityIndicator } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { LocationHeader } from "@/components/LocationHeader"
import { Screen } from "@/components/Screen"
import { SearchBar } from "@/components/SearchBar"
import { StatCategoryCard, CATEGORY_DISPLAY_NAMES } from "@/components/StatCategoryCard"
import { WarningBanner } from "@/components/WarningBanner"
import { RecommendationsSection } from "@/components/RecommendationsSection"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { useAuth } from "@/context/AuthContext"
import { usePendingAction } from "@/context/PendingActionContext"
import { useStatDefinitions } from "@/context/StatDefinitionsContext"
import { useSubscriptions } from "@/context/SubscriptionsContext"
import { useZipCodeData, getWorstStatusForCategory, getAlertStats } from "@/hooks/useZipCodeData"
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
const DEFAULT_ZIP_CODE = "90210"

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
  // 3. For guests, default to 90210
  const getDefaultZipCode = () => {
    if (route.params?.zipCode) return route.params.zipCode
    if (isAuthenticated && primarySubscription) return primarySubscription.zipCode
    return DEFAULT_ZIP_CODE
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

  // Fetch data for current zip code from Amplify (with mock fallback)
  const { zipData, isLoading, error, isMockData, refresh } = useZipCodeData(currentZipCode)

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
        await addSubscription(
          zipData.zipCode,
          zipData.cityName,
          zipData.state,
        )
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

  const $noDataText: TextStyle = {
    fontSize: 16,
    color: theme.colors.textDim,
    textAlign: "center",
    marginTop: 40,
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

  // Get alert stats (danger/warning) for the warning banner
  const alertStats = zipData ? getAlertStats(zipData, statDefinitions) : []
  // Show the first danger stat, or first warning if no danger
  const priorityAlert = alertStats.find((a) => a.stat.status === "danger") ?? alertStats[0]

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
        <LocationHeader zipCode={currentZipCode} cityName="Error" />
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
        <View style={$errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.textDim}
          />
          <Text style={$errorText}>{error}</Text>
          <Pressable style={$retryButton} onPress={refresh}>
            <Text style={$retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </Screen>
    )
  }

  // No data state
  if (!zipData) {
    return (
      <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
        <LocationHeader zipCode={currentZipCode} cityName="No Data" />
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
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={$noDataText}>No safety data available for zip code {currentZipCode}.</Text>
          <Text style={[{ marginTop: 8 }, $noDataText]}>
            Try searching for a different zip code.
          </Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={$contentContainer}>
      {/* Location Header */}
      <LocationHeader
        zipCode={zipData.zipCode}
        cityName={zipData.state ? `${zipData.cityName}, ${zipData.state}` : zipData.cityName}
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

      {/* Mock Data Banner - only shown in development when using mock data */}
      {isMockData && __DEV__ && (
        <View style={$mockDataBanner}>
          <Text style={$mockDataText}>Using local data (offline or no backend data)</Text>
        </View>
      )}

      {/* Follow Button */}
      <Pressable
        onPress={handleFollow}
        disabled={isFollowing}
        style={({ pressed }) => [
          $followButton,
          { borderColor: theme.colors.tint },
          pressed && { opacity: 0.8 },
          isFollowing && { opacity: 0.6 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Follow ${currentZipCode}`}
      >
        <MaterialCommunityIcons
          name="heart-plus-outline"
          size={20}
          color={theme.colors.tint}
        />
        <Text style={[$followButtonText, { color: theme.colors.tint }]}>
          {isFollowing ? "Following..." : "Follow This Zip Code"}
        </Text>
      </Pressable>

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

const $followButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginHorizontal: 16,
  marginBottom: 16,
  paddingVertical: 12,
  borderRadius: 12,
  borderWidth: 2,
  gap: 8,
}

const $followButtonText: TextStyle = {
  fontSize: 16,
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
