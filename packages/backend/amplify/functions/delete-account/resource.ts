import { defineFunction } from "@aws-amplify/backend";

export const deleteAccount = defineFunction({
  name: "delete-account",
  entry: "./handler.ts",
  timeoutSeconds: 30,
});
