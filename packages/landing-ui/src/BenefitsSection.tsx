"use client";

import type { LandingContent, LandingImages } from "./types";
import { createT } from "./t";

type Props = {
  content?: LandingContent;
  images?: LandingImages;
  imageBase?: string;
  usePlaceholders?: boolean;
};

const DEFAULT_ICONS = ["pollution.png", "monitor.png", "protect.png", "relocation.png"] as const;

export function BenefitsSection({
  content,
  images,
  imageBase = "/images/",
  usePlaceholders = false,
}: Props) {
  const t = createT(content);
  const icons = images?.benefitIcons ?? DEFAULT_ICONS.map((f) => `${imageBase}icons/${f}`);

  const items = [0, 1, 2, 3].map((i) => ({
    title: t(`home.benefits.title${i + 1}`),
    content: t(`home.benefits.content${i + 1}`),
    image: icons[i],
  }));

  return (
    <section>
      <h2
        className="text-2xl sm:text-4xl"
        style={{ color: "var(--mh-text)", fontFamily: "var(--mh-font-medium)" }}
      >
        {t("home.benefitsTitle")}
        <span
          className="px-1 text-2xl sm:text-4xl"
          style={{
            backgroundColor: "var(--mh-accent)",
            color: "var(--mh-accent-fg)",
            fontFamily: "var(--mh-font-medium)",
          }}
        >
          {t("home.signUp")}
        </span>
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article
            key={item.title}
            className="flex min-h-[400px] flex-col rounded-lg p-4 shadow-md"
            style={{ backgroundColor: "var(--mh-card-bg)" }}
          >
            <h3 className="text-3xl" style={{ color: "var(--mh-text)" }}>
              {item.title}
            </h3>
            <div className="flex flex-1 items-end">
              <p className="self-start pt-4 text-lg" style={{ color: "var(--mh-text)" }}>
                {item.content}
              </p>
              {usePlaceholders ? (
                <div
                  aria-hidden
                  className="size-16 shrink-0 rounded lg:size-24"
                  style={{ backgroundColor: "var(--mh-surface-alt)" }}
                />
              ) : (
                <img
                  src={item.image}
                  alt={item.title}
                  width={96}
                  height={96}
                  className="size-16 shrink-0 object-contain lg:size-24"
                />
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
