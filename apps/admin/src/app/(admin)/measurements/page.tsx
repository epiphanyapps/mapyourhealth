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

// Aggregation results, one per scope. The cascade introduced in #278
// allows a `LocationMeasurement` to be anchored at city, state, or
// country level (city/state nullable, country required). The admin
// page surfaces all three via separate sections so admins can verify
// what data lives at each scope without a DynamoDB scan.
interface LocationStats {
  city: string;
  state: string;
  measurementCount: number;
  worstStatus: StatStatus;
  lastUpdated: string;
}

interface StateStats {
  state: string;
  country: string;
  measurementCount: number;
  worstStatus: StatStatus;
  lastUpdated: string;
}

interface CountryStats {
  country: string;
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

/**
 * Shared aggregator: contributes one measurement to a running aggregate.
 * Mutates and returns the aggregate so callers can use the
 * `map.set(key, contribute(map.get(key) ?? init, m))` idiom in three
 * scope-specific loops without three copies of the same code.
 */
function contributeMeasurement<
  T extends {
    measurementCount: number;
    worstStatus: StatStatus;
    lastUpdated: string;
  },
>(
  agg: T,
  measurement: LocationMeasurement,
  thresholdMap: Map<string, ContaminantThreshold>,
  contaminantMap: Map<string, Contaminant>,
): T {
  agg.measurementCount += 1;

  const threshold =
    thresholdMap.get(`${measurement.contaminantId}:WHO`) ||
    thresholdMap.get(`${measurement.contaminantId}:US`);
  const contaminant = contaminantMap.get(measurement.contaminantId);
  const higherIsBad = contaminant?.higherIsBad ?? true;
  const status = calculateStatus(measurement.value, threshold, higherIsBad);

  if (status === "danger") {
    agg.worstStatus = "danger";
  } else if (status === "warning" && agg.worstStatus !== "danger") {
    agg.worstStatus = "warning";
  }

  const measurementDate = new Date(measurement.measuredAt ?? 0);
  const existingDate = new Date(agg.lastUpdated);
  if (measurementDate > existingDate) {
    agg.lastUpdated = measurement.measuredAt ?? agg.lastUpdated;
  }

  return agg;
}

export default function ZipCodesPage() {
  const router = useRouter();
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [stateStats, setStateStats] = useState<StateStats[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
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

      // Aggregate measurements into three Maps keyed by anchor scope.
      // Classification mirrors the cascade lambda's deriveScope at
      // packages/backend/amplify/functions/on-location-measurement-update/handler.ts
      // — city wins, then state, then country. country is required by the
      // schema so the else-branch is always reachable when a row has no
      // city/state. Rows missing all three are dropped defensively.
      const cityMap = new Map<string, LocationStats>();
      const stateMapAgg = new Map<string, StateStats>();
      const countryMapAgg = new Map<string, CountryStats>();

      for (const m of measurements) {
        if (!m.country) continue;
        const fallbackTimestamp = m.measuredAt ?? new Date().toISOString();

        if (m.city) {
          const key = `${m.city}|${m.state ?? ""}`;
          const init: LocationStats = cityMap.get(key) ?? {
            city: m.city,
            state: m.state ?? "",
            measurementCount: 0,
            worstStatus: "safe",
            lastUpdated: fallbackTimestamp,
          };
          cityMap.set(
            key,
            contributeMeasurement(init, m, thresholdMap, contaminantMap),
          );
        } else if (m.state) {
          const key = `${m.state}|${m.country}`;
          const init: StateStats = stateMapAgg.get(key) ?? {
            state: m.state,
            country: m.country,
            measurementCount: 0,
            worstStatus: "safe",
            lastUpdated: fallbackTimestamp,
          };
          stateMapAgg.set(
            key,
            contributeMeasurement(init, m, thresholdMap, contaminantMap),
          );
        } else {
          const key = m.country;
          const init: CountryStats = countryMapAgg.get(key) ?? {
            country: m.country,
            measurementCount: 0,
            worstStatus: "safe",
            lastUpdated: fallbackTimestamp,
          };
          countryMapAgg.set(
            key,
            contributeMeasurement(init, m, thresholdMap, contaminantMap),
          );
        }
      }

      const cityResult = Array.from(cityMap.values()).sort((a, b) =>
        `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`),
      );
      const stateResult = Array.from(stateMapAgg.values()).sort((a, b) =>
        `${a.state}, ${a.country}`.localeCompare(`${b.state}, ${b.country}`),
      );
      const countryResult = Array.from(countryMapAgg.values()).sort((a, b) =>
        a.country.localeCompare(b.country),
      );

      setLocationStats(cityResult);
      setStateStats(stateResult);
      setCountryStats(countryResult);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Each section gets its own filter so a single search box matches
  // across all three: typing "QC" surfaces Boucherville/Montreal in the
  // city section AND the QC row in the state section; "CA" matches
  // Canadian cities AND the country-wide row.
  const lowerQuery = searchQuery.toLowerCase();
  const filteredLocations = locationStats.filter((loc) =>
    `${loc.city}, ${loc.state}`.toLowerCase().includes(lowerQuery),
  );
  const filteredStateStats = stateStats.filter((s) =>
    `${s.state}, ${s.country}`.toLowerCase().includes(lowerQuery),
  );
  const filteredCountryStats = countryStats.filter((c) =>
    c.country.toLowerCase().includes(lowerQuery),
  );

  const handleAddLocation = () => {
    if (newCity.trim()) {
      router.push(`/measurements/${encodeURIComponent(newCity.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Location Measurements
        </h1>
        <p className="text-muted-foreground">
          Coverage view across the three cascade levels the mobile app reads
          from: by-city, by-state, and by-country. When a user picks a city,
          mobile reads city-anchored rows first; if none, it falls back to
          state, then country.{" "}
          <span className="font-medium">Add new city</span> only creates the
          location target — to add the actual contaminant values, use{" "}
          <span className="font-medium">Manage</span> on a row, or the{" "}
          <span className="font-medium">Import Data</span> page.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search city, state, or country..."
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
          <CardTitle>By city</CardTitle>
          <CardDescription>
            {filteredLocations.length} cit
            {filteredLocations.length !== 1 ? "ies" : "y"}{" "}
            with measurements anchored at city level
            {searchQuery && filteredLocations.length !== locationStats.length
              ? ` (of ${locationStats.length} total)`
              : ""}
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
                ? "No cities match your search."
                : "No city-anchored measurement data yet. Add a location to get started."}
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
                      {location.measurementCount} measurement
                      {location.measurementCount !== 1 ? "s" : ""}
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
                            `/measurements/${encodeURIComponent(location.city)}`,
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

      <Card>
        <CardHeader>
          <CardTitle>By state / province</CardTitle>
          <CardDescription>
            {filteredStateStats.length} state-wide record
            {filteredStateStats.length !== 1 ? "s" : ""} — apply to every city
            in the state without its own data (#123 cascade fallback)
            {searchQuery && filteredStateStats.length !== stateStats.length
              ? ` (of ${stateStats.length} total)`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStateStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No state-wide records match your search."
                : "No state-anchored measurements yet. Use the Import page and leave the city column blank to add one."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State / Province</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Measurements</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStateStats.map((s) => (
                  <TableRow key={`${s.state}-${s.country}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{s.state}</span>
                      </div>
                    </TableCell>
                    <TableCell>{s.country}</TableCell>
                    <TableCell>
                      {s.measurementCount} measurement
                      {s.measurementCount !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statStatusColors[s.worstStatus]}
                      >
                        {s.worstStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(s.lastUpdated).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By country</CardTitle>
          <CardDescription>
            {filteredCountryStats.length} country-wide record
            {filteredCountryStats.length !== 1 ? "s" : ""} — apply to every city
            in the country without its own (or its state&apos;s) data
            {searchQuery && filteredCountryStats.length !== countryStats.length
              ? ` (of ${countryStats.length} total)`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCountryStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No country-wide records match your search."
                : "No country-anchored measurements yet. Use the Import page and leave the city + state columns blank to add one."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Measurements</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCountryStats.map((c) => (
                  <TableRow key={c.country}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{c.country}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.measurementCount} measurement
                      {c.measurementCount !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statStatusColors[c.worstStatus]}
                      >
                        {c.worstStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(c.lastUpdated).toLocaleDateString()}
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
