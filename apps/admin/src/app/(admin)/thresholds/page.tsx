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
import {
  THRESHOLD_STATUS_OPTIONS,
  thresholdStatusColors,
  thresholdStatusNames,
  type ThresholdStatus,
} from "@/lib/constants";

type ContaminantThreshold = Schema["ContaminantThreshold"]["type"];
type Contaminant = Schema["Contaminant"]["type"];
type Jurisdiction = Schema["Jurisdiction"]["type"];

export default function ThresholdsPage() {
  const [thresholds, setThresholds] = useState<ContaminantThreshold[]>([]);
  const [contaminants, setContaminants] = useState<Contaminant[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<ContaminantThreshold | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterContaminant, setFilterContaminant] = useState<string>("all");
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    contaminantId: "",
    jurisdictionCode: "",
    limitValue: "",
    warningRatio: "0.8",
    status: "regulated" as ThresholdStatus,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();

      const [thresholdsResult, contaminantsResult, jurisdictionsResult] = await Promise.all([
        client.models.ContaminantThreshold.list({ limit: 1000 }),
        client.models.Contaminant.list({ limit: 1000 }),
        client.models.Jurisdiction.list({ limit: 100 }),
      ]);

      if (thresholdsResult.errors) {
        console.error("Error fetching thresholds:", thresholdsResult.errors);
        toast.error("Failed to fetch thresholds");
      } else {
        setThresholds(thresholdsResult.data || []);
      }

      if (contaminantsResult.errors) {
        console.error("Error fetching contaminants:", contaminantsResult.errors);
      } else {
        setContaminants(contaminantsResult.data || []);
      }

      if (jurisdictionsResult.errors) {
        console.error("Error fetching jurisdictions:", jurisdictionsResult.errors);
      } else {
        setJurisdictions(jurisdictionsResult.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      contaminantId: "",
      jurisdictionCode: "",
      limitValue: "",
      warningRatio: "0.8",
      status: "regulated",
    });
    setEditingThreshold(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (threshold: ContaminantThreshold) => {
    setEditingThreshold(threshold);
    setFormData({
      contaminantId: threshold.contaminantId,
      jurisdictionCode: threshold.jurisdictionCode,
      limitValue: threshold.limitValue?.toString() || "",
      warningRatio: threshold.warningRatio?.toString() || "0.8",
      status: (threshold.status as ThresholdStatus) || "regulated",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.contaminantId || !formData.jurisdictionCode || !formData.status) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const thresholdData = {
        contaminantId: formData.contaminantId,
        jurisdictionCode: formData.jurisdictionCode,
        limitValue: formData.limitValue ? parseFloat(formData.limitValue) : null,
        warningRatio: formData.warningRatio ? parseFloat(formData.warningRatio) : 0.8,
        status: formData.status,
      };

      if (editingThreshold) {
        await client.models.ContaminantThreshold.update({
          id: editingThreshold.id,
          ...thresholdData,
        });
        toast.success("Threshold updated");
      } else {
        await client.models.ContaminantThreshold.create(thresholdData);
        toast.success("Threshold created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving threshold:", error);
      toast.error("Failed to save threshold");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (threshold: ContaminantThreshold) => {
    const contaminantName = contaminants.find(c => c.contaminantId === threshold.contaminantId)?.name || threshold.contaminantId;
    if (!confirm(`Are you sure you want to delete the threshold for "${contaminantName}" in ${threshold.jurisdictionCode}?`)) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.ContaminantThreshold.delete({ id: threshold.id });
      toast.success("Threshold deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting threshold:", error);
      toast.error("Failed to delete threshold");
    }
  };

  // Get contaminant name by ID
  const getContaminantName = (contaminantId: string) => {
    const contaminant = contaminants.find(c => c.contaminantId === contaminantId);
    return contaminant?.name || contaminantId;
  };

  // Get jurisdiction name by code
  const getJurisdictionName = (code: string) => {
    const jurisdiction = jurisdictions.find(j => j.code === code);
    return jurisdiction?.name || code;
  };

  // Filter thresholds
  const filteredThresholds = thresholds.filter(t => {
    if (filterContaminant !== "all" && t.contaminantId !== filterContaminant) return false;
    if (filterJurisdiction !== "all" && t.jurisdictionCode !== filterJurisdiction) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Thresholds</h1>
          <p className="text-muted-foreground">
            Manage jurisdiction-specific contaminant limits
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Threshold
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingThreshold ? "Edit Threshold" : "Create Threshold"}
              </DialogTitle>
              <DialogDescription>
                {editingThreshold
                  ? "Update the threshold details below."
                  : "Add a new jurisdiction-specific threshold."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contaminantId">Contaminant *</Label>
                  <Select
                    value={formData.contaminantId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, contaminantId: value })
                    }
                    disabled={!!editingThreshold}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contaminant" />
                    </SelectTrigger>
                    <SelectContent>
                      {contaminants.map((c) => (
                        <SelectItem key={c.id} value={c.contaminantId}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jurisdictionCode">Jurisdiction *</Label>
                  <Select
                    value={formData.jurisdictionCode}
                    onValueChange={(value) =>
                      setFormData({ ...formData, jurisdictionCode: value })
                    }
                    disabled={!!editingThreshold}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      {jurisdictions.map((j) => (
                        <SelectItem key={j.id} value={j.code}>
                          {j.name} ({j.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="limitValue">Limit Value</Label>
                  <Input
                    id="limitValue"
                    type="number"
                    placeholder="e.g., 10000"
                    value={formData.limitValue}
                    onChange={(e) =>
                      setFormData({ ...formData, limitValue: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for banned substances
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warningRatio">Warning Ratio</Label>
                  <Input
                    id="warningRatio"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    placeholder="e.g., 0.8"
                    value={formData.warningRatio}
                    onChange={(e) =>
                      setFormData({ ...formData, warningRatio: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    0.8 = warn at 80% of limit
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as ThresholdStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THRESHOLD_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {thresholdStatusNames[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                ) : editingThreshold ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-64">
              <Label className="mb-2 block">Contaminant</Label>
              <Select value={filterContaminant} onValueChange={setFilterContaminant}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contaminants</SelectItem>
                  {contaminants.map((c) => (
                    <SelectItem key={c.id} value={c.contaminantId}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <Label className="mb-2 block">Jurisdiction</Label>
              <Select value={filterJurisdiction} onValueChange={setFilterJurisdiction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jurisdictions</SelectItem>
                  {jurisdictions.map((j) => (
                    <SelectItem key={j.id} value={j.code}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thresholds</CardTitle>
          <CardDescription>
            {filteredThresholds.length} threshold{filteredThresholds.length !== 1 ? "s" : ""}
            {filterContaminant !== "all" || filterJurisdiction !== "all" ? " (filtered)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredThresholds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No thresholds found. Click &quot;Add Threshold&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contaminant</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Limit Value</TableHead>
                  <TableHead>Warning Ratio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredThresholds.map((threshold) => (
                  <TableRow key={threshold.id}>
                    <TableCell className="font-medium">
                      {getContaminantName(threshold.contaminantId)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {threshold.jurisdictionCode}
                      </Badge>
                      <span className="ml-2 text-muted-foreground text-sm">
                        {getJurisdictionName(threshold.jurisdictionCode)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {threshold.limitValue !== null ? threshold.limitValue : "—"}
                    </TableCell>
                    <TableCell>{threshold.warningRatio ?? 0.8}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          threshold.status
                            ? thresholdStatusColors[threshold.status as ThresholdStatus]
                            : ""
                        }
                      >
                        {threshold.status
                          ? thresholdStatusNames[threshold.status as ThresholdStatus]
                          : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(threshold)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(threshold)}
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
