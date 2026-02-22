import {
  calculateObservationStatus,
  LocationObservation,
  ObservedProperty,
  PropertyThreshold,
} from "./safety"

// Helper to create a minimal observation
const createObservation = (overrides: Partial<LocationObservation> = {}): LocationObservation => ({
  city: "Montreal",
  state: "QC",
  country: "CA",
  propertyId: "test_property",
  observedAt: "2024-01-01T00:00:00Z",
  ...overrides,
})

// Helper to create a minimal property
const createProperty = (overrides: Partial<ObservedProperty> = {}): ObservedProperty => ({
  id: "test_property",
  name: "Test Property",
  category: "water_quality",
  observationType: "numeric",
  higherIsBad: true,
  ...overrides,
})

// Helper to create a minimal threshold
const createThreshold = (overrides: Partial<PropertyThreshold> = {}): PropertyThreshold => ({
  propertyId: "test_property",
  jurisdictionCode: "CA-QC",
  status: "active",
  ...overrides,
})

describe("calculateObservationStatus", () => {
  describe("numeric observations", () => {
    const numericProperty = createProperty({
      observationType: "numeric",
      higherIsBad: true,
    })

    test("returns danger when value exceeds limit (higherIsBad=true)", () => {
      const observation = createObservation({ numericValue: 100 })
      const threshold = createThreshold({ limitValue: 50, warningValue: 30 })

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("danger")
    })

    test("returns warning when value exceeds warning but below limit", () => {
      const observation = createObservation({ numericValue: 40 })
      const threshold = createThreshold({ limitValue: 50, warningValue: 30 })

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("warning")
    })

    test("returns safe when value is below warning threshold", () => {
      const observation = createObservation({ numericValue: 20 })
      const threshold = createThreshold({ limitValue: 50, warningValue: 30 })

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("safe")
    })

    test("returns safe when value equals limit exactly", () => {
      const observation = createObservation({ numericValue: 50 })
      const threshold = createThreshold({ limitValue: 50, warningValue: 30 })

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("danger")
    })

    test("handles higherIsBad=false correctly (danger when below limit)", () => {
      const lowIsBadProperty = createProperty({
        observationType: "numeric",
        higherIsBad: false,
      })
      const observation = createObservation({ numericValue: 5 })
      const threshold = createThreshold({ limitValue: 10, warningValue: 20 })

      expect(calculateObservationStatus(observation, lowIsBadProperty, threshold)).toBe("danger")
    })

    test("returns safe when no numeric value provided", () => {
      const observation = createObservation({ numericValue: undefined })
      const threshold = createThreshold({ limitValue: 50, warningValue: 30 })

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("safe")
    })

    test("returns safe when no limit value in threshold", () => {
      const observation = createObservation({ numericValue: 100 })
      const threshold = createThreshold({ limitValue: undefined })

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("safe")
    })
  })

  describe("zone observations", () => {
    const zoneProperty = createProperty({
      observationType: "zone",
    })

    test("returns mapped status from zoneMapping", () => {
      const observation = createObservation({ zoneValue: "Unhealthy" })
      const threshold = createThreshold({
        zoneMapping: {
          Good: "safe",
          Moderate: "warning",
          Unhealthy: "danger",
        },
      })

      expect(calculateObservationStatus(observation, zoneProperty, threshold)).toBe("danger")
    })

    test("returns safe for unmapped zone value", () => {
      const observation = createObservation({ zoneValue: "Unknown" })
      const threshold = createThreshold({
        zoneMapping: {
          Good: "safe",
          Moderate: "warning",
        },
      })

      expect(calculateObservationStatus(observation, zoneProperty, threshold)).toBe("safe")
    })

    test("returns safe when no zone value provided", () => {
      const observation = createObservation({ zoneValue: undefined })
      const threshold = createThreshold({
        zoneMapping: { Good: "safe" },
      })

      expect(calculateObservationStatus(observation, zoneProperty, threshold)).toBe("safe")
    })

    test("returns safe when no zone mapping in threshold", () => {
      const observation = createObservation({ zoneValue: "Unhealthy" })
      const threshold = createThreshold({ zoneMapping: undefined })

      expect(calculateObservationStatus(observation, zoneProperty, threshold)).toBe("safe")
    })
  })

  describe("endemic observations", () => {
    const endemicProperty = createProperty({
      observationType: "endemic",
    })

    test("returns danger when endemic and endemicIsDanger=true", () => {
      const observation = createObservation({ endemicValue: true })
      const threshold = createThreshold({ endemicIsDanger: true })

      expect(calculateObservationStatus(observation, endemicProperty, threshold)).toBe("danger")
    })

    test("returns warning when endemic and endemicIsDanger=false", () => {
      const observation = createObservation({ endemicValue: true })
      const threshold = createThreshold({ endemicIsDanger: false })

      expect(calculateObservationStatus(observation, endemicProperty, threshold)).toBe("warning")
    })

    test("returns safe when not endemic", () => {
      const observation = createObservation({ endemicValue: false })
      const threshold = createThreshold({ endemicIsDanger: true })

      expect(calculateObservationStatus(observation, endemicProperty, threshold)).toBe("safe")
    })
  })

  describe("incidence observations", () => {
    const incidenceProperty = createProperty({
      observationType: "incidence",
    })

    test("returns danger when incidence exceeds danger threshold", () => {
      const observation = createObservation({ incidenceValue: 100 })
      const threshold = createThreshold({
        incidenceWarningThreshold: 20,
        incidenceDangerThreshold: 50,
      })

      expect(calculateObservationStatus(observation, incidenceProperty, threshold)).toBe("danger")
    })

    test("returns warning when incidence exceeds warning but below danger", () => {
      const observation = createObservation({ incidenceValue: 30 })
      const threshold = createThreshold({
        incidenceWarningThreshold: 20,
        incidenceDangerThreshold: 50,
      })

      expect(calculateObservationStatus(observation, incidenceProperty, threshold)).toBe("warning")
    })

    test("returns safe when incidence below warning threshold", () => {
      const observation = createObservation({ incidenceValue: 10 })
      const threshold = createThreshold({
        incidenceWarningThreshold: 20,
        incidenceDangerThreshold: 50,
      })

      expect(calculateObservationStatus(observation, incidenceProperty, threshold)).toBe("safe")
    })

    test("returns safe when no incidence value provided", () => {
      const observation = createObservation({ incidenceValue: undefined })
      const threshold = createThreshold({
        incidenceDangerThreshold: 50,
      })

      expect(calculateObservationStatus(observation, incidenceProperty, threshold)).toBe("safe")
    })
  })

  describe("binary observations", () => {
    const binaryProperty = createProperty({
      observationType: "binary",
      higherIsBad: true,
    })

    test("returns danger when binary is true and higherIsBad=true", () => {
      const observation = createObservation({ binaryValue: true })
      const threshold = createThreshold()

      expect(calculateObservationStatus(observation, binaryProperty, threshold)).toBe("danger")
    })

    test("returns safe when binary is false", () => {
      const observation = createObservation({ binaryValue: false })
      const threshold = createThreshold()

      expect(calculateObservationStatus(observation, binaryProperty, threshold)).toBe("safe")
    })

    test("returns safe when binary is true and higherIsBad=false", () => {
      const goodProperty = createProperty({
        observationType: "binary",
        higherIsBad: false,
      })
      const observation = createObservation({ binaryValue: true })
      const threshold = createThreshold()

      expect(calculateObservationStatus(observation, goodProperty, threshold)).toBe("safe")
    })
  })

  describe("edge cases", () => {
    const property = createProperty()

    test("returns safe when no threshold provided", () => {
      const observation = createObservation({ numericValue: 100 })

      expect(calculateObservationStatus(observation, property, undefined)).toBe("safe")
    })

    test("returns safe when threshold status is not_applicable", () => {
      const observation = createObservation({ numericValue: 100 })
      const threshold = createThreshold({
        status: "not_applicable",
        limitValue: 50,
      })

      expect(calculateObservationStatus(observation, property, threshold)).toBe("safe")
    })

    test("handles unknown observation type gracefully", () => {
      const unknownProperty = createProperty({
        observationType: "unknown" as ObservedProperty["observationType"],
      })
      const observation = createObservation()
      const threshold = createThreshold()

      expect(calculateObservationStatus(observation, unknownProperty, threshold)).toBe("safe")
    })
  })
})
