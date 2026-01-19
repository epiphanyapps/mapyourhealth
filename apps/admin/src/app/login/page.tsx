"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Amplify } from "aws-amplify";
import { signIn, signOut, fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import outputs from "../../../amplify_outputs.json";

// DEBUG: Log and configure Amplify
console.log("=== LOGIN PAGE DEBUG ===");
console.log("Outputs loaded:", outputs);
console.log("Auth config:", outputs?.auth);
console.log("User Pool ID:", outputs?.auth?.user_pool_id);
console.log("AWS Region:", outputs?.auth?.aws_region);
console.log("=== END LOGIN PAGE DEBUG ===");

// Configure Amplify
Amplify.configure(outputs, { ssr: true });
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          // User is signed in, check if admin
          const session = await fetchAuthSession();
          const groups =
            (session.tokens?.idToken?.payload?.["cognito:groups"] as string[]) ||
            [];

          if (groups.includes("admin")) {
            // Already signed in as admin, redirect to home with full reload
            window.location.href = "/";
            return;
          } else {
            // Signed in but not admin, sign out
            await signOut();
          }
        }
      } catch {
        // Not signed in, continue showing login form
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, [router]);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      setError("");
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Sign out any existing user first
      try {
        await signOut();
      } catch {
        // Ignore sign out errors
      }

      await signIn({ username: email, password });

      // Check if user is in admin group
      const session = await fetchAuthSession();
      const groups =
        (session.tokens?.idToken?.payload?.["cognito:groups"] as string[]) ||
        [];

      if (!groups.includes("admin")) {
        await signOut();
        setError(
          "Access denied. You must be an admin to access this portal."
        );
        setIsLoading(false);
        return;
      }

      // Use full page reload to re-initialize AuthProvider with new auth state
      window.location.href = "/";
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">MapYourHealth Admin</CardTitle>
          <CardDescription>
            Sign in to access the admin portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
