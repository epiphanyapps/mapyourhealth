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
  /**
   * Worst-of-(whoStatus, localStatus). Used for the trailing summary pill
   * and as a fallback when whoStatus / localStatus are absent (older cached
   * data shape).
   */
  status: StatStatus
  /** Status vs WHO threshold (EPI-18 sub-bug B). */
  whoStatus?: StatStatus
  /** Status vs local-jurisdiction threshold (EPI-18 sub-bug B). */
  localStatus?: StatStatus
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
    flex: 1.75,
    alignItems: "flex-end",
  }

  // Inline pill sits to the left of the threshold text (EPI-18 sub-bug B).
  const $valueCellInner: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  }

  const $pillSpacer: ViewStyle = {
    width: 8,
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

  // EPI-18 sub-bug C: render each row's own unit instead of the first
  // row's unit (or the optional `unit` prop). The previous behavior caused
  // every cell to render with "Bq/L" — the first row's unit, since radioactive
  // contaminants tend to sort first — so Lead and Mercury (μg/L) showed up
  // labeled in becquerels.
  const formatValue = (
    value: number | null,
    rowUnit: string,
    options?: { isUnregulated?: boolean; isLocal?: boolean },
  ): string => {
    if (options?.isUnregulated) return "UNREGULATED"
    if (value === null) return options?.isLocal ? "N/A" : "NO STANDARD"
    const effectiveUnit = unit || rowUnit
    return `${value} ${effectiveUnit}`
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
      </View>

      {/* Data Rows */}
      {rows.map((row, index) => {
        // EPI-18 sub-bug B: each value cell renders a status pill so the
        // user sees that a row can be safe vs WHO yet exceed a tighter
        // local (e.g., QC) limit. Suppress the pill when the threshold
        // is null/unregulated — there's nothing to compare against.
        const showLocalPill = row.localLimit !== null && !row.isUnregulated
        const showWhoPill = row.whoLimit !== null
        const localPillStatus = row.localStatus ?? row.status
        const whoPillStatus = row.whoStatus ?? row.status
        return (
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
              <View style={$valueCellInner}>
                {showLocalPill ? (
                  <StatusIndicator status={localPillStatus} size="small" />
                ) : (
                  <View style={$pillSpacer} />
                )}
                <Text
                  style={
                    row.localLimit === null || row.isUnregulated ? $unregulatedText : $valueText
                  }
                >
                  {formatValue(row.localLimit, row.unit, {
                    isUnregulated: row.isUnregulated,
                    isLocal: true,
                  })}
                </Text>
              </View>
            </View>
            <View style={$valueCell}>
              <View style={$valueCellInner}>
                {showWhoPill ? (
                  <StatusIndicator status={whoPillStatus} size="small" />
                ) : (
                  <View style={$pillSpacer} />
                )}
                <Text style={row.whoLimit === null ? $unregulatedText : $valueText}>
                  {formatValue(row.whoLimit, row.unit)}
                </Text>
              </View>
            </View>
          </View>
        )
      })}
    </View>
  )
}
