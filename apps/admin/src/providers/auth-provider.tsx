"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { getCurrentUser, fetchAuthSession, signOut } from "aws-amplify/auth";
import outputs from "../../amplify_outputs.json";

// Configure Amplify in AuthProvider to ensure it's ready before auth checks
console.log("=== AUTH PROVIDER: Configuring Amplify ===");
Amplify.configure(outputs, { ssr: true });
console.log("=== AUTH PROVIDER: Amplify configured ===");

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
    console.log("=== AUTH PROVIDER: checkUser starting ===");
    try {
      const currentUser = await getCurrentUser();
      console.log("=== AUTH PROVIDER: currentUser ===", currentUser);
      const session = await fetchAuthSession();
      console.log("=== AUTH PROVIDER: session ===", session);

      // Get groups from the ID token
      const groups =
        (session.tokens?.idToken?.payload?.["cognito:groups"] as string[]) ||
        [];
      const isAdmin = groups.includes("admin");
      console.log("=== AUTH PROVIDER: groups ===", groups, "isAdmin:", isAdmin);

      setUser({
        userId: currentUser.userId,
        username: currentUser.username,
        email: currentUser.signInDetails?.loginId,
        isAdmin,
      });
      console.log("=== AUTH PROVIDER: user set successfully ===");
    } catch (error) {
      console.log("=== AUTH PROVIDER: checkUser error ===", error);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log("=== AUTH PROVIDER: checkUser complete, isLoading=false ===");
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
