"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

// Types from schema
type PollutionSource = {
  id?: string;
  sourceId?: string;
  name: string;
  sourceType: "industrial" | "agricultural" | "waste_site" | "spill" | "mining" | "transportation" | "construction" | "other";
  latitude: number;
  longitude: number;
  impactRadius: number;
  address?: string;
  city: string;
  state: string;
  country: string;
  jurisdictionCode: string;
  primaryContaminants: string[];
  severityLevel: "low" | "moderate" | "high" | "critical";
  status: "active" | "monitored" | "remediated" | "closed";
  description?: string;
  notes?: string;
  reportedAt: string;
  reportedBy?: string;
};

type Contaminant = {
  id: string;
  contaminantId: string;
  name: string;
  unit: string;
  category: string;
};

interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface PollutionSourceMapProps {
  sources: PollutionSource[];
  selectedSource: PollutionSource | null;
  viewport: MapViewport;
  onViewportChange: (viewport: MapViewport) => void;
  onMapClick: (coordinates: { lat: number; lng: number }) => void;
  onSourceSelect: (source: PollutionSource) => void;
  onSourceSave: (sourceData: Partial<PollutionSource>) => Promise<void>;
  onSourceDelete: (sourceId: string) => Promise<void>;
  isCreatingSource: boolean;
  contaminants: Contaminant[];
}

