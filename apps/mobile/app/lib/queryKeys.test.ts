/**
 * Regression tests for the cascade-aware query keys (#123).
 *
 * Originally `usePollutionSources` and `useLocationObservations` keyed
 * React Query by `byCity(city)` only. Once the cascade was added, two
 * distinct (state, country) inputs with `city === ""` (the state-/country-
 * only cascade case) collapsed onto the same cache slot, serving stale
 * data from the previous query. The fix introduces `byLocation(city,
 * state, country)`; this file pins the contract so a future refactor
 * can't quietly regress.
 */

import { queryKeys } from "./queryKeys"

describe("queryKeys.byLocation cascade keys (#123)", () => {
  it.each([
    ["measurements", queryKeys.measurements.byLocation],
    ["observations", queryKeys.observations.byLocation],
    ["pollutionSources", queryKeys.pollutionSources.byLocation],
  ] as const)(
    "%s: distinct (state, country) inputs with empty city produce distinct keys",
    (_label, byLocation) => {
      const qcKey = JSON.stringify(byLocation("", "QC", "CA"))
      const onKey = JSON.stringify(byLocation("", "ON", "CA"))
      const usKey = JSON.stringify(byLocation("", "", "US"))
      const caCountryKey = JSON.stringify(byLocation("", "", "CA"))

      expect(qcKey).not.toBe(onKey)
      expect(qcKey).not.toBe(usKey)
      expect(qcKey).not.toBe(caCountryKey)
      expect(onKey).not.toBe(caCountryKey)
      expect(usKey).not.toBe(caCountryKey)
    },
  )

  it.each([
    ["measurements", queryKeys.measurements.byLocation],
    ["observations", queryKeys.observations.byLocation],
    ["pollutionSources", queryKeys.pollutionSources.byLocation],
  ] as const)(
    "%s: same-named city in different states produces distinct keys",
    (_label, byLocation) => {
      // Same city name, different state → must not alias.
      const springfieldIL = JSON.stringify(byLocation("Springfield", "IL", "US"))
      const springfieldMA = JSON.stringify(byLocation("Springfield", "MA", "US"))
      expect(springfieldIL).not.toBe(springfieldMA)
    },
  )
})
