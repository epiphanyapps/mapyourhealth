"use client";

import { useState } from "react";
import type { LandingContent } from "./types";
import { createT } from "./t";

type Props = {
  content?: LandingContent;
};

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
        {faqItems.map((item, index) => (
          <div
            key={index}
            className="overflow-hidden border-b-2"
            style={{ backgroundColor: "var(--mh-surface-alt)", borderColor: "var(--mh-surface-alt)" }}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="flex w-full items-center justify-between p-2 text-left transition-colors"
              style={{ backgroundColor: "var(--mh-card-bg)", color: "var(--mh-text)" }}
            >
              <span className="text-2xl">{item.question}</span>
              <span
                aria-hidden
                className="inline-flex size-8 shrink-0 items-center justify-center text-3xl leading-none"
              >
                {openIndex === index ? "\u00d7" : "+"}
              </span>
            </button>
            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{ gridTemplateRows: openIndex === index ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="p-2 text-lg whitespace-pre-line" style={{ color: "var(--mh-text)" }}>
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