// Form validation schema
const sourceFormSchema = z.object({
  name: z.string().min(1, "Source name is required").max(100, "Name too long"),
  sourceType: z.enum(["industrial", "agricultural", "waste_site", "spill", "mining", "transportation", "construction", "other"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  impactRadius: z.number().min(1, "Radius must be at least 1 meter").max(50000, "Radius cannot exceed 50km"),
  address: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  country: z.string().min(1, "Country is required"),
  jurisdictionCode: z.string().min(1, "Jurisdiction is required"),
  primaryContaminants: z.array(z.string()).min(0),
  severityLevel: z.enum(["low", "moderate", "high", "critical"]),
  status: z.enum(["active", "monitored", "remediated", "closed"]),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof sourceFormSchema>;

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  moderate: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

// Inner component that has access to the map instance via useMap()
function ImpactCircles({
  sources,
  selectedSource,
}: {
  sources: PollutionSource[];
  selectedSource: PollutionSource | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const circles: google.maps.Circle[] = [];

    sources.forEach((source) => {
      if (!source.id) return;

      const isSelected = selectedSource?.id === source.id;
      const color = SEVERITY_COLORS[source.severityLevel] || "#6b7280";

      const circle = new google.maps.Circle({
        map,
        center: { lat: source.latitude, lng: source.longitude },
        radius: source.impactRadius,
        fillColor: color,
        fillOpacity: isSelected ? 0.4 : 0.2,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: isSelected ? 3 : 2,
        clickable: false,
      });

      circles.push(circle);
    });

    return () => {
      circles.forEach((c) => c.setMap(null));
    };
  }, [map, sources, selectedSource]);

  return null;
}

export default function PollutionSourceMap({
  sources,
  selectedSource,
  viewport,
  onViewportChange,
  onMapClick,
  onSourceSelect,
  onSourceSave,
  onSourceDelete,
  isCreatingSource,
  contaminants,
}: PollutionSourceMapProps) {
  const [isSaving, setIsSaving] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Form management
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(sourceFormSchema),
  });

  const watchedContaminants = watch("primaryContaminants", []);

  // Pre-populate form when source is selected
  useEffect(() => {
    if (selectedSource) {
      reset({
        name: selectedSource.name || "",
        sourceType: selectedSource.sourceType || "other",
        latitude: selectedSource.latitude,
        longitude: selectedSource.longitude,
        impactRadius: selectedSource.impactRadius || 500,
        address: selectedSource.address || "",
        city: selectedSource.city || "",
        state: selectedSource.state || "",
        country: selectedSource.country || "",
        jurisdictionCode: selectedSource.jurisdictionCode || "",
        primaryContaminants: selectedSource.primaryContaminants || [],
        severityLevel: selectedSource.severityLevel || "moderate",
        status: selectedSource.status || "active",
        description: selectedSource.description || "",
        notes: selectedSource.notes || "",
      });
    }
  }, [selectedSource, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSaving(true);
      await onSourceSave(data);
      toast.success("Pollution source saved successfully");
    } catch (error) {
      console.error("Error saving source:", error);
      toast.error("Failed to save pollution source");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSource?.id) return;

    try {
      await onSourceDelete(selectedSource.id);
      toast.success("Pollution source deleted successfully");
    } catch (error) {
      console.error("Error deleting source:", error);
      toast.error("Failed to delete pollution source");
    }
  };

  const addContaminant = (contaminantId: string) => {
    const current = watchedContaminants || [];
    if (!current.includes(contaminantId)) {
      setValue("primaryContaminants", [...current, contaminantId]);
    }
  };

  const removeContaminant = (contaminantId: string) => {
    const current = watchedContaminants || [];
    setValue("primaryContaminants", current.filter(id => id !== contaminantId));
  };

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (isCreatingSource && e.latLng) {
        onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    },
    [isCreatingSource, onMapClick],
  );

  const mapCenter = useMemo(
    () => ({ lat: viewport.latitude, lng: viewport.longitude }),
    [viewport.latitude, viewport.longitude],
  );

  if (!apiKey) {
    return (
      <div className="relative h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center text-gray-500 p-8">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="font-medium">Map not configured</p>
          <p className="text-sm mt-1">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in apps/admin/.env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Google Map */}
      <APIProvider apiKey={apiKey}>
        <div
          className="w-full h-full rounded-lg overflow-hidden"
          style={{ cursor: isCreatingSource ? "crosshair" : "default" }}
        >
          <Map
            defaultCenter={mapCenter}
            defaultZoom={viewport.zoom}
            center={mapCenter}
            zoom={viewport.zoom}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="pollution-sources-map"
            onClick={handleMapClick}
            onCameraChanged={(ev) => {
              const { center, zoom } = ev.detail;
              onViewportChange({
                latitude: center.lat,
                longitude: center.lng,
                zoom,
              });
            }}
          >
            {/* Impact circles */}
            <ImpactCircles sources={sources} selectedSource={selectedSource} />

            {/* Source markers */}
            {sources.map((source) => {
              if (!source.id) return null;
              const color = SEVERITY_COLORS[source.severityLevel] || "#6b7280";
              const isSelected = selectedSource?.id === source.id;

              return (
                <AdvancedMarker
                  key={source.id}
                  position={{ lat: source.latitude, lng: source.longitude }}
                  onClick={() => onSourceSelect(source)}
                  title={source.name}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: color,
                      border: `2px solid ${isSelected ? "#000" : "#fff"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: "bold",
                      boxShadow: isSelected
                        ? "0 0 0 2px #000, 0 2px 8px rgba(0,0,0,0.3)"
                        : "0 2px 4px rgba(0,0,0,0.3)",
                      cursor: "pointer",
                    }}
                  >
                    {source.severityLevel === "critical" ? "!" : "•"}
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>
        </div>
      </APIProvider>

      {/* Source Details Panel */}
      <Sheet open={!!selectedSource} onOpenChange={() => onSourceSelect(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedSource?.id ? "Edit Pollution Source" : "New Pollution Source"}
            </SheetTitle>
            <SheetDescription>
              {selectedSource?.id
                ? "Update the pollution source information below."
                : "Enter details for the new pollution source."}
            </SheetDescription>
          </SheetHeader>

          {selectedSource && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium">Basic Information</h3>

                <div>
                  <Label htmlFor="name">Source Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Industrial Facility Alpha"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="sourceType">Source Type *</Label>
                  <Select
                    value={watch("sourceType")}
                    onValueChange={(value) => setValue("sourceType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="agricultural">Agricultural</SelectItem>
                      <SelectItem value="waste_site">Waste Site</SelectItem>
                      <SelectItem value="spill">Spill</SelectItem>
                      <SelectItem value="mining">Mining</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Detailed description of the pollution source..."
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Location */}
              <div className="space-y-4">
                <h3 className="font-medium">Location</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="latitude">Latitude *</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      {...register("latitude", { valueAsNumber: true })}
                    />
                    {errors.latitude && (
                      <p className="text-sm text-red-500 mt-1">{errors.latitude.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="longitude">Longitude *</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      {...register("longitude", { valueAsNumber: true })}
                    />
                    {errors.longitude && (
                      <p className="text-sm text-red-500 mt-1">{errors.longitude.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...register("address")}
                    placeholder="Street address (optional)"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      {...register("city")}
                      placeholder="Montreal"
                    />
                    {errors.city && (
                      <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="state">State/Province *</Label>
                    <Input
                      id="state"
                      {...register("state")}
                      placeholder="QC"
                    />
                    {errors.state && (
                      <p className="text-sm text-red-500 mt-1">{errors.state.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      {...register("country")}
                      placeholder="CA"
                    />
                    {errors.country && (
                      <p className="text-sm text-red-500 mt-1">{errors.country.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="jurisdictionCode">Jurisdiction *</Label>
                  <Input
                    id="jurisdictionCode"
                    {...register("jurisdictionCode")}
                    placeholder="e.g., CA-QC"
                  />
                  {errors.jurisdictionCode && (
                    <p className="text-sm text-red-500 mt-1">{errors.jurisdictionCode.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Impact Zone */}
              <div className="space-y-4">
                <h3 className="font-medium">Impact Zone</h3>

                <div>
                  <Label htmlFor="impactRadius">Radius (meters) *</Label>
                  <Input
                    id="impactRadius"
                    type="number"
                    min="1"
                    max="50000"
                    {...register("impactRadius", { valueAsNumber: true })}
                  />
                  {errors.impactRadius && (
                    <p className="text-sm text-red-500 mt-1">{errors.impactRadius.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Area affected by contamination (1m - 50km)
                  </p>
                </div>
              </div>

              <Separator />

              {/* Contaminants */}
              <div className="space-y-4">
                <h3 className="font-medium">Contaminants</h3>

                <div className="flex flex-wrap gap-2">
                  {(watchedContaminants || []).map((contaminantId) => {
                    const contaminant = contaminants.find(c => c.contaminantId === contaminantId);
                    return (
                      <Badge
                        key={contaminantId}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {contaminant?.name || contaminantId}
                        <button
                          type="button"
                          onClick={() => removeContaminant(contaminantId)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>

                <Select
                  onValueChange={addContaminant}
                  value=""
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add contaminant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contaminants
                      .filter(c => !(watchedContaminants || []).includes(c.contaminantId))
                      .map((contaminant) => (
                        <SelectItem
                          key={contaminant.contaminantId}
                          value={contaminant.contaminantId}
                        >
                          {contaminant.name} ({contaminant.category})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Status & Severity */}
              <div className="space-y-4">
                <h3 className="font-medium">Status & Severity</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="severityLevel">Severity Level *</Label>
                    <Select
                      value={watch("severityLevel")}
                      onValueChange={(value) => setValue("severityLevel", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={watch("status")}
                      onValueChange={(value) => setValue("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="monitored">Monitored</SelectItem>
                        <SelectItem value="remediated">Remediated</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any additional context, regulatory information, etc."
                  rows={3}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-between pt-4">
                <div>
                  {selectedSource?.id && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isSaving}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onSourceSelect(null)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {selectedSource?.id ? "Update" : "Create"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
