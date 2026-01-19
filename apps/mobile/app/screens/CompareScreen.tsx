import { FC, useState, useCallback } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { CategoryIcon, CATEGORY_COLORS } from "@/components/CategoryIcon"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { StatusIndicator } from "@/components/StatusIndicator"
import { Text } from "@/components/Text"
import { useStatDefinitions } from "@/context/StatDefinitionsContext"
import { StatCategory, StatStatus, ZipCodeData } from "@/data/types/safety"
import { getZipCodeMetadata } from "@/data/helpers"
import { useZipCodeData, getWorstStatusForCategory } from "@/hooks/useZipCodeData"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

interface CompareScreenProps extends AppStackScreenProps<"Compare"> {}

/**
 * Category display names for UI
 */
const CATEGORY_DISPLAY_NAMES: Record<StatCategory, string> = {
  [StatCategory.water]: "Water Quality",
  [StatCategory.air]: "Air Quality",
  [StatCategory.health]: "Health",
  [StatCategory.disaster]: "Disaster Risk",
}

/**
 * All four categories to compare
 */
const ALL_CATEGORIES = [
  StatCategory.water,
  StatCategory.air,
  StatCategory.health,
  StatCategory.disaster,
]

/**
 * Calculate overall safety score based on all categories
 * Returns a score from 0-100 where 100 is safest
 */
function calculateSafetyScore(
  zipData: ZipCodeData | null,
  statDefinitions: { id: string; category: StatCategory }[],
): number {
  if (!zipData) return 0

  let totalScore = 0
  let categoryCount = 0

  for (const category of ALL_CATEGORIES) {
    const status = getWorstStatusForCategory(zipData, category, statDefinitions)
    categoryCount++
    if (status === "safe") {
      totalScore += 100
    } else if (status === "warning") {
      totalScore += 50
    }
    // danger = 0 points
  }

  return categoryCount > 0 ? Math.round(totalScore / categoryCount) : 0
}

/**
 * Get the location display name for a zip code
 */
function getLocationName(zipCode: string, zipData: ZipCodeData | null): string {
  if (zipData?.cityName && zipData.state) {
    return `${zipData.cityName}, ${zipData.state}`
  }
  if (zipData?.cityName) {
    return zipData.cityName
  }
  const metadata = getZipCodeMetadata(zipCode)
  if (metadata) {
    return `${metadata.city}, ${metadata.state}`
  }
  return "Unknown Location"
}

/**
 * CompareScreen - Compare safety data between two zip codes
 *
 * Displays:
 * - Two zip code input fields with search
 * - Side-by-side comparison of all categories
 * - Status indicators for each zip code per category
 * - Overall safety score comparison
 */
