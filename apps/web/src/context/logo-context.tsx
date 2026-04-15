"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import {
  DEFAULT_LANDING_LOGO,
  type LandingLogoConfig,
  type LogoVariant,
  parseLandingLogo,
  resolveLogoVariant,
} from "@mapyourhealth/backend/shared/landing-logo";
import {
  DEFAULT_TENANT_ID,
  landingLogoConfigKey,
  resolveTenantId,
} from "@mapyourhealth/backend/shared/tenant";

const LogoConfigContext = createContext<LandingLogoConfig>(DEFAULT_LANDING_LOGO);

export function LogoProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<LandingLogoConfig>(DEFAULT_LANDING_LOGO);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const tenantId =
          resolveTenantId({
            hostname:
              typeof window === "undefined" ? undefined : window.location.hostname,
          }) ?? DEFAULT_TENANT_ID;
        const client = generateClient<Schema>({ authMode: "iam" });
        const { data } = await client.models.AppConfig.listAppConfigByConfigKey(
          { configKey: landingLogoConfigKey(tenantId) },
        );
        if (cancelled || !data?.[0]?.value) return;
        setConfig(parseLandingLogo(data[0].value));
      } catch (err) {
        console.warn("[logo] failed to load config:", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LogoConfigContext.Provider value={config}>
      {children}
    </LogoConfigContext.Provider>
  );
}

/** Returns the resolved logo variant for the active locale. */
export function useLogoVariant(): LogoVariant {
  const config = useContext(LogoConfigContext);
  const { i18n } = useTranslation();
  return resolveLogoVariant(config, i18n.language);
}
