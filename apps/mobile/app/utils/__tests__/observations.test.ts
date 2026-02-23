import { getCategoryIcon, getStatusColorKey, formatObservationDate } from "../observations"

describe("observations utilities", () => {
  describe("getCategoryIcon", () => {
    it("returns correct icon for water_quality", () => {
      expect(getCategoryIcon("water_quality")).toBe("water")
    })

    it("returns correct icon for air_quality", () => {
      expect(getCategoryIcon("air_quality")).toBe("air-filter")
    })

    it("returns correct icon for disease", () => {
      expect(getCategoryIcon("disease")).toBe("virus")
    })

    it("returns correct icon for radiation", () => {
      expect(getCategoryIcon("radiation")).toBe("radioactive")
    })

    it("returns correct icon for soil", () => {
      expect(getCategoryIcon("soil")).toBe("leaf")
    })

    it("returns correct icon for noise", () => {
      expect(getCategoryIcon("noise")).toBe("volume-high")
    })

    it("returns correct icon for climate", () => {
      expect(getCategoryIcon("climate")).toBe("weather-cloudy")
    })

    it("returns correct icon for infrastructure", () => {
      expect(getCategoryIcon("infrastructure")).toBe("home-city")
    })

    it("returns alert-circle for unknown category", () => {
      expect(getCategoryIcon("unknown_category")).toBe("alert-circle")
    })

    it("returns alert-circle for empty string", () => {
      expect(getCategoryIcon("")).toBe("alert-circle")
    })
  })

  describe("getStatusColorKey", () => {
    it("returns statusDanger for danger status", () => {
      expect(getStatusColorKey("danger")).toBe("statusDanger")
    })

    it("returns statusWarning for warning status", () => {
      expect(getStatusColorKey("warning")).toBe("statusWarning")
    })

    it("returns statusSafe for safe status", () => {
      expect(getStatusColorKey("safe")).toBe("statusSafe")
    })
  })

  describe("formatObservationDate", () => {
    it("formats a valid ISO date string", () => {
      const result = formatObservationDate("2024-03-15T10:30:00.000Z")
      // The exact format depends on the locale, but it should contain these elements
      expect(result).toMatch(/Mar|March/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })

    it("returns the original string for invalid date", () => {
      const invalidDate = "not-a-date"
      expect(formatObservationDate(invalidDate)).toBe(invalidDate)
    })

    it("handles date-only strings", () => {
      // Use a date in the middle of the month to avoid timezone issues
      const result = formatObservationDate("2024-01-15")
      expect(result).toMatch(/Jan|January/)
      expect(result).toMatch(/2024/)
    })
  })
})
