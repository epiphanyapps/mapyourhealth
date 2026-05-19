/**
 * Shared formatters for pollution-source presentation.
 *
 * Kept separate from `theme/pollutionColors.ts` so colour/severity logic stays
 * decoupled from text rendering — both the Dashboard card and the detail
 * screen import from here.
 */

export function formatRadius(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

export function formatSourceType(type: string | null | undefined): string {
  if (!type) return "Unknown"
  const [first, ...rest] = type.split("_")
  if (!first) return "Unknown"
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ")
}
