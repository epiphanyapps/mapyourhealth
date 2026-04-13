"use client";

import Link from "next/link";
import { LanguageSelector } from "./language-selector";

export function Navbar() {
  return (
    <header className="relative z-10">
      <nav className="flex w-full items-center justify-between px-4 py-4 md:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-netflix-bold)] text-2xl text-primary-500 sm:text-3xl"
        >
          MapYourHealth
        </Link>
        <LanguageSelector />
      </nav>
    </header>
  );
}
