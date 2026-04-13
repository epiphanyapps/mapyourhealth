"use client";

import { HeroSection } from "@/components/hero-section";
import { BenefitsSection } from "@/components/benefits-section";
import { FaqSection } from "@/components/faq-section";
import { Footer } from "@/components/footer";
import { FaqStructuredData } from "@/components/faq-structured-data";

export default function Home() {
  return (
    <main>
      <FaqStructuredData />
      <HeroSection />
      <div className="mx-6 mb-12 md:mx-12">
        <BenefitsSection />
        <div className="h-12 md:h-24" />
        <FaqSection />
      </div>
      <Footer />
    </main>
  );
}
