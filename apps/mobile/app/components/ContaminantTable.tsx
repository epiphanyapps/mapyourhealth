import { View, ViewStyle, TextStyle, TouchableOpacity } from "react-native"

import { hasHealthEffectsData } from "@/data/contaminantHealthEffects"
import type { StatStatus } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

import { ContaminantInfoButton } from "./ContaminantInfoButton"
import { StatusIndicator } from "./StatusIndicator"
import { Text } from "./Text"

export interface ContaminantTableRow {
  /** Contaminant name */
  name: string
  /** Contaminant ID for health effects lookup (optional) */
  contaminantId?: string
  /** Current measured value */
  value: number
  /** Unit of measurement */
  unit: string
  /** WHO threshold value (null if not regulated) */
  whoLimit: number | null
  /** Local/jurisdiction threshold value (null if not regulated) */
  localLimit: number | null
  /** Local jurisdiction name (e.g., "NEW YORK", "QUEBEC") */
  localJurisdictionName: string
  /** Status based on threshold comparison */
  status: StatStatus
  /** Whether the contaminant is unregulated locally */
  isUnregulated?: boolean
}

export interface ContaminantTableProps {
  /** Rows of contaminant data */
  rows: ContaminantTableRow[]
  /** Unit to display in header (optional, defaults to first row's unit) */
  unit?: string
  /** Callback when WHO column header is tapped */
  onWhoHeaderPress?: () => void
  /** Callback when Local column header is tapped */
  onLocalHeaderPress?: () => void
}

/**
 * A table component that displays contaminants with WHO and local standard values.
 *
 * Displays columns: Name | WHO Standard | Local Standard | Status
 */
export function ContaminantTable(props: ContaminantTableProps) {
  const { rows, unit, onWhoHeaderPress, onLocalHeaderPress } = props
  const { theme } = useAppTheme()

  const displayUnit = unit || (rows.length > 0 ? rows[0].unit : "")

  const $container: ViewStyle = {
    marginTop: 16,
  }

  const $headerRow: ViewStyle = {
    flexDirection: "row",
    backgroundColor: theme.colors.palette.neutral100,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.palette.neutral200,
  }

  const $headerCell: ViewStyle = {
    paddingVertical: 10,
    paddingHorizontal: 8,
  }

  const $headerText: TextStyle = {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
    textTransform: "uppercase",
  }

  const $row: ViewStyle = {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.palette.neutral300,
    backgroundColor: theme.colors.background,
  }

  const $alternateRow: ViewStyle = {
    backgroundColor: theme.colors.palette.neutral100,
  }

  const $lastRow: ViewStyle = {
    borderBottomWidth: 0,
  }

  const $cell: ViewStyle = {
    paddingVertical: 14, // Increased for better mobile touch targets
    paddingHorizontal: 10, // Increased for better spacing on mobile
    justifyContent: "center",
    minHeight: 44, // Ensure minimum touch target size for accessibility
  }

  const $nameCell: ViewStyle = {
    ...$cell,
    flex: 2,
  }

  const $nameCellRow: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
  }

  const $valueCell: ViewStyle = {
    ...$cell,
    flex: 1.5,
    alignItems: "flex-end",
  }

  const $statusCell: ViewStyle = {
    ...$cell,
    flex: 0.5,
    alignItems: "center",
  }

  const $cellText: TextStyle = {
    fontSize: 14,
    color: theme.colors.text,
  }

  const $valueText: TextStyle = {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
  }

  const $unregulatedText: TextStyle = {
    fontSize: 12,
    color: theme.colors.textDim,
    fontStyle: "italic",
  }

  const $linkHeaderText: TextStyle = {
    ...$headerText,
    color: theme.colors.tint,
    textDecorationLine: "underline",
  }

  const localJurisdictionLabel = rows.length > 0 ? rows[0].localJurisdictionName : "LOCAL"

  const formatValue = (
    value: number | null,
    options?: { isUnregulated?: boolean; isLocal?: boolean },
  ): string => {
    if (options?.isUnregulated) return "UNREGULATED"
    if (value === null) return options?.isLocal ? "N/A" : "NO STANDARD"
    return `${value} ${displayUnit}`
  }

  return (
    <View style={$container}>
      {/* Header Row */}
      <View style={$headerRow}>
        <View style={[$headerCell, $nameCell]}>
          <Text style={$headerText}>Contaminant</Text>
        </View>
        <TouchableOpacity
          style={[$headerCell, $valueCell]}
          onPress={onLocalHeaderPress}
          disabled={!onLocalHeaderPress}
          accessibilityRole="link"
          accessibilityLabel={`View ${localJurisdictionLabel} water standards`}
        >
          <Text style={onLocalHeaderPress ? $linkHeaderText : $headerText}>
            {localJurisdictionLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[$headerCell, $valueCell]}
          onPress={onWhoHeaderPress}
          disabled={!onWhoHeaderPress}
          accessibilityRole="link"
          accessibilityLabel="View WHO drinking water guidelines"
        >
          <Text style={onWhoHeaderPress ? $linkHeaderText : $headerText}>WHO</Text>
        </TouchableOpacity>
        <View style={[$headerCell, $statusCell]}>
          <Text style={$headerText}></Text>
        </View>
      </View>

      {/* Data Rows */}
      {rows.map((row, index) => (
        <View
          key={row.name}
          style={[$row, index % 2 === 1 && $alternateRow, index === rows.length - 1 && $lastRow]}
        >
          <View style={[$nameCell, $nameCellRow]}>
            <Text style={$cellText}>{row.name}</Text>
            {row.contaminantId && hasHealthEffectsData(row.contaminantId) && (
              <ContaminantInfoButton contaminantId={row.contaminantId} />
            )}
          </View>
          <View style={$valueCell}>
            <Text
              style={row.localLimit === null || row.isUnregulated ? $unregulatedText : $valueText}
            >
              {formatValue(row.localLimit, { isUnregulated: row.isUnregulated, isLocal: true })}
            </Text>
          </View>
          <View style={$valueCell}>
            <Text style={row.whoLimit === null ? $unregulatedText : $valueText}>
              {formatValue(row.whoLimit)}
            </Text>
          </View>
          <View style={$statusCell}>
            <StatusIndicator status={row.status} size="small" />
          </View>
        </View>
      ))}
    </View>
  )
}
