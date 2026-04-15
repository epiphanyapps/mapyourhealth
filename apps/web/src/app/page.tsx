"use client";

import { LandingPage } from "@/components/landing-page";
import { FaqStructuredData } from "@/components/faq-structured-data";

export default function Home() {
  return (
    <>
      <FaqStructuredData />
      <LandingPage />
    </>
  );
}
