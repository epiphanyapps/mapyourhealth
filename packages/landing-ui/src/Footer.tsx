"use client";

import type { LandingContent, LandingImages } from "./types";
import { createT } from "./t";

type Props = {
  content?: LandingContent;
  images?: LandingImages;
  imageBase?: string;
  usePlaceholders?: boolean;
};

export function Footer({ content, images, imageBase = "/images/", usePlaceholders = false }: Props) {
  const t = createT(content);
  const desktop = images?.footerDesktop ?? `${imageBase}hero/large_desktop_1920x800.jpg`;
  const tablet = images?.footerTablet ?? `${imageBase}hero/tablet_portrait_800x1000.jpg`;

  return (
    <footer className="relative h-44 overflow-hidden" style={{ backgroundColor: "var(--mh-bg)" }}>
      {usePlaceholders ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, var(--mh-card-bg) 0%, var(--mh-bg) 100%)",
          }}
        />
      ) : (
        <picture>
          <source media="(max-width: 768px)" srcSet={tablet} />
          <img
            src={desktop}
            alt=""
            className="absolute inset-0 h-[880px] w-full object-cover object-bottom"
          />
        </picture>
      )}
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative flex h-full items-center justify-center">
        <p style={{ color: "var(--mh-accent-soft)", fontFamily: "var(--mh-font-regular)" }}>
          {"\u00a9 "}
          {new Date().getFullYear()}
          {" - "}
          {t("appName")}
        </p>
      </div>
    </footer>
  );
}
