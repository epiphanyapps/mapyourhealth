"use client";

import { useTranslation } from "react-i18next";
import {
  Navbar as BaseNavbar,
  LanguageSelector,
} from "@mapyourhealth/landing-ui";
import type { NavbarLogo } from "@mapyourhealth/landing-ui";
import { useLogoVariant } from "@/context/logo-context";

const LANGUAGES = [
  { code: "en", label: "En" },
  { code: "fr", label: "Fr" },
];

export function Navbar() {
  const { t, i18n } = useTranslation();
  const variant = useLogoVariant();
  const fallbackText = t("appName");
  const current = (i18n.resolvedLanguage ?? i18n.language) ?? "en";

  const logo: NavbarLogo =
    variant.mode === "image" && variant.imageUrl
      ? { kind: "image", src: variant.imageUrl, alt: variant.imageAlt ?? fallbackText }
      : {
          kind: "text",
          text: variant.text?.trim() || fallbackText,
          color: variant.textColor ?? undefined,
        };

  return (
    <BaseNavbar
      logo={logo}
      right={
        <LanguageSelector
          languages={LANGUAGES}
          current={current}
          onChange={(code) => i18n.changeLanguage(code)}
        />
      }
    />
  );
}
