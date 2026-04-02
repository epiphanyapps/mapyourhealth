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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamic import for map component to avoid SSR issues
const PollutionSourceMap = dynamic(
  () => import("@/components/pollution-sources/PollutionSourceMap"),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-gray-100 rounded-lg" /> }
);

const SourceListPanel = dynamic(
  () => import("@/components/pollution-sources/SourceListPanel"),
  { ssr: false }
);

type PollutionSource = Schema["PollutionSource"]["type"];
type Contaminant = Schema["Contaminant"]["type"];

interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

export default function PollutionSourcesPage() {
  const [sources, setSources] = useState<PollutionSource[]>([]);
  const [contaminants, setContaminants] = useState<Contaminant[]>([]);
  const [filteredSources, setFilteredSources] = useState<PollutionSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<PollutionSource | null>(null);
  const [isCreatingSource, setIsCreatingSource] = useState(false);
  const [mapViewport, setMapViewport] = useState<MapViewport>({
    latitude: 45.5088,
    longitude: -73.5878,
    zoom: 10,
  });

  // Filters
  const [filters, setFilters] = useState({
    sourceType: "all",
    severity: "all",
    status: "all",
    jurisdiction: "all",
  });

  const client = generateClient<Schema>();

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const [sourcesResult, contaminantsResult] = await Promise.all([
        client.models.PollutionSource.list({ limit: 1000 }),
        client.models.Contaminant.list({ limit: 1000 }),
      ]);

      if (sourcesResult.errors) {
        console.error("Error fetching pollution sources:", sourcesResult.errors);
        toast.error("Failed to fetch pollution sources");
      } else {
        setSources(sourcesResult.data || []);
        setFilteredSources(sourcesResult.data || []);
      }

      if (contaminantsResult.errors) {
        console.error("Error fetching contaminants:", contaminantsResult.errors);
      } else {
        setContaminants(contaminantsResult.data || []);
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

  // Apply filters whenever filter state or sources change
  useEffect(() => {
    let filtered = sources;

    if (filters.sourceType !== "all") {
      filtered = filtered.filter((s) => s.sourceType === filters.sourceType);
    }

    if (filters.severity !== "all") {
      filtered = filtered.filter((s) => s.severityLevel === filters.severity);
    }

    if (filters.status !== "all") {
      filtered = filtered.filter((s) => s.status === filters.status);
    }

    if (filters.jurisdiction !== "all") {
      filtered = filtered.filter((s) => s.jurisdictionCode === filters.jurisdiction);
    }

    setFilteredSources(filtered);
  }, [filters, sources]);

  const handleCreateSource = () => {
    setIsCreatingSource(true);
    setSelectedSource(null);
    toast.info("Click on the map to place a new pollution source");
  };

  const handleMapClick = (coordinates: { lat: number; lng: number }) => {
    if (isCreatingSource) {
      // Create new source at clicked coordinates
      const newSource: Partial<PollutionSource> = {
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        impactRadius: 500, // Default 500m radius
        sourceType: "other",
        severityLevel: "moderate",
        status: "active",
        name: `New Source ${sources.length + 1}`,
        city: "", // To be filled in form
        state: "",
        country: "",
        jurisdictionCode: "",
        reportedAt: new Date().toISOString(),
        primaryContaminants: [],
      };
      
      setSelectedSource(newSource as PollutionSource);
      setIsCreatingSource(false);
    }
  };

  const handleSourceSelect = (source: PollutionSource) => {
    setSelectedSource(source);
    setIsCreatingSource(false);
    setMapViewport({
      latitude: source.latitude,
      longitude: source.longitude,
      zoom: 14,
    });
  };

  const handleSourceSave = async (sourceData: Partial<PollutionSource>) => {
    try {
      if (selectedSource?.id) {
        // Update existing source
        const result = await client.models.PollutionSource.update({
          id: selectedSource.id,
          ...sourceData,
        });
        
        if (result.errors) {
          throw new Error("Failed to update source");
        }
        
        toast.success("Pollution source updated successfully");
      } else {
        // Create new source
        const result = await client.models.PollutionSource.create({
          ...sourceData,
          sourceId: `PS_${Date.now()}`, // Generate unique ID
          reportedAt: new Date().toISOString(),
          reportedBy: "admin", // TODO: Use actual user ID
        } as Record<string, unknown>);
        
        if (result.errors) {
          throw new Error("Failed to create source");
        }
        
        toast.success("Pollution source created successfully");
      }

      setSelectedSource(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error saving source:", error);
      toast.error("Failed to save pollution source");
    }
  };

  const handleSourceDelete = async (sourceId: string) => {
    if (!confirm("Are you sure you want to delete this pollution source?")) {
      return;
    }

    try {
      await client.models.PollutionSource.delete({ id: sourceId });
      toast.success("Pollution source deleted successfully");
      setSelectedSource(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting source:", error);
      toast.error("Failed to delete pollution source");
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "monitored": return <MapPin className="h-4 w-4 text-yellow-500" />;
      case "remediated": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "closed": return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default: return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get unique values for filter dropdowns
  const uniqueSourceTypes = [...new Set(sources.map(s => s.sourceType))];
  const uniqueSeverities = [...new Set(sources.map(s => s.severityLevel))];
  const uniqueStatuses = [...new Set(sources.map(s => s.status))];
  const uniqueJurisdictions = [...new Set(sources.map(s => s.jurisdictionCode))];

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 p-6">
      {/* Left Panel - Filters and Source List */}
      <div className="w-80 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Pollution Sources
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage environmental contamination data
            </p>
          </div>
        </div>

        {/* Add Source Button */}
        <Button 
          onClick={handleCreateSource} 
          className="w-full"
          disabled={isCreatingSource}
        >
          <Plus className="mr-2 h-4 w-4" />
          {isCreatingSource ? "Click map to place..." : "Add Pollution Source"}
        </Button>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Source Type
              </label>
              <Select
                value={filters.sourceType}
                onValueChange={(value) =>
                  setFilters({ ...filters, sourceType: value })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueSourceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Severity
              </label>
              <Select
                value={filters.severity}
                onValueChange={(value) =>
                  setFilters({ ...filters, severity: value })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {uniqueSeverities.map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Source List */}
        <Card className="flex-1 min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Sources
              <Badge variant="secondary" className="ml-2">
                {filteredSources.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="text-center py-8 px-4 text-muted-foreground text-sm">
                No pollution sources found
              </div>
            ) : (
              <div className="max-h-full overflow-y-auto">
                {filteredSources.map((source) => (
                  <div
                    key={source.id}
                    className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedSource?.id === source.id ? "bg-muted" : ""
                    }`}
                    onClick={() => handleSourceSelect(source)}
                  >
                    <div className="flex items-start gap-2">
                      {getStatusIcon(source.status)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {source.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {source.city}, {source.state}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getSeverityColor(source.severityLevel)}`}
                          >
                            {source.severityLevel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {source.impactRadius}m
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Map and Details */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Map Container */}
        <Card className="flex-1">
          <CardContent className="p-0 h-full">
            <PollutionSourceMap
              sources={filteredSources}
              selectedSource={selectedSource}
              viewport={mapViewport}
              onViewportChange={setMapViewport}
              onMapClick={handleMapClick}
              onSourceSelect={handleSourceSelect}
              onSourceSave={handleSourceSave}
              onSourceDelete={handleSourceDelete}
              isCreatingSource={isCreatingSource}
              contaminants={contaminants}
            />
          </CardContent>
        </Card>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {filteredSources.length} sources visible
            {filters.sourceType !== "all" || filters.severity !== "all" || 
             filters.status !== "all" || filters.jurisdiction !== "all" 
              ? " (filtered)" 
              : ""}
          </div>
          <div>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}