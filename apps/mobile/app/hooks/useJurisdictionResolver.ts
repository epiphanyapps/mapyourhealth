/**
 * useJurisdictionResolver
 *
 * Thin wrapper over `useContaminants().getJurisdictionForLocation`. Exists so
 * call sites have a single, replaceable point of access to (state, country) →
 * jurisdiction resolution.
 *
 * Today the resolution is an in-memory lookup against the cached
 * `jurisdictionMap` (built from the `Jurisdiction` reference table at app
 * startup). If we ever swap to a different strategy — e.g. reading from the
 * `Location` DynamoDB table to support city-level jurisdiction overrides —
 * only this hook needs to change; consumers stay the same.
 *
 * Two helpers because call sites split roughly 2:1 on whether they need the
 * full Jurisdiction record or just the code:
 *
 *  - `resolve(state, country)` returns the full `Jurisdiction | undefined` —
 *    use when the display name or other fields matter (e.g.
 *    `CategoryDetailScreen` shows `jurisdiction.name.toUpperCase()`).
 *  - `resolveCode(state, country)` returns the resolved code with `"WHO"` as
 *    the fallback — use when you just need a code for downstream lookups
 *    (e.g. `useLocationData` mapping measurements to local thresholds).
 */

import { useMemo } from "react"

import { useContaminants } from "@/context/ContaminantsContext"
import type { Jurisdiction } from "@/data/types/safety"

export interface JurisdictionResolver {
  resolve: (state: string, country: string) => Jurisdiction | undefined
  resolveCode: (state: string, country: string) => string
}

export function useJurisdictionResolver(): JurisdictionResolver {
  const { getJurisdictionForLocation } = useContaminants()
  return useMemo(
    () => ({
      resolve: getJurisdictionForLocation,
      resolveCode: (state, country) => getJurisdictionForLocation(state, country)?.code ?? "WHO",
    }),
    [getJurisdictionForLocation],
  )
}
