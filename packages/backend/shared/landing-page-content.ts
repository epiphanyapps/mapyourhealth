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

export const LANDING_SECTION_ORDER: { section: string; prefix: string }[] = [
  { section: "Hero", prefix: "home.title" },
  { section: "Hero", prefix: "home.subtitle" },
  { section: "Hero", prefix: "home.description" },
  { section: "Hero", prefix: "home.CTA" },
  { section: "Hero", prefix: "home.alreadyKnow" },
  { section: "Hero", prefix: "home.tryWebBeta" },
  { section: "Hero", prefix: "home.mobileComingSoon" },
  { section: "Hero", prefix: "home.signUp" },
  { section: "Newsletter form", prefix: "home.enterEmail" },
  { section: "Newsletter form", prefix: "home.enterZipCode" },
  { section: "Newsletter form", prefix: "home.zipCode" },
  { section: "Newsletter form", prefix: "home.selectCountry" },
  { section: "Newsletter form", prefix: "home.invalidEmail" },
  { section: "Newsletter form", prefix: "home.errorMessage" },
  { section: "Newsletter form", prefix: "home.success" },
  { section: "Newsletter form", prefix: "home.successAlreadyRegistered" },
  { section: "Benefits", prefix: "home.benefits" },
  { section: "Benefits", prefix: "home.benefitsTitle" },
  { section: "FAQ", prefix: "home.faq" },
  { section: "FAQ", prefix: "home.faqTitle" },
  { section: "Confirm page", prefix: "confirm." },
  { section: "Branding", prefix: "appName" },
];

export function sectionForKey(key: string): string {
  for (const { section, prefix } of LANDING_SECTION_ORDER) {
    if (key === prefix || key.startsWith(`${prefix}.`) || key.startsWith(prefix)) {
      return section;
    }
  }
  return "Other";
}

export function isLikelyMultiline(value: string): boolean {
  return value.includes("\n") || value.length > 80;
}
