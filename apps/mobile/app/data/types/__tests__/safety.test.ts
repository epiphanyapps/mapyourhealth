import {
  calculateObservationStatus,
  computeStatus,
  getObservedPropertyCategoryDisplayName,
  type ContaminantThreshold,
  type ObservedProperty,
  type PropertyThreshold,
  type LocationObservation,
} from "../safety"

describe("computeStatus", () => {
  const baseThreshold: ContaminantThreshold = {
    contaminantId: "lead",
    jurisdictionCode: "US-NY",
    limitValue: 15,
    warningRatio: 0.8,
    status: "regulated",
  }

  describe("missing threshold", () => {
    it("returns 'safe' by default when threshold is undefined", () => {
      expect(computeStatus(100, undefined, true)).toBe("safe")
    })

    it("honors whenMissing override (e.g. 'danger' to flag unregulated)", () => {
      expect(computeStatus(100, undefined, true, { whenMissing: "danger" })).toBe("danger")
    })
  })

  describe("threshold lifecycle", () => {
    it("returns 'danger' when status === 'banned' regardless of value", () => {
      expect(computeStatus(0, { ...baseThreshold, status: "banned" }, true)).toBe("danger")
      expect(computeStatus(999, { ...baseThreshold, status: "banned" }, true)).toBe("danger")
    })

    it("returns 'safe' when status === 'not_controlled'", () => {
      expect(computeStatus(100, { ...baseThreshold, status: "not_controlled" }, true)).toBe("safe")
    })

    it("returns 'safe' when limitValue is null (no limit to compare against)", () => {
      expect(computeStatus(100, { ...baseThreshold, limitValue: null }, true)).toBe("safe")
    })
  })

  describe("higherIsBad: true (most contaminants — higher is worse)", () => {
    it("returns 'danger' at or above the limit", () => {
      expect(computeStatus(15, baseThreshold, true)).toBe("danger")
      expect(computeStatus(20, baseThreshold, true)).toBe("danger")
    })

    it("returns 'warning' at or above limit × warningRatio", () => {
      // limit=15, warningRatio=0.8 → warning at 12
      expect(computeStatus(12, baseThreshold, true)).toBe("warning")
      expect(computeStatus(13, baseThreshold, true)).toBe("warning")
    })

    it("returns 'safe' below the warning threshold", () => {
      expect(computeStatus(11, baseThreshold, true)).toBe("safe")
      expect(computeStatus(0, baseThreshold, true)).toBe("safe")
    })

    it("'limit=0 must be absent' rule — value=0 reads as safe, not danger", () => {
      // Lead/asbestos/PFAS: regulatory limit is "any detected presence" → 0.
      // value=0 means "none detected" — should be safe, not the degenerate
      // `0 >= 0 → danger` reading.
      expect(computeStatus(0, { ...baseThreshold, limitValue: 0 }, true)).toBe("safe")
      // But any positive presence at limit=0 is danger.
      expect(computeStatus(0.01, { ...baseThreshold, limitValue: 0 }, true)).toBe("danger")
    })
  })

  describe("higherIsBad: false (lower is worse — dissolved oxygen, pH proxies)", () => {
    // Warning zone for `!higherIsBad` sits *above* the danger limit, not
    // below: warningThreshold = limit / warningRatio. With limit=15 and
    // warningRatio=0.8, that's `15 / 0.8 = 18.75`, so:
    //   value > 18.75 → safe
    //   15 <  value ≤ 18.75 → warning (close to dangerous)
    //   value ≤ 15 → danger

    it("returns 'danger' at or below the limit", () => {
      expect(computeStatus(15, baseThreshold, false)).toBe("danger")
      expect(computeStatus(10, baseThreshold, false)).toBe("danger")
    })

    it("returns 'warning' between the limit and limit ÷ warningRatio", () => {
      expect(computeStatus(16, baseThreshold, false)).toBe("warning")
      expect(computeStatus(18, baseThreshold, false)).toBe("warning")
      expect(computeStatus(18.75, baseThreshold, false)).toBe("warning")
    })

    it("returns 'safe' above the warning threshold", () => {
      expect(computeStatus(19, baseThreshold, false)).toBe("safe")
      expect(computeStatus(20, baseThreshold, false)).toBe("safe")
    })

    it("falls back to limit-only comparison when warningRatio is 0", () => {
      // Defensive: warningRatio=0 would divide by zero. Treat as no
      // warning zone — every value is either safe (above limit) or
      // danger (at/below limit), no warning.
      const zeroRatio = { ...baseThreshold, warningRatio: 0 }
      expect(computeStatus(15, zeroRatio, false)).toBe("danger")
      expect(computeStatus(16, zeroRatio, false)).toBe("safe")
    })
  })
})

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
