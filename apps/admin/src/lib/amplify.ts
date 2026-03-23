"use client";

import outputs from "../../amplify_outputs.json";

// Amplify is configured in auth-provider.tsx at module load.
// This module re-exports outputs for use by data clients.
export { outputs };
