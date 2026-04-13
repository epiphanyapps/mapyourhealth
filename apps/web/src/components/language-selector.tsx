"use client";

import { useTranslation } from "react-i18next";
import type { Language } from "@/lib/i18n/resources";

const languages: { code: Language; label: string }[] = [
  { code: "en", label: "En" },
  { code: "fr", label: "Fr" },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as Language;

  return (
    <div className="z-50 flex gap-1 rounded-full bg-primary-500 p-1 shadow-lg">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`aspect-square rounded-full p-1 transition-all ${
            currentLang === code
              ? "bg-neutral-200 shadow-sm"
              : "opacity-50 hover:opacity-75"
          }`}
        >
          <span
            className={`font-[family-name:var(--font-netflix-regular)] text-lg ${
              currentLang === code ? "text-primary-550" : "text-white"
            }`}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