export const CompareScreen: FC<CompareScreenProps> = function CompareScreen({ navigation }) {
  const { theme } = useAppTheme()
  const { statDefinitions } = useStatDefinitions()

  // State for zip code inputs
  const [zipCode1, setZipCode1] = useState("")
  const [zipCode2, setZipCode2] = useState("")
  const [activeZip1, setActiveZip1] = useState<string | null>(null)
  const [activeZip2, setActiveZip2] = useState<string | null>(null)

  // Fetch data for both zip codes (only when submitted)
  const {
    zipData: zipData1,
    isLoading: isLoading1,
    error: error1,
  } = useZipCodeData(activeZip1 ?? "")
  const {
    zipData: zipData2,
    isLoading: isLoading2,
    error: error2,
  } = useZipCodeData(activeZip2 ?? "")

  // Handle search for zip code 1
  const handleSearch1 = useCallback(() => {
    const trimmed = zipCode1.trim()
    if (/^\d{5}$/.test(trimmed)) {
      setActiveZip1(trimmed)
    }
  }, [zipCode1])

  // Handle search for zip code 2
  const handleSearch2 = useCallback(() => {
    const trimmed = zipCode2.trim()
    if (/^\d{5}$/.test(trimmed)) {
      setActiveZip2(trimmed)
    }
  }, [zipCode2])

  // Calculate safety scores
  const score1 = activeZip1 ? calculateSafetyScore(zipData1, statDefinitions) : null
  const score2 = activeZip2 ? calculateSafetyScore(zipData2, statDefinitions) : null

  // Determine which zip code is safer for each category
  const getCategorySaferZip = (
    category: StatCategory,
  ): "zip1" | "zip2" | "equal" | null => {
    if (!zipData1 || !zipData2) return null

    const status1 = getWorstStatusForCategory(zipData1, category, statDefinitions)
    const status2 = getWorstStatusForCategory(zipData2, category, statDefinitions)

    // Rank statuses: safe > warning > danger (higher is better)
    const statusRank: Record<StatStatus, number> = { safe: 2, warning: 1, danger: 0 }
    const rank1 = statusRank[status1]
    const rank2 = statusRank[status2]

    if (rank1 > rank2) return "zip1"
    if (rank2 > rank1) return "zip2"
    return "equal"
  }

  // Get the status for a category
  const getStatusForCategory = (
    zipData: ZipCodeData | null,
    category: StatCategory,
  ): StatStatus => {
    if (!zipData) return "safe"
    return getWorstStatusForCategory(zipData, category, statDefinitions)
  }

  // Get background color for winner highlight
  const getHighlightColor = (
    saferZip: "zip1" | "zip2" | "equal" | null,
    isZip1: boolean,
  ): string | undefined => {
    if (saferZip === null || saferZip === "equal") return undefined
    if ((saferZip === "zip1" && isZip1) || (saferZip === "zip2" && !isZip1)) {
      return "rgba(16, 185, 129, 0.1)" // Light green for safer
    }
    return undefined
  }

  // Styles
  const $container: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
  }

  const $content: ViewStyle = {
    paddingHorizontal: 16,
    paddingBottom: 24,
  }

  const $inputRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: theme.colors.palette.neutral200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  }

  const $input: TextStyle = {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 8,
  }

  const $searchButton: ViewStyle = {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.tint,
  }

  const $sectionTitle: TextStyle = {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 16,
  }

  const $comparisonHeader: ViewStyle = {
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 8,
  }

  const $headerColumn: ViewStyle = {
    flex: 1,
    alignItems: "center",
  }

  const $headerText: TextStyle = {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  }

  const $locationText: TextStyle = {
    fontSize: 12,
    color: theme.colors.textDim,
    textAlign: "center",
    marginTop: 2,
  }

  const $categoryRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: theme.colors.palette.neutral100,
    borderRadius: 12,
    overflow: "hidden",
  }

  const $categoryCenter: ViewStyle = {
    width: 80,
    alignItems: "center",
    paddingVertical: 12,
  }

  const $categoryName: TextStyle = {
    fontSize: 10,
    color: theme.colors.textDim,
    marginTop: 4,
    textAlign: "center",
  }

  const $statusCell: ViewStyle = {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  }

  const $statusText: TextStyle = {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "capitalize",
  }

  const $overallScoreContainer: ViewStyle = {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  }

  const $scoreCard: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.palette.neutral100,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  }

  const $scoreValue: TextStyle = {
    fontSize: 48,
    fontWeight: "bold",
    color: theme.colors.text,
  }

  const $scoreLabel: TextStyle = {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 4,
  }

  const $winnerBadge: ViewStyle = {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  }

  const $winnerText: TextStyle = {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  }

  const $loadingContainer: ViewStyle = {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  }

  const $emptyState: ViewStyle = {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  }

  const $emptyText: TextStyle = {
    fontSize: 16,
    color: theme.colors.textDim,
    textAlign: "center",
    marginTop: 16,
  }

  const $errorText: TextStyle = {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
    textAlign: "center",
  }

  const $inputLabel: TextStyle = {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textDim,
    marginBottom: 8,
  }

  // Render status indicator with text
  const renderStatusCell = (
    zipData: ZipCodeData | null,
    category: StatCategory,
    saferZip: "zip1" | "zip2" | "equal" | null,
    isZip1: boolean,
  ) => {
    if (!zipData) {
      return (
        <View style={$statusCell}>
          <Text style={{ color: theme.colors.textDim }}>-</Text>
        </View>
      )
    }

    const status = getStatusForCategory(zipData, category)
    const highlightColor = getHighlightColor(saferZip, isZip1)
    const statusColor =
      status === "danger" ? "#DC2626" : status === "warning" ? "#F59E0B" : "#10B981"

    return (
      <View style={[$statusCell, highlightColor && { backgroundColor: highlightColor }]}>
        <StatusIndicator status={status} size="medium" />
        <Text style={[$statusText, { color: statusColor }]}>{status}</Text>
      </View>
    )
  }

  // Check if we have any data to compare
  const hasData = (activeZip1 && zipData1) || (activeZip2 && zipData2)
  const hasBothData = activeZip1 && activeZip2 && zipData1 && zipData2

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} style={$container}>
      <Header
        title="Compare Zip Codes"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={$content}>
        {/* Zip Code 1 Input */}
        <Text style={$inputLabel}>First Zip Code</Text>
        <View style={$inputRow}>
          <MaterialCommunityIcons
            name="map-marker"
            size={20}
            color={theme.colors.textDim}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={$input}
            placeholder="Enter zip code (e.g., 90210)"
            placeholderTextColor={theme.colors.textDim}
            value={zipCode1}
            onChangeText={setZipCode1}
            keyboardType="number-pad"
            maxLength={5}
            onSubmitEditing={handleSearch1}
            returnKeyType="search"
          />
          <Pressable
            style={$searchButton}
            onPress={handleSearch1}
            disabled={!/^\d{5}$/.test(zipCode1.trim())}
          >
            <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        {error1 && activeZip1 && <Text style={$errorText}>{error1}</Text>}

        {/* Zip Code 2 Input */}
        <Text style={$inputLabel}>Second Zip Code</Text>
        <View style={$inputRow}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={20}
            color={theme.colors.textDim}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={$input}
            placeholder="Enter zip code (e.g., 10001)"
            placeholderTextColor={theme.colors.textDim}
            value={zipCode2}
            onChangeText={setZipCode2}
            keyboardType="number-pad"
            maxLength={5}
            onSubmitEditing={handleSearch2}
            returnKeyType="search"
          />
          <Pressable
            style={$searchButton}
            onPress={handleSearch2}
            disabled={!/^\d{5}$/.test(zipCode2.trim())}
          >
            <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        {error2 && activeZip2 && <Text style={$errorText}>{error2}</Text>}

        {/* Loading states */}
        {(isLoading1 || isLoading2) && (
          <View style={[$emptyState, { paddingVertical: 24 }]}>
            <ActivityIndicator size="large" color={theme.colors.tint} />
            <Text style={[$emptyText, { marginTop: 12 }]}>Loading comparison data...</Text>
          </View>
        )}

        {/* Empty state - no zip codes entered */}
        {!hasData && !isLoading1 && !isLoading2 && (
          <View style={$emptyState}>
            <MaterialCommunityIcons
              name="compare"
              size={64}
              color={theme.colors.textDim}
            />
            <Text style={$emptyText}>
              Enter two zip codes above to compare their safety data side by side.
            </Text>
          </View>
        )}

        {/* Comparison results */}
        {hasData && !isLoading1 && !isLoading2 && (
          <>
            {/* Category Comparison */}
            <Text style={$sectionTitle}>Category Comparison</Text>

            {/* Header row with zip code labels */}
            <View style={$comparisonHeader}>
              <View style={$headerColumn}>
                <Text style={$headerText}>{activeZip1 || "-"}</Text>
                <Text style={$locationText}>
                  {activeZip1 ? getLocationName(activeZip1, zipData1) : ""}
                </Text>
              </View>
              <View style={{ width: 80 }} />
              <View style={$headerColumn}>
                <Text style={$headerText}>{activeZip2 || "-"}</Text>
                <Text style={$locationText}>
                  {activeZip2 ? getLocationName(activeZip2, zipData2) : ""}
                </Text>
              </View>
            </View>

            {/* Category rows */}
            {ALL_CATEGORIES.map((category) => {
              const saferZip = getCategorySaferZip(category)
              return (
                <View key={category} style={$categoryRow}>
                  {renderStatusCell(zipData1, category, saferZip, true)}
                  <View style={$categoryCenter}>
                    <CategoryIcon
                      category={category}
                      size={24}
                      color={CATEGORY_COLORS[category]}
                    />
                    <Text style={$categoryName}>{CATEGORY_DISPLAY_NAMES[category]}</Text>
                  </View>
                  {renderStatusCell(zipData2, category, saferZip, false)}
                </View>
              )
            })}

            {/* Overall Safety Score */}
            <Text style={$sectionTitle}>Overall Safety Score</Text>
            <View style={$overallScoreContainer}>
              {/* Score 1 */}
              <View
                style={[
                  $scoreCard,
                  hasBothData &&
                    score1 !== null &&
                    score2 !== null &&
                    score1 > score2 && {
                      borderWidth: 2,
                      borderColor: "#10B981",
                    },
                ]}
              >
                {activeZip1 ? (
                  <>
                    <Text style={$scoreValue}>{score1 ?? "-"}</Text>
                    <Text style={$scoreLabel}>{activeZip1}</Text>
                    {hasBothData && score1 !== null && score2 !== null && score1 > score2 && (
                      <View style={$winnerBadge}>
                        <Text style={$winnerText}>Safer</Text>
                      </View>
                    )}
                    {hasBothData && score1 !== null && score2 !== null && score1 === score2 && (
                      <View style={[$winnerBadge, { backgroundColor: theme.colors.textDim }]}>
                        <Text style={$winnerText}>Tied</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={{ color: theme.colors.textDim }}>-</Text>
                )}
              </View>

              {/* Score 2 */}
              <View
                style={[
                  $scoreCard,
                  hasBothData &&
                    score1 !== null &&
                    score2 !== null &&
                    score2 > score1 && {
                      borderWidth: 2,
                      borderColor: "#10B981",
                    },
                ]}
              >
                {activeZip2 ? (
                  <>
                    <Text style={$scoreValue}>{score2 ?? "-"}</Text>
                    <Text style={$scoreLabel}>{activeZip2}</Text>
                    {hasBothData && score1 !== null && score2 !== null && score2 > score1 && (
                      <View style={$winnerBadge}>
                        <Text style={$winnerText}>Safer</Text>
                      </View>
                    )}
                    {hasBothData && score1 !== null && score2 !== null && score1 === score2 && (
                      <View style={[$winnerBadge, { backgroundColor: theme.colors.textDim }]}>
                        <Text style={$winnerText}>Tied</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={{ color: theme.colors.textDim }}>-</Text>
                )}
              </View>
            </View>

            {/* Score explanation */}
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.textDim,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              Score based on all category statuses (0-100, higher is safer)
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}
