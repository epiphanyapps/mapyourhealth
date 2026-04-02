/**
 * Type declarations for seed JSON files that are gitignored but
 * bundled by esbuild at deploy time.
 */

declare module '../../../scripts/seed-om-data.json' {
  const data: {
    observedProperties: Array<Record<string, unknown>>;
    locationObservations: Array<{
      city: string;
      state: string;
      country: string;
      county?: string | null;
      propertyId: string;
      zoneValue?: string | null;
      observedAt: string;
      source?: string | null;
      sourceUrl?: string | null;
      rawData?: Record<string, unknown> | null;
    }>;
  };
  export default data;
}
