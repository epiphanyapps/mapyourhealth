"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  AlertTriangle,
  Plus,
  X 
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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const circles = useRef<Map<string, string>>(new Map()); // sourceId -> layerId mapping
  const [isSaving, setIsSaving] = useState(false);

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

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Load Mapbox GL JS dynamically to avoid SSR issues
    import("mapbox-gl").then((mapboxgl) => {
      if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
        console.error("Mapbox token not found");
        return;
      }

      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      map.current = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/light-v11",
        center: [viewport.longitude, viewport.latitude],
        zoom: viewport.zoom,
      });

      map.current.addControl(new mapboxgl.default.NavigationControl(), "top-right");
      map.current.addControl(new mapboxgl.default.ScaleControl(), "bottom-left");

      // Handle map clicks
      map.current.on("click", (e) => {
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      // Handle viewport changes
      map.current.on("moveend", () => {
        if (map.current) {
          const center = map.current.getCenter();
          const zoom = map.current.getZoom();
          onViewportChange({
            latitude: center.lat,
            longitude: center.lng,
            zoom,
          });
        }
      });

      // Change cursor when creating source
      map.current.getCanvas().style.cursor = isCreatingSource ? "crosshair" : "";
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update cursor when creating source
  useEffect(() => {
    if (map.current) {
      map.current.getCanvas().style.cursor = isCreatingSource ? "crosshair" : "";
    }
  }, [isCreatingSource]);

  // Update viewport when prop changes
  useEffect(() => {
    if (map.current) {
      map.current.flyTo({
        center: [viewport.longitude, viewport.latitude],
        zoom: viewport.zoom,
        duration: 1000,
      });
    }
  }, [viewport]);

  // Render pollution sources on map
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers and circles
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();
    
    circles.current.forEach((layerId) => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(layerId)) {
        map.current!.removeSource(layerId);
      }
    });
    circles.current.clear();

    // Add pollution sources to map
    import("mapbox-gl").then((mapboxgl) => {
      sources.forEach((source) => {
        if (!map.current || !source.id) return;

        // Create impact circle
        const circleLayerId = `circle-${source.id}`;
        
        // Create circle polygon
        const center = [source.longitude, source.latitude];
        const radius = source.impactRadius; // meters
        const points = 64;
        const coordinates = [];
        
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          const dx = radius * Math.cos(angle);
          const dy = radius * Math.sin(angle);
          
          // Convert meters to degrees (approximate)
          const deltaLng = dx / (111320 * Math.cos(source.latitude * Math.PI / 180));
          const deltaLat = dy / 110540;
          
          coordinates.push([
            source.longitude + deltaLng,
            source.latitude + deltaLat,
          ]);
        }
        coordinates.push(coordinates[0]); // Close polygon

        // Add circle source and layer
        map.current.addSource(circleLayerId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [coordinates],
            },
          },
        });

        // Get color based on severity
        const getColor = (severity: string) => {
          switch (severity) {
            case "low": return "#22c55e";
            case "moderate": return "#eab308";
            case "high": return "#f97316";
            case "critical": return "#ef4444";
            default: return "#6b7280";
          }
        };

        map.current.addLayer({
          id: circleLayerId,
          type: "fill",
          source: circleLayerId,
          paint: {
            "fill-color": getColor(source.severityLevel),
            "fill-opacity": source.id === selectedSource?.id ? 0.4 : 0.2,
          },
        });

        map.current.addLayer({
          id: `${circleLayerId}-outline`,
          type: "line",
          source: circleLayerId,
          paint: {
            "line-color": getColor(source.severityLevel),
            "line-width": source.id === selectedSource?.id ? 3 : 2,
            "line-opacity": 0.8,
          },
        });

        circles.current.set(source.id, circleLayerId);

        // Create marker
        const markerElement = document.createElement("div");
        markerElement.className = "pollution-source-marker";
        markerElement.style.cssText = `
          width: 24px;
          height: 24px;
          background-color: ${getColor(source.severityLevel)};
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
        `;

        // Add severity indicator
        const icon = document.createElement("div");
        icon.innerHTML = source.severityLevel === "critical" ? "!" : "•";
        markerElement.appendChild(icon);

        const marker = new mapboxgl.default.Marker(markerElement)
          .setLngLat([source.longitude, source.latitude])
          .addTo(map.current);

        // Click handler for marker
        markerElement.addEventListener("click", (e) => {
          e.stopPropagation();
          onSourceSelect(source);
        });

        markers.current.set(source.id, marker);

        // Add click handlers for circle layers
        map.current.on("click", circleLayerId, (e) => {
          e.preventDefault();
          onSourceSelect(source);
        });

        map.current.on("mouseenter", circleLayerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = "pointer";
          }
        });

        map.current.on("mouseleave", circleLayerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = isCreatingSource ? "crosshair" : "";
          }
        });
      });
    });
  }, [sources, selectedSource, isCreatingSource, onSourceSelect]);

  // Populate form when source is selected
  useEffect(() => {
    if (selectedSource) {
      reset({
        name: selectedSource.name || "",
        sourceType: selectedSource.sourceType || "other",
        latitude: selectedSource.latitude || 0,
        longitude: selectedSource.longitude || 0,
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

  const getSourceTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "bg-green-100 text-green-800 border-green-200";
      case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="relative h-full">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />

      {/* Map Loading Indicator */}
      {!map.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading map...</span>
          </div>
        </div>
      )}

      {/* Source Details Panel */}
      <Sheet open={!!selectedSource} onOpenChange={() => onSourceSelect(null as any)}>
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
                    onValueChange={(value) => setValue("sourceType", value as any)}
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
                      onValueChange={(value) => setValue("severityLevel", value as any)}
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
                      onValueChange={(value) => setValue("status", value as any)}
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
                    onClick={() => onSourceSelect(null as any)}
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