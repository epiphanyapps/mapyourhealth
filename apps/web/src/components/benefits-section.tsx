"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

const benefitImages = [
  "/images/icons/pollution.png",
  "/images/icons/monitor.png",
  "/images/icons/protect.png",
  "/images/icons/relocation.png",
];

export function BenefitsSection() {
  const { t } = useTranslation();

  const items = [
    {
      title: t("home.benefits.title1"),
      content: t("home.benefits.content1"),
      image: benefitImages[0],
    },
    {
      title: t("home.benefits.title2"),
      content: t("home.benefits.content2"),
      image: benefitImages[1],
    },
    {
      title: t("home.benefits.title3"),
      content: t("home.benefits.content3"),
      image: benefitImages[2],
    },
    {
      title: t("home.benefits.title4"),
      content: t("home.benefits.content4"),
      image: benefitImages[3],
    },
  ];

  return (
    <section>
      <h2 className="font-[family-name:var(--font-netflix-medium)] text-2xl text-neutral-100 sm:text-4xl">
        {t("home.benefitsTitle")}
        <span className="bg-primary-550 px-1 font-[family-name:var(--font-netflix-medium)] text-2xl text-white sm:text-4xl">
          {t("home.signUp")}
        </span>
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article
            key={item.title}
            className="flex min-h-[400px] flex-col rounded-lg bg-card p-4 shadow-md"
          >
            <h3 className="text-3xl text-white">{item.title}</h3>
            <div className="flex flex-1 items-end">
              <p className="self-start pt-4 text-lg text-white">
                {item.content}
              </p>
              <Image
                src={item.image}
                alt={item.title}
                width={96}
                height={96}
                className="size-16 shrink-0 object-contain lg:size-24"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
