/**
 * Shared constants for the admin dashboard
 */

// Categories for stats and reports
export const CATEGORIES = ["water", "air", "health", "disaster"] as const;
export type Category = (typeof CATEGORIES)[number];

// Status options for hazard reports
export const REPORT_STATUS_OPTIONS = ["pending", "reviewed", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUS_OPTIONS)[number];

// Status options for zip code stats
export const STAT_STATUS_OPTIONS = ["danger", "warning", "safe"] as const;
export type StatStatus = (typeof STAT_STATUS_OPTIONS)[number];

// Color mappings for categories
export const categoryColors: Record<Category, string> = {
  water: "bg-blue-100 text-blue-800",
  air: "bg-purple-100 text-purple-800",
  health: "bg-red-100 text-red-800",
  disaster: "bg-orange-100 text-orange-800",
};

// Color mappings for report statuses
export const reportStatusColors: Record<ReportStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
};

// Color mappings for stat statuses (danger/warning/safe)
export const statStatusColors: Record<StatStatus, string> = {
  danger: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
  safe: "bg-green-100 text-green-800",
};

// History configuration
export const STAT_HISTORY_LIMIT = 12; // Keep last 12 entries (for 12 months of history)
