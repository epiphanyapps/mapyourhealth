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

interface ZipCodeStats {
  zipCode: string;
  statCount: number;
  worstStatus: StatStatus;
  lastUpdated: string;
}

export default function ZipCodesPage() {
  const router = useRouter();
  const [zipCodeStats, setZipCodeStats] = useState<ZipCodeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newZipCode, setNewZipCode] = useState("");

  const fetchZipCodeStats = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.ZipCodeStat.list();

      if (errors) {
        console.error("Error fetching stats:", errors);
        return;
      }

      // Group by zip code
      const zipCodeMap = new Map<string, { stats: (typeof data)[0][]; worstStatus: string; lastUpdated: string }>();

      for (const stat of data || []) {
        const existing = zipCodeMap.get(stat.zipCode) || {
          stats: [],
          worstStatus: "safe",
          lastUpdated: stat.lastUpdated,
        };

        existing.stats.push(stat);

        // Update worst status
        if (stat.status === "danger") {
          existing.worstStatus = "danger";
        } else if (stat.status === "warning" && existing.worstStatus !== "danger") {
          existing.worstStatus = "warning";
        }

        // Update last updated
        if (new Date(stat.lastUpdated) > new Date(existing.lastUpdated)) {
          existing.lastUpdated = stat.lastUpdated;
        }

        zipCodeMap.set(stat.zipCode, existing);
      }

      const result: ZipCodeStats[] = Array.from(zipCodeMap.entries()).map(
        ([zipCode, { stats, worstStatus, lastUpdated }]) => ({
          zipCode,
          statCount: stats.length,
          worstStatus: worstStatus as StatStatus,
          lastUpdated,
        })
      );

      // Sort by zip code
      result.sort((a, b) => a.zipCode.localeCompare(b.zipCode));

      setZipCodeStats(result);
    } catch (error) {
      console.error("Error fetching zip code stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZipCodeStats();
  }, []);

  const filteredZipCodes = zipCodeStats.filter((z) =>
    z.zipCode.includes(searchQuery)
  );

  const handleAddZipCode = () => {
    if (newZipCode.match(/^\d{5}$/)) {
      router.push(`/zip-codes/${newZipCode}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Zip Code Stats</h1>
        <p className="text-muted-foreground">
          View and manage safety statistics for each zip code
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by zip code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New zip code"
            value={newZipCode}
            onChange={(e) => setNewZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className="w-32"
          />
          <Button onClick={handleAddZipCode} disabled={!newZipCode.match(/^\d{5}$/)}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Zip Codes</CardTitle>
          <CardDescription>
            {zipCodeStats.length} zip code{zipCodeStats.length !== 1 ? "s" : ""} with data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredZipCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No zip codes match your search."
                : "No zip code data yet. Add a zip code to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zip Code</TableHead>
                  <TableHead>Stats Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredZipCodes.map((zipCode) => (
                  <TableRow key={zipCode.zipCode}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{zipCode.zipCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>{zipCode.statCount} stats</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statStatusColors[zipCode.worstStatus]}
                      >
                        {zipCode.worstStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(zipCode.lastUpdated).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/zip-codes/${zipCode.zipCode}`)}
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
