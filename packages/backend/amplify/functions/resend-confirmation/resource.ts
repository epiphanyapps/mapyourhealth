import { defineFunction } from "@aws-amplify/backend";

export const resendConfirmation = defineFunction({
  name: "resend-confirmation",
  entry: "./handler.ts",
});
