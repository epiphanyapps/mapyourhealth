"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { getCurrentUser, fetchAuthSession, signOut } from "aws-amplify/auth";
import outputs from "../../amplify_outputs.json";

// Configure Amplify once at module load.
//
// Intentionally NOT passing `{ ssr: true }`: that mode tells Amplify to
// store tokens in cookies so server components can read them, but the
// admin app is all client components (no server-side `getCurrentUser`
// / `fetchAuthSession` calls) and we don't ship `@aws-amplify/adapter-
// nextjs`. With `ssr: true` on, Amplify writes its session cookies with
// `SameSite=None` — which the browser then requires to be `Secure` —
// which is rejected on `http://localhost`. The cookie write fails
// silently, `fetchAuthSession` can't read tokens back, and signIn
// throws "Unable to get user session following successful sign-in".
// Default mode uses localStorage and works on both localhost and HTTPS.
Amplify.configure(outputs);

interface User {
  userId: string;
  username: string;
  email?: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();

      // Get groups from the ID token
      const groups =
        (session.tokens?.idToken?.payload?.["cognito:groups"] as string[]) ||
        [];
      const isAdmin = groups.includes("admin");

      setUser({
        userId: currentUser.userId,
        username: currentUser.username,
        email: currentUser.signInDetails?.loginId,
        isAdmin,
      });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await checkUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.isAdmin ?? false,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
