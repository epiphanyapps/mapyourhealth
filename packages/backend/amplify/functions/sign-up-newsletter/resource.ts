import { defineFunction } from "@aws-amplify/backend";

export const signUpNewsletter = defineFunction({
  name: "sign-up-newsletter",
  entry: "./handler.ts",
  environment: {
    EMAIL_FROM: process.env.EMAIL_FROM || "noreply@mapyourhealth.info",
  },
});
