"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import {
  SUPPORTED_LOCALES,
  expandFlatContent,
} from "@mapyourhealth/backend/shared/landing-page-content";

export function LandingContentLoader() {
  const { i18n } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const client = generateClient<Schema>({ authMode: "iam" });
        await Promise.all(
          SUPPORTED_LOCALES.map(async (locale) => {
            try {
              const { data } = await client.models.LandingPageContent.get({
                locale,
              });
              if (cancelled || !data?.content) return;
              const flat = data.content as Record<string, string>;
              const expanded = expandFlatContent(flat);
              i18n.addResourceBundle(
                locale,
                "translation",
                expanded,
                true,
                true,
              );
            } catch (err) {
              console.warn(
                `[landing-content] failed to load ${locale}:`,
                err,
              );
            }
          }),
        );
        if (!cancelled) {
          // Force a re-render of t()-consumers by re-emitting the active language.
          await i18n.changeLanguage(i18n.language);
        }
      } catch (err) {
        console.warn("[landing-content] client init failed:", err);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [i18n]);

  return null;
}
