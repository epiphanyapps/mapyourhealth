import {
  calculateObservationStatus,
  getObservedPropertyCategoryDisplayName,
  type ObservedProperty,
  type PropertyThreshold,
  type LocationObservation,
} from "../safety"

describe("calculateObservationStatus", () => {
  describe("numeric observation type", () => {
    const numericProperty: ObservedProperty = {
      id: "lead",
      name: "Lead",
      category: "water_quality",
      observationType: "numeric",
      unit: "ppb",
      higherIsBad: true,
    }

    const threshold: PropertyThreshold = {
      propertyId: "lead",
      jurisdictionCode: "US-EPA",
      limitValue: 15,
      warningValue: 10,
      status: "active",
    }

    it("returns danger when value exceeds limit (higherIsBad)", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "TX",
        country: "US",
        propertyId: "lead",
        numericValue: 20,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("danger")
    })

    it("returns warning when value exceeds warning but not limit", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "TX",
        country: "US",
        propertyId: "lead",
        numericValue: 12,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("warning")
    })

    it("returns safe when value is below warning", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "TX",
        country: "US",
        propertyId: "lead",
        numericValue: 5,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("safe")
    })

    it("returns safe when numericValue is null", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "TX",
        country: "US",
        propertyId: "lead",
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, numericProperty, threshold)).toBe("safe")
    })
  })

  describe("zone observation type", () => {
    const zoneProperty: ObservedProperty = {
      id: "radon",
      name: "Radon Zone",
      category: "radiation",
      observationType: "zone",
      higherIsBad: true,
    }

    const threshold: PropertyThreshold = {
      propertyId: "radon",
      jurisdictionCode: "US",
      zoneMapping: {
        "1": "danger",
        "2": "warning",
        "3": "safe",
      },
      status: "active",
    }

    it("returns danger for zone 1", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "PA",
        country: "US",
        propertyId: "radon",
        zoneValue: "1",
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, zoneProperty, threshold)).toBe("danger")
    })

    it("returns warning for zone 2", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "PA",
        country: "US",
        propertyId: "radon",
        zoneValue: "2",
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, zoneProperty, threshold)).toBe("warning")
    })

    it("returns safe for zone 3", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "FL",
        country: "US",
        propertyId: "radon",
        zoneValue: "3",
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, zoneProperty, threshold)).toBe("safe")
    })

    it("returns safe for unknown zone", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "XX",
        country: "US",
        propertyId: "radon",
        zoneValue: "unknown",
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, zoneProperty, threshold)).toBe("safe")
    })
  })

  describe("endemic observation type", () => {
    const endemicProperty: ObservedProperty = {
      id: "lyme",
      name: "Lyme Disease",
      category: "disease",
      observationType: "endemic",
      higherIsBad: true,
    }

    const dangerThreshold: PropertyThreshold = {
      propertyId: "lyme",
      jurisdictionCode: "CA-QC",
      endemicIsDanger: true,
      status: "active",
    }

    const warningThreshold: PropertyThreshold = {
      propertyId: "lyme",
      jurisdictionCode: "CA-ON",
      endemicIsDanger: false,
      status: "active",
    }

    it("returns danger when endemic and endemicIsDanger is true", () => {
      const observation: LocationObservation = {
        city: "Montreal",
        state: "QC",
        country: "CA",
        propertyId: "lyme",
        endemicValue: true,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, endemicProperty, dangerThreshold)).toBe(
        "danger",
      )
    })

    it("returns warning when endemic and endemicIsDanger is false", () => {
      const observation: LocationObservation = {
        city: "Toronto",
        state: "ON",
        country: "CA",
        propertyId: "lyme",
        endemicValue: true,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, endemicProperty, warningThreshold)).toBe(
        "warning",
      )
    })

    it("returns safe when not endemic", () => {
      const observation: LocationObservation = {
        city: "Calgary",
        state: "AB",
        country: "CA",
        propertyId: "lyme",
        endemicValue: false,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, endemicProperty, dangerThreshold)).toBe("safe")
    })
  })

  describe("incidence observation type", () => {
    const incidenceProperty: ObservedProperty = {
      id: "lyme_incidence",
      name: "Lyme Disease Incidence",
      category: "disease",
      observationType: "incidence",
      unit: "per 100,000",
      higherIsBad: true,
    }

    const threshold: PropertyThreshold = {
      propertyId: "lyme_incidence",
      jurisdictionCode: "US",
      incidenceDangerThreshold: 50,
      incidenceWarningThreshold: 10,
      status: "active",
    }

    it("returns danger when incidence exceeds danger threshold", () => {
      const observation: LocationObservation = {
        city: "Lyme",
        state: "CT",
        country: "US",
        propertyId: "lyme_incidence",
        incidenceValue: 75,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, incidenceProperty, threshold)).toBe("danger")
    })

    it("returns warning when incidence between warning and danger", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "NY",
        country: "US",
        propertyId: "lyme_incidence",
        incidenceValue: 25,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, incidenceProperty, threshold)).toBe("warning")
    })

    it("returns safe when incidence below warning threshold", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "TX",
        country: "US",
        propertyId: "lyme_incidence",
        incidenceValue: 5,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, incidenceProperty, threshold)).toBe("safe")
    })
  })

  describe("edge cases", () => {
    const property: ObservedProperty = {
      id: "test",
      name: "Test",
      category: "water_quality",
      observationType: "numeric",
      higherIsBad: true,
    }

    it("returns safe when threshold is undefined", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "TX",
        country: "US",
        propertyId: "test",
        numericValue: 100,
        observedAt: "2024-01-01",
      }

      expect(calculateObservationStatus(observation, property, undefined)).toBe("safe")
    })

    it("returns safe when threshold status is not_applicable", () => {
      const observation: LocationObservation = {
        city: "TestCity",
        state: "TX",
        country: "US",
        propertyId: "test",
        numericValue: 100,
        observedAt: "2024-01-01",
      }

      const notApplicableThreshold: PropertyThreshold = {
        propertyId: "test",
        jurisdictionCode: "XX",
        status: "not_applicable",
      }

      expect(calculateObservationStatus(observation, property, notApplicableThreshold)).toBe("safe")
    })
  })
})

describe("getObservedPropertyCategoryDisplayName", () => {
  it("returns correct display name for water_quality", () => {
    expect(getObservedPropertyCategoryDisplayName("water_quality")).toBe("Water Quality")
  })

  it("returns correct display name for disease", () => {
    expect(getObservedPropertyCategoryDisplayName("disease")).toBe("Disease & Health")
  })

  it("returns correct display name for radiation", () => {
    expect(getObservedPropertyCategoryDisplayName("radiation")).toBe("Radiation")
  })
})
