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
import {
  statStatusColors,
  type StatStatus,
  contaminantCategoryNames,
  contaminantCategoryColors,
  type ContaminantCategory,
} from "@/lib/constants";

type LocationMeasurement = Schema["LocationMeasurement"]["type"];
type Contaminant = Schema["Contaminant"]["type"];
type ContaminantThreshold = Schema["ContaminantThreshold"]["type"];

/**
 * Calculate status based on measurement value and threshold
 */
function calculateStatus(
  value: number,
  threshold: ContaminantThreshold | undefined,
  higherIsBad: boolean = true
): StatStatus {
  if (!threshold || threshold.limitValue === null) {
    return "safe";
  }
  if (threshold.status === "banned") {
    return "danger";
  }

  const limit = threshold.limitValue!;
  const warningRatio = threshold.warningRatio ?? 0.8;
  const warningThreshold = limit * warningRatio;

  if (higherIsBad) {
    if (value >= limit) return "danger";
    if (value >= warningThreshold) return "warning";
    return "safe";
  } else {
    if (value <= limit) return "danger";
    if (value <= warningThreshold) return "warning";
    return "safe";
  }
}

export default function PostalCodeDetailPage({
  params,
}: {
  params: Promise<{ zipCode: string }>;
}) {
  const { zipCode: postalCode } = use(params);
  const router = useRouter();
  const [measurements, setMeasurements] = useState<LocationMeasurement[]>([]);
  const [contaminants, setContaminants] = useState<Contaminant[]>([]);
  const [thresholds, setThresholds] = useState<ContaminantThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<LocationMeasurement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    contaminantId: "",
    value: "",
    source: "",
    sourceUrl: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();

      const [measurementsResult, contaminantsResult, thresholdsResult] = await Promise.all([
        client.models.LocationMeasurement.listLocationMeasurementByPostalCode({
          postalCode,
        }),
        client.models.Contaminant.list({ limit: 1000 }),
        client.models.ContaminantThreshold.list({ limit: 1000 }),
      ]);

      setMeasurements(measurementsResult.data || []);
      setContaminants(contaminantsResult.data || []);
      setThresholds(thresholdsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [postalCode]);

  const getContaminant = (contaminantId: string) => {
    return contaminants.find((c) => c.contaminantId === contaminantId);
  };

  const getThreshold = (contaminantId: string) => {
    // Try WHO first, then US as fallback
    return (
      thresholds.find(
        (t) => t.contaminantId === contaminantId && t.jurisdictionCode === "WHO"
      ) ||
      thresholds.find(
        (t) => t.contaminantId === contaminantId && t.jurisdictionCode === "US"
      )
    );
  };

  const resetForm = () => {
    setFormData({
      contaminantId: "",
      value: "",
      source: "",
      sourceUrl: "",
      notes: "",
    });
    setEditingMeasurement(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (measurement: LocationMeasurement) => {
    setEditingMeasurement(measurement);
    setFormData({
      contaminantId: measurement.contaminantId,
      value: measurement.value.toString(),
      source: measurement.source || "",
      sourceUrl: measurement.sourceUrl || "",
      notes: measurement.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.contaminantId || !formData.value) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();
      const value = parseFloat(formData.value);
      const now = new Date().toISOString();

      const measurementData = {
        postalCode,
        contaminantId: formData.contaminantId,
        value,
        measuredAt: now,
        source: formData.source || null,
        sourceUrl: formData.sourceUrl || null,
        notes: formData.notes || null,
      };

      if (editingMeasurement) {
        await client.models.LocationMeasurement.update({
          id: editingMeasurement.id,
          ...measurementData,
        });
        toast.success("Measurement updated");
      } else {
        await client.models.LocationMeasurement.create(measurementData);
        toast.success("Measurement created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving measurement:", error);
      toast.error("Failed to save measurement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (measurement: LocationMeasurement) => {
    const contaminant = getContaminant(measurement.contaminantId);
    if (
      !confirm(
        `Are you sure you want to delete "${contaminant?.name || measurement.contaminantId}"?`
      )
    ) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.LocationMeasurement.delete({ id: measurement.id });
      toast.success("Measurement deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting measurement:", error);
      toast.error("Failed to delete measurement");
    }
  };

  // Get available contaminants (not already added)
  const availableContaminants = editingMeasurement
    ? contaminants
    : contaminants.filter(
        (c) => !measurements.some((m) => m.contaminantId === c.contaminantId)
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
            <h1 className="text-3xl font-bold tracking-tight">{postalCode}</h1>
          </div>
          <p className="text-muted-foreground">
            Manage contaminant measurements for this postal code
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Measurements</CardTitle>
            <CardDescription>
              {measurements.length} measurement{measurements.length !== 1 ? "s" : ""} for this
              location
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={openCreateDialog} disabled={availableContaminants.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Measurement
            </Button>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingMeasurement ? "Edit Measurement" : "Add Measurement"}
                </DialogTitle>
                <DialogDescription>
                  {editingMeasurement
                    ? "Update the measurement value for this location."
                    : "Add a new contaminant measurement for this location."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="contaminantId">Contaminant *</Label>
                  <Select
                    value={formData.contaminantId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, contaminantId: value })
                    }
                    disabled={!!editingMeasurement}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contaminant" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContaminants.map((c) => (
                        <SelectItem key={c.contaminantId} value={c.contaminantId}>
                          {c.name} ({c.unit})
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
                    step="any"
                    placeholder="Enter measured value"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                  {formData.contaminantId && formData.value && (
                    <p className="text-sm text-muted-foreground">
                      Status will be:{" "}
                      <Badge
                        variant="secondary"
                        className={
                          statStatusColors[
                            calculateStatus(
                              parseFloat(formData.value),
                              getThreshold(formData.contaminantId),
                              getContaminant(formData.contaminantId)?.higherIsBad ?? true
                            )
                          ]
                        }
                      >
                        {calculateStatus(
                          parseFloat(formData.value),
                          getThreshold(formData.contaminantId),
                          getContaminant(formData.contaminantId)?.higherIsBad ?? true
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
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    placeholder="https://..."
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  ) : editingMeasurement ? (
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
          ) : measurements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No measurements for this location yet. Click &quot;Add Measurement&quot; to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contaminant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {measurements.map((measurement) => {
                  const contaminant = getContaminant(measurement.contaminantId);
                  const threshold = getThreshold(measurement.contaminantId);
                  const status = calculateStatus(
                    measurement.value,
                    threshold,
                    contaminant?.higherIsBad ?? true
                  );

                  return (
                    <TableRow key={measurement.id}>
                      <TableCell className="font-medium">
                        {contaminant?.name || measurement.contaminantId}
                      </TableCell>
                      <TableCell>
                        {contaminant?.category && (
                          <Badge
                            variant="secondary"
                            className={
                              contaminantCategoryColors[
                                contaminant.category as ContaminantCategory
                              ]
                            }
                          >
                            {contaminantCategoryNames[contaminant.category as ContaminantCategory]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {measurement.value} {contaminant?.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statStatusColors[status]}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{measurement.source || "—"}</TableCell>
                      <TableCell>
                        {measurement.measuredAt
                          ? new Date(measurement.measuredAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(measurement)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(measurement)}
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
