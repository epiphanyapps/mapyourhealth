"use client";

import {
  Landing,
  Navbar,
  LanguageSelector,
  NewsletterForm,
  COUNTRIES,
} from "@mapyourhealth/landing-ui";
import type {
  LandingContent,
  LandingThemeTokens,
  NavbarLogo,
} from "@mapyourhealth/landing-ui";

type Props = {
  content: LandingContent;
  theme: LandingThemeTokens;
  locale: string;
};

const LANGUAGES = [
  { code: "en", label: "En" },
  { code: "fr", label: "Fr" },
];

const PREVIEW_APP_URL = "https://app.mapyourhealth.info";
// Icons + footer imagery live with the landing app, not the admin domain.
// Point at the production landing so the preview doesn't need its own copy.
const PREVIEW_IMAGE_BASE = "https://www.mapyourhealth.info/images/";

export function LandingPreview({ content, theme, locale }: Props) {
  const t = (key: string, fallback?: string) => content[key] ?? fallback ?? key;
  const logo: NavbarLogo = {
    kind: "text",
    text: content["appName"] ?? "MapYourHealth",
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
      <div style={{ width: "1520px", zoom: 0.5 }}>
        <Landing
          content={content}
          theme={theme}
          imageBase={PREVIEW_IMAGE_BASE}
          usePlaceholders
          navbarSlot={
            <Navbar
              logo={logo}
              right={
                <LanguageSelector
                  languages={LANGUAGES}
                  current={locale}
                  onChange={() => {
                    /* preview only — locale is driven by the admin form */
                  }}
                />
              }
            />
          }
          formSlot={
            <NewsletterForm
              t={t}
              lang={locale}
              appUrl={PREVIEW_APP_URL}
              countries={COUNTRIES}
              readOnly
              onSubscribe={async () => ({
                success: true,
                message: t("home.success", "Preview only — no email was sent."),
              })}
            />
          }
        />
      </div>
    </div>
  );
}
