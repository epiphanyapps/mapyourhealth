"use client";

import { useState } from "react";
import type { LandingContent } from "./types";
import { createT } from "./t";

type Props = {
  content?: LandingContent;
};

function PlusIcon({ className }: { className?: string }) {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function FaqSection({ content }: Props) {
  const t = createT(content);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems = [1, 2, 3, 4, 5, 6].map((i) => ({
    question: t(`home.faq.question${i}`),
    answer: t(`home.faq.answer${i}`),
  }));

  return (
    <section>
      <h2
        className="p-3 pl-0 text-2xl sm:text-4xl"
        style={{ color: "var(--mh-text)", fontFamily: "var(--mh-font-medium)" }}
      >
        {t("home.faqTitle")}
      </h2>
      <div className="flex flex-col">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="overflow-hidden border-b-2"
              style={{
                backgroundColor: "var(--mh-surface-alt)",
                borderColor: "var(--mh-surface-alt)",
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between p-2 text-left transition-colors hover:bg-[var(--mh-faq-row-bg-hover)]"
                style={{
                  backgroundColor: "var(--mh-faq-row-bg)",
                  color: "var(--mh-text)",
                }}
              >
                <span className="text-2xl">{item.question}</span>
                {isOpen ? (
                  <CloseIcon className="size-8 shrink-0" />
                ) : (
                  <PlusIcon className="size-8 shrink-0" />
                )}
              </button>
              <div
                className="grid transition-all duration-300 ease-in-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p
                    className="p-2 text-lg whitespace-pre-line"
                    style={{ color: "var(--mh-text)" }}
                  >
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
