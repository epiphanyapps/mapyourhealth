import { Platform, Share } from "react-native"

export type ShareOutcome = "shared" | "copied" | "cancelled" | "error"

export interface SharePayload {
  message: string
  title?: string
  url?: string
}

export interface ShareResult {
  outcome: ShareOutcome
  error?: unknown
}

interface WebShareNavigator {
  share?: (data: { text?: string; title?: string; url?: string }) => Promise<void>
  clipboard?: { writeText?: (text: string) => Promise<void> }
}

function getWebNavigator(): WebShareNavigator | undefined {
  return typeof navigator !== "undefined" ? (navigator as unknown as WebShareNavigator) : undefined
}

/**
 * Share text on whatever surface the current platform supports.
 *
 * - Native (iOS/Android): React Native's Share.share().
 * - Web with Web Share API: navigator.share() (shows the OS share sheet on
 *   browsers that support it — mobile Safari, Chrome on Android, etc.).
 * - Web without Web Share API (desktop browsers in the common case): copies
 *   the message to the clipboard via navigator.clipboard.writeText().
 *
 * RN's Share.share() has no web implementation and silently rejects on
 * Expo Web, which is what caused Rayane's "sharing function is not working
 * on my PC" report (GH #355). This util gives every surface a working path.
 */
export async function sharePayload(payload: SharePayload): Promise<ShareResult> {
  if (Platform.OS !== "web") {
    try {
      const result = await Share.share({ message: payload.message, title: payload.title })
      return { outcome: result.action === "dismissedAction" ? "cancelled" : "shared" }
    } catch (error) {
      return { outcome: "error", error }
    }
  }

  const nav = getWebNavigator()

  if (nav?.share) {
    try {
      await nav.share({ text: payload.message, title: payload.title, url: payload.url })
      return { outcome: "shared" }
    } catch (error) {
      // AbortError is the user dismissing the share sheet — treat as cancel.
      if (error instanceof Error && error.name === "AbortError") {
        return { outcome: "cancelled" }
      }
      // Permission denied / other errors → fall through to clipboard.
    }
  }

  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(payload.message)
      return { outcome: "copied" }
    } catch (error) {
      return { outcome: "error", error }
    }
  }

  return { outcome: "error", error: new Error("No share surface available") }
}
