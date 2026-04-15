"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from "aws-amplify/auth";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import {
  SUPPORTED_LOCALES,
  type Locale,
  flattenContent,
  groupKeysBySection,
  isLikelyMultiline,
  parseContent,
  serializeContent,
} from "@mapyourhealth/backend/shared/landing-page-content";
import {
  THEME_TOKENS,
  defaultThemeTokens,
  type LandingThemeTokens,
} from "@mapyourhealth/landing-ui";
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
import { LogoSection } from "./logo-section";
import { LandingPreview } from "./landing-preview";

const BUNDLED: Record<Locale, Record<string, unknown>> = {
  en: enBundled as Record<string, unknown>,
  fr: frBundled as Record<string, unknown>,
};

type FieldState = Record<string, string>;
type TabKey = Locale | "theme";

function lastSegment(key: string): string {
  const parts = key.split(".");
  return parts[parts.length - 1] ?? key;
}

function computeOverrides(
  values: FieldState,
  bundled: FieldState,
): FieldState {
  const out: FieldState = {};
  for (const [key, value] of Object.entries(values)) {
    const defaultValue = bundled[key] ?? "";
    if (value.trim() !== "" && value !== defaultValue) {
      out[key] = value;
    }
  }
  return out;
}

function computeThemeOverrides(tokens: LandingThemeTokens): LandingThemeTokens {
  const out: LandingThemeTokens = {};
  for (const def of THEME_TOKENS) {
    const value = tokens[def.key];
    if (value && value !== def.default) {
      out[def.key] = value;
    }
  }
  return out;
}

function throwIfErrors(errors: readonly { message: string }[] | undefined) {
  if (errors?.length) {
    throw new Error(
      errors.map((e) => e.message).join("; ") || "AppSync returned errors",
    );
  }
}

