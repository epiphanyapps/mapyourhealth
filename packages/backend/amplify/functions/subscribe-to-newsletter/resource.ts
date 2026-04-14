import { defineFunction } from "@aws-amplify/backend";

export const subscribeToNewsletter = defineFunction({
  name: "subscribe-to-newsletter",
  entry: "./handler.ts",
  environment: {
    EMAIL_FROM: process.env.EMAIL_FROM || "noreply@mapyourhealth.info",
  },
});
