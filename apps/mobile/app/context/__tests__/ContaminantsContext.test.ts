import { DEFAULT_HIGHER_IS_BAD, DEFAULT_WARNING_RATIO } from "@/data/types/safety"
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
  it("substitutes DEFAULT_WARNING_RATIO when the Amplify record has warningRatio null", () => {
    const mapped = mapAmplifyThreshold({
      ...baseThreshold,
      warningRatio: null,
    } as unknown as AmplifyContaminantThreshold)

    expect(mapped.warningRatio).toBe(DEFAULT_WARNING_RATIO)
  })

  it("preserves the Amplify warningRatio when it is a number (including 0)", () => {
    expect(
      mapAmplifyThreshold({ ...baseThreshold, warningRatio: 0.5 } as AmplifyContaminantThreshold)
        .warningRatio,
    ).toBe(0.5)

    // 0 is a real value used by zero-tolerance contaminants (E. coli, total coliform)
    // and must not be coalesced away.
    expect(
      mapAmplifyThreshold({ ...baseThreshold, warningRatio: 0 } as AmplifyContaminantThreshold)
        .warningRatio,
    ).toBe(0)
  })
})

describe("mapAmplifyContaminant", () => {
  it("substitutes DEFAULT_HIGHER_IS_BAD when the Amplify record has higherIsBad null", () => {
    const mapped = mapAmplifyContaminant({
      ...baseContaminant,
      higherIsBad: null,
    } as unknown as AmplifyContaminant)

    expect(mapped.higherIsBad).toBe(DEFAULT_HIGHER_IS_BAD)
  })

  it("preserves higherIsBad: false (the case the default would silently flip)", () => {
    const mapped = mapAmplifyContaminant({
      ...baseContaminant,
      higherIsBad: false,
    } as AmplifyContaminant)

    expect(mapped.higherIsBad).toBe(false)
  })
})
