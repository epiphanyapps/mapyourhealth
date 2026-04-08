import { record } from "aws-amplify/analytics"

/**
 * Track a custom analytics event via Pinpoint.
 * Events are automatically batched and sent.
 */
export function trackEvent(name: string, attributes?: Record<string, string>) {
  try {
    record({ name, ...(attributes ? { attributes } : {}) })
  } catch {
    // Silently fail if analytics isn't configured
  }
}
