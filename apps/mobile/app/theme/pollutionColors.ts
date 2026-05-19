/**
 * Shared pollution-source palette + ordering helpers.
 *
 * Severity drives both the dot/badge colour on the Dashboard card and the
 * accent on the detail screen. Status colours surface only on the detail
 * screen today; centralised here so a future status pill on the card stays
 * consistent.
 */

import type { AmplifyPollutionSource } from "@/services/amplify/data"

export type PollutionSeverity = "low" | "moderate" | "high" | "critical"
export type PollutionStatus = "active" | "monitored" | "remediated" | "closed"

export const SEVERITY_COLORS: Record<PollutionSeverity, string> = {
  low: "#10B981",
  moderate: "#F59E0B",
  high: "#F97316",
  critical: "#DC2626",
}

export const STATUS_COLORS: Record<PollutionStatus, string> = {
  active: "#DC2626",
  monitored: "#F59E0B",
  remediated: "#10B981",
  closed: "#6B7280",
}

const SEVERITY_RANK: Record<PollutionSeverity, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
}

export function severityRank(level: PollutionSeverity | null | undefined): number {
  if (!level) return 0
  return SEVERITY_RANK[level] ?? 0
}

export function isPollutionSeverity(value: string | null | undefined): value is PollutionSeverity {
  return value === "low" || value === "moderate" || value === "high" || value === "critical"
}

export function isPollutionStatus(value: string | null | undefined): value is PollutionStatus {
  return value === "active" || value === "monitored" || value === "remediated" || value === "closed"
}

/** Coerce an Amplify enum field (typed as `any` post-codegen) into our
 *  narrow union, or `null` for missing/unknown values. */
function toSeverity(value: unknown): PollutionSeverity | null {
  return isPollutionSeverity(value as string | null | undefined)
    ? (value as PollutionSeverity)
    : null
}

/** Highest-severity level across a list. Returns null when the list is empty
 *  or no source carries a known severity. */
export function worstSeverity(sources: AmplifyPollutionSource[]): PollutionSeverity | null {
  let winner: PollutionSeverity | null = null
  let winnerRank = 0
  for (const source of sources) {
    const level = toSeverity(source.severityLevel)
    if (!level) continue
    const rank = SEVERITY_RANK[level]
    if (rank > winnerRank) {
      winner = level
      winnerRank = rank
    }
  }
  return winner
}

/** Stable sort by severity descending (critical → low). Unknown severity
 *  trails. Original order is preserved within a severity bucket. */
export function sortBySeverityDesc(sources: AmplifyPollutionSource[]): AmplifyPollutionSource[] {
  return [...sources]
    .map((source, index) => ({ source, index }))
    .sort((a, b) => {
      const rankDelta =
        severityRank(toSeverity(b.source.severityLevel)) -
        severityRank(toSeverity(a.source.severityLevel))
      if (rankDelta !== 0) return rankDelta
      return a.index - b.index
    })
    .map(({ source }) => source)
}
