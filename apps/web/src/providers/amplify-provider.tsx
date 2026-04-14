"use client";

import { Amplify } from "aws-amplify";
import outputs from "@/lib/amplify";

Amplify.configure(outputs, { ssr: true });

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
