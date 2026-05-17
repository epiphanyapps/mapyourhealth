import type { AmplifyContaminant, AmplifyContaminantThreshold } from "@/services/amplify/data"

import { mapAmplifyContaminant, mapAmplifyThreshold } from "../ContaminantsContext"

// The mappers under test are pure functions, but `ContaminantsContext` pulls in
// `aws-amplify/auth` transitively via `@/services/amplify/data`. Stubbing the
// data module short-circuits that chain so Jest doesn't need a configured
// Amplify runtime to evaluate the file. `jest.mock` is hoisted by babel-jest,
// so the call still runs before the imports above.
jest.mock("@/services/amplify/data", () => ({
  getContaminants: jest.fn(),
  getContaminantThresholds: jest.fn(),
  getJurisdictions: jest.fn(),
}))

// Minimal fixtures — cast through `unknown` because the Amplify generated
// types carry relation accessors and timestamps that the mappers never read.
const baseThreshold = {
  contaminantId: "lead",
  jurisdictionCode: "WHO",
  limitValue: 10,
  warningRatio: 0.8,
  status: "regulated",
} as unknown as AmplifyContaminantThreshold

const baseContaminant = {
  contaminantId: "lead",
  name: "Lead",
  category: "inorganic",
  unit: "ppb",
  higherIsBad: true,
} as unknown as AmplifyContaminant

describe("mapAmplifyThreshold", () => {
  // `warningRatio` is `.required().default(0.8)` at the schema level, so the
  // mapper trusts Amplify and passes the value through. These tests document
  // that contract — including the zero-tolerance case (E. coli, total
  // coliform) which a `??` coalesce would silently rewrite.
  it("passes warningRatio through unchanged when it is a number", () => {
    expect(
      mapAmplifyThreshold({ ...baseThreshold, warningRatio: 0.5 } as AmplifyContaminantThreshold)
        .warningRatio,
    ).toBe(0.5)
  })

  it("preserves warningRatio: 0 (zero-tolerance contaminants)", () => {
    expect(
      mapAmplifyThreshold({ ...baseThreshold, warningRatio: 0 } as AmplifyContaminantThreshold)
        .warningRatio,
    ).toBe(0)
  })
})

describe("mapAmplifyContaminant", () => {
  // `higherIsBad` is `.required().default(true)` at the schema level. Same
  // trust-the-schema contract as `warningRatio` — the mapper must not
  // coalesce `false` to `true`, since beneficial properties are a real case.
  it("passes higherIsBad: true through unchanged", () => {
    const mapped = mapAmplifyContaminant({
      ...baseContaminant,
      higherIsBad: true,
    } as AmplifyContaminant)

    expect(mapped.higherIsBad).toBe(true)
  })

  it("preserves higherIsBad: false (the case a `?? true` coalesce would silently flip)", () => {
    const mapped = mapAmplifyContaminant({
      ...baseContaminant,
      higherIsBad: false,
    } as AmplifyContaminant)

    expect(mapped.higherIsBad).toBe(false)
  })
})
