"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Droplets,
  MapPin,
  AlertTriangle,
  Upload,
  ArrowRight,
  Globe,
  Scale,
} from "lucide-react";

type LocationMeasurement = Schema["LocationMeasurement"]["type"];
type HazardReport = Schema["HazardReport"]["type"];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    contaminants: 0,
    locationsWithData: 0,
    pendingReports: 0,
    jurisdictions: 0,
    thresholds: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const client = generateClient<Schema>();

        // Fetch all counts in parallel
        const [contaminantsResult, measurementsResult, reportsResult, jurisdictionsResult, thresholdsResult] =
          await Promise.all([
            client.models.Contaminant.list({ limit: 1000 }),
            client.models.LocationMeasurement.list({ limit: 1000 }),
            client.models.HazardReport.list({ limit: 1000 }),
            client.models.Jurisdiction.list({ limit: 100 }),
            client.models.ContaminantThreshold.list({ limit: 1000 }),
          ]);

        // Count contaminants
        const contaminants = contaminantsResult.data?.length || 0;

        // Count unique postal codes with data
        const uniquePostalCodes = new Set(
          measurementsResult.data?.map((m: LocationMeasurement) => m.postalCode) || []
        );
        const locationsWithData = uniquePostalCodes.size;

        // Count pending reports
        const pendingReports =
          reportsResult.data?.filter((report: HazardReport) => report.status === "pending")
            .length || 0;

        // Count jurisdictions and thresholds
        const jurisdictions = jurisdictionsResult.data?.length || 0;
        const thresholds = thresholdsResult.data?.length || 0;

        setStats({
          contaminants,
          locationsWithData,
          pendingReports,
          jurisdictions,
          thresholds,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickActions = [
    {
      title: "Manage Contaminants",
      description: "Add, edit, or remove contaminant definitions",
      icon: Droplets,
      href: "/stats",
    },
    {
      title: "Manage Thresholds",
      description: "Configure jurisdiction-specific limits",
      icon: Scale,
      href: "/thresholds",
    },
    {
      title: "Manage Jurisdictions",
      description: "Add or edit regulatory jurisdictions",
      icon: Globe,
      href: "/jurisdictions",
    },
    {
      title: "Location Measurements",
      description: "Add or modify measurements for postal codes",
      icon: MapPin,
      href: "/zip-codes",
    },
    {
      title: "Import Data",
      description: "Bulk import data via CSV or JSON",
      icon: Upload,
      href: "/import",
    },
    {
      title: "Review Reports",
      description: "Moderate user-submitted hazard reports",
      icon: AlertTriangle,
      href: "/reports",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the MapYourHealth Admin Portal
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contaminants
            </CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.contaminants}
            </div>
            <p className="text-xs text-muted-foreground">
              Defined contaminants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Jurisdictions
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.jurisdictions}
            </div>
            <p className="text-xs text-muted-foreground">
              Regulatory regions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Thresholds
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.thresholds}
            </div>
            <p className="text-xs text-muted-foreground">
              Configured limits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Locations with Data
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.locationsWithData}
            </div>
            <p className="text-xs text-muted-foreground">
              Postal codes tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reports
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.pendingReports}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:bg-muted/50 transition-colors">
              <Link href={action.href}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <action.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {action.title}
                        </CardTitle>
                        <CardDescription>{action.description}</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
