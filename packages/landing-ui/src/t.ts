import type { LandingContent } from "./types";

export function createT(content: LandingContent | undefined) {
  return (key: string, fallback?: string): string => {
    const value = content?.[key];
    if (typeof value === "string" && value.length > 0) return value;
    return fallback ?? key;
  };
}
