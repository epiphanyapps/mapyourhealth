import type { NextConfig } from "next";

const APP_URLS: Record<string, string> = {
  staging: "https://staging.d2z5ddqhlc1q5.amplifyapp.com",
  main: "https://app.mapyourhealth.info",
};

const branch = process.env.AWS_BRANCH ?? "main";
const appUrl = APP_URLS[branch] ?? APP_URLS.main;

const nextConfig: NextConfig = {
  transpilePackages: ["@mapyourhealth/landing-ui"],
  env: {
    NEXT_PUBLIC_APP_URL: appUrl,
  },
};

export default nextConfig;
