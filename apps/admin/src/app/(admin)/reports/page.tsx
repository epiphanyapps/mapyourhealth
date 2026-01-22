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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  CATEGORIES,
  REPORT_STATUS_OPTIONS,
  categoryColors,
  reportStatusColors,
  type Category,
  type ReportStatus,
} from "@/lib/constants";

interface HazardReport {
  id: string;
  category: Category | null;
  description: string;
  location: string;
  zipCode?: string | null;
  status: ReportStatus | null;
  adminNotes?: string | null;
  owner?: string | null;
  createdAt?: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.HazardReport.list();

      if (errors) {
        console.error("Error fetching reports:", errors);
        toast.error("Failed to fetch reports");
        return;
      }

      // Sort by creation date, newest first
      const sortedData = (data || []).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setReports(sortedData as unknown as HazardReport[]);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to fetch reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter((report) => {
    if (statusFilter !== "all" && report.status !== statusFilter) return false;
    if (categoryFilter !== "all" && report.category !== categoryFilter) return false;
    return true;
  });

  const openReportDialog = (report: HazardReport) => {
    setSelectedReport(report);
    setAdminNotes(report.adminNotes || "");
  };

  const updateReportStatus = async (newStatus: ReportStatus) => {
    if (!selectedReport) return;

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();
      await client.models.HazardReport.update({
        id: selectedReport.id,
        status: newStatus,
        adminNotes: adminNotes || null,
      });

      toast.success(`Report marked as ${newStatus}`);
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
    } finally {
      setIsSaving(false);
    }
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hazard Reports</h1>
        <p className="text-muted-foreground">
          Review and moderate user-submitted hazard reports
        </p>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <span className="text-yellow-800">
            {pendingCount} report{pendingCount !== 1 ? "s" : ""} awaiting review
          </span>
        </div>
      )}

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {REPORT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
          <CardDescription>
            {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}{" "}
            {statusFilter !== "all" || categoryFilter !== "all" ? "(filtered)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports match your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          report.category ? categoryColors[report.category] : ""
                        }
                      >
                        {report.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {report.description}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="truncate max-w-32">{report.location}</div>
                        {report.zipCode && (
                          <div className="text-xs text-muted-foreground">
                            {report.zipCode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={reportStatusColors[report.status || "pending"]}
                      >
                        {report.status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReportDialog(report)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Review this hazard report and update its status
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="mt-1">
                    <Badge
                      variant="secondary"
                      className={
                        selectedReport.category
                          ? categoryColors[selectedReport.category]
                          : ""
                      }
                    >
                      {selectedReport.category}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Status</Label>
                  <p className="mt-1">
                    <Badge
                      variant="secondary"
                      className={reportStatusColors[selectedReport.status || "pending"]}
                    >
                      {selectedReport.status || "pending"}
                    </Badge>
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Location</Label>
                <p className="mt-1">{selectedReport.location}</p>
                {selectedReport.zipCode && (
                  <p className="text-sm text-muted-foreground">
                    Zip: {selectedReport.zipCode}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 p-3 bg-muted rounded-md">
                  {selectedReport.description}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">Submitted</Label>
                <p className="mt-1">
                  {selectedReport.createdAt
                    ? new Date(selectedReport.createdAt).toLocaleString()
                    : "Unknown"}
                </p>
              </div>

              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Input
                  id="adminNotes"
                  placeholder="Add internal notes about this report..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => updateReportStatus("reviewed")}
              disabled={isSaving}
            >
              <Eye className="mr-2 h-4 w-4" />
              Mark Reviewed
            </Button>
            <Button
              variant="outline"
              onClick={() => updateReportStatus("dismissed")}
              disabled={isSaving}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Dismiss
            </Button>
            <Button
              onClick={() => updateReportStatus("resolved")}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
