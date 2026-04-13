"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { generateClient } from "aws-amplify/api";
import { CheckCircle, ChevronRight } from "lucide-react";
import { countries } from "@/lib/countries";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";

export function NewsletterForm() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("newsletterSubscribed") === "true";
    }
    return false;
  });
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage(t("home.invalidEmail"));
      setLoading(false);
      return;
    }

    if (!country) {
      setErrorMessage(t("home.selectCountry"));
      setLoading(false);
      return;
    }

    if (!zipCode) {
      setErrorMessage(t("home.enterZipCode"));
      setLoading(false);
      return;
    }

    try {
      const client = generateClient<Schema>();
      const result = await client.mutations.signUpNewsletter({
        email,
        country: country || undefined,
        zip: zipCode || undefined,
        lang: i18n.language,
        callbackURL: window.location.host,
      });

      if (!result.data?.success) {
        const msg = result.data?.message;
        if (msg?.includes("already been subscribed")) {
          setSuccess(true);
          setSuccessMessage(t("home.successAlreadyRegistered"));
          localStorage.setItem("newsletterSubscribed", "true");
        } else {
          setErrorMessage(msg || t("home.errorMessage"));
        }
      } else {
        setSuccess(true);
        setSuccessMessage(t("home.success"));
        localStorage.setItem("newsletterSubscribed", "true");
      }
    } catch {
      setErrorMessage(t("home.errorMessage"));
    }
    setLoading(false);
  };

  return (
    <div className="mt-4 flex flex-1 flex-col items-center xs:mt-12">
      <div className="my-14 max-w-5xl px-2">
        <h1 className="px-8 text-center font-[family-name:var(--font-netflix-bold)] text-4xl text-primary-500 sm:px-16 sm:text-5xl">
          {t("home.title")}
        </h1>
        <p className="mt-4 px-8 text-center text-xl sm:px-20">
          <span className="font-[family-name:var(--font-netflix-light)] text-xl text-white">
            {t("home.CTA1")}
          </span>
          <span className="font-[family-name:var(--font-netflix-bold)] text-xl text-primary-500">
            {t("appName")}
          </span>
          <span className="font-[family-name:var(--font-netflix-light)] text-xl text-white">
            {t("home.CTA2")}
          </span>
        </p>

        {success ? (
          <div className="mt-8 flex w-full animate-in fade-in items-center justify-center gap-4 duration-1000">
            <CheckCircle className="size-12 text-primary-550" />
            <span className="font-[family-name:var(--font-netflix-regular)] text-3xl text-white">
              {successMessage || t("home.success")}
            </span>
            <a
              href="https://app.mapyourhealth.info"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-6 rounded-md bg-primary-550 px-6 py-3 font-[family-name:var(--font-netflix-bold)] text-lg text-white transition-colors hover:bg-primary-550/90"
            >
              {t("home.tryWebBeta")} &rarr;
            </a>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-4 flex flex-col items-center justify-center gap-4 md:mt-0 md:h-48 md:flex-row"
          >
            <div className="mt-8 flex flex-col items-center justify-evenly gap-4 md:mt-0 md:flex-row">
              <div className="flex flex-col">
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={t("home.enterEmail")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-md border border-neutral-700 bg-neutral-800 px-3 text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-primary-550 focus:outline-none"
                />
                {errorMessage && (
                  <span className="mt-1 text-sm text-red-400">
                    {errorMessage}
                  </span>
                )}
              </div>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-11 w-[200px] rounded-md border border-neutral-700 bg-neutral-800 px-2 text-white focus:ring-2 focus:ring-primary-550 focus:outline-none"
              >
                <option value="">{t("home.selectCountry")}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t("home.zipCode")}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="h-11 rounded-md border border-neutral-700 bg-neutral-800 px-3 text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-primary-550 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 items-center gap-2 rounded-md bg-primary-550 px-6 font-[family-name:var(--font-netflix-bold)] text-xl text-white transition-colors hover:bg-primary-550/90 disabled:opacity-50"
            >
              {loading ? (
                <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {t("home.signUp")}
                  <ChevronRight className="size-6" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 flex flex-col items-center">
          <p className="mb-4 text-center font-[family-name:var(--font-netflix-regular)] text-lg text-white">
            {t("home.alreadyKnow")}
          </p>
          <a
            href="https://app.mapyourhealth.info"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border-2 border-primary-550 bg-white px-8 py-3 font-[family-name:var(--font-netflix-bold)] text-lg text-primary-550 transition-colors hover:bg-neutral-100"
          >
            {t("home.tryWebBeta")} &rarr;
          </a>
          <p className="mt-2 text-center font-[family-name:var(--font-netflix-light)] text-sm text-neutral-400">
            {t("home.mobileComingSoon")}
          </p>
        </div>
      </div>
    </div>
  );
}
