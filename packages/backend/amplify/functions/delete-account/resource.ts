import { defineFunction } from "@aws-amplify/backend";

export const deleteAccount = defineFunction({
  name: "delete-account",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "auth", // Assign to auth stack (handles Cognito user deletion)
});
