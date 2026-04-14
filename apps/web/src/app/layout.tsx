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
  metadataBase: new URL("https://mapyourhealth.info"),
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
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 1024,
        alt: "MapYourHealth",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MapYourHealth",
    description: "Monitor environmental health hazards in your area.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
