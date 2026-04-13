import en from "@/translations/en.json";
import fr from "@/translations/fr.json";
import ar from "@/translations/ar.json";

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
} as const;

export type Language = keyof typeof resources;

export const RTL_LANGUAGES: Language[] = ["ar"];
