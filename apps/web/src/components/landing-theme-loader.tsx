"use client";

import { useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { applyTheme } from "@mapyourhealth/landing-ui";
import type { LandingThemeTokens } from "@mapyourhealth/landing-ui";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";

export const LANDING_THEME_STORAGE_KEY = "mh-landing-theme";

export function LandingThemeLoader() {
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const client = generateClient<Schema>({ authMode: "iam" });
        const { data } = await client.models.LandingTheme.get({ key: "default" });
        if (cancelled) return;

        if (!data?.tokens) {
          // No remote override — clear any stale cache so next visit matches.
          try {
            window.localStorage.removeItem(LANDING_THEME_STORAGE_KEY);
          } catch {
            // ignore — storage can throw in private mode
          }
          applyTheme(undefined, document.documentElement);
          return;
        }

        const tokens =
          typeof data.tokens === "string"
            ? (JSON.parse(data.tokens) as LandingThemeTokens)
            : (data.tokens as LandingThemeTokens);
        applyTheme(tokens, document.documentElement);
        try {
          window.localStorage.setItem(
            LANDING_THEME_STORAGE_KEY,
            JSON.stringify(tokens),
          );
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn("[landing-theme] failed to load:", err);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
