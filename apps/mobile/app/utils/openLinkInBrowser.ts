import { Linking } from "react-native"

/**
 * Helper for opening a give URL in an external browser.
 */
export function openLinkInBrowser(url: string) {
  const link = url.replace("https://api.rss2json.com/v1/", "https://app.mapyourhealth.info/")
  Linking.canOpenURL(link).then((canOpen) => canOpen && Linking.openURL(link))
}
