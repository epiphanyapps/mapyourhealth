/**
 * Mirrors the cascade behavior of `getThreshold` in
 * `apps/mobile/app/context/ContaminantsContext.tsx`. Given a
 * (contaminantId, jurisdictionCode) lookup the mobile app will try, in order:
 *
 *   1. Exact `(contaminantId, jurisdictionCode)` threshold
 *   2. One-level parent (the jurisdiction's `parentCode`)
 *   3. `WHO` as the global default
 *
 * For admin coverage reporting we don't need the threshold itself, just the
 * resolution outcome so the UI can show ✓ (exists here), ↓ (cascades), ⚠
 * (falls all the way to WHO), or ⊘ (nothing at all, including no WHO row).
 *
 * Kept in pure-function form so it's trivially unit-testable and can stay in
 * sync with mobile by inspection. If mobile ever widens the cascade past one
 * parent level, update both call sites together.
 */

export type CoverageState = "direct" | "cascade-parent" | "cascade-who" | "none";

export type ThresholdCoverage = {
  state: CoverageState;
  /** The jurisdiction code that actually answered the lookup (or null for "none"). */
  resolvedJurisdictionCode: string | null;
};

export type ThresholdLookupKey = string; // `${contaminantId}:${jurisdictionCode}`

export function makeThresholdKey(
  contaminantId: string,
  jurisdictionCode: string,
): ThresholdLookupKey {
  return `${contaminantId}:${jurisdictionCode}`;
}

export type MinimalJurisdiction = {
  code: string;
  parentCode?: string | null;
};

export function resolveThresholdCoverage(
  contaminantId: string,
  jurisdictionCode: string,
  jurisdictionByCode: Map<string, MinimalJurisdiction>,
  thresholdKeys: Set<ThresholdLookupKey>,
): ThresholdCoverage {
  if (thresholdKeys.has(makeThresholdKey(contaminantId, jurisdictionCode))) {
    return { state: "direct", resolvedJurisdictionCode: jurisdictionCode };
  }

  const jurisdiction = jurisdictionByCode.get(jurisdictionCode);
  const parentCode = jurisdiction?.parentCode ?? null;
  if (parentCode && thresholdKeys.has(makeThresholdKey(contaminantId, parentCode))) {
    return { state: "cascade-parent", resolvedJurisdictionCode: parentCode };
  }

  if (thresholdKeys.has(makeThresholdKey(contaminantId, "WHO"))) {
    // If the requested jurisdiction *is* WHO, the "direct" branch would have
    // matched above. Reaching here means the lookup fell through to WHO from
    // a non-WHO jurisdiction.
    return { state: "cascade-who", resolvedJurisdictionCode: "WHO" };
  }

  return { state: "none", resolvedJurisdictionCode: null };
}
