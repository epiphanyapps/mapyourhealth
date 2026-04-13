"use client";

import { useEffect } from "react";
import { Amplify } from "aws-amplify";
import outputs from "@/lib/amplify";

let configured = false;

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!configured) {
      Amplify.configure(outputs);
      configured = true;
    }
  }, []);

  return <>{children}</>;
}
