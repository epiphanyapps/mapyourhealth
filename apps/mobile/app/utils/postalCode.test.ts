/**
 * Tests for postalCode utility functions
 */

import { normalizePostalCode } from "./postalCode"

describe("postalCode utilities", () => {
  describe("normalizePostalCode", () => {
    it("uppercases the postal code", () => {
      expect(normalizePostalCode("m5v3l9")).toBe("M5V3L9")
    })

    it("trims whitespace", () => {
      expect(normalizePostalCode("  12345  ")).toBe("12345")
    })

    it("removes space from Canadian postal code", () => {
      expect(normalizePostalCode("M5V 3L9")).toBe("M5V3L9")
    })

    it("removes dash from Canadian postal code", () => {
      expect(normalizePostalCode("M5V-3L9")).toBe("M5V3L9")
    })

    it("removes dash from Japanese postal code", () => {
      expect(normalizePostalCode("123-4567")).toBe("1234567")
    })

    it("removes space from Netherlands postal code", () => {
      expect(normalizePostalCode("1234 AB")).toBe("1234AB")
    })

    it("keeps US zip code unchanged", () => {
      expect(normalizePostalCode("12345")).toBe("12345")
      expect(normalizePostalCode("12345-6789")).toBe("12345-6789")
    })

    it("keeps UK postcode unchanged", () => {
      expect(normalizePostalCode("SW1A 1AA")).toBe("SW1A 1AA")
    })
  })
})
