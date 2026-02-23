/**
 * LocationObservationsScreen
 *
 * Displays O&M observations for a location including radon zones,
 * Lyme disease status, and other environmental health observations.
 */

import { FC, useCallback, useMemo, useState } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { EmptyState } from "@/components/EmptyState"
import { ExpandableCard } from "@/components/ExpandableCard"
import { Header } from "@/components/Header"
import { ObservationCard } from "@/components/ObservationCard"
import { Screen } from "@/components/Screen"
import { StatusIndicator } from "@/components/StatusIndicator"
import { Text } from "@/components/Text"
import {
  type ObservedPropertyCategory,
  type ObservationWithStatus,
  getObservedPropertyCategoryDisplayName,
} from "@/data/types/safety"
import { useLocationObservations } from "@/hooks/useLocationObservations"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { getCategoryIcon, getStatusColorKey } from "@/utils/observations"

interface LocationObservationsScreenProps extends AppStackScreenProps<"LocationObservations"> {}

/**
 * Group observations by category
 */
function groupByCategory(
  observations: ObservationWithStatus[],
): Record<ObservedPropertyCategory, ObservationWithStatus[]> {
  const groups: Record<ObservedPropertyCategory, ObservationWithStatus[]> = {
    water_quality: [],
    air_quality: [],
    disease: [],
    radiation: [],
    soil: [],
    noise: [],
    climate: [],
    infrastructure: [],
  }

  for (const obs of observations) {
    const category = obs.property?.category
    if (category && groups[category]) {
      groups[category].push(obs)
    }
  }

  return groups
}

/**
 * Get worst status for a group of observations
 */
function getGroupWorstStatus(observations: ObservationWithStatus[]): "danger" | "warning" | "safe" {
  if (observations.some((obs) => obs.status === "danger")) return "danger"
  if (observations.some((obs) => obs.status === "warning")) return "warning"
  return "safe"
}

/**
 * Category display order (by importance)
 */
const CATEGORY_ORDER: ObservedPropertyCategory[] = [
  "disease",
  "radiation",
  "water_quality",
  "air_quality",
  "soil",
  "noise",
  "climate",
  "infrastructure",
]

/**
 * Location Observations Screen - Shows all O&M observations for a location.
 *
 * Displays observations grouped by category (disease, radiation, etc.)
 * with expandable sections for each category.
 */
