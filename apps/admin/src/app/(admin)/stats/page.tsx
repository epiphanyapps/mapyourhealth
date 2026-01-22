"use client";

import { useEffect, useState } from "react";
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
  DialogTrigger,
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, categoryColors, type Category } from "@/lib/constants";

interface StatDefinition {
  id: string;
  statId: string;
  name: string;
  unit: string;
  description?: string | null;
  category: Category | null;
  dangerThreshold: number;
  warningThreshold: number;
  higherIsBad?: boolean | null;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<StatDefinition | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    statId: "",
    name: "",
    unit: "",
    description: "",
    category: "" as Category | "",
    dangerThreshold: "",
    warningThreshold: "",
    higherIsBad: true,
  });

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.StatDefinition.list();

      if (errors) {
        console.error("Error fetching stats:", errors);
        toast.error("Failed to fetch stat definitions");
        return;
      }

      setStats((data || []) as unknown as StatDefinition[]);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to fetch stat definitions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const resetForm = () => {
    setFormData({
      statId: "",
      name: "",
      unit: "",
      description: "",
      category: "",
      dangerThreshold: "",
      warningThreshold: "",
      higherIsBad: true,
    });
    setEditingStat(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (stat: StatDefinition) => {
    setEditingStat(stat);
    setFormData({
      statId: stat.statId,
      name: stat.name,
      unit: stat.unit,
      description: stat.description || "",
      category: stat.category || "",
      dangerThreshold: stat.dangerThreshold.toString(),
      warningThreshold: stat.warningThreshold.toString(),
      higherIsBad: stat.higherIsBad ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.statId || !formData.name || !formData.unit || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const statData = {
        statId: formData.statId,
        name: formData.name,
        unit: formData.unit,
        description: formData.description || null,
        category: formData.category as Category,
        dangerThreshold: parseFloat(formData.dangerThreshold),
        warningThreshold: parseFloat(formData.warningThreshold),
        higherIsBad: formData.higherIsBad,
      };

      if (editingStat) {
        await client.models.StatDefinition.update({
          id: editingStat.id,
          ...statData,
        });
        toast.success("Stat definition updated");
      } else {
        await client.models.StatDefinition.create(statData);
        toast.success("Stat definition created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchStats();
    } catch (error) {
      console.error("Error saving stat:", error);
      toast.error("Failed to save stat definition");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (stat: StatDefinition) => {
    if (!confirm(`Are you sure you want to delete "${stat.name}"?`)) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.StatDefinition.delete({ id: stat.id });
      toast.success("Stat definition deleted");
      fetchStats();
    } catch (error) {
      console.error("Error deleting stat:", error);
      toast.error("Failed to delete stat definition");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stat Definitions</h1>
          <p className="text-muted-foreground">
            Manage safety metrics and their thresholds
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Stat Definition
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingStat ? "Edit Stat Definition" : "Create Stat Definition"}
              </DialogTitle>
              <DialogDescription>
                {editingStat
                  ? "Update the stat definition details below."
                  : "Add a new safety metric to track."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statId">Stat ID *</Label>
                  <Input
                    id="statId"
                    placeholder="e.g., lead_levels"
                    value={formData.statId}
                    onChange={(e) =>
                      setFormData({ ...formData, statId: e.target.value })
                    }
                    disabled={!!editingStat}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        category: value as Category,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Lead Levels"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    placeholder="e.g., ppb"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Higher Values Are</Label>
                  <Select
                    value={formData.higherIsBad ? "bad" : "good"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, higherIsBad: value === "bad" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bad">Bad (worse)</SelectItem>
                      <SelectItem value="good">Good (better)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="warningThreshold">Warning Threshold *</Label>
                  <Input
                    id="warningThreshold"
                    type="number"
                    placeholder="e.g., 10"
                    value={formData.warningThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warningThreshold: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dangerThreshold">Danger Threshold *</Label>
                  <Input
                    id="dangerThreshold"
                    type="number"
                    placeholder="e.g., 15"
                    value={formData.dangerThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dangerThreshold: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
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
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Stat Definitions</CardTitle>
          <CardDescription>
            {stats.length} stat definition{stats.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stat definitions yet. Click "Add Stat Definition" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Warning</TableHead>
                  <TableHead>Danger</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">{stat.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          stat.category ? categoryColors[stat.category] : ""
                        }
                      >
                        {stat.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{stat.unit}</TableCell>
                    <TableCell>{stat.warningThreshold}</TableCell>
                    <TableCell>{stat.dangerThreshold}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
