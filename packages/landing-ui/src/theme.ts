import type { LandingThemeTokens } from "./types";

export type ThemeTokenDef = {
  key: string;
  label: string;
  cssVar: string;
  default: string;
};

export const THEME_TOKENS: readonly ThemeTokenDef[] = [
  { key: "accent", label: "Primary accent", cssVar: "--mh-accent", default: "#9db835" },
  { key: "accentSoft", label: "Soft accent", cssVar: "--mh-accent-soft", default: "#c4d779" },
  { key: "accentFg", label: "On-accent text", cssVar: "--mh-accent-fg", default: "#ffffff" },
  { key: "background", label: "Page background", cssVar: "--mh-bg", default: "#000000" },
  { key: "cardBg", label: "Card background", cssVar: "--mh-card-bg", default: "#1c1c1c" },
  { key: "surfaceAlt", label: "Surface (alt)", cssVar: "--mh-surface-alt", default: "#2e2e2e" },
  { key: "text", label: "Body text", cssVar: "--mh-text", default: "#ffffff" },
  { key: "textMuted", label: "Muted text", cssVar: "--mh-text-muted", default: "#a3a3a3" },
] as const;

export function themeTokensToStyle(
  tokens: LandingThemeTokens | undefined,
): Record<string, string> {
  const style: Record<string, string> = {};
  for (const def of THEME_TOKENS) {
    const value = tokens?.[def.key];
    if (typeof value === "string" && value.length > 0) {
      style[def.cssVar] = value;
    }
  }
  return style;
}

export function applyTheme(
  tokens: LandingThemeTokens | undefined,
  root: HTMLElement,
): void {
  for (const def of THEME_TOKENS) {
    const value = tokens?.[def.key];
    if (typeof value === "string" && value.length > 0) {
      root.style.setProperty(def.cssVar, value);
    } else {
      root.style.removeProperty(def.cssVar);
    }
  }
}

export function defaultThemeTokens(): LandingThemeTokens {
  const tokens: LandingThemeTokens = {};
  for (const def of THEME_TOKENS) {
    tokens[def.key] = def.default;
  }
  return tokens;
}
