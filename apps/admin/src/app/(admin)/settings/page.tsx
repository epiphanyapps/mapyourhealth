"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const client = generateClient<Schema>();

type AppConfig = Schema["AppConfig"]["type"];

const CONFIG_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  comingSoonGate: {
    label: "Coming Soon Gate",
    description:
      "When enabled, unauthenticated users see a Coming Soon screen instead of the dashboard. Authenticated users always have full access.",
  },
};

// Database management action definitions
const DATA_ACTIONS = [
  {
    action: "wipeContaminants" as const,
    label: "Wipe Contaminant Data",
    description: "Clears Contaminant, ContaminantThreshold, and Jurisdiction tables.",
    confirmPhrase: "DELETE",
    variant: "destructive" as const,
  },
  {
    action: "wipeLocations" as const,
    label: "Wipe Location Data",
    description: "Clears Location, LocationMeasurement, and LocationObservation tables.",
    confirmPhrase: "DELETE",
    variant: "destructive" as const,
  },
  {
    action: "wipeAll" as const,
    label: "Wipe All Reference Data",
    description:
      "Clears all 10 reference data tables. User data (subscriptions, reports, health records) is never affected.",
    confirmPhrase: "DELETE ALL",
    variant: "destructive" as const,
  },
  {
    action: "reseedAll" as const,
    label: "Reseed All Data",
    description:
      "Wipes all reference data, then re-seeds from Risks.xlsx seed files (~9,000 records). This may take 1-3 minutes.",
    confirmPhrase: "RESEED",
    variant: "default" as const,
  },
];

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Database management state
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const fetchConfigs = async () => {
    try {
      const { data, errors } = await client.models.AppConfig.list({ limit: 100 });
      if (errors) {
        console.error("Error fetching configs:", errors);
        toast.error("Failed to load settings");
        return;
      }
      setConfigs(data);
    } catch (err) {
      console.error("Error fetching configs:", err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggle = async (config: AppConfig) => {
    setUpdating(config.id);
    try {
      const { errors } = await client.models.AppConfig.update({
        id: config.id,
        isEnabled: !config.isEnabled,
      });
      if (errors) {
        console.error("Error updating config:", errors);
        toast.error("Failed to update setting");
        return;
      }
      setConfigs((prev) =>
        prev.map((c) => (c.id === config.id ? { ...c, isEnabled: !c.isEnabled } : c)),
      );
      toast.success(
        `${CONFIG_DESCRIPTIONS[config.configKey]?.label ?? config.configKey} ${!config.isEnabled ? "enabled" : "disabled"}`,
      );
    } catch (err) {
      console.error("Error updating config:", err);
      toast.error("Failed to update setting");
    } finally {
      setUpdating(null);
    }
  };

  const ensureComingSoonConfig = async () => {
    const existing = configs.find((c) => c.configKey === "comingSoonGate");
    if (existing) return;

    try {
      const { data, errors } = await client.models.AppConfig.create({
        configKey: "comingSoonGate",
        isEnabled: false,
        description: "Show Coming Soon screen to unauthenticated users",
      });
      if (errors) {
        console.error("Error creating config:", errors);
        return;
      }
      if (data) {
        setConfigs((prev) => [...prev, data]);
        toast.success("Coming Soon Gate config created");
      }
    } catch (err) {
      console.error("Error creating config:", err);
    }
  };

  useEffect(() => {
    if (!loading && configs.length === 0) {
      ensureComingSoonConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleDataAction = async (action: string) => {
    setActiveAction(action);
    setDialogAction(null);
    setConfirmText("");

    try {
      const { data, errors } = await client.mutations.manageData({
        action: action as "wipeContaminants" | "wipeLocations" | "wipeAll" | "reseedAll",
      });

      if (errors) {
        toast.error(`Operation failed: ${errors[0].message}`);
        return;
      }

      if (data?.success) {
        toast.success(data.details);
      } else {
        toast.error(data?.error || data?.details || "Operation failed");
      }
    } catch (err) {
      console.error(`Error during ${action}:`, err);
      toast.error("Operation failed unexpectedly");
    } finally {
      setActiveAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage application-wide configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Gates</CardTitle>
          <CardDescription>
            Control which features are available to users. Changes take effect within 5 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configs.map((config) => {
            const info = CONFIG_DESCRIPTIONS[config.configKey] ?? {
              label: config.configKey,
              description: config.description ?? "",
            };
            return (
              <div key={config.id} className="flex items-center justify-between space-x-4">
                <div className="space-y-1">
                  <Label htmlFor={config.id} className="text-base font-medium">
                    {info.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                </div>
                <Switch
                  id={config.id}
                  checked={config.isEnabled ?? false}
                  onCheckedChange={() => handleToggle(config)}
                  disabled={updating === config.id}
                />
              </div>
            );
          })}

          {configs.length === 0 && (
            <p className="text-sm text-muted-foreground">No configuration entries found.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Management</CardTitle>
          <CardDescription>
            Wipe or reseed reference data tables. User data (subscriptions, reports, health records)
            is never affected by these operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DATA_ACTIONS.map((item) => (
            <div
              key={item.action}
              className="flex items-center justify-between space-x-4 rounded-lg border p-4"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>

              <Dialog
                open={dialogAction === item.action}
                onOpenChange={(open) => {
                  setDialogAction(open ? item.action : null);
                  if (!open) setConfirmText("");
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant={item.variant}
                    size="sm"
                    disabled={!!activeAction}
                  >
                    {activeAction === item.action && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {activeAction === item.action ? "Running..." : item.label}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm: {item.label}</DialogTitle>
                    <DialogDescription>{item.description}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-4">
                    <Label htmlFor="confirm-input">
                      Type <span className="font-mono font-bold">{item.confirmPhrase}</span> to
                      confirm
                    </Label>
                    <Input
                      id="confirm-input"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={item.confirmPhrase}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogAction(null);
                        setConfirmText("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={item.variant}
                      disabled={confirmText !== item.confirmPhrase}
                      onClick={() => handleDataAction(item.action)}
                    >
                      {item.label}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ))}

          {activeAction && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Operation in progress... This may take a few minutes. Do not close this page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
