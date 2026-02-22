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
  OBSERVED_PROPERTY_CATEGORIES,
  OBSERVATION_TYPES,
  observedPropertyCategoryNames,
  observedPropertyCategoryColors,
  observationTypeNames,
  type ObservedPropertyCategory,
  type ObservationType,
} from "@/lib/constants";

type ObservedProperty = Schema["ObservedProperty"]["type"];

export default function PropertiesPage() {
  const [properties, setProperties] = useState<ObservedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] =
    useState<ObservedProperty | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    propertyId: "",
    name: "",
    nameFr: "",
    category: "water_quality" as ObservedPropertyCategory,
    observationType: "numeric" as ObservationType,
    unit: "",
    description: "",
    descriptionFr: "",
    higherIsBad: true,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const result = await client.models.ObservedProperty.list({ limit: 1000 });

      if (result.errors) {
        console.error("Error fetching properties:", result.errors);
        toast.error("Failed to fetch properties");
      } else {
        setProperties(result.data || []);
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
      name: "",
      nameFr: "",
      category: "water_quality",
      observationType: "numeric",
      unit: "",
      description: "",
      descriptionFr: "",
      higherIsBad: true,
    });
    setEditingProperty(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (property: ObservedProperty) => {
    setEditingProperty(property);
    setFormData({
      propertyId: property.propertyId,
      name: property.name,
      nameFr: property.nameFr || "",
      category: (property.category as ObservedPropertyCategory) || "water_quality",
      observationType: (property.observationType as ObservationType) || "numeric",
      unit: property.unit || "",
      description: property.description || "",
      descriptionFr: property.descriptionFr || "",
      higherIsBad: property.higherIsBad ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.propertyId || !formData.name || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const propertyData = {
        propertyId: formData.propertyId,
        name: formData.name,
        nameFr: formData.nameFr || null,
        category: formData.category,
        observationType: formData.observationType,
        unit: formData.unit || null,
        description: formData.description || null,
        descriptionFr: formData.descriptionFr || null,
        higherIsBad: formData.higherIsBad,
      };

      if (editingProperty) {
        await client.models.ObservedProperty.update({
          id: editingProperty.id,
          ...propertyData,
        });
        toast.success("Property updated");
      } else {
        await client.models.ObservedProperty.create(propertyData);
        toast.success("Property created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving property:", error);
      toast.error("Failed to save property");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (property: ObservedProperty) => {
    if (
      !confirm(
        `Are you sure you want to delete "${property.name}"? This will also affect any thresholds and observations using this property.`
      )
    ) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.ObservedProperty.delete({ id: property.id });
      toast.success("Property deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
    }
  };

  // Filter properties
  const filteredProperties = properties.filter((p) => {
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (filterType !== "all" && p.observationType !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Observed Properties
          </h1>
          <p className="text-muted-foreground">
            Manage what can be measured or observed
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingProperty ? "Edit Property" : "Create Property"}
              </DialogTitle>
              <DialogDescription>
                {editingProperty
                  ? "Update the property details below."
                  : "Add a new observed property."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyId">Property ID *</Label>
                  <Input
                    id="propertyId"
                    placeholder="e.g., air_quality_index"
                    value={formData.propertyId}
                    onChange={(e) =>
                      setFormData({ ...formData, propertyId: e.target.value })
                    }
                    disabled={!!editingProperty}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    placeholder="e.g., μg/L, AQI"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (English) *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Air Quality Index"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameFr">Name (French)</Label>
                  <Input
                    id="nameFr"
                    placeholder="e.g., Indice de qualité de l'air"
                    value={formData.nameFr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameFr: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        category: value as ObservedPropertyCategory,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBSERVED_PROPERTY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {observedPropertyCategoryNames[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observationType">Observation Type *</Label>
                  <Select
                    value={formData.observationType}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        observationType: value as ObservationType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBSERVATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {observationTypeNames[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (English)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this property measures..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionFr">Description (French)</Label>
                <Textarea
                  id="descriptionFr"
                  placeholder="Description en français..."
                  value={formData.descriptionFr}
                  onChange={(e) =>
                    setFormData({ ...formData, descriptionFr: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="higherIsBad"
                  checked={formData.higherIsBad}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, higherIsBad: checked })
                  }
                />
                <Label htmlFor="higherIsBad">Higher values are worse</Label>
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
                ) : editingProperty ? (
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
              <Label className="mb-2 block">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {OBSERVED_PROPERTY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {observedPropertyCategoryNames[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <Label className="mb-2 block">Observation Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {OBSERVATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {observationTypeNames[type]}
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
          <CardTitle>Properties</CardTitle>
          <CardDescription>
            {filteredProperties.length} propert
            {filteredProperties.length !== 1 ? "ies" : "y"}
            {filterCategory !== "all" || filterType !== "all"
              ? " (filtered)"
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No properties found. Click &quot;Add Property&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="font-mono text-sm">
                      {property.propertyId}
                    </TableCell>
                    <TableCell className="font-medium">
                      {property.name}
                      {property.nameFr && (
                        <span className="ml-2 text-muted-foreground text-sm">
                          ({property.nameFr})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
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
                        {property.category
                          ? observedPropertyCategoryNames[
                              property.category as ObservedPropertyCategory
                            ]
                          : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {property.observationType
                        ? observationTypeNames[
                            property.observationType as ObservationType
                          ]
                        : "—"}
                    </TableCell>
                    <TableCell>{property.unit || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(property)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(property)}
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
