"use client";

import { useState, useSyncExternalStore } from "react";
import type { Country } from "./countries";
import { countries as DEFAULT_COUNTRIES } from "./countries";

export type SubscribeArgs = {
  email: string;
  country?: string;
  zip?: string;
  lang: string;
  callbackURL: string;
};

export type SubscribeResult = {
  success: boolean;
  message?: string;
};

type Props = {
  t: (key: string, fallback?: string) => string;
  lang: string;
  onSubscribe: (args: SubscribeArgs) => Promise<SubscribeResult>;
  appUrl: string;
  countries?: Country[];
  /** Skip real subscription side effects (used by the admin preview). */
  readOnly?: boolean;
};

const SUBSCRIBED_KEY = "newsletterSubscribed";

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// `readOnly` only gates writes — reads always happen so a real subscriber who
// returns to the landing sees the success state. Admin previews live on a
// different origin so this localStorage is isolated from real subscribers.
function getSubscribedSnapshot() {
  try {
    return localStorage.getItem(SUBSCRIBED_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function NewsletterForm({
  t,
  lang,
  onSubscribe,
  appUrl,
  countries = DEFAULT_COUNTRIES,
  readOnly = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const subscribed = useSyncExternalStore(
    subscribeToStorage,
    getSubscribedSnapshot,
    getServerSnapshot,
  );
  const [localSuccess, setSuccess] = useState(false);
  const success = subscribed || localSuccess;
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
      const result = await onSubscribe({
        email,
        country: country || undefined,
        zip: zipCode || undefined,
        lang,
        callbackURL: typeof window !== "undefined" ? window.location.host : "",
      });
      if (!result.success) {
        const msg = result.message;
        if (msg?.includes("already been subscribed")) {
          setSuccess(true);
          setSuccessMessage(t("home.successAlreadyRegistered"));
          if (!readOnly) {
            try {
              localStorage.setItem(SUBSCRIBED_KEY, "true");
            } catch {
              /* ignore */
            }
          }
        } else {
          setErrorMessage(msg || t("home.errorMessage"));
        }
      } else {
        setSuccess(true);
        setSuccessMessage(t("home.success"));
        if (!readOnly) {
          try {
            localStorage.setItem(SUBSCRIBED_KEY, "true");
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      setErrorMessage(t("home.errorMessage"));
    }
    setLoading(false);
  };

  const inputStyle = {
    backgroundColor: "var(--mh-surface-alt)",
    borderColor: "var(--mh-surface-alt)",
    color: "var(--mh-text)",
  };

  return (
    <div className="mt-4 flex flex-1 flex-col items-center xs:mt-12">
      <div className="my-14 max-w-5xl px-2">
        <h1
          className="px-8 text-center text-4xl sm:px-16 sm:text-5xl"
          style={{
            color: "var(--mh-accent-soft)",
            fontFamily: "var(--mh-font-bold)",
          }}
        >
          {t("home.title")}
        </h1>
        <p
          className="mt-2 px-8 text-center text-2xl sm:px-16 sm:text-3xl"
          style={{
            color: "var(--mh-text)",
            fontFamily: "var(--mh-font-bold)",
          }}
        >
          {t("home.subtitle")}
        </p>
        <p className="mt-4 px-8 text-center text-xl sm:px-20">
          <span
            className="text-xl"
            style={{ color: "var(--mh-text)", fontFamily: "var(--mh-font-light)" }}
          >
            {t("home.CTA1")}
          </span>
          <span
            className="text-xl"
            style={{
              color: "var(--mh-accent-soft)",
              fontFamily: "var(--mh-font-bold)",
            }}
          >
            {t("appName")}
          </span>
          <span
            className="text-xl"
            style={{ color: "var(--mh-text)", fontFamily: "var(--mh-font-light)" }}
          >
            {t("home.CTA2")}
          </span>
        </p>

        {success ? (
          <div
            data-testid="newsletter-success"
            className="mt-8 flex w-full animate-in fade-in items-center justify-center gap-4 duration-1000"
          >
            <CheckCircleIcon className="size-12" />
            <span
              className="text-3xl"
              style={{
                color: "var(--mh-text)",
                fontFamily: "var(--mh-font-regular)",
              }}
            >
              {successMessage || t("home.success")}
            </span>
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-6 rounded-md px-6 py-3 text-lg transition-colors"
              style={{
                backgroundColor: "var(--mh-accent)",
                color: "var(--mh-accent-fg)",
                fontFamily: "var(--mh-font-bold)",
              }}
            >
              {t("home.tryWebBeta")} &rarr;
            </a>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            data-testid="newsletter-form"
            className="mt-4 flex flex-col items-center justify-center gap-4 md:mt-0 md:h-48 md:flex-row"
          >
            <div className="mt-8 flex flex-col items-center justify-evenly gap-4 md:mt-0 md:flex-row">
              <div className="flex flex-col">
                <input
                  type="email"
                  autoComplete="email"
                  data-testid="newsletter-email"
                  placeholder={t("home.enterEmail")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-md border px-3 focus:outline-none"
                  style={inputStyle}
                />
                {errorMessage && (
                  <span
                    data-testid="newsletter-error"
                    className="mt-1 text-sm"
                    style={{ color: "#ef4444" }}
                  >
                    {errorMessage}
                  </span>
                )}
              </div>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                data-testid="newsletter-country"
                className="h-11 w-[200px] rounded-md border px-2 focus:outline-none"
                style={inputStyle}
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
                data-testid="newsletter-zip"
                placeholder={t("home.zipCode")}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="h-11 rounded-md border px-3 focus:outline-none"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              data-testid="newsletter-submit"
              disabled={loading}
              className="flex h-11 items-center gap-2 rounded-md px-6 text-xl transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--mh-accent)",
                color: "var(--mh-accent-fg)",
                fontFamily: "var(--mh-font-bold)",
              }}
            >
              {loading ? (
                <span
                  className="size-5 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: "var(--mh-accent-fg)", borderTopColor: "transparent" }}
                />
              ) : (
                <>
                  {t("home.signUp")}
                  <ChevronRightIcon className="size-6" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 flex flex-col items-center">
          <p
            className="mb-4 text-center text-lg"
            style={{
              color: "var(--mh-text)",
              fontFamily: "var(--mh-font-regular)",
            }}
          >
            {t("home.alreadyKnow")}
          </p>
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border-2 px-8 py-3 text-lg transition-colors"
            style={{
              borderColor: "var(--mh-accent)",
              backgroundColor: "var(--mh-accent-fg)",
              color: "var(--mh-accent)",
              fontFamily: "var(--mh-font-bold)",
            }}
          >
            {t("home.tryWebBeta")} &rarr;
          </a>
          <p
            className="mt-2 text-center text-sm"
            style={{
              color: "var(--mh-text-muted)",
              fontFamily: "var(--mh-font-light)",
            }}
          >
            {t("home.mobileComingSoon")}
          </p>
        </div>
      </div>
    </div>
  );
}
