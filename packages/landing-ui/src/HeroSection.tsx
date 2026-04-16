"use client";

import type { ReactNode } from "react";
import type { LandingImages } from "./types";

type Props = {
  images?: LandingImages;
  imageBase?: string;
  usePlaceholders?: boolean;
  navbarSlot?: ReactNode;
  formSlot?: ReactNode;
};

const DEFAULT_BASE = "/images/";

function heroSrc(images: LandingImages | undefined, base: string, key: keyof LandingImages, file: string): string {
  const override = images?.[key];
  if (typeof override === "string" && override.length > 0) return override;
  return `${base}hero/${file}`;
}

export function HeroSection({
  images,
  imageBase = DEFAULT_BASE,
  usePlaceholders = false,
  navbarSlot,
  formSlot,
}: Props) {
  // `min-h-screen` makes the live hero fill the viewport. Drop it in placeholder
  // mode (admin preview) so Benefits immediately follows — otherwise the scaled
  // hero leaves the section off-screen when the preview loads.
  const heightClass = usePlaceholders ? "" : "min-h-screen";
  return (
    <section className={`relative w-full ${heightClass}`.trim()} style={{ backgroundColor: "var(--mh-bg)" }}>
      {usePlaceholders ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--mh-surface-alt) 0%, var(--mh-card-bg) 100%)",
          }}
        />
      ) : (
        <picture>
          <source media="(max-width: 375px)" srcSet={heroSrc(images, imageBase, "heroMobilePortrait375", "mobile_portrait_375x667.jpg")} />
          <source media="(max-width: 480px)" srcSet={heroSrc(images, imageBase, "heroMobilePortrait480", "mobile_portrait_480x800.jpg")} />
          <source media="(max-width: 768px) and (orientation: portrait)" srcSet={heroSrc(images, imageBase, "heroTabletPortrait800", "tablet_portrait_800x1000.jpg")} />
          <source media="(max-width: 960px) and (orientation: landscape)" srcSet={heroSrc(images, imageBase, "heroMobileLandscape960", "mobile_landscape_960x600.jpg")} />
          <source media="(max-width: 1024px) and (orientation: portrait)" srcSet={heroSrc(images, imageBase, "heroTabletPortrait900", "tablet_portrait_900x1200.jpg")} />
          <source media="(max-width: 1024px) and (orientation: landscape)" srcSet={heroSrc(images, imageBase, "heroTabletLandscape1024", "tablet_landscape_1024x640.jpg")} />
          <source media="(max-width: 1280px)" srcSet={heroSrc(images, imageBase, "heroDesktop1280", "standard_desktop_1280x720.jpg")} />
          <source media="(max-width: 1366px)" srcSet={heroSrc(images, imageBase, "heroDesktop1366", "standard_desktop_1366x768.jpg")} />
          <source media="(max-width: 1440px)" srcSet={heroSrc(images, imageBase, "heroDesktop1440", "large_desktop_1440x810.jpg")} />
          <img
            src={heroSrc(images, imageBase, "heroDesktop1920", "large_desktop_1920x800.jpg")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
            referrerPolicy="no-referrer"
          />
        </picture>
      )}
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10">
        {navbarSlot}
        {formSlot}
      </div>
    </section>
  );
}
