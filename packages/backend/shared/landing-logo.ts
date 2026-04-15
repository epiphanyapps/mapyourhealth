import type { Locale } from "./landing-page-content";

export type LogoMode = "text" | "image";

export interface LogoVariant {
  mode: LogoMode;
  /** Used when mode === "text". Falls back to bundled `appName` if empty. */
  text?: string;
  /** Hex or css color for the text logo. */
  textColor?: string;
  /** S3 URL (public read) for the image. */
  imageUrl?: string;
  /** Alt text for the image. */
  imageAlt?: string;
}

export interface LandingLogoConfig {
  /** Applied when no locale-specific override is set. */
  global: LogoVariant;
  /** Optional per-locale overrides. */
  locales?: Partial<Record<Locale, LogoVariant>>;
}

export const DEFAULT_LANDING_LOGO: LandingLogoConfig = {
  global: { mode: "text" },
};

export function serializeLandingLogo(config: LandingLogoConfig): string {
  return JSON.stringify(config);
}

export function parseLandingLogo(raw: unknown): LandingLogoConfig {
  if (!raw) return DEFAULT_LANDING_LOGO;
  const source: unknown = typeof raw === "string" ? safeParse(raw) : raw;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return DEFAULT_LANDING_LOGO;
  }
  const obj = source as Record<string, unknown>;
  return {
    global: coerceVariant(obj.global) ?? DEFAULT_LANDING_LOGO.global,
    locales: coerceLocales(obj.locales),
  };
}

/** Resolve which variant to render for a given locale, with fallback chain. */
export function resolveLogoVariant(
  config: LandingLogoConfig,
  locale: string,
): LogoVariant {
  return config.locales?.[locale as Locale] ?? config.global;
}

// --- helpers -------------------------------------------------------------

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function coerceVariant(raw: unknown): LogoVariant | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const v = raw as Record<string, unknown>;
  const mode: LogoMode = v.mode === "image" ? "image" : "text";
  return {
    mode,
    text: typeof v.text === "string" ? v.text : undefined,
    textColor: typeof v.textColor === "string" ? v.textColor : undefined,
    imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : undefined,
    imageAlt: typeof v.imageAlt === "string" ? v.imageAlt : undefined,
  };
}

function coerceLocales(
  raw: unknown,
): Partial<Record<Locale, LogoVariant>> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Partial<Record<Locale, LogoVariant>> = {};
  for (const [key, value] of Object.entries(raw)) {
    const variant = coerceVariant(value);
    if (variant) out[key as Locale] = variant;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Client-side validation limits. */
export const LOGO_IMAGE_CONSTRAINTS = {
  maxBytes: 500 * 1024,
  maxDimension: 1024,
  allowedMimeTypes: ["image/png"] as const,
};
