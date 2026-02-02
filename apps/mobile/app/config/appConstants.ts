/**
 * App-wide constants
 *
 * Centralized configuration values that were previously hardcoded.
 * Import from here to ensure consistency across the app.
 */

// Read version from package.json
// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require("../../package.json")

/**
 * App metadata
 */
export const APP_VERSION = packageJson.version as string
export const APP_NAME = "MapYourHealth"

/**
 * Contact information
 */
export const SUPPORT_EMAIL = "support@mapyourhealth.com"

/**
 * Feature configuration
 */
export const MAGIC_LINK_EXPIRATION_MINUTES = 15
export const VERIFICATION_CODE_EXPIRATION_HOURS = 24
export const RESEND_COOLDOWN_SECONDS = 60
export const RATE_LIMIT_PENALTY_SECONDS = 300

/**
 * Notification settings
 */
export const IN_APP_NOTIFICATION_DURATION_MS = 5000
export const TOKEN_SYNC_MAX_RETRIES = 3

/**
 * Status colors (for non-themed contexts)
 * Prefer using theme.colors when available
 */
export const STATUS_COLORS = {
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
} as const

/**
 * Get full version string with app name
 */
export function getVersionString(): string {
  return `${APP_NAME} v${APP_VERSION}`
}

/**
 * Get mailto URL for support
 */
export function getSupportMailtoUrl(subject?: string): string {
  const baseUrl = `mailto:${SUPPORT_EMAIL}`
  if (subject) {
    return `${baseUrl}?subject=${encodeURIComponent(subject)}`
  }
  return baseUrl
}
