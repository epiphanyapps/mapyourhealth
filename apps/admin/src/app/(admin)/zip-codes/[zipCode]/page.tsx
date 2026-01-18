"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface ZipCodeStat {
  id: string;
  zipCode: string;
  statId: string;
  value: number;
  status: "danger" | "warning" | "safe" | null;
  lastUpdated: string;
  source?: string | null;
}

interface StatDefinition {
  id: string;
  statId: string;
  name: string;
  unit: string;
  category: string | null;
  dangerThreshold: number;
  warningThreshold: number;
  higherIsBad?: boolean | null;
}

const statusColors: Record<string, string> = {
  danger: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
  safe: "bg-green-100 text-green-800",
};

export default function ZipCodeDetailPage({
  params,
}: {
  params: Promise<{ zipCode: string }>;
}) {
  const { zipCode } = use(params);
  const router = useRouter();
  const [stats, setStats] = useState<ZipCodeStat[]>([]);
  const [statDefinitions, setStatDefinitions] = useState<StatDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<ZipCodeStat | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    statId: "",
    value: "",
    source: "",
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();

      // Fetch stats for this zip code
      const { data: statsData } = await client.models.ZipCodeStat.listZipCodeStatByZipCode({
        zipCode,
      });

      // Fetch all stat definitions
      const { data: defsData } = await client.models.StatDefinition.list();

      setStats((statsData || []) as unknown as ZipCodeStat[]);
      setStatDefinitions((defsData || []) as unknown as StatDefinition[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [zipCode]);

  const getStatDefinition = (statId: string) => {
    return statDefinitions.find((def) => def.statId === statId);
  };

  const calculateStatus = (
    value: number,
    def: StatDefinition
  ): "danger" | "warning" | "safe" => {
    const { dangerThreshold, warningThreshold, higherIsBad } = def;

    if (higherIsBad ?? true) {
      if (value >= dangerThreshold) return "danger";
      if (value >= warningThreshold) return "warning";
      return "safe";
    } else {
      if (value <= dangerThreshold) return "danger";
      if (value <= warningThreshold) return "warning";
      return "safe";
    }
  };

  const resetForm = () => {
    setFormData({ statId: "", value: "", source: "" });
    setEditingStat(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (stat: ZipCodeStat) => {
    setEditingStat(stat);
    setFormData({
      statId: stat.statId,
      value: stat.value.toString(),
      source: stat.source || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.statId || !formData.value) {
      toast.error("Please fill in all required fields");
      return;
    }

    const def = getStatDefinition(formData.statId);
    if (!def) {
      toast.error("Invalid stat definition");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();
      const value = parseFloat(formData.value);
      const status = calculateStatus(value, def);

      const statData = {
        zipCode,
        statId: formData.statId,
        value,
        status,
        lastUpdated: new Date().toISOString(),
        source: formData.source || null,
      };

      if (editingStat) {
        await client.models.ZipCodeStat.update({
          id: editingStat.id,
          ...statData,
        });
        toast.success("Stat updated");
      } else {
        await client.models.ZipCodeStat.create(statData);
        toast.success("Stat created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving stat:", error);
      toast.error("Failed to save stat");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (stat: ZipCodeStat) => {
    const def = getStatDefinition(stat.statId);
    if (!confirm(`Are you sure you want to delete "${def?.name || stat.statId}"?`)) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.ZipCodeStat.delete({ id: stat.id });
      toast.success("Stat deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting stat:", error);
      toast.error("Failed to delete stat");
    }
  };

  // Get available stat definitions (not already added)
  const availableStatDefs = editingStat
    ? statDefinitions
    : statDefinitions.filter(
        (def) => !stats.some((s) => s.statId === def.statId)
      );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/zip-codes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">{zipCode}</h1>
          </div>
          <p className="text-muted-foreground">Manage stats for this zip code</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Safety Stats</CardTitle>
            <CardDescription>
              {stats.length} stat{stats.length !== 1 ? "s" : ""} configured for this location
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={openCreateDialog} disabled={availableStatDefs.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Stat
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStat ? "Edit Stat Value" : "Add Stat Value"}
                </DialogTitle>
                <DialogDescription>
                  {editingStat
                    ? "Update the stat value for this zip code."
                    : "Add a new stat measurement for this zip code."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="statId">Stat Definition *</Label>
                  <Select
                    value={formData.statId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, statId: value })
                    }
                    disabled={!!editingStat}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a stat" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatDefs.map((def) => (
                        <SelectItem key={def.statId} value={def.statId}>
                          {def.name} ({def.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">Value *</Label>
                  <Input
                    id="value"
                    type="number"
                    placeholder="Enter measured value"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: e.target.value })
                    }
                  />
                  {formData.statId && formData.value && (
                    <p className="text-sm text-muted-foreground">
                      Status will be:{" "}
                      <Badge
                        variant="secondary"
                        className={
                          statusColors[
                            calculateStatus(
                              parseFloat(formData.value),
                              getStatDefinition(formData.statId)!
                            )
                          ]
                        }
                      >
                        {calculateStatus(
                          parseFloat(formData.value),
                          getStatDefinition(formData.statId)!
                        )}
                      </Badge>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    placeholder="e.g., EPA, CDC, Local Health Dept"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingStat ? (
                    "Update"
                  ) : (
                    "Add"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stats for this zip code yet. Click "Add Stat" to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stat</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => {
                  const def = getStatDefinition(stat.statId);
                  return (
                    <TableRow key={stat.id}>
                      <TableCell className="font-medium">
                        {def?.name || stat.statId}
                      </TableCell>
                      <TableCell>
                        {stat.value} {def?.unit}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[stat.status || "safe"]}
                        >
                          {stat.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{stat.source || "-"}</TableCell>
                      <TableCell>
                        {new Date(stat.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(stat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(stat)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
