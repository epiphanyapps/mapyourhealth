"use client";

import { Navbar } from "./navbar";
import { NewsletterForm } from "./newsletter-form";

export function HeroSection() {
  return (
    <section className="relative min-h-screen w-full">
      <picture>
        <source
          media="(max-width: 375px)"
          srcSet="/images/hero/mobile_portrait_375x667.jpg"
        />
        <source
          media="(max-width: 480px)"
          srcSet="/images/hero/mobile_portrait_480x800.jpg"
        />
        <source
          media="(max-width: 768px) and (orientation: portrait)"
          srcSet="/images/hero/tablet_portrait_800x1000.jpg"
        />
        <source
          media="(max-width: 960px) and (orientation: landscape)"
          srcSet="/images/hero/mobile_landscape_960x600.jpg"
        />
        <source
          media="(max-width: 1024px) and (orientation: portrait)"
          srcSet="/images/hero/tablet_portrait_900x1200.jpg"
        />
        <source
          media="(max-width: 1024px) and (orientation: landscape)"
          srcSet="/images/hero/tablet_landscape_1024x640.jpg"
        />
        <source
          media="(max-width: 1280px)"
          srcSet="/images/hero/standard_desktop_1280x720.jpg"
        />
        <source
          media="(max-width: 1366px)"
          srcSet="/images/hero/standard_desktop_1366x768.jpg"
        />
        <source
          media="(max-width: 1440px)"
          srcSet="/images/hero/large_desktop_1440x810.jpg"
        />
        <img
          src="/images/hero/large_desktop_1920x800.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
      </picture>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10">
        <Navbar />
        <NewsletterForm />
      </div>
    </section>
  );
}
