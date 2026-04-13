"use client";

import { useTranslation } from "react-i18next";

export function FaqStructuredData() {
  const { t } = useTranslation();

  const faqItems = [
    { q: t("home.faq.question1"), a: t("home.faq.answer1") },
    { q: t("home.faq.question2"), a: t("home.faq.answer2") },
    { q: t("home.faq.question3"), a: t("home.faq.answer3") },
    { q: t("home.faq.question4"), a: t("home.faq.answer4") },
    { q: t("home.faq.question5"), a: t("home.faq.answer5") },
    { q: t("home.faq.question6"), a: t("home.faq.answer6") },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
