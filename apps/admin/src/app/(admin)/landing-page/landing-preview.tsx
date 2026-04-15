"use client";

import { Landing } from "@mapyourhealth/landing-ui";
import type { LandingContent, LandingThemeTokens } from "@mapyourhealth/landing-ui";

type Props = {
  content: LandingContent;
  theme: LandingThemeTokens;
};

function FormPlaceholder({ content }: { content: LandingContent }) {
  const t = (k: string, fb: string) => content[k] ?? fb;
  return (
    <div className="mx-auto max-w-5xl px-8 py-16 text-center" style={{ color: "var(--mh-text)" }}>
      <h1 className="text-4xl sm:text-5xl" style={{ color: "var(--mh-accent-soft)", fontFamily: "var(--mh-font-bold)" }}>
        {t("home.title", "Title")}
      </h1>
      <p className="mt-2 text-2xl sm:text-3xl" style={{ color: "var(--mh-text)", fontFamily: "var(--mh-font-bold)" }}>
        {t("home.subtitle", "Subtitle")}
      </p>
      <p className="mt-4 text-xl" style={{ color: "var(--mh-text)" }}>
        {t("home.CTA1", "CTA1")} <span style={{ color: "var(--mh-accent-soft)" }}>{t("appName", "App")}</span> {t("home.CTA2", "CTA2")}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <div
          className="h-11 w-64 rounded-md border px-3 text-sm leading-[44px]"
          style={{ backgroundColor: "var(--mh-surface-alt)", borderColor: "var(--mh-surface-alt)", color: "var(--mh-text-muted)" }}
        >
          {t("home.enterEmail", "Email")}
        </div>
        <button
          type="button"
          className="h-11 rounded-md px-6 text-xl"
          style={{ backgroundColor: "var(--mh-accent)", color: "var(--mh-accent-fg)", fontFamily: "var(--mh-font-bold)" }}
        >
          {t("home.signUp", "Sign up")}
        </button>
      </div>
      <p className="mt-6 text-sm" style={{ color: "var(--mh-text-muted)" }}>
        {t("home.mobileComingSoon", "")}
      </p>
    </div>
  );
}

function NavbarPlaceholder({ content }: { content: LandingContent }) {
  const appName = content["appName"] ?? "MapYourHealth";
  return (
    <div
      className="flex items-center justify-between px-6 py-4"
      style={{ color: "var(--mh-text)" }}
    >
      <span style={{ fontFamily: "var(--mh-font-bold)" }}>{appName}</span>
      <div className="flex gap-2 text-sm" style={{ color: "var(--mh-text-muted)" }}>
        <span>EN</span>
        <span>|</span>
        <span>FR</span>
      </div>
    </div>
  );
}

export function LandingPreview({ content, theme }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
      <div className="border-b bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        Preview · placeholders for hero imagery
      </div>
      <div
        className="relative overflow-auto"
        style={{ maxHeight: "calc(100vh - 12rem)" }}
      >
        <div style={{ width: "1280px", transform: "scale(0.5)", transformOrigin: "top left" }}>
          <Landing
            content={content}
            theme={theme}
            usePlaceholders
            navbarSlot={<NavbarPlaceholder content={content} />}
            formSlot={<FormPlaceholder content={content} />}
          />
        </div>
        <div aria-hidden style={{ height: "calc(100vh * 0.5)" }} />
      </div>
    </div>
  );
}
