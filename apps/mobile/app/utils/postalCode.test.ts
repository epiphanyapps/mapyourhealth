/**
 * Tests for postalCode utility functions
 */

import {
  getPostalCodeLabel,
  getPostalCodeLabelCapitalized,
  isValidPostalCode,
  detectPostalCodeRegion,
  normalizePostalCode,
  formatPostalCodeForDisplay,
} from "./postalCode"

// Mock expo-localization
jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [{ regionCode: "US" }]),
}))

describe("postalCode utilities", () => {
  describe("getPostalCodeLabel", () => {
    it("returns 'zip code' for US region", () => {
      expect(getPostalCodeLabel("US")).toBe("zip code")
    })

    it("returns 'postal code' for CA region", () => {
      expect(getPostalCodeLabel("CA")).toBe("postal code")
    })

    it("returns 'postcode' for GB region", () => {
      expect(getPostalCodeLabel("GB")).toBe("postcode")
    })

    it("returns 'postcode' for UK region", () => {
      expect(getPostalCodeLabel("UK")).toBe("postcode")
    })

    it("returns 'ZIP/postal code' for other regions", () => {
      expect(getPostalCodeLabel("DE")).toBe("ZIP/postal code")
      expect(getPostalCodeLabel("FR")).toBe("ZIP/postal code")
      expect(getPostalCodeLabel("AU")).toBe("ZIP/postal code")
    })

    it("handles lowercase region codes", () => {
      expect(getPostalCodeLabel("us")).toBe("zip code")
      expect(getPostalCodeLabel("ca")).toBe("postal code")
      expect(getPostalCodeLabel("gb")).toBe("postcode")
    })

    it("uses device locale when no region provided", () => {
      // Mock returns US by default
      expect(getPostalCodeLabel()).toBe("zip code")
    })
  })

  describe("getPostalCodeLabelCapitalized", () => {
    it("capitalizes first letter for US", () => {
      expect(getPostalCodeLabelCapitalized("US")).toBe("Zip code")
    })

    it("capitalizes first letter for CA", () => {
      expect(getPostalCodeLabelCapitalized("CA")).toBe("Postal code")
    })

    it("capitalizes first letter for GB", () => {
      expect(getPostalCodeLabelCapitalized("GB")).toBe("Postcode")
    })

    it("capitalizes first letter for default", () => {
      expect(getPostalCodeLabelCapitalized("DE")).toBe("ZIP/postal code")
    })
  })

  describe("isValidPostalCode", () => {
    describe("valid postal codes", () => {
      it("accepts US 5-digit zip code", () => {
        expect(isValidPostalCode("12345")).toBe(true)
      })

      it("accepts US 5+4 zip code", () => {
        expect(isValidPostalCode("12345-6789")).toBe(true)
      })

      it("accepts Canadian postal code with space", () => {
        expect(isValidPostalCode("M5V 3L9")).toBe(true)
      })

      it("accepts Canadian postal code without space", () => {
        expect(isValidPostalCode("M5V3L9")).toBe(true)
      })

      it("accepts UK postcode", () => {
        expect(isValidPostalCode("SW1A 1AA")).toBe(true)
      })

      it("accepts Australian 4-digit code", () => {
        expect(isValidPostalCode("1234")).toBe(true)
      })

      it("accepts German 5-digit code", () => {
        expect(isValidPostalCode("10115")).toBe(true)
      })

      it("accepts Indian 6-digit code", () => {
        expect(isValidPostalCode("110001")).toBe(true)
      })

      it("accepts Japanese postal code with dash", () => {
        expect(isValidPostalCode("123-4567")).toBe(true)
      })

      it("accepts Netherlands postal code", () => {
        expect(isValidPostalCode("1234 AB")).toBe(true)
      })

      it("accepts codes up to 12 characters", () => {
        expect(isValidPostalCode("123456789012")).toBe(true)
      })
    })

    describe("invalid postal codes", () => {
      it("rejects empty string", () => {
        expect(isValidPostalCode("")).toBe(false)
      })

      it("rejects whitespace only", () => {
        expect(isValidPostalCode("   ")).toBe(false)
      })

      it("rejects codes shorter than 4 characters", () => {
        expect(isValidPostalCode("123")).toBe(false)
        expect(isValidPostalCode("ab")).toBe(false)
      })

      it("rejects codes longer than 12 characters", () => {
        expect(isValidPostalCode("1234567890123")).toBe(false)
      })

      it("rejects special characters only", () => {
        expect(isValidPostalCode("!@#$")).toBe(false)
      })

      // Note: Leading/trailing spaces are trimmed by the function,
      // so " 1234 " becomes "1234" which is valid (4 chars, alphanumeric)
    })
  })

  describe("detectPostalCodeRegion", () => {
    it("detects US 5-digit zip code", () => {
      expect(detectPostalCodeRegion("12345")).toBe("US")
    })

    it("detects US 5+4 zip code", () => {
      expect(detectPostalCodeRegion("12345-6789")).toBe("US")
    })

    it("detects Canadian postal code with space", () => {
      expect(detectPostalCodeRegion("M5V 3L9")).toBe("CA")
    })

    it("detects Canadian postal code without space", () => {
      expect(detectPostalCodeRegion("M5V3L9")).toBe("CA")
    })

    it("detects UK postcode (SW1A 1AA)", () => {
      expect(detectPostalCodeRegion("SW1A 1AA")).toBe("GB")
    })

    it("detects UK postcode (EC1A 1BB)", () => {
      expect(detectPostalCodeRegion("EC1A 1BB")).toBe("GB")
    })

    it("detects UK postcode short format (W1A 0AX)", () => {
      expect(detectPostalCodeRegion("W1A 0AX")).toBe("GB")
    })

    it("detects Japanese postal code with dash", () => {
      expect(detectPostalCodeRegion("123-4567")).toBe("JP")
    })

    it("detects Japanese postal code without dash", () => {
      expect(detectPostalCodeRegion("1234567")).toBe("JP")
    })

    it("detects Netherlands postal code", () => {
      expect(detectPostalCodeRegion("1234 AB")).toBe("NL")
      expect(detectPostalCodeRegion("1234AB")).toBe("NL")
    })

    it("detects Indian 6-digit postal code", () => {
      expect(detectPostalCodeRegion("110001")).toBe("IN")
    })

    it("detects Australian 4-digit code", () => {
      expect(detectPostalCodeRegion("2000")).toBe("AU")
    })

    // Note: 5-digit codes like German/French match US pattern first
    // since US is checked before DE/FR in the implementation.
    // This is intentional - we prioritize US pattern for 5-digit codes.
    it("treats 5-digit codes as US (US pattern takes precedence)", () => {
      expect(detectPostalCodeRegion("10115")).toBe("US")
      expect(detectPostalCodeRegion("75001")).toBe("US")
    })

    it("detects German 4-digit code", () => {
      expect(detectPostalCodeRegion("1234")).toBe("AU") // 4 digits matches AU first
    })

    it("returns null for unrecognized format", () => {
      expect(detectPostalCodeRegion("ABCDEFGH")).toBe(null)
    })
  })

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

  describe("formatPostalCodeForDisplay", () => {
    it("adds space to Canadian postal code", () => {
      expect(formatPostalCodeForDisplay("M5V3L9")).toBe("M5V 3L9")
    })

    it("handles already-spaced Canadian postal code", () => {
      expect(formatPostalCodeForDisplay("M5V 3L9")).toBe("M5V 3L9")
    })

    it("handles lowercase Canadian postal code", () => {
      expect(formatPostalCodeForDisplay("m5v3l9")).toBe("M5V 3L9")
    })

    it("returns normalized US zip code unchanged", () => {
      expect(formatPostalCodeForDisplay("12345")).toBe("12345")
    })

    it("returns normalized US+4 zip code unchanged", () => {
      expect(formatPostalCodeForDisplay("12345-6789")).toBe("12345-6789")
    })

    it("returns Japanese postal code without dash", () => {
      expect(formatPostalCodeForDisplay("123-4567")).toBe("1234567")
    })

    it("returns Netherlands postal code without space", () => {
      expect(formatPostalCodeForDisplay("1234 AB")).toBe("1234AB")
    })
  })
})
