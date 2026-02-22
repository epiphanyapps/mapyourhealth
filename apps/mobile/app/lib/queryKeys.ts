/**
 * React Query key factory for consistent cache key management.
 *
 * Convention: each domain gets a factory that returns structured keys.
 * This ensures cache invalidation is predictable and type-safe.
 */

export const queryKeys = {
  // ── Categories ──
  categories: {
    all: ["categories"] as const,
    list: () => [...queryKeys.categories.all, "list"] as const,
    subCategories: () => [...queryKeys.categories.all, "subCategories"] as const,
    byId: (categoryId: string) => [...queryKeys.categories.all, "byId", categoryId] as const,
  },

  // ── Contaminants / Thresholds / Jurisdictions ──
  contaminants: {
    all: ["contaminants"] as const,
    definitions: () => [...queryKeys.contaminants.all, "definitions"] as const,
    thresholds: () => [...queryKeys.contaminants.all, "thresholds"] as const,
    jurisdictions: () => [...queryKeys.contaminants.all, "jurisdictions"] as const,
  },

  // ── Location search ──
  locations: {
    all: ["locations"] as const,
    list: () => [...queryKeys.locations.all, "list"] as const,
  },

  // ── Measurements / Zip-code data ──
  measurements: {
    all: ["measurements"] as const,
    byPostalCode: (postalCode: string) =>
      [...queryKeys.measurements.all, "postalCode", postalCode] as const,
    byCity: (city: string, state: string) =>
      [...queryKeys.measurements.all, "city", city, state] as const,
    multiLocation: (postalCodes: string[]) =>
      [...queryKeys.measurements.all, "multi", ...postalCodes.sort()] as const,
  },

  // ── Subscriptions ──
  subscriptions: {
    all: ["subscriptions"] as const,
    list: () => [...queryKeys.subscriptions.all, "list"] as const,
  },

  // ── Hazard reports ──
  hazardReports: {
    all: ["hazardReports"] as const,
    list: () => [...queryKeys.hazardReports.all, "list"] as const,
  },

  // ── Episodes (demo/podcast) ──
  episodes: {
    all: ["episodes"] as const,
    list: () => [...queryKeys.episodes.all, "list"] as const,
  },
} as const
