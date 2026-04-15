"use client";

import { useEffect, useMemo, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from "aws-amplify/auth";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import {
  SUPPORTED_LOCALES,
  type Locale,
  flattenContent,
  sectionForKey,
  isLikelyMultiline,
} from "@mapyourhealth/backend/shared/landing-page-content";
import enBundled from "../../../../../web/src/translations/en.json";
import frBundled from "../../../../../web/src/translations/fr.json";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

const BUNDLED: Record<Locale, Record<string, unknown>> = {
  en: enBundled as Record<string, unknown>,
  fr: frBundled as Record<string, unknown>,
};

type FieldState = Record<string, string>;

function lastSegment(key: string): string {
  const parts = key.split(".");
  return parts[parts.length - 1] ?? key;
}

function parseContent(raw: unknown): FieldState {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as FieldState)
        : {};
    } catch {
      return {};
    }
  }
  return raw as FieldState;
}

export default function LandingPageContentPage() {
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const [bundledFlat, setBundledFlat] = useState<Record<Locale, FieldState>>({
    en: {},
    fr: {},
  });
  const [overrides, setOverrides] = useState<Record<Locale, FieldState>>({
    en: {},
    fr: {},
  });
  const [values, setValues] = useState<Record<Locale, FieldState>>({
    en: {},
    fr: {},
  });
  const [dirty, setDirty] = useState<Record<Locale, boolean>>({
    en: false,
    fr: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Locale | null>(null);

  useEffect(() => {
    const flat: Record<Locale, FieldState> = {
      en: flattenContent(BUNDLED.en),
      fr: flattenContent(BUNDLED.fr),
    };
    setBundledFlat(flat);

    const load = async () => {
      try {
        const client = generateClient<Schema>({ authMode: "userPool" });
        const fetched: Record<Locale, FieldState> = { en: {}, fr: {} };
        await Promise.all(
          SUPPORTED_LOCALES.map(async (locale) => {
            const { data } = await client.models.LandingPageContent.get({
              locale,
            });
            if (data?.content) {
              fetched[locale] = parseContent(data.content);
            }
          }),
        );
        setOverrides(fetched);
        setValues({
          en: { ...flat.en, ...fetched.en },
          fr: { ...flat.fr, ...fetched.fr },
        });
      } catch (err) {
        console.error("Failed to load landing content:", err);
        toast.error("Failed to load landing content");
        setValues(flat);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sections = useMemo(() => {
    const keys = Object.keys(bundledFlat[activeLocale]).sort();
    const grouped: Record<string, string[]> = {};
    for (const key of keys) {
      const section = sectionForKey(key);
      grouped[section] = grouped[section] ?? [];
      grouped[section].push(key);
    }
    const order = [
      "Branding",
      "Hero",
      "Newsletter form",
      "Benefits",
      "FAQ",
      "Confirm page",
      "Other",
    ];
    return order
      .filter((s) => grouped[s]?.length)
      .map((s) => ({ section: s, keys: grouped[s] }));
  }, [bundledFlat, activeLocale]);

  const handleChange = (locale: Locale, key: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [key]: value },
    }));
    setDirty((prev) => ({ ...prev, [locale]: true }));
  };

  const handleResetField = (locale: Locale, key: string) => {
    const def = bundledFlat[locale][key] ?? "";
    setValues((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [key]: def },
    }));
    setDirty((prev) => ({ ...prev, [locale]: true }));
  };

  const handleSave = async (locale: Locale) => {
    try {
      setSaving(locale);
      const next: FieldState = {};
      for (const [key, value] of Object.entries(values[locale])) {
        const bundled = bundledFlat[locale][key] ?? "";
        // Only persist values that differ from the bundled default.
        if (value.trim() !== "" && value !== bundled) {
          next[key] = value;
        }
      }

      const session = await fetchAuthSession();
      const email =
        (session.tokens?.idToken?.payload?.email as string | undefined) ??
        "admin";

      const client = generateClient<Schema>({ authMode: "userPool" });
      const existing = overrides[locale];
      const hasExisting = Object.keys(existing).length > 0;

      const payload = {
        locale,
        content: JSON.stringify(next),
        updatedBy: email,
      };
      const result = hasExisting
        ? await client.models.LandingPageContent.update(payload)
        : await client.models.LandingPageContent.create(payload);
      if (result.errors?.length) {
        throw new Error(
          result.errors.map((e) => e.message).join("; ") ||
            "AppSync returned errors",
        );
      }

      setOverrides((prev) => ({ ...prev, [locale]: next }));
      setDirty((prev) => ({ ...prev, [locale]: false }));
      toast.success(
        `Saved ${Object.keys(next).length} override${
          Object.keys(next).length === 1 ? "" : "s"
        } for ${locale.toUpperCase()}`,
      );
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(null);
    }
  };

  const isOverridden = (locale: Locale, key: string) =>
    (values[locale][key] ?? "") !== (bundledFlat[locale][key] ?? "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Landing Page</h1>
        <p className="text-muted-foreground">
          Edit every piece of text shown on mapyourhealth.info. Leave a field
          blank (or click Reset) to fall back to the bundled default.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs
          value={activeLocale}
          onValueChange={(v) => {
            if (dirty[activeLocale]) {
              if (
                !window.confirm(
                  "You have unsaved changes. Switch locale and lose them?",
                )
              ) {
                return;
              }
            }
            setActiveLocale(v as Locale);
          }}
        >
          <TabsList>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="fr">Français</TabsTrigger>
          </TabsList>

          {SUPPORTED_LOCALES.map((locale) => (
            <TabsContent key={locale} value={locale} className="space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {Object.keys(overrides[locale]).length} override
                  {Object.keys(overrides[locale]).length === 1 ? "" : "s"}{" "}
                  persisted.
                </p>
                <Button
                  onClick={() => handleSave(locale)}
                  disabled={!dirty[locale] || saving === locale}
                >
                  {saving === locale ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save {locale.toUpperCase()}
                </Button>
              </div>

              {sections.map(({ section, keys }) => (
                <Card key={section}>
                  <CardHeader>
                    <CardTitle>{section}</CardTitle>
                    <CardDescription>
                      {keys.length} field{keys.length === 1 ? "" : "s"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {keys.map((key) => {
                      const value = values[locale][key] ?? "";
                      const multiline =
                        isLikelyMultiline(
                          bundledFlat[locale][key] ?? "",
                        ) || isLikelyMultiline(value);
                      const overridden = isOverridden(locale, key);
                      return (
                        <div key={key} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor={`${locale}-${key}`}
                              className="font-mono text-xs"
                            >
                              {lastSegment(key)}
                              <span className="ml-2 text-muted-foreground">
                                {key}
                              </span>
                              {overridden && (
                                <span className="ml-2 text-amber-600">
                                  • edited
                                </span>
                              )}
                            </Label>
                            {overridden && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetField(locale, key)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset
                              </Button>
                            )}
                          </div>
                          {multiline ? (
                            <Textarea
                              id={`${locale}-${key}`}
                              value={value}
                              onChange={(e) =>
                                handleChange(locale, key, e.target.value)
                              }
                              rows={Math.min(
                                8,
                                Math.max(2, value.split("\n").length),
                              )}
                            />
                          ) : (
                            <Input
                              id={`${locale}-${key}`}
                              value={value}
                              onChange={(e) =>
                                handleChange(locale, key, e.target.value)
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
