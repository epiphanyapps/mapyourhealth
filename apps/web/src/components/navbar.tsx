"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useLogoVariant } from "@/context/logo-context";
import { LanguageSelector } from "./language-selector";

export function Navbar() {
  const { t } = useTranslation();
  const variant = useLogoVariant();
  const fallbackText = t("appName");

  return (
    <header className="relative z-10">
      <nav className="flex w-full items-center justify-between px-4 py-4 md:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-netflix-bold)] text-2xl sm:text-3xl inline-flex items-center"
          style={
            variant.mode === "text"
              ? { color: variant.textColor ?? undefined }
              : undefined
          }
        >
          {variant.mode === "image" && variant.imageUrl ? (
            <img
              src={variant.imageUrl}
              alt={variant.imageAlt ?? fallbackText}
              className="h-8 sm:h-10 w-auto"
            />
          ) : (
            <span className={variant.textColor ? undefined : "text-primary-500"}>
              {variant.text?.trim() || fallbackText}
            </span>
          )}
        </Link>
        <LanguageSelector />
      </nav>
    </header>
  );
}
