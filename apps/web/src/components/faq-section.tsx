"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";

export function FaqSection() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems = [
    {
      question: t("home.faq.question1"),
      answer: t("home.faq.answer1"),
    },
    {
      question: t("home.faq.question2"),
      answer: t("home.faq.answer2"),
    },
    {
      question: t("home.faq.question3"),
      answer: t("home.faq.answer3"),
    },
    {
      question: t("home.faq.question4"),
      answer: t("home.faq.answer4"),
    },
    {
      question: t("home.faq.question5"),
      answer: t("home.faq.answer5"),
    },
    {
      question: t("home.faq.question6"),
      answer: t("home.faq.answer6"),
    },
  ];

  return (
    <section>
      <h2 className="p-3 pl-0 font-[family-name:var(--font-netflix-medium)] text-2xl text-neutral-100 sm:text-4xl">
        {t("home.faqTitle")}
      </h2>
      <div className="flex flex-col">
        {faqItems.map((item, index) => (
          <div key={index} className="overflow-hidden border-b-2 bg-charcoal-850">
            <button
              onClick={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
              className="flex w-full items-center justify-between p-2 text-left transition-colors hover:bg-gray-700 bg-gray-800"
            >
              <span className="text-2xl text-white">{item.question}</span>
              {openIndex === index ? (
                <X className="size-8 shrink-0 text-white" />
              ) : (
                <Plus className="size-8 shrink-0 text-white" />
              )}
            </button>
            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{
                gridTemplateRows: openIndex === index ? "1fr" : "0fr",
              }}
            >
              <div className="overflow-hidden">
                <p className="p-2 text-lg text-white whitespace-pre-line">
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
