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

interface PostalCodeStats {
  postalCode: string;
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

export default function ZipCodesPage() {
  const router = useRouter();
  const [postalCodeStats, setPostalCodeStats] = useState<PostalCodeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();

      // Fetch measurements, thresholds, and contaminants in parallel
      const [measurementsResult, thresholdsResult, contaminantsResult] = await Promise.all([
        client.models.LocationMeasurement.list({ limit: 1000 }),
        client.models.ContaminantThreshold.list({ limit: 1000 }),
        client.models.Contaminant.list({ limit: 1000 }),
      ]);

      if (measurementsResult.errors) {
        console.error("Error fetching measurements:", measurementsResult.errors);
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

      // Group by postal code and calculate status
      const postalCodeMap = new Map<string, {
        measurements: LocationMeasurement[];
        worstStatus: StatStatus;
        lastUpdated: string;
      }>();

      for (const measurement of measurements) {
        const existing = postalCodeMap.get(measurement.postalCode) || {
          measurements: [],
          worstStatus: "safe" as StatStatus,
          lastUpdated: measurement.measuredAt ?? new Date().toISOString(),
        };

        existing.measurements.push(measurement);

        // Calculate status for this measurement
        // Try WHO threshold first, then US
        const threshold =
          thresholdMap.get(`${measurement.contaminantId}:WHO`) ||
          thresholdMap.get(`${measurement.contaminantId}:US`);
        const contaminant = contaminantMap.get(measurement.contaminantId);
        const higherIsBad = contaminant?.higherIsBad ?? true;
        const status = calculateStatus(measurement.value, threshold, higherIsBad);

        // Update worst status
        if (status === "danger") {
          existing.worstStatus = "danger";
        } else if (status === "warning" && existing.worstStatus !== "danger") {
          existing.worstStatus = "warning";
        }

        // Update last updated
        const measurementDate = new Date(measurement.measuredAt ?? 0);
        const existingDate = new Date(existing.lastUpdated);
        if (measurementDate > existingDate) {
          existing.lastUpdated = measurement.measuredAt ?? existing.lastUpdated;
        }

        postalCodeMap.set(measurement.postalCode, existing);
      }

      const result: PostalCodeStats[] = Array.from(postalCodeMap.entries()).map(
        ([postalCode, { measurements, worstStatus, lastUpdated }]) => ({
          postalCode,
          measurementCount: measurements.length,
          worstStatus,
          lastUpdated,
        })
      );

      // Sort by postal code
      result.sort((a, b) => a.postalCode.localeCompare(b.postalCode));

      setPostalCodeStats(result);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPostalCodes = postalCodeStats.filter((z) =>
    z.postalCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPostalCode = () => {
    if (newPostalCode.trim()) {
      router.push(`/zip-codes/${encodeURIComponent(newPostalCode.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Location Measurements</h1>
        <p className="text-muted-foreground">
          View and manage contaminant measurements for each postal code
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by postal code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New postal code"
            value={newPostalCode}
            onChange={(e) => setNewPostalCode(e.target.value)}
            className="w-40"
          />
          <Button onClick={handleAddPostalCode} disabled={!newPostalCode.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <CardDescription>
            {postalCodeStats.length} postal code{postalCodeStats.length !== 1 ? "s" : ""} with measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPostalCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No postal codes match your search."
                : "No measurement data yet. Add a postal code to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Postal Code</TableHead>
                  <TableHead>Measurements</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPostalCodes.map((location) => (
                  <TableRow key={location.postalCode}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{location.postalCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>{location.measurementCount} measurements</TableCell>
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
                        onClick={() => router.push(`/zip-codes/${encodeURIComponent(location.postalCode)}`)}
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
