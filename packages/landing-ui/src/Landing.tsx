"use client";

import type { ReactNode } from "react";
import type { LandingContent, LandingImages, LandingThemeTokens } from "./types";
import { HeroSection } from "./HeroSection";
import { BenefitsSection } from "./BenefitsSection";
import { FaqSection } from "./FaqSection";
import { Footer } from "./Footer";
import { themeTokensToStyle } from "./theme";

export type LandingProps = {
  content?: LandingContent;
  theme?: LandingThemeTokens;
  images?: LandingImages;
  imageBase?: string;
  usePlaceholders?: boolean;
  navbarSlot?: ReactNode;
  formSlot?: ReactNode;
  className?: string;
};

export function Landing({
  content,
  theme,
  images,
  imageBase,
  usePlaceholders,
  navbarSlot,
  formSlot,
  className,
}: LandingProps) {
  const style = themeTokensToStyle(theme);
  return (
    <div
      className={className}
      style={{
        ...(style as React.CSSProperties),
        backgroundColor: "var(--mh-bg)",
        color: "var(--mh-text)",
      }}
    >
      <HeroSection
        images={images}
        imageBase={imageBase}
        usePlaceholders={usePlaceholders}
        navbarSlot={navbarSlot}
        formSlot={formSlot}
      />
      <div className="mx-6 mb-12 md:mx-12">
        <BenefitsSection
          content={content}
          images={images}
          imageBase={imageBase}
        />
        <div className="h-12 md:h-24" />
        <FaqSection content={content} />
      </div>
      <Footer
        content={content}
        images={images}
        imageBase={imageBase}
        usePlaceholders={usePlaceholders}
      />
    </div>
  );
}
