/**
 * Unit tests for the on-location-measurement-update Lambda's pure helpers.
 *
 * The lambda's main behaviour (DynamoDB stream → invoke
 * process-notifications) is integration-tested on staging once the schema
 * deploys. These tests cover the cascade-scope derivation logic (#123)
 * which is the core decision point for fan-out scope.
 *
 * Run from this directory: `npx jest --config jest.config.js`
 */

// Mock the AWS SDK client so the handler module can be imported in
// isolation. We're not exercising the InvokeCommand path here.
jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn(() => ({ send: jest.fn() })),
  InvokeCommand: jest.fn(),
}))

import { deriveScope, type LocationMeasurementRecord } from "./handler"

describe("deriveScope (#123)", () => {
  const baseRecord: LocationMeasurementRecord = {
    id: "row-1",
    country: "CA",
    contaminantId: "radon",
    value: 200,
    measuredAt: "2026-04-01T00:00:00Z",
  }

  it("returns 'city' when city is populated", () => {
    expect(
      deriveScope({ ...baseRecord, city: "Sorel-Tracy", state: "QC", country: "CA" }),
    ).toBe("city")
  })

  it("returns 'state' when only state + country are populated", () => {
    expect(
      deriveScope({ ...baseRecord, city: null, state: "QC", country: "CA" }),
    ).toBe("state")
  })

  it("returns 'country' when only country is populated", () => {
    expect(
      deriveScope({ ...baseRecord, city: null, state: null, country: "CA" }),
    ).toBe("country")
  })

  it("treats undefined and null city/state identically", () => {
    expect(deriveScope({ ...baseRecord, country: "CA" })).toBe("country")
    expect(
      deriveScope({ ...baseRecord, city: undefined, state: undefined, country: "CA" }),
    ).toBe("country")
  })

  it("treats empty-string city as no-city (state-scope) — DynamoDB sometimes serialises null as empty", () => {
    expect(
      deriveScope({ ...baseRecord, city: "", state: "QC", country: "CA" }),
    ).toBe("state")
  })

  it("city wins even when state is also populated (most specific scope)", () => {
    expect(
      deriveScope({ ...baseRecord, city: "Sorel-Tracy", state: "QC", country: "CA" }),
    ).toBe("city")
  })
})
