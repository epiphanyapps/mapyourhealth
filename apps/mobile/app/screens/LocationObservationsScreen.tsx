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
  StyleSheet,
  Pressable,
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
import { getJurisdictionForState } from "@/utils/jurisdiction"
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
    const { city, state, country } = route.params
    const jurisdictionCode =
      route.params.jurisdictionCode ?? getJurisdictionForState(state, country)
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

    // Loading state
    if (isLoading) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]} testID="observations-screen-loading">
          <Header
            title="Health Observations"
            leftIcon="back"
            onLeftPress={() => navigation.goBack()}
            safeAreaEdges={[]}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.tint} testID="loading-indicator" />
            <Text style={[styles.loadingText, { color: theme.colors.textDim }]}>
              Loading observations...
            </Text>
          </View>
        </Screen>
      )
    }

    // Error state
    if (error && observations.length === 0) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]} testID="observations-screen-error">
          <Header
            title="Health Observations"
            leftIcon="back"
            onLeftPress={() => navigation.goBack()}
            safeAreaEdges={[]}
          />
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={theme.colors.textDim}
            />
            <Text style={[styles.errorText, { color: theme.colors.textDim }]}>{error}</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: theme.colors.tint }]}
              onPress={refresh}
              testID="retry-button"
            >
              <Text style={[styles.retryButtonText, { color: theme.colors.palette.neutral100 }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        </Screen>
      )
    }

    // Empty state
    if (observations.length === 0) {
      return (
        <Screen preset="fixed" safeAreaEdges={["top"]} testID="observations-screen-empty">
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
              source: require("../../assets/images/sad-face.png"),
            }}
          />
        </Screen>
      )
    }

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} testID="observations-screen">
        <Header
          title="Health Observations"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
          safeAreaEdges={[]}
        />

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.tint}
              colors={[theme.colors.tint]}
            />
          }
          testID="observations-scroll-view"
        >
          {/* Summary Card */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.colors.background,
                borderLeftColor: theme.colors[worstStatusColorKey],
                shadowColor: theme.colors.palette.neutral800,
              },
            ]}
            testID="summary-card"
          >
            <View style={styles.summaryLeft}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                {locationName}
              </Text>
              <Text style={[styles.summarySubtitle, { color: theme.colors.textDim }]}>
                {country}
              </Text>
            </View>
            <View style={styles.summaryRight}>
              <Text
                style={[styles.alertCount, { color: theme.colors[worstStatusColorKey] }]}
                testID="alert-count"
              >
                {alertCount}
              </Text>
              <Text style={[styles.alertLabel, { color: theme.colors.textDim }]}>
                {alertCount === 1 ? "Alert" : "Alerts"}
              </Text>
            </View>
          </View>

          {/* Offline Banner */}
          {isOffline && (
            <View
              style={[styles.offlineBanner, { backgroundColor: theme.colors.offlineBg }]}
              testID="offline-banner"
            >
              <MaterialCommunityIcons name="wifi-off" size={16} color={theme.colors.offlineText} />
              <Text style={[styles.offlineBannerText, { color: theme.colors.offlineText }]}>
                You are offline. Showing cached data if available.
              </Text>
            </View>
          )}

          {/* Categories with observations */}
          <View style={styles.categoriesContainer}>
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
                    <View style={styles.categoryHeader}>
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: theme.colors.palette.neutral200 },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={iconName}
                          size={18}
                          color={theme.colors.tint}
                        />
                      </View>
                      <View style={styles.categoryHeaderText}>
                        <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                          {categoryName}
                        </Text>
                        <Text style={[styles.categoryCount, { color: theme.colors.textDim }]}>
                          {categoryObs.length} observation{categoryObs.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <View style={styles.categoryStatus}>
                        <StatusIndicator status={categoryStatus} size="medium" />
                      </View>
                    </View>
                  }
                >
                  <View style={styles.observationsList}>
                    {categoryObs.map((obs, index) => (
                      <ObservationCard
                        key={`${obs.propertyId}-${index}`}
                        observation={obs}
                        testID={`observation-card-${category}-${index}`}
                      />
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

const styles = StyleSheet.create({
  alertCount: {
    fontSize: 24,
    fontWeight: "700",
  } as TextStyle,
  alertLabel: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  categoriesContainer: {
    gap: 8,
    paddingTop: 8,
  } as ViewStyle,
  categoryCount: {
    fontSize: 12,
    marginTop: 2,
  } as TextStyle,
  categoryHeader: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  } as ViewStyle,
  categoryHeaderText: {
    flex: 1,
  } as ViewStyle,
  categoryIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    marginRight: 12,
    width: 32,
  } as ViewStyle,
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  categoryStatus: {
    marginRight: 8,
  } as ViewStyle,
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  } as ViewStyle,
  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  } as ViewStyle,
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    marginTop: 12,
    textAlign: "center",
  } as TextStyle,
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 40,
  } as ViewStyle,
  loadingText: {
    marginTop: 12,
  } as TextStyle,
  observationsList: {
    gap: 12,
  } as ViewStyle,
  offlineBanner: {
    alignItems: "center",
    borderRadius: 6,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  } as ViewStyle,
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    textAlign: "center",
  } as TextStyle,
  retryButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  } as ViewStyle,
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  summaryCard: {
    alignItems: "center",
    borderLeftWidth: 4,
    borderRadius: 12,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  } as ViewStyle,
  summaryLeft: {
    flex: 1,
  } as ViewStyle,
  summaryRight: {
    alignItems: "center",
  } as ViewStyle,
  summarySubtitle: {
    fontSize: 14,
  } as TextStyle,
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  } as TextStyle,
})
