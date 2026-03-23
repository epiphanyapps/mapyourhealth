"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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
    </div>
  );
}
