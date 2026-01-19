"use client";

import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

// DEBUG: Log outputs at runtime to verify config
console.log("=== AMPLIFY OUTPUTS DEBUG ===");
console.log("AWS Region:", outputs.auth?.aws_region);
console.log("User Pool ID:", outputs.auth?.user_pool_id);
console.log("User Pool Client ID:", outputs.auth?.user_pool_client_id);
console.log("Full outputs:", JSON.stringify(outputs, null, 2));
console.log("=== END AMPLIFY OUTPUTS DEBUG ===");

Amplify.configure(outputs, { ssr: true });

export { outputs };
