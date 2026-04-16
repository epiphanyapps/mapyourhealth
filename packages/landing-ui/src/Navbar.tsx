"use client";

import type { ReactNode } from "react";

export type NavbarLogo =
  | { kind: "text"; text: string; color?: string }
  | { kind: "image"; src: string; alt: string };

type Props = {
  logo: NavbarLogo;
  homeHref?: string;
  right?: ReactNode;
};

export function Navbar({ logo, homeHref = "/", right }: Props) {
  return (
    <header className="relative z-10">
      <nav className="flex w-full items-center justify-between px-4 py-4 md:px-6">
        <a
          href={homeHref}
          className="inline-flex items-center text-2xl sm:text-3xl"
          style={{
            fontFamily: "var(--mh-font-bold)",
            color: logo.kind === "text" ? (logo.color ?? "var(--mh-accent-soft)") : undefined,
          }}
        >
          {logo.kind === "image" ? (
            <img src={logo.src} alt={logo.alt} className="h-8 w-auto sm:h-10" />
          ) : (
            <span>{logo.text}</span>
          )}
        </a>
        {right}
      </nav>
    </header>
  );
}
