"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { generateClient } from "aws-amplify/api";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";

type ConfirmationState = "loading" | "success" | "error";

export default function ConfirmPage() {
  const params = useParams();
  const code = params.code as string;
  const { t } = useTranslation();
  const [state, setState] = useState<ConfirmationState>("loading");
  const [message, setMessage] = useState(t("confirm.loading"));
  const hasConfirmed = useRef(false);

  useEffect(() => {
    const confirmSubscription = async () => {
      if (hasConfirmed.current) return;

      if (!code) {
        setState("error");
        setMessage(t("confirm.invalidCode"));
        return;
      }

      try {
        const client = generateClient<Schema>();
        const result = await client.mutations.confirmNewsletter({
          confirmationCode: code,
        });

        if (result.data?.success) {
          hasConfirmed.current = true;
          setState("success");
          setMessage(t("confirm.success"));
        } else {
          setState("error");
          setMessage(result.data?.message || t("confirm.error"));
        }
      } catch {
        setState("error");
        setMessage(t("confirm.error"));
      }
    };

    confirmSubscription();
  }, [code, t]);

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <picture>
        <source
          media="(max-width: 768px)"
          srcSet="/images/hero/tablet_portrait_800x1000.jpg"
        />
        <img
          src="/images/hero/large_desktop_1920x800.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-neutral-900/80 p-8 shadow-lg backdrop-blur-sm">
        <p
          className={`text-center font-[family-name:var(--font-netflix-medium)] text-2xl ${
            state === "error"
              ? "text-red-500"
              : state === "success"
                ? "text-primary-500"
                : "text-white"
          }`}
        >
          {message}
        </p>
        {state === "success" && (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-primary-500 underline hover:text-primary-550"
            >
              &larr; Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
