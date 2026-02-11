/**
 * Shared constants for the admin dashboard
 */

// =============================================================================
// Contaminant Categories (new model)
// =============================================================================

/** Categories for water contaminants */
export const CONTAMINANT_CATEGORIES = [
  "fertilizer",
  "pesticide",
  "radioactive",
  "disinfectant",
  "inorganic",
  "organic",
  "microbiological",
] as const;
export type ContaminantCategory = (typeof CONTAMINANT_CATEGORIES)[number];

/** Display names for contaminant categories */
export const contaminantCategoryNames: Record<ContaminantCategory, string> = {
  fertilizer: "Fertilizers",
  pesticide: "Pesticides",
  radioactive: "Radioactive",
  disinfectant: "Disinfection Byproducts",
  inorganic: "Heavy Metals & Inorganics",
  organic: "Organic Compounds",
  microbiological: "Microbiological",
};

/** Color mappings for contaminant categories */
export const contaminantCategoryColors: Record<ContaminantCategory, string> = {
  fertilizer: "bg-green-100 text-green-800",
  pesticide: "bg-yellow-100 text-yellow-800",
  radioactive: "bg-purple-100 text-purple-800",
  disinfectant: "bg-blue-100 text-blue-800",
  inorganic: "bg-gray-100 text-gray-800",
  organic: "bg-orange-100 text-orange-800",
  microbiological: "bg-red-100 text-red-800",
};

// =============================================================================
// Threshold Status
// =============================================================================

/** Status options for contaminant thresholds */
export const THRESHOLD_STATUS_OPTIONS = [
  "regulated",
  "banned",
  "not_approved",
  "not_controlled",
] as const;
export type ThresholdStatus = (typeof THRESHOLD_STATUS_OPTIONS)[number];

/** Display names for threshold statuses */
export const thresholdStatusNames: Record<ThresholdStatus, string> = {
  regulated: "Regulated",
  banned: "Banned",
  not_approved: "Not Approved",
  not_controlled: "Not Controlled",
};

/** Color mappings for threshold statuses */
export const thresholdStatusColors: Record<ThresholdStatus, string> = {
  regulated: "bg-blue-100 text-blue-800",
  banned: "bg-red-100 text-red-800",
  not_approved: "bg-yellow-100 text-yellow-800",
  not_controlled: "bg-gray-100 text-gray-800",
};

// =============================================================================
// Legacy Categories (for backward compatibility during migration)
// =============================================================================

/** @deprecated Use CONTAMINANT_CATEGORIES instead */
export const CATEGORIES = ["water", "air", "health", "disaster"] as const;
/** @deprecated Use ContaminantCategory instead */
export type Category = (typeof CATEGORIES)[number];

/** @deprecated Use contaminantCategoryColors instead */
export const categoryColors: Record<Category, string> = {
  water: "bg-blue-100 text-blue-800",
  air: "bg-purple-100 text-purple-800",
  health: "bg-red-100 text-red-800",
  disaster: "bg-orange-100 text-orange-800",
};

// =============================================================================
// Report Status
// =============================================================================

/** Status options for hazard reports */
export const REPORT_STATUS_OPTIONS = [
  "pending",
  "reviewed",
  "resolved",
  "dismissed",
] as const;
export type ReportStatus = (typeof REPORT_STATUS_OPTIONS)[number];

/** Color mappings for report statuses */
export const reportStatusColors: Record<ReportStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
};

// =============================================================================
// Safety Status
// =============================================================================

/** Status options for location stats */
export const STAT_STATUS_OPTIONS = ["danger", "warning", "safe"] as const;
export type StatStatus = (typeof STAT_STATUS_OPTIONS)[number];

/** Color mappings for stat statuses (danger/warning/safe) */
export const statStatusColors: Record<StatStatus, string> = {
  danger: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
  safe: "bg-green-100 text-green-800",
};

// =============================================================================
// Misc
// =============================================================================

/** History configuration */
export const STAT_HISTORY_LIMIT = 12; // Keep last 12 entries (for 12 months of history)
