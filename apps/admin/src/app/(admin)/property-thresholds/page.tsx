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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PROPERTY_THRESHOLD_STATUS_OPTIONS,
  propertyThresholdStatusNames,
  propertyThresholdStatusColors,
  observationTypeNames,
  type PropertyThresholdStatus,
  type ObservationType,
} from "@/lib/constants";

type PropertyThreshold = Schema["PropertyThreshold"]["type"];
type ObservedProperty = Schema["ObservedProperty"]["type"];
type Jurisdiction = Schema["Jurisdiction"]["type"];

export default function PropertyThresholdsPage() {
  const [thresholds, setThresholds] = useState<PropertyThreshold[]>([]);
  const [properties, setProperties] = useState<ObservedProperty[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] =
    useState<PropertyThreshold | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    propertyId: "",
    jurisdictionCode: "",
    limitValue: "",
    warningValue: "",
    zoneMapping: "",
    endemicIsDanger: false,
    incidenceWarningThreshold: "",
    incidenceDangerThreshold: "",
    status: "active" as PropertyThresholdStatus,
    notes: "",
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();

      const [thresholdsResult, propertiesResult, jurisdictionsResult] =
        await Promise.all([
          client.models.PropertyThreshold.list({ limit: 1000 }),
          client.models.ObservedProperty.list({ limit: 1000 }),
          client.models.Jurisdiction.list({ limit: 100 }),
        ]);

      if (thresholdsResult.errors) {
        console.error("Error fetching thresholds:", thresholdsResult.errors);
        toast.error("Failed to fetch thresholds");
      } else {
        setThresholds(thresholdsResult.data || []);
      }

      if (propertiesResult.errors) {
        console.error("Error fetching properties:", propertiesResult.errors);
      } else {
        setProperties(propertiesResult.data || []);
      }

      if (jurisdictionsResult.errors) {
        console.error(
          "Error fetching jurisdictions:",
          jurisdictionsResult.errors
        );
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
      propertyId: "",
      jurisdictionCode: "",
      limitValue: "",
      warningValue: "",
      zoneMapping: "",
      endemicIsDanger: false,
      incidenceWarningThreshold: "",
      incidenceDangerThreshold: "",
      status: "active",
      notes: "",
    });
    setEditingThreshold(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (threshold: PropertyThreshold) => {
    setEditingThreshold(threshold);
    setFormData({
      propertyId: threshold.propertyId,
      jurisdictionCode: threshold.jurisdictionCode,
      limitValue: threshold.limitValue?.toString() || "",
      warningValue: threshold.warningValue?.toString() || "",
      zoneMapping: threshold.zoneMapping
        ? JSON.stringify(threshold.zoneMapping, null, 2)
        : "",
      endemicIsDanger: threshold.endemicIsDanger ?? false,
      incidenceWarningThreshold:
        threshold.incidenceWarningThreshold?.toString() || "",
      incidenceDangerThreshold:
        threshold.incidenceDangerThreshold?.toString() || "",
      status: (threshold.status as PropertyThresholdStatus) || "active",
      notes: threshold.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.propertyId || !formData.jurisdictionCode || !formData.status) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate JSON if provided
    let parsedZoneMapping = null;
    if (formData.zoneMapping.trim()) {
      try {
        parsedZoneMapping = JSON.parse(formData.zoneMapping);
      } catch {
        toast.error("Invalid JSON in zone mapping");
        return;
      }
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const thresholdData = {
        propertyId: formData.propertyId,
        jurisdictionCode: formData.jurisdictionCode,
        limitValue: formData.limitValue ? parseFloat(formData.limitValue) : null,
        warningValue: formData.warningValue
          ? parseFloat(formData.warningValue)
          : null,
        zoneMapping: parsedZoneMapping,
        endemicIsDanger: formData.endemicIsDanger,
        incidenceWarningThreshold: formData.incidenceWarningThreshold
          ? parseFloat(formData.incidenceWarningThreshold)
          : null,
        incidenceDangerThreshold: formData.incidenceDangerThreshold
          ? parseFloat(formData.incidenceDangerThreshold)
          : null,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (editingThreshold) {
        await client.models.PropertyThreshold.update({
          id: editingThreshold.id,
          ...thresholdData,
        });
        toast.success("Threshold updated");
      } else {
        await client.models.PropertyThreshold.create(thresholdData);
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

  const handleDelete = async (threshold: PropertyThreshold) => {
    const propertyName =
      properties.find((p) => p.propertyId === threshold.propertyId)?.name ||
      threshold.propertyId;
    if (
      !confirm(
        `Are you sure you want to delete the threshold for "${propertyName}" in ${threshold.jurisdictionCode}?`
      )
    ) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.PropertyThreshold.delete({ id: threshold.id });
      toast.success("Threshold deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting threshold:", error);
      toast.error("Failed to delete threshold");
    }
  };

  // Get property by ID
  const getProperty = (propertyId: string) => {
    return properties.find((p) => p.propertyId === propertyId);
  };

  // Get jurisdiction name by code
  const getJurisdictionName = (code: string) => {
    const jurisdiction = jurisdictions.find((j) => j.code === code);
    return jurisdiction?.name || code;
  };

  // Get the selected property for showing relevant form fields
  const selectedProperty = formData.propertyId
    ? getProperty(formData.propertyId)
    : null;

  // Filter thresholds
  const filteredThresholds = thresholds.filter((t) => {
    if (filterProperty !== "all" && t.propertyId !== filterProperty)
      return false;
    if (filterJurisdiction !== "all" && t.jurisdictionCode !== filterJurisdiction)
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Property Thresholds
          </h1>
          <p className="text-muted-foreground">
            Manage jurisdiction-specific thresholds for observed properties
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Threshold
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
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
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyId">Property *</Label>
                  <Select
                    value={formData.propertyId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, propertyId: value })
                    }
                    disabled={!!editingThreshold}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.propertyId}>
                          {p.name}
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

              {selectedProperty && (
                <p className="text-sm text-muted-foreground">
                  Property type:{" "}
                  <strong>
                    {observationTypeNames[
                      selectedProperty.observationType as ObservationType
                    ] || selectedProperty.observationType}
                  </strong>
                </p>
              )}

              {/* Numeric thresholds */}
              {(!selectedProperty ||
                selectedProperty.observationType === "numeric") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="warningValue">Warning Value</Label>
                    <Input
                      id="warningValue"
                      type="number"
                      placeholder="e.g., 50"
                      value={formData.warningValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          warningValue: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limitValue">Danger/Limit Value</Label>
                    <Input
                      id="limitValue"
                      type="number"
                      placeholder="e.g., 100"
                      value={formData.limitValue}
                      onChange={(e) =>
                        setFormData({ ...formData, limitValue: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Zone mapping */}
              {(!selectedProperty ||
                selectedProperty.observationType === "zone") && (
                <div className="space-y-2">
                  <Label htmlFor="zoneMapping">Zone Mapping (JSON)</Label>
                  <Textarea
                    id="zoneMapping"
                    placeholder='{"Good": "safe", "Moderate": "warning", "Unhealthy": "danger"}'
                    value={formData.zoneMapping}
                    onChange={(e) =>
                      setFormData({ ...formData, zoneMapping: e.target.value })
                    }
                    className="font-mono text-sm"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maps source zone values to safety levels (safe, warning, danger)
                  </p>
                </div>
              )}

              {/* Endemic settings */}
              {(!selectedProperty ||
                selectedProperty.observationType === "endemic") && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="endemicIsDanger"
                    checked={formData.endemicIsDanger}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, endemicIsDanger: checked })
                    }
                  />
                  <Label htmlFor="endemicIsDanger">
                    Endemic presence is danger level (vs. warning)
                  </Label>
                </div>
              )}

              {/* Incidence thresholds */}
              {(!selectedProperty ||
                selectedProperty.observationType === "incidence") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="incidenceWarningThreshold">
                      Incidence Warning Threshold
                    </Label>
                    <Input
                      id="incidenceWarningThreshold"
                      type="number"
                      placeholder="e.g., 10 (per 100k)"
                      value={formData.incidenceWarningThreshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          incidenceWarningThreshold: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incidenceDangerThreshold">
                      Incidence Danger Threshold
                    </Label>
                    <Input
                      id="incidenceDangerThreshold"
                      type="number"
                      placeholder="e.g., 50 (per 100k)"
                      value={formData.incidenceDangerThreshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          incidenceDangerThreshold: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as PropertyThresholdStatus,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_THRESHOLD_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {propertyThresholdStatusNames[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Admin notes about this threshold..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
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
              <Label className="mb-2 block">Property</Label>
              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.propertyId}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <Label className="mb-2 block">Jurisdiction</Label>
              <Select
                value={filterJurisdiction}
                onValueChange={setFilterJurisdiction}
              >
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
          <CardTitle>Property Thresholds</CardTitle>
          <CardDescription>
            {filteredThresholds.length} threshold
            {filteredThresholds.length !== 1 ? "s" : ""}
            {filterProperty !== "all" || filterJurisdiction !== "all"
              ? " (filtered)"
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredThresholds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No thresholds found. Click &quot;Add Threshold&quot; to create
              one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Warning</TableHead>
                  <TableHead>Limit/Danger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredThresholds.map((threshold) => {
                  const property = getProperty(threshold.propertyId);
                  return (
                    <TableRow key={threshold.id}>
                      <TableCell className="font-medium">
                        {property?.name || threshold.propertyId}
                        {property?.observationType && (
                          <span className="ml-2 text-muted-foreground text-xs">
                            (
                            {observationTypeNames[
                              property.observationType as ObservationType
                            ] || property.observationType}
                            )
                          </span>
                        )}
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
                        {threshold.warningValue !== null
                          ? threshold.warningValue
                          : threshold.incidenceWarningThreshold !== null
                            ? `${threshold.incidenceWarningThreshold}/100k`
                            : "—"}
                      </TableCell>
                      <TableCell>
                        {threshold.limitValue !== null
                          ? threshold.limitValue
                          : threshold.incidenceDangerThreshold !== null
                            ? `${threshold.incidenceDangerThreshold}/100k`
                            : threshold.endemicIsDanger
                              ? "Endemic = Danger"
                              : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            threshold.status
                              ? propertyThresholdStatusColors[
                                  threshold.status as PropertyThresholdStatus
                                ]
                              : ""
                          }
                        >
                          {threshold.status
                            ? propertyThresholdStatusNames[
                                threshold.status as PropertyThresholdStatus
                              ]
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
