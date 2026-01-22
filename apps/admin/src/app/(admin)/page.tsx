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
import { Button } from "@/components/ui/button";
import {
  ListChecks,
  MapPin,
  AlertTriangle,
  Upload,
  ArrowRight,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    statDefinitions: 0,
    zipCodesWithData: 0,
    pendingReports: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const client = generateClient<Schema>();

        // Fetch all counts in parallel
        const [statDefsResult, zipCodeStatsResult, reportsResult] =
          await Promise.all([
            client.models.StatDefinition.list(),
            client.models.ZipCodeStat.list(),
            client.models.HazardReport.list(),
          ]);

        // Count stat definitions
        const statDefinitions = statDefsResult.data?.length || 0;

        // Count unique zip codes with data
        const uniqueZipCodes = new Set(
          zipCodeStatsResult.data?.map((stat) => stat.zipCode) || []
        );
        const zipCodesWithData = uniqueZipCodes.size;

        // Count pending reports
        const pendingReports =
          reportsResult.data?.filter((report) => report.status === "pending")
            .length || 0;

        setStats({
          statDefinitions,
          zipCodesWithData,
          pendingReports,
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
      title: "Manage Stat Definitions",
      description: "Add, edit, or remove safety metrics",
      icon: ListChecks,
      href: "/stats",
    },
    {
      title: "Update Zip Code Data",
      description: "Add or modify stats for zip codes",
      icon: MapPin,
      href: "/zip-codes",
    },
    {
      title: "Import Data",
      description: "Bulk import stats via CSV or JSON",
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Stat Definitions
            </CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.statDefinitions}
            </div>
            <p className="text-xs text-muted-foreground">
              Safety metrics configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Zip Codes with Data
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.zipCodesWithData}
            </div>
            <p className="text-xs text-muted-foreground">
              Locations tracked
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
        <div className="grid gap-4 md:grid-cols-2">
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
