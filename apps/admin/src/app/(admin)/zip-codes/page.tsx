"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Loader2, Plus } from "lucide-react";
import { statStatusColors, type StatStatus } from "@/lib/constants";

type LocationMeasurement = Schema["LocationMeasurement"]["type"];
type ContaminantThreshold = Schema["ContaminantThreshold"]["type"];
type Contaminant = Schema["Contaminant"]["type"];

// Extended type for LocationMeasurement with city/state fields from schema
type LocationMeasurementWithLocation = LocationMeasurement & {
  city: string;
  state: string;
};

interface LocationStats {
  city: string;
  state: string;
  measurementCount: number;
  worstStatus: StatStatus;
  lastUpdated: string;
}

/**
 * Calculate status based on measurement value and threshold
 */
function calculateStatus(
  value: number,
  threshold: ContaminantThreshold | undefined,
  higherIsBad: boolean = true,
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

export default function ZipCodesPage() {
  const router = useRouter();
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newCity, setNewCity] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();

      // Fetch measurements, thresholds, and contaminants in parallel
      const [measurementsResult, thresholdsResult, contaminantsResult] =
        await Promise.all([
          client.models.LocationMeasurement.list({ limit: 1000 }),
          client.models.ContaminantThreshold.list({ limit: 1000 }),
          client.models.Contaminant.list({ limit: 1000 }),
        ]);

      if (measurementsResult.errors) {
        console.error(
          "Error fetching measurements:",
          measurementsResult.errors,
        );
        return;
      }

      const measurements = measurementsResult.data || [];
      const thresholds = thresholdsResult.data || [];
      const contaminants = contaminantsResult.data || [];

      // Create lookup maps
      const thresholdMap = new Map<string, ContaminantThreshold>();
      for (const t of thresholds) {
        thresholdMap.set(`${t.contaminantId}:${t.jurisdictionCode}`, t);
      }

      const contaminantMap = new Map<string, Contaminant>();
      for (const c of contaminants) {
        contaminantMap.set(c.contaminantId, c);
      }

      // Group by city+state and calculate status
      const locationMap = new Map<
        string,
        {
          city: string;
          state: string;
          measurements: LocationMeasurement[];
          worstStatus: StatStatus;
          lastUpdated: string;
        }
      >();

      for (const measurement of measurements) {
        const m = measurement as LocationMeasurementWithLocation;
        const city = m.city ?? "Unknown";
        const state = m.state ?? "";
        const key = `${city}|${state}`;
        const existing = locationMap.get(key) || {
          city,
          state,
          measurements: [] as LocationMeasurement[],
          worstStatus: "safe" as StatStatus,
          lastUpdated: measurement.measuredAt ?? new Date().toISOString(),
        };

        existing.measurements.push(measurement);

        // Calculate status for this measurement
        const threshold =
          thresholdMap.get(`${measurement.contaminantId}:WHO`) ||
          thresholdMap.get(`${measurement.contaminantId}:US`);
        const contaminant = contaminantMap.get(measurement.contaminantId);
        const higherIsBad = contaminant?.higherIsBad ?? true;
        const status = calculateStatus(
          measurement.value,
          threshold,
          higherIsBad,
        );

        if (status === "danger") {
          existing.worstStatus = "danger";
        } else if (status === "warning" && existing.worstStatus !== "danger") {
          existing.worstStatus = "warning";
        }

        const measurementDate = new Date(measurement.measuredAt ?? 0);
        const existingDate = new Date(existing.lastUpdated);
        if (measurementDate > existingDate) {
          existing.lastUpdated = measurement.measuredAt ?? existing.lastUpdated;
        }

        locationMap.set(key, existing);
      }

      const result: LocationStats[] = Array.from(locationMap.values()).map(
        ({ city, state, measurements: m, worstStatus, lastUpdated }) => ({
          city,
          state,
          measurementCount: m.length,
          worstStatus,
          lastUpdated,
        }),
      );

      result.sort((a, b) =>
        `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`),
      );

      setLocationStats(result);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLocations = locationStats.filter((loc) =>
    `${loc.city}, ${loc.state}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const handleAddLocation = () => {
    if (newCity.trim()) {
      router.push(`/zip-codes/${encodeURIComponent(newCity.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Location Measurements
        </h1>
        <p className="text-muted-foreground">
          View and manage contaminant measurements by city
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New city"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            className="w-40"
          />
          <Button onClick={handleAddLocation} disabled={!newCity.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <CardDescription>
            {locationStats.length} cit{locationStats.length !== 1 ? "ies" : "y"}{" "}
            with measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No locations match your search."
                : "No measurement data yet. Add a location to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Measurements</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.map((location) => (
                  <TableRow key={`${location.city}-${location.state}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{location.city}</span>
                      </div>
                    </TableCell>
                    <TableCell>{location.state}</TableCell>
                    <TableCell>
                      {location.measurementCount} measurements
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statStatusColors[location.worstStatus]}
                      >
                        {location.worstStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(location.lastUpdated).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/zip-codes/${encodeURIComponent(location.city)}`,
                          )
                        }
                      >
                        Manage
                      </Button>
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
