import { defineFunction } from "@aws-amplify/backend";

export const confirmNewsletter = defineFunction({
  name: "confirm-newsletter",
  entry: "./handler.ts",
});
