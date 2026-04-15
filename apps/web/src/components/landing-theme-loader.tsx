"use client";

import { useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { applyTheme } from "@mapyourhealth/landing-ui";
import type { LandingThemeTokens } from "@mapyourhealth/landing-ui";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";

export function LandingThemeLoader() {
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const client = generateClient<Schema>({ authMode: "iam" });
        const { data } = await client.models.LandingTheme.get({ key: "default" });
        if (cancelled || !data?.tokens) return;
        const tokens =
          typeof data.tokens === "string"
            ? (JSON.parse(data.tokens) as LandingThemeTokens)
            : (data.tokens as LandingThemeTokens);
        applyTheme(tokens, document.documentElement);
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
