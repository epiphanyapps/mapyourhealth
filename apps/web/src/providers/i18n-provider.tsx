"use client";

import { useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { RTL_LANGUAGES, type Language } from "@/lib/i18n/resources";
import { LandingContentLoader } from "@/components/landing-content-loader";
import { LandingThemeLoader } from "@/components/landing-theme-loader";
import { LogoProvider } from "@/context/logo-context";

const STORAGE_KEY = "i18nextLng";
const SUPPORTED: Language[] = ["en", "fr"];

function detectClientLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED as string[]).includes(stored)) {
      return stored as Language;
    }
  } catch {
    // localStorage can throw in private mode; fall through to navigator.
  }
  const nav = window.navigator.language?.slice(0, 2);
  if (nav && (SUPPORTED as string[]).includes(nav)) return nav as Language;
  return "en";
}

function LanguageDetector() {
  const { i18n: i18nInstance } = useTranslation();

  useEffect(() => {
    const target = detectClientLanguage();
    if (i18nInstance.language !== target) {
      i18nInstance.changeLanguage(target);
    }
    const persist = (lng: string) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, lng);
      } catch {
        // ignore
      }
    };
    i18nInstance.on("languageChanged", persist);
    return () => {
      i18nInstance.off("languageChanged", persist);
    };
  }, [i18nInstance]);

  return null;
}

function DirectionUpdater() {
  const { i18n: i18nInstance } = useTranslation();

  useEffect(() => {
    const lang = i18nInstance.language as Language;
    const dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [i18nInstance.language]);

  return null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageDetector />
      <DirectionUpdater />
      <LandingContentLoader />
      <LandingThemeLoader />
      <LogoProvider>{children}</LogoProvider>
    </I18nextProvider>
  );
}
