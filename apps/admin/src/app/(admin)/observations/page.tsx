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
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  observationTypeNames,
  observedPropertyCategoryColors,
  type ObservedPropertyCategory,
  type ObservationType,
} from "@/lib/constants";

type LocationObservation = Schema["LocationObservation"]["type"];
type ObservedProperty = Schema["ObservedProperty"]["type"];

export default function ObservationsPage() {
  const [observations, setObservations] = useState<LocationObservation[]>([]);
  const [properties, setProperties] = useState<ObservedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingObservation, setEditingObservation] =
    useState<LocationObservation | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterState, setFilterState] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    city: "",
    state: "",
    country: "",
    county: "",
    propertyId: "",
    numericValue: "",
    zoneValue: "",
    endemicValue: false,
    incidenceValue: "",
    binaryValue: false,
    observedAt: new Date().toISOString().slice(0, 16),
    validUntil: "",
    source: "",
    sourceUrl: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();

      const [observationsResult, propertiesResult] = await Promise.all([
        client.models.LocationObservation.list({ limit: 500 }),
        client.models.ObservedProperty.list({ limit: 1000 }),
      ]);

      if (observationsResult.errors) {
        console.error("Error fetching observations:", observationsResult.errors);
        toast.error("Failed to fetch observations");
      } else {
        setObservations(observationsResult.data || []);
      }

      if (propertiesResult.errors) {
        console.error("Error fetching properties:", propertiesResult.errors);
      } else {
        setProperties(propertiesResult.data || []);
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
      city: "",
      state: "",
      country: "",
      county: "",
      propertyId: "",
      numericValue: "",
      zoneValue: "",
      endemicValue: false,
      incidenceValue: "",
      binaryValue: false,
      observedAt: new Date().toISOString().slice(0, 16),
      validUntil: "",
      source: "",
      sourceUrl: "",
      notes: "",
    });
    setEditingObservation(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (observation: LocationObservation) => {
    setEditingObservation(observation);
    setFormData({
      city: observation.city,
      state: observation.state,
      country: observation.country,
      county: observation.county || "",
      propertyId: observation.propertyId,
      numericValue: observation.numericValue?.toString() || "",
      zoneValue: observation.zoneValue || "",
      endemicValue: observation.endemicValue ?? false,
      incidenceValue: observation.incidenceValue?.toString() || "",
      binaryValue: observation.binaryValue ?? false,
      observedAt: observation.observedAt
        ? new Date(observation.observedAt).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      validUntil: observation.validUntil
        ? new Date(observation.validUntil).toISOString().slice(0, 16)
        : "",
      source: observation.source || "",
      sourceUrl: observation.sourceUrl || "",
      notes: observation.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (
      !formData.city ||
      !formData.state ||
      !formData.country ||
      !formData.propertyId ||
      !formData.observedAt
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const observationData = {
        city: formData.city,
        state: formData.state,
        country: formData.country,
        county: formData.county || null,
        propertyId: formData.propertyId,
        numericValue: formData.numericValue
          ? parseFloat(formData.numericValue)
          : null,
        zoneValue: formData.zoneValue || null,
        endemicValue: formData.endemicValue,
        incidenceValue: formData.incidenceValue
          ? parseFloat(formData.incidenceValue)
          : null,
        binaryValue: formData.binaryValue,
        observedAt: new Date(formData.observedAt).toISOString(),
        validUntil: formData.validUntil
          ? new Date(formData.validUntil).toISOString()
          : null,
        source: formData.source || null,
        sourceUrl: formData.sourceUrl || null,
        notes: formData.notes || null,
      };

      if (editingObservation) {
        await client.models.LocationObservation.update({
          id: editingObservation.id,
          ...observationData,
        });
        toast.success("Observation updated");
      } else {
        await client.models.LocationObservation.create(observationData);
        toast.success("Observation created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving observation:", error);
      toast.error("Failed to save observation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (observation: LocationObservation) => {
    const propertyName =
      properties.find((p) => p.propertyId === observation.propertyId)?.name ||
      observation.propertyId;
    if (
      !confirm(
        `Are you sure you want to delete the "${propertyName}" observation for ${observation.city}, ${observation.state}?`
      )
    ) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.LocationObservation.delete({ id: observation.id });
      toast.success("Observation deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting observation:", error);
      toast.error("Failed to delete observation");
    }
  };

  // Get property by ID
  const getProperty = (propertyId: string) => {
    return properties.find((p) => p.propertyId === propertyId);
  };

  // Get the selected property for showing relevant form fields
  const selectedProperty = formData.propertyId
    ? getProperty(formData.propertyId)
    : null;

  // Get unique countries and states for filters
  const countries = [...new Set(observations.map((o) => o.country))].sort();
  const states = [
    ...new Set(
      observations
        .filter((o) => filterCountry === "all" || o.country === filterCountry)
        .map((o) => o.state)
    ),
  ].sort();

  // Filter observations
  const filteredObservations = observations.filter((o) => {
    if (filterProperty !== "all" && o.propertyId !== filterProperty) return false;
    if (filterCountry !== "all" && o.country !== filterCountry) return false;
    if (filterState !== "all" && o.state !== filterState) return false;
    return true;
  });

  // Format observation value based on type
  const formatValue = (observation: LocationObservation) => {
    const property = getProperty(observation.propertyId);
    if (!property) {
      return observation.numericValue?.toString() || "—";
    }

    switch (property.observationType) {
      case "numeric":
        return observation.numericValue !== null
          ? `${observation.numericValue}${property.unit ? ` ${property.unit}` : ""}`
          : "—";
      case "zone":
        return observation.zoneValue || "—";
      case "endemic":
        return observation.endemicValue ? "Endemic" : "Not Endemic";
      case "incidence":
        return observation.incidenceValue !== null
          ? `${observation.incidenceValue} per 100k`
          : "—";
      case "binary":
        return observation.binaryValue ? "Yes" : "No";
      default:
        return "—";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Location Observations
          </h1>
          <p className="text-muted-foreground">
            Manage observed data at specific locations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Observation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingObservation ? "Edit Observation" : "Create Observation"}
              </DialogTitle>
              <DialogDescription>
                {editingObservation
                  ? "Update the observation details below."
                  : "Add a new location observation."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Montreal"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County/Region</Label>
                  <Input
                    id="county"
                    placeholder="e.g., Kings County"
                    value={formData.county}
                    onChange={(e) =>
                      setFormData({ ...formData, county: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province *</Label>
                  <Input
                    id="state"
                    placeholder="e.g., QC"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    placeholder="e.g., CA"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Property */}
              <div className="space-y-2">
                <Label htmlFor="propertyId">Property *</Label>
                <Select
                  value={formData.propertyId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, propertyId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.propertyId}>
                        {p.name} ({observationTypeNames[p.observationType as ObservationType]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Value fields based on observation type */}
              {(!selectedProperty ||
                selectedProperty.observationType === "numeric") && (
                <div className="space-y-2">
                  <Label htmlFor="numericValue">Numeric Value</Label>
                  <Input
                    id="numericValue"
                    type="number"
                    placeholder="e.g., 45.5"
                    value={formData.numericValue}
                    onChange={(e) =>
                      setFormData({ ...formData, numericValue: e.target.value })
                    }
                  />
                  {selectedProperty?.unit && (
                    <p className="text-xs text-muted-foreground">
                      Unit: {selectedProperty.unit}
                    </p>
                  )}
                </div>
              )}

              {(!selectedProperty ||
                selectedProperty.observationType === "zone") && (
                <div className="space-y-2">
                  <Label htmlFor="zoneValue">Zone Value</Label>
                  <Input
                    id="zoneValue"
                    placeholder="e.g., Good, Moderate, Unhealthy"
                    value={formData.zoneValue}
                    onChange={(e) =>
                      setFormData({ ...formData, zoneValue: e.target.value })
                    }
                  />
                </div>
              )}

              {(!selectedProperty ||
                selectedProperty.observationType === "endemic") && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="endemicValue"
                    checked={formData.endemicValue}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, endemicValue: checked })
                    }
                  />
                  <Label htmlFor="endemicValue">Endemic in this area</Label>
                </div>
              )}

              {(!selectedProperty ||
                selectedProperty.observationType === "incidence") && (
                <div className="space-y-2">
                  <Label htmlFor="incidenceValue">
                    Incidence Rate (per 100,000)
                  </Label>
                  <Input
                    id="incidenceValue"
                    type="number"
                    placeholder="e.g., 25.3"
                    value={formData.incidenceValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        incidenceValue: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              {(!selectedProperty ||
                selectedProperty.observationType === "binary") && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="binaryValue"
                    checked={formData.binaryValue}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, binaryValue: checked })
                    }
                  />
                  <Label htmlFor="binaryValue">Active/Yes</Label>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="observedAt">Observed At *</Label>
                  <Input
                    id="observedAt"
                    type="datetime-local"
                    value={formData.observedAt}
                    onChange={(e) =>
                      setFormData({ ...formData, observedAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input
                    id="validUntil"
                    type="datetime-local"
                    value={formData.validUntil}
                    onChange={(e) =>
                      setFormData({ ...formData, validUntil: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Source */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    placeholder="e.g., EPA, CDC, MELCC"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    placeholder="https://..."
                    value={formData.sourceUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, sourceUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional context..."
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
                ) : editingObservation ? (
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
            <div className="w-40">
              <Label className="mb-2 block">Country</Label>
              <Select
                value={filterCountry}
                onValueChange={(value) => {
                  setFilterCountry(value);
                  setFilterState("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="mb-2 block">State/Province</Label>
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
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
          <CardTitle>Observations</CardTitle>
          <CardDescription>
            {filteredObservations.length} observation
            {filteredObservations.length !== 1 ? "s" : ""}
            {filterProperty !== "all" ||
            filterCountry !== "all" ||
            filterState !== "all"
              ? " (filtered)"
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredObservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No observations found. Click &quot;Add Observation&quot; to create
              one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Observed</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObservations.map((observation) => {
                  const property = getProperty(observation.propertyId);
                  return (
                    <TableRow key={observation.id}>
                      <TableCell>
                        <div className="font-medium">{observation.city}</div>
                        <div className="text-sm text-muted-foreground">
                          {observation.state}, {observation.country}
                        </div>
                      </TableCell>
                      <TableCell>
                        {property ? (
                          <>
                            <Badge
                              variant="secondary"
                              className={
                                property.category
                                  ? observedPropertyCategoryColors[
                                      property.category as ObservedPropertyCategory
                                    ]
                                  : ""
                              }
                            >
                              {property.name}
                            </Badge>
                          </>
                        ) : (
                          observation.propertyId
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatValue(observation)}
                      </TableCell>
                      <TableCell>
                        {observation.observedAt
                          ? new Date(observation.observedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {observation.source && (
                          <div className="flex items-center gap-1">
                            <span>{observation.source}</span>
                            {observation.sourceUrl && (
                              <a
                                href={observation.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(observation)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(observation)}
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
