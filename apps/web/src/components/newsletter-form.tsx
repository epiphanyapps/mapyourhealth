"use client";

import { useTranslation } from "react-i18next";
import { generateClient } from "aws-amplify/api";
import {
  NewsletterForm as BaseNewsletterForm,
  COUNTRIES,
} from "@mapyourhealth/landing-ui";
import type { SubscribeArgs, SubscribeResult } from "@mapyourhealth/landing-ui";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";

const APP_URL = "https://app.mapyourhealth.info";

export function NewsletterForm() {
  const { t, i18n } = useTranslation();

  const onSubscribe = async (args: SubscribeArgs): Promise<SubscribeResult> => {
    const client = generateClient<Schema>();
    const result = await client.mutations.subscribeToNewsletter(
      {
        email: args.email,
        country: args.country,
        zip: args.zip,
        lang: args.lang,
        callbackURL: args.callbackURL,
      },
      { authMode: "iam" },
    );
    return {
      success: Boolean(result.data?.success),
      message: result.data?.message ?? undefined,
    };
  };

  return (
    <BaseNewsletterForm
      t={(key, fallback) => {
        const value = t(key);
        if (typeof value === "string" && value.length > 0 && value !== key) return value;
        return fallback ?? value;
      }}
      lang={i18n.language}
      onSubscribe={onSubscribe}
      appUrl={APP_URL}
      countries={COUNTRIES}
    />
  );
}
