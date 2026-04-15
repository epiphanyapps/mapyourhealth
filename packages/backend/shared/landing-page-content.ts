export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function flattenContent(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[path] = value;
    } else if (typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenContent(value as Record<string, unknown>, path));
    }
  }
  return out;
}

export function expandFlatContent(
  flat: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let cursor = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      const existing = cursor[segment];
      if (typeof existing !== "object" || existing === null || Array.isArray(existing)) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]] = value;
  }
  return out;
}

/**
 * Section + key order shown in the admin CMS. Mirrors the top-to-bottom
 * reading order of the live landing page so editors find fields where
 * they see them. Any key not listed here falls into an "Other" section
 * sorted alphabetically.
 */
export const LANDING_SECTIONS: { section: string; keys: string[] }[] = [
  { section: "Branding", keys: ["appName"] },
  {
    section: "Hero",
    keys: [
      "home.title",
      "home.subtitle",
      "home.CTA1",
      "home.CTA2",
      "home.description",
    ],
  },
  {
    section: "Newsletter form",
    keys: [
      "home.enterEmail",
      "home.selectCountry",
      "home.zipCode",
      "home.enterZipCode",
      "home.signUp",
      "home.invalidEmail",
      "home.errorMessage",
      "home.success",
      "home.successAlreadyRegistered",
    ],
  },
  {
    section: "Below form",
    keys: ["home.alreadyKnow", "home.tryWebBeta", "home.mobileComingSoon"],
  },
  {
    section: "Benefits",
    keys: [
      "home.benefitsTitle",
      "home.benefits.title1",
      "home.benefits.content1",
      "home.benefits.title2",
      "home.benefits.content2",
      "home.benefits.title3",
      "home.benefits.content3",
      "home.benefits.title4",
      "home.benefits.content4",
    ],
  },
  {
    section: "FAQ",
    keys: [
      "home.faqTitle",
      "home.faq.question1",
      "home.faq.answer1",
      "home.faq.question2",
      "home.faq.answer2",
      "home.faq.question3",
      "home.faq.answer3",
      "home.faq.question4",
      "home.faq.answer4",
      "home.faq.question5",
      "home.faq.answer5",
      "home.faq.question6",
      "home.faq.answer6",
    ],
  },
  {
    section: "Confirm page",
    keys: [
      "confirm.loading",
      "confirm.success",
      "confirm.invalidCode",
      "confirm.error",
    ],
  },
];

/**
 * Given the full set of keys discovered in the bundled translations,
 * return grouped sections in the order above. Unknown keys land in
 * "Other" (alphabetical) so newly-added i18n keys never disappear from
 * the CMS — they just surface at the bottom until someone slots them
 * into LANDING_SECTIONS.
 */
export function groupKeysBySection(
  availableKeys: Iterable<string>,
): { section: string; keys: string[] }[] {
  const available = new Set(availableKeys);
  const known = new Set(LANDING_SECTIONS.flatMap((s) => s.keys));
  const grouped = LANDING_SECTIONS.map(({ section, keys }) => ({
    section,
    keys: keys.filter((k) => available.has(k)),
  })).filter((s) => s.keys.length > 0);
  const leftover = [...available].filter((k) => !known.has(k)).sort();
  if (leftover.length) grouped.push({ section: "Other", keys: leftover });
  return grouped;
}

export function isLikelyMultiline(value: string): boolean {
  return value.includes("\n") || value.length > 80;
}

/**
 * The `content` field is stored as AppSync AWSJSON (a JSON string). The
 * Amplify data client doesn't auto-serialize this on write or auto-parse
 * it on read, so both sides must go through these helpers.
 */
export function serializeContent(flat: Record<string, string>): string {
  return JSON.stringify(flat);
}

export function parseContent(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  return {};
}