export default function LandingPageContentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("en");
  const [themePreviewLocale, setThemePreviewLocale] = useState<Locale>("en");
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

  // Theme state
  const [themeTokens, setThemeTokens] = useState<LandingThemeTokens>(
    defaultThemeTokens(),
  );
  const [themeOverrides, setThemeOverrides] = useState<LandingThemeTokens>({});
  const [themeDirty, setThemeDirty] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  // Debounced mirrors used by the preview to avoid re-rendering on every keystroke.
  const [previewValues, setPreviewValues] = useState(values);
  const [previewTheme, setPreviewTheme] = useState(themeTokens);
  const valuesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const themeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (valuesTimer.current) clearTimeout(valuesTimer.current);
    valuesTimer.current = setTimeout(() => setPreviewValues(values), 100);
    return () => {
      if (valuesTimer.current) clearTimeout(valuesTimer.current);
    };
  }, [values]);

  useEffect(() => {
    if (themeTimer.current) clearTimeout(themeTimer.current);
    themeTimer.current = setTimeout(() => setPreviewTheme(themeTokens), 100);
    return () => {
      if (themeTimer.current) clearTimeout(themeTimer.current);
    };
  }, [themeTokens]);

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
              fetched[locale] = parseContent(data.content) as FieldState;
            }
          }),
        );
        setOverrides(fetched);
        const merged = {
          en: { ...flat.en, ...fetched.en },
          fr: { ...flat.fr, ...fetched.fr },
        };
        setValues(merged);
        setPreviewValues(merged);

        // Load theme
        try {
          const { data: themeData } = await client.models.LandingTheme.get({
            key: "default",
          });
          if (themeData?.tokens) {
            const loaded =
              typeof themeData.tokens === "string"
                ? (JSON.parse(themeData.tokens) as LandingThemeTokens)
                : (themeData.tokens as LandingThemeTokens);
            setThemeOverrides(loaded);
            const next = { ...defaultThemeTokens(), ...loaded };
            setThemeTokens(next);
            setPreviewTheme(next);
          }
        } catch (err) {
          console.warn("Failed to load theme:", err);
        }
      } catch (err) {
        console.error("Failed to load landing content:", err);
        toast.error("Failed to load landing content");
        setValues(flat);
        setPreviewValues(flat);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeLocale: Locale =
    activeTab === "theme" ? themePreviewLocale : activeTab;

  const sections = useMemo(
    () => groupKeysBySection(Object.keys(bundledFlat[activeLocale])),
    [bundledFlat, activeLocale],
  );

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
      const next = computeOverrides(values[locale], bundledFlat[locale]);
      const hasExisting = Object.keys(overrides[locale]).length > 0;
      const client = generateClient<Schema>({ authMode: "userPool" });

      if (Object.keys(next).length === 0) {
        if (hasExisting) {
          const result = await client.models.LandingPageContent.delete({
            locale,
          });
          throwIfErrors(result.errors);
        }
      } else {
        const session = await fetchAuthSession();
        const email =
          (session.tokens?.idToken?.payload?.email as string | undefined) ??
          "admin";
        const payload = {
          locale,
          content: serializeContent(next),
          updatedBy: email,
        };
        const result = hasExisting
          ? await client.models.LandingPageContent.update(payload)
          : await client.models.LandingPageContent.create(payload);
        throwIfErrors(result.errors);
      }

      setOverrides((prev) => ({ ...prev, [locale]: next }));
      setDirty((prev) => ({ ...prev, [locale]: false }));
      const count = Object.keys(next).length;
      toast.success(
        count === 0
          ? `Cleared all overrides for ${locale.toUpperCase()}`
          : `Saved ${count} override${count === 1 ? "" : "s"} for ${locale.toUpperCase()}`,
      );
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(null);
    }
  };

  const handleThemeChange = (tokenKey: string, value: string) => {
    setThemeTokens((prev) => ({ ...prev, [tokenKey]: value }));
    setThemeDirty(true);
  };

  const handleResetToken = (tokenKey: string) => {
    const def = THEME_TOKENS.find((t) => t.key === tokenKey);
    if (!def) return;
    setThemeTokens((prev) => ({ ...prev, [tokenKey]: def.default }));
    setThemeDirty(true);
  };

  const handleSaveTheme = async () => {
    try {
      setSavingTheme(true);
      const next = computeThemeOverrides(themeTokens);
      const hasExisting = Object.keys(themeOverrides).length > 0;
      const client = generateClient<Schema>({ authMode: "userPool" });

      if (Object.keys(next).length === 0) {
        if (hasExisting) {
          const result = await client.models.LandingTheme.delete({
            key: "default",
          });
          throwIfErrors(result.errors);
        }
      } else {
        const session = await fetchAuthSession();
        const email =
          (session.tokens?.idToken?.payload?.email as string | undefined) ??
          "admin";
        const payload = {
          key: "default",
          tokens: JSON.stringify(next),
          updatedBy: email,
        };
        const result = hasExisting
          ? await client.models.LandingTheme.update(payload)
          : await client.models.LandingTheme.create(payload);
        throwIfErrors(result.errors);
      }

      setThemeOverrides(next);
      setThemeDirty(false);
      const count = Object.keys(next).length;
      toast.success(
        count === 0
          ? "Cleared theme overrides"
          : `Saved ${count} theme token${count === 1 ? "" : "s"}`,
      );
    } catch (err) {
      console.error("Failed to save theme:", err);
      toast.error("Failed to save theme");
    } finally {
      setSavingTheme(false);
    }
  };

  const isOverridden = (locale: Locale, key: string) =>
    (values[locale][key] ?? "") !== (bundledFlat[locale][key] ?? "");

  const handleTabChange = (next: string) => {
    if (activeTab !== "theme" && dirty[activeTab as Locale]) {
      if (
        !window.confirm(
          "You have unsaved changes. Switch tab and lose them?",
        )
      ) {
        return;
      }
    }
    if (activeTab === "theme" && themeDirty) {
      if (
        !window.confirm(
          "You have unsaved theme changes. Switch tab and lose them?",
        )
      ) {
        return;
      }
    }
    setActiveTab(next as TabKey);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Landing Page</h1>
        <p className="text-muted-foreground">
          Edit every piece of text shown on mapyourhealth.info. Leave a field
          blank (or click Reset) to fall back to the bundled default.
        </p>
      </div>

      <LogoSection />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,760px)]">
          <div>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="fr">Français</TabsTrigger>
                <TabsTrigger value="theme">Theme</TabsTrigger>
              </TabsList>

              {SUPPORTED_LOCALES.map((locale) => (
                <TabsContent
                  key={locale}
                  value={locale}
                  className="space-y-6 mt-4"
                >
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
                                    onClick={() =>
                                      handleResetField(locale, key)
                                    }
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

              <TabsContent value="theme" className="space-y-6 mt-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    {Object.keys(themeOverrides).length} theme token
                    {Object.keys(themeOverrides).length === 1 ? "" : "s"}{" "}
                    persisted.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Preview locale:
                    </span>
                    <div
                      role="tablist"
                      aria-label="Preview locale"
                      className="inline-flex rounded-md border"
                    >
                      {SUPPORTED_LOCALES.map((locale) => (
                        <button
                          key={locale}
                          type="button"
                          role="tab"
                          aria-selected={themePreviewLocale === locale}
                          onClick={() => setThemePreviewLocale(locale)}
                          className={
                            "px-3 py-1 text-xs transition-colors " +
                            (themePreviewLocale === locale
                              ? "bg-muted font-medium"
                              : "text-muted-foreground hover:bg-muted/50")
                          }
                        >
                          {locale.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={handleSaveTheme}
                      disabled={!themeDirty || savingTheme}
                    >
                      {savingTheme ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save theme
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Colours</CardTitle>
                    <CardDescription>
                      Applies to the live landing page across every locale.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {THEME_TOKENS.map((token) => {
                      const value = themeTokens[token.key] ?? token.default;
                      const overridden = value !== token.default;
                      return (
                        <div key={token.key} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor={`theme-${token.key}`}
                              className="font-mono text-xs"
                            >
                              {token.label}
                              <span className="ml-2 text-muted-foreground">
                                {token.key}
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
                                onClick={() => handleResetToken(token.key)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id={`theme-${token.key}`}
                              type="color"
                              value={value}
                              onChange={(e) =>
                                handleThemeChange(token.key, e.target.value)
                              }
                              className="h-10 w-14 cursor-pointer rounded border"
                            />
                            <Input
                              value={value}
                              onChange={(e) =>
                                handleThemeChange(token.key, e.target.value)
                              }
                              className="font-mono"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <LandingPreview
              content={previewValues[activeLocale]}
              theme={previewTheme}
              locale={activeLocale}
            />
          </div>
        </div>
      )}
    </div>
  );
}
