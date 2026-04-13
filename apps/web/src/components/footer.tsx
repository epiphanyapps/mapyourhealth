"use client";

import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative h-44 overflow-hidden">
      <picture>
        <source
          media="(max-width: 768px)"
          srcSet="/images/hero/tablet_portrait_800x1000.jpg"
        />
        <img
          src="/images/hero/large_desktop_1920x800.jpg"
          alt=""
          className="absolute inset-0 h-[880px] w-full object-cover object-bottom"
        />
      </picture>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative flex h-full items-center justify-center">
        <p className="font-[family-name:var(--font-netflix-regular)] text-primary-500">
          &copy; {new Date().getFullYear()} - {t("appName")}
        </p>
      </div>
    </footer>
  );
}
