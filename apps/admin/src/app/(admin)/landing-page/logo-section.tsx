"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from "aws-amplify/auth";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import {
  DEFAULT_LANDING_LOGO,
  type LandingLogoConfig,
  type LogoVariant,
  parseLandingLogo,
  serializeLandingLogo,
} from "@mapyourhealth/backend/shared/landing-logo";
import {
  SUPPORTED_LOCALES,
  type Locale,
} from "@mapyourhealth/backend/shared/landing-page-content";
import {
  DEFAULT_TENANT_ID,
  landingLogoConfigKey,
} from "@mapyourhealth/backend/shared/tenant";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { LogoEditor } from "./logo-editor";

export function LogoSection() {
  const tenantId = DEFAULT_TENANT_ID;
  const configKey = landingLogoConfigKey(tenantId);
  const [config, setConfig] = useState<LandingLogoConfig>(DEFAULT_LANDING_LOGO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const client = generateClient<Schema>({ authMode: "userPool" });
        const { data } = await client.models.AppConfig.listAppConfigByConfigKey({
          configKey,
        });
        const row = data?.[0];
        if (row) {
          setRecordId(row.id);
          setConfig(parseLandingLogo(row.value));
        }
      } catch (err) {
        console.error("Failed to load logo config:", err);
        toast.error("Failed to load logo config");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [configKey]);

  const updateGlobal = (next: LogoVariant | null) => {
    if (next === null) return; // Global can't be cleared.
    setConfig((prev) => ({ ...prev, global: next }));
    setDirty(true);
  };

  const updateLocale = (locale: Locale, next: LogoVariant | null) => {
    setConfig((prev) => {
      const locales = { ...(prev.locales ?? {}) };
      if (next === null) delete locales[locale];
      else locales[locale] = next;
      return { ...prev, locales: Object.keys(locales).length ? locales : undefined };
    });
    setDirty(true);
  };

  const save = async () => {
    try {
      setSaving(true);
      const session = await fetchAuthSession();
      const email =
        (session.tokens?.idToken?.payload?.email as string | undefined) ??
        "admin";
      const client = generateClient<Schema>({ authMode: "userPool" });
      const value = serializeLandingLogo(config);
      if (recordId) {
        const { errors } = await client.models.AppConfig.update({
          id: recordId,
          configKey,
          value,
          updatedBy: email,
        });
        throwIfErrors(errors);
      } else {
        const { data, errors } = await client.models.AppConfig.create({
          configKey,
          value,
          updatedBy: email,
          description: "Landing page logo config (per tenant)",
        });
        throwIfErrors(errors);
        if (data?.id) setRecordId(data.id);
      }
      setDirty(false);
      toast.success("Logo saved");
    } catch (err) {
      console.error("Failed to save logo:", err);
      toast.error("Failed to save logo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Shown top-left on the landing page. Pick Text or Image per slot.
            The global logo is used unless a locale override is set.
          </CardDescription>
        </div>
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Logo
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <LogoEditor
          heading="Global"
          tenantId={tenantId}
          value={config.global}
          onChange={updateGlobal}
        />
        {SUPPORTED_LOCALES.map((locale) => (
          <LogoEditor
            key={locale}
            heading={`${locale.toUpperCase()} override`}
            tenantId={tenantId}
            value={config.locales?.[locale] ?? null}
            clearable
            onChange={(next) => updateLocale(locale, next)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function throwIfErrors(errors: readonly { message: string }[] | undefined) {
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}
