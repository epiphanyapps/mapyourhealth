"use client";

import { useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { RTL_LANGUAGES, type Language } from "@/lib/i18n/resources";
import { LandingContentLoader } from "@/components/landing-content-loader";

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
      <DirectionUpdater />
      <LandingContentLoader />
      {children}
    </I18nextProvider>
  );
}
