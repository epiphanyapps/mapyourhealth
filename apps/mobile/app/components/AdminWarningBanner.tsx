import { useMemo } from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import i18n from "i18next"

import { Text } from "@/components/Text"
import type { AmplifyWarningBanner } from "@/services/amplify/data"

/**
 * Severity-based color constants
 */
const CRITICAL_BACKGROUND = "#FEE2E2"
const CRITICAL_ACCENT = "#DC2626"
const CRITICAL_TEXT = "#991B1B"

const WARNING_BACKGROUND = "#FEF3C7"
const WARNING_ACCENT = "#D97706"
const WARNING_TEXT = "#92400E"

const INFO_BACKGROUND = "#DBEAFE"
const INFO_ACCENT = "#2563EB"
const INFO_TEXT = "#1E40AF"

type Severity = "critical" | "warning" | "info"

interface SeverityColors {
  background: string
  accent: string
  text: string
  icon: "alert-octagon" | "alert-circle" | "information"
}

const SEVERITY_MAP: Record<Severity, SeverityColors> = {
  critical: {
    background: CRITICAL_BACKGROUND,
    accent: CRITICAL_ACCENT,
    text: CRITICAL_TEXT,
    icon: "alert-octagon",
  },
  warning: {
    background: WARNING_BACKGROUND,
    accent: WARNING_ACCENT,
    text: WARNING_TEXT,
    icon: "alert-circle",
  },
  info: {
    background: INFO_BACKGROUND,
    accent: INFO_ACCENT,
    text: INFO_TEXT,
    icon: "information",
  },
}

export interface AdminWarningBannerProps {
  /** The warning banner data from the backend */
  banner: AmplifyWarningBanner
}

/**
 * Determine the user's current language prefix (e.g., "fr" or "en")
 * Uses the app's i18next instance to stay in sync with user language settings.
 */
function getCurrentLanguage(): string {
  const primaryTag = i18n.language?.split("-")[0]
  return primaryTag || "en"
}

/**
 * AdminWarningBanner - Displays a single admin-created warning banner.
 *
 * Shows severity-based colored card with title and description.
 * Supports i18n (uses French title/description when locale is French).
 */
export function AdminWarningBanner(props: AdminWarningBannerProps) {
  const { banner } = props

  const language = getCurrentLanguage()
  const isFrench = language === "fr"

  const title = isFrench && banner.titleFr ? banner.titleFr : banner.title
  const description = isFrench && banner.descriptionFr ? banner.descriptionFr : banner.description

  const severity: Severity = (banner.severity as Severity) || "warning"
  const colors = SEVERITY_MAP[severity]

  const themedStyles = useMemo(
    () => ({
      container: {
        ...$container,
        backgroundColor: colors.background,
      } as ViewStyle,
      labelText: {
        ...$labelText,
        color: colors.accent,
      } as TextStyle,
      titleText: {
        ...$titleText,
        color: colors.text,
      } as TextStyle,
      descriptionText: {
        ...$descriptionText,
        color: colors.text,
      } as TextStyle,
    }),
    [colors],
  )

  return (
    <View style={themedStyles.container} accessibilityRole="alert">
      <View style={$contentRow}>
        <MaterialCommunityIcons name={colors.icon} size={24} color={colors.accent} style={$icon} />
        <View style={$textContainer}>
          <Text style={themedStyles.labelText}>
            {severity === "critical"
              ? i18n.t("warningBanner.critical")
              : severity === "warning"
                ? i18n.t("warningBanner.warning")
                : i18n.t("warningBanner.info")}
          </Text>
          <Text style={themedStyles.titleText}>{title}</Text>
          <Text style={themedStyles.descriptionText}>{description}</Text>
        </View>
      </View>
    </View>
  )
}

const $container: ViewStyle = {
  borderRadius: 12,
  padding: 16,
}

const $contentRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
}

const $icon: ViewStyle = {
  marginRight: 12,
  marginTop: 2,
}

const $textContainer: ViewStyle = {
  flex: 1,
}

const $labelText: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 2,
}

const $titleText: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  marginBottom: 4,
}

const $descriptionText: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
}
