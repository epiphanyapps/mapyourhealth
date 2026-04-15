import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

// NOTE: Detection is intentionally NOT done here. Running
// i18next-browser-languagedetector during init causes a Next.js hydration
// mismatch — the server has no access to localStorage/navigator, so it
// renders `fallbackLng` while the client picks up a different language on
// first paint. Detection happens post-mount in `LanguageDetector`.
i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en", "fr"],
  load: "languageOnly",
  interpolation: { escapeValue: false },
});

export default i18n;