export const LocationObservationsScreen: FC<LocationObservationsScreenProps> =
  function LocationObservationsScreen(props) {
    const { navigation, route } = props
    const { city, state, country, jurisdictionCode } = route.params
    const { theme } = useAppTheme()

    const { observations, isLoading, error, isOffline, refresh, worstStatus, alertCount } =
      useLocationObservations({
        city,
        state,
        jurisdictionCode,
      })

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

    // Group observations by category
    const groupedObservations = useMemo(() => groupByCategory(observations), [observations])

    // Get categories that have observations (ordered by importance)
    const activeCategories = useMemo(
      () => CATEGORY_ORDER.filter((cat) => groupedObservations[cat].length > 0),
      [groupedObservations],
    )

    const locationName = city && state ? `${city}, ${state}` : city || state || "Unknown Location"
    const worstStatusColorKey = getStatusColorKey(worstStatus)

    const $contentContainer: ViewStyle = {
      flexGrow: 1,
      paddingBottom: 24,
    }

    const $summaryCard: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.background,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      padding: 16,
      borderRadius: 12,
      shadowColor: theme.colors.palette.neutral800,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors[worstStatusColorKey],
    }

    const $summaryLeft: ViewStyle = {
      flex: 1,
    }

    const $summaryTitle: TextStyle = {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
    }

    const $summarySubtitle: TextStyle = {
      fontSize: 14,
      color: theme.colors.textDim,
    }

    const $summaryRight: ViewStyle = {
      alignItems: "center",
    }

    const $alertCount: TextStyle = {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors[worstStatusColorKey],
    }

    const $alertLabel: TextStyle = {
      fontSize: 12,
      color: theme.colors.textDim,
      marginTop: 2,
    }

    const $categoriesContainer: ViewStyle = {
      paddingTop: 8,
      gap: 8,
    }

    const $categoryHeader: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    }

    const $categoryIcon: ViewStyle = {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.palette.neutral200,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    }

    const $categoryHeaderText: ViewStyle = {
      flex: 1,
    }

    const $categoryName: TextStyle = {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    }

    const $categoryCount: TextStyle = {
      fontSize: 12,
      color: theme.colors.textDim,
      marginTop: 2,
    }

    const $categoryStatus: ViewStyle = {
      marginRight: 8,
    }

    const $observationsList: ViewStyle = {
      gap: 12,
    }

    const $loadingContainer: ViewStyle = {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    }

    const $loadingText: TextStyle = {
      marginTop: 12,
      color: theme.colors.textDim,
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
      color: theme.colors.palette.neutral100,
      fontSize: 16,
      fontWeight: "600",
    }

    const $offlineBanner: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.offlineBg,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 6,
      gap: 8,
    }

    const $offlineBannerText: TextStyle = {
      fontSize: 12,
      color: theme.colors.offlineText,
      textAlign: "center",
      flex: 1,
    }

    // Loading state
    if (isLoading) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]}>
          <Header
            title="Health Observations"
            leftIcon="back"
            onLeftPress={() => navigation.goBack()}
            safeAreaEdges={[]}
          />
          <View style={$loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.tint} />
            <Text style={$loadingText}>Loading observations...</Text>
          </View>
        </Screen>
      )
    }

    // Error state
    if (error && observations.length === 0) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]}>
          <Header
            title="Health Observations"
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

    // Empty state
    if (observations.length === 0) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]}>
          <Header
            title="Health Observations"
            leftIcon="back"
            onLeftPress={() => navigation.goBack()}
            safeAreaEdges={[]}
          />
          <EmptyState
            heading="No Observations"
            content={`No health observations are available for ${locationName} at this time.`}
            button="Refresh"
            buttonOnPress={refresh}
            ImageProps={{
              source: require("../../assets/images/empty-state.png"),
            }}
          />
        </Screen>
      )
    }

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]}>
        <Header
          title="Health Observations"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
          safeAreaEdges={[]}
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
          {/* Summary Card */}
          <View style={$summaryCard}>
            <View style={$summaryLeft}>
              <Text style={$summaryTitle}>{locationName}</Text>
              <Text style={$summarySubtitle}>{country}</Text>
            </View>
            <View style={$summaryRight}>
              <Text style={$alertCount}>{alertCount}</Text>
              <Text style={$alertLabel}>{alertCount === 1 ? "Alert" : "Alerts"}</Text>
            </View>
          </View>

          {/* Offline Banner */}
          {isOffline && (
            <View style={$offlineBanner}>
              <MaterialCommunityIcons name="wifi-off" size={16} color={theme.colors.offlineText} />
              <Text style={$offlineBannerText}>
                You are offline. Showing cached data if available.
              </Text>
            </View>
          )}

          {/* Categories with observations */}
          <View style={$categoriesContainer}>
            {activeCategories.map((category) => {
              const categoryObs = groupedObservations[category]
              const categoryStatus = getGroupWorstStatus(categoryObs)
              const categoryName = getObservedPropertyCategoryDisplayName(category)
              const iconName = getCategoryIcon(category)

              return (
                <ExpandableCard
                  key={category}
                  initiallyExpanded={categoryStatus !== "safe"}
                  header={
                    <View style={$categoryHeader}>
                      <View style={$categoryIcon}>
                        <MaterialCommunityIcons
                          name={iconName}
                          size={18}
                          color={theme.colors.tint}
                        />
                      </View>
                      <View style={$categoryHeaderText}>
                        <Text style={$categoryName}>{categoryName}</Text>
                        <Text style={$categoryCount}>
                          {categoryObs.length} observation{categoryObs.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <View style={$categoryStatus}>
                        <StatusIndicator status={categoryStatus} size="medium" />
                      </View>
                    </View>
                  }
                >
                  <View style={$observationsList}>
                    {categoryObs.map((obs, index) => (
                      <ObservationCard key={`${obs.propertyId}-${index}`} observation={obs} />
                    ))}
                  </View>
                </ExpandableCard>
              )
            })}
          </View>
        </ScrollView>
      </Screen>
    )
  }
