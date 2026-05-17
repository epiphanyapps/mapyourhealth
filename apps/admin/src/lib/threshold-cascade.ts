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
 * parent level, only `getThresholdChain` needs to change — the resolver and
 * the UI's chain display both consume it.
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

/**
 * The ordered cascade we'd walk for any contaminant under this jurisdiction:
 * `[jurisdictionCode, parentCode?, "WHO"]`, deduped so the chain doesn't end
 * in `WHO → WHO` when the parent is already WHO (or when the jurisdiction
 * itself is WHO). Single source of truth for both the `resolveThresholdCoverage`
 * walk and the UI's "US-NY → US → WHO" display string.
 */
export function getThresholdChain(
  jurisdictionCode: string,
  jurisdictionByCode: Map<string, MinimalJurisdiction>,
): string[] {
  const chain: string[] = [jurisdictionCode];
  const parentCode = jurisdictionByCode.get(jurisdictionCode)?.parentCode;
  if (parentCode && parentCode !== jurisdictionCode) chain.push(parentCode);
  if (chain[chain.length - 1] !== "WHO") chain.push("WHO");
  return chain;
}

export function resolveThresholdCoverage(
  contaminantId: string,
  jurisdictionCode: string,
  jurisdictionByCode: Map<string, MinimalJurisdiction>,
  thresholdKeys: Set<ThresholdLookupKey>,
): ThresholdCoverage {
  // Walk the same chain the UI displays. Index 0 is the requested jurisdiction
  // itself (a hit there is "direct"); the WHO terminator yields "cascade-who"
  // only when reached via a non-WHO start, because if the request *is* WHO it
  // sits at index 0 and matches the "direct" branch first.
  const chain = getThresholdChain(jurisdictionCode, jurisdictionByCode);
  for (let i = 0; i < chain.length; i++) {
    const code = chain[i];
    if (!thresholdKeys.has(makeThresholdKey(contaminantId, code))) continue;
    if (i === 0) {
      return { state: "direct", resolvedJurisdictionCode: code };
    }
    if (code === "WHO") {
      return { state: "cascade-who", resolvedJurisdictionCode: "WHO" };
    }
    return { state: "cascade-parent", resolvedJurisdictionCode: code };
  }
  return { state: "none", resolvedJurisdictionCode: null };
}
