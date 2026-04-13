import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { I18nProvider } from "@/providers/i18n-provider";
import { AmplifyProvider } from "@/providers/amplify-provider";

const netflixSansBold = localFont({
  src: "../fonts/NetflixSans-Bold.otf",
  variable: "--font-netflix-bold",
  display: "swap",
});

const netflixSansMedium = localFont({
  src: "../fonts/NetflixSans-Medium.otf",
  variable: "--font-netflix-medium",
  display: "swap",
});

const netflixSansRegular = localFont({
  src: "../fonts/NetflixSans-Regular.otf",
  variable: "--font-netflix-regular",
  display: "swap",
});

const netflixSansLight = localFont({
  src: "../fonts/NetflixSans-Light.otf",
  variable: "--font-netflix-light",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MapYourHealth - Monitor Environmental Health Hazards",
  description:
    "Track toxic pollutants, monitor public services, and protect your health. Sign up for alerts about environmental hazards in your area.",
  openGraph: {
    title: "MapYourHealth",
    description:
      "Toxic pollution is your new neighbor. Monitor environmental health hazards.",
    url: "https://mapyourhealth.info",
    siteName: "MapYourHealth",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MapYourHealth",
    description: "Monitor environmental health hazards in your area.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className="dark">
      <body
        className={`${netflixSansBold.variable} ${netflixSansMedium.variable} ${netflixSansRegular.variable} ${netflixSansLight.variable} antialiased`}
      >
        <AmplifyProvider>
          <I18nProvider>{children}</I18nProvider>
        </AmplifyProvider>
      </body>
    </html>
  );
}
