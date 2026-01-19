"use client";

import { useState } from "react";
import { updatePassword } from "aws-amplify/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KeyRound, Loader2 } from "lucide-react";

interface ChangePasswordDialogProps {
  trigger?: React.ReactNode;
}

export function ChangePasswordDialog({ trigger }: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      setIsLoading(false);
      return;
    }

    try {
      await updatePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
      });

      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Close dialog after a short delay
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to change password";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <KeyRound className="mr-2 h-4 w-4" />
            Change Password
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPasswordChange">New Password</Label>
            <Input
              id="newPasswordChange"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with uppercase, lowercase, numbers, and symbols
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPasswordChange">Confirm New Password</Label>
            <Input
              id="confirmPasswordChange"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
