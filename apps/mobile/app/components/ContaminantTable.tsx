import { View, ViewStyle, TextStyle } from "react-native"

import type { StatStatus } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

import { StatusIndicator } from "./StatusIndicator"
import { Text } from "./Text"

export interface ContaminantTableRow {
  /** Contaminant name */
  name: string
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
}

/**
 * A table component that displays contaminants with WHO and local standard values.
 *
 * Displays columns: Name | WHO Standard | Local Standard | Status
 */
export function ContaminantTable(props: ContaminantTableProps) {
  const { rows, unit } = props
  const { theme } = useAppTheme()

  const displayUnit = unit || (rows.length > 0 ? rows[0].unit : "")

  const $container: ViewStyle = {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.palette.neutral200,
    overflow: "hidden",
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
    borderBottomColor: theme.colors.palette.neutral200,
    backgroundColor: theme.colors.background,
  }

  const $lastRow: ViewStyle = {
    borderBottomWidth: 0,
  }

  const $cell: ViewStyle = {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
  }

  const $nameCell: ViewStyle = {
    ...$cell,
    flex: 2,
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

  const formatValue = (value: number | null, isUnregulated?: boolean): string => {
    if (isUnregulated) return "UNREGULATED"
    if (value === null) return "NO STANDARD"
    return `${value} ${displayUnit}`
  }

  return (
    <View style={$container}>
      {/* Header Row */}
      <View style={$headerRow}>
        <View style={[$headerCell, $nameCell]}>
          <Text style={$headerText}>Contaminant</Text>
        </View>
        <View style={[$headerCell, $valueCell]}>
          <Text style={$headerText}>WHO</Text>
        </View>
        <View style={[$headerCell, $valueCell]}>
          <Text style={$headerText}>Local</Text>
        </View>
        <View style={[$headerCell, $statusCell]}>
          <Text style={$headerText}></Text>
        </View>
      </View>

      {/* Data Rows */}
      {rows.map((row, index) => (
        <View key={row.name} style={[$row, index === rows.length - 1 && $lastRow]}>
          <View style={$nameCell}>
            <Text style={$cellText}>{row.name}</Text>
          </View>
          <View style={$valueCell}>
            <Text style={row.whoLimit === null ? $unregulatedText : $valueText}>
              {formatValue(row.whoLimit)}
            </Text>
          </View>
          <View style={$valueCell}>
            <Text
              style={row.localLimit === null || row.isUnregulated ? $unregulatedText : $valueText}
            >
              {formatValue(row.localLimit, row.isUnregulated)}
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
