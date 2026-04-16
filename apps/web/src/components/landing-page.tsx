"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Landing } from "@mapyourhealth/landing-ui";
import { flattenContent } from "@mapyourhealth/backend/shared/landing-page-content";
import { Navbar } from "./navbar";
import { NewsletterForm } from "./newsletter-form";

export function LandingPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const content = useMemo(() => {
    const bundle = i18n.getResourceBundle(lang, "translation") as
      | Record<string, unknown>
      | undefined;
    return bundle ? flattenContent(bundle) : {};
  }, [i18n, lang]);

  return (
    <Landing
      content={content}
      navbarSlot={<Navbar />}
      formSlot={<NewsletterForm />}
    />
  );
}
