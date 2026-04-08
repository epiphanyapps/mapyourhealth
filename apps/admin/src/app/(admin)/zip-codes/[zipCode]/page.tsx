"use client";

import { useEffect, useState, use, useCallback } from "react";
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
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, MapPin, Bell, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { fetchAuthSession } from "aws-amplify/auth";
import { toast } from "sonner";
import {
  statStatusColors,
  type StatStatus,
  contaminantCategoryNames,
  contaminantCategoryColors,
  type ContaminantCategory,
} from "@/lib/constants";

type LocationMeasurement = Schema["LocationMeasurement"]["type"];
type Contaminant = Schema["Contaminant"]["type"];
type ContaminantThreshold = Schema["ContaminantThreshold"]["type"];
type UserSubscription = Schema["UserSubscription"]["type"];

// Lambda function name for notifications
const NOTIFICATIONS_LAMBDA_FUNCTION =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_LAMBDA || "process-notifications";

type AlertLevel = "info" | "warning" | "danger";

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

export default function LocationDetailPage({
  params,
}: {
  params: Promise<{ zipCode: string }>;
}) {
  const { zipCode: locationId } = use(params);
  const cityName = decodeURIComponent(locationId);
  const router = useRouter();
  const [measurements, setMeasurements] = useState<LocationMeasurement[]>([]);
  const [contaminants, setContaminants] = useState<Contaminant[]>([]);
  const [thresholds, setThresholds] = useState<ContaminantThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] =
    useState<LocationMeasurement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    contaminantId: "",
    value: "",
    source: "",
    sourceUrl: "",
    notes: "",
  });

  // Alert dialog state
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>("warning");
  const [customMessage, setCustomMessage] = useState("");
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [subscribers, setSubscribers] = useState<UserSubscription[]>([]);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();

      const [measurementsResult, contaminantsResult, thresholdsResult] =
        await Promise.all([
          client.models.LocationMeasurement.listLocationMeasurementByCity({
            city: cityName,
          }),
          client.models.Contaminant.list({ limit: 1000 }),
          client.models.ContaminantThreshold.list({ limit: 1000 }),
        ]);

      setMeasurements(measurementsResult.data || []);
      setContaminants(contaminantsResult.data || []);
      setThresholds(thresholdsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [cityName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getContaminant = (contaminantId: string) => {
    return contaminants.find((c) => c.contaminantId === contaminantId);
  };

  const getThreshold = (contaminantId: string) => {
    // Try WHO first, then US as fallback
    return (
      thresholds.find(
        (t) =>
          t.contaminantId === contaminantId && t.jurisdictionCode === "WHO",
      ) ||
      thresholds.find(
        (t) => t.contaminantId === contaminantId && t.jurisdictionCode === "US",
      )
    );
  };

  const resetForm = () => {
    setFormData({
      contaminantId: "",
      value: "",
      source: "",
      sourceUrl: "",
      notes: "",
    });
    setEditingMeasurement(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (measurement: LocationMeasurement) => {
    setEditingMeasurement(measurement);
    setFormData({
      contaminantId: measurement.contaminantId,
      value: measurement.value.toString(),
      source: measurement.source || "",
      sourceUrl: measurement.sourceUrl || "",
      notes: measurement.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.contaminantId || !formData.value) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();
      const value = parseFloat(formData.value);
      const now = new Date().toISOString();

      const measurementData = {
        city: cityName,
        state: "",
        country: "",
        contaminantId: formData.contaminantId,
        value,
        measuredAt: now,
        source: formData.source || null,
        sourceUrl: formData.sourceUrl || null,
        notes: formData.notes || null,
      };

      if (editingMeasurement) {
        await client.models.LocationMeasurement.update({
          id: editingMeasurement.id,
          ...measurementData,
        });
        toast.success("Measurement updated");
      } else {
        await client.models.LocationMeasurement.create(measurementData);
        toast.success("Measurement created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving measurement:", error);
      toast.error("Failed to save measurement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (measurement: LocationMeasurement) => {
    const contaminant = getContaminant(measurement.contaminantId);
    if (
      !confirm(
        `Are you sure you want to delete "${contaminant?.name || measurement.contaminantId}"?`,
      )
    ) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.LocationMeasurement.delete({ id: measurement.id });
      toast.success("Measurement deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting measurement:", error);
      toast.error("Failed to delete measurement");
    }
  };

  // Get available contaminants (not already added)
  const availableContaminants = editingMeasurement
    ? contaminants
    : contaminants.filter(
        (c) => !measurements.some((m) => m.contaminantId === c.contaminantId),
      );

  const fetchSubscribers = useCallback(async () => {
    setIsLoadingSubscribers(true);
    try {
      const client = generateClient<Schema>();
      const result = await client.models.UserSubscription.listUserSubscriptionByCity({
        city: cityName,
      });
      setSubscribers(result.data || []);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast.error("Failed to fetch subscribers");
    } finally {
      setIsLoadingSubscribers(false);
    }
  }, [cityName]);

  const openAlertDialog = async () => {
    setAlertLevel("warning");
    setCustomMessage("");
    setIsAlertDialogOpen(true);
    await fetchSubscribers();
  };

  const sendManualAlert = async () => {
    if (subscribers.length === 0) {
      toast.error("No subscribers to notify");
      return;
    }

    setIsSendingAlert(true);
    try {
      const session = await fetchAuthSession();
      const credentials = session.credentials;

      if (!credentials) {
        toast.error("Not authenticated");
        return;
      }

      const lambdaClient = new LambdaClient({
        region: "ca-central-1",
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      const command = new InvokeCommand({
        FunctionName: NOTIFICATIONS_LAMBDA_FUNCTION,
        InvocationType: "RequestResponse",
        Payload: Buffer.from(
          JSON.stringify({
            city: cityName,
            triggerType: "manual_alert",
            adminTriggered: true,
            alertLevel,
            customMessage: customMessage || undefined,
          }),
        ),
      });

      const response = await lambdaClient.send(command);

      if (response.Payload) {
        const result = JSON.parse(Buffer.from(response.Payload).toString());
        if (result.success) {
          toast.success(
            `Alert sent to ${result.subscribersNotified} subscriber(s)`,
          );
          setIsAlertDialogOpen(false);
        } else {
          toast.error(result.errors?.[0] || "Failed to send alert");
        }
      }
    } catch (error) {
      console.error("Error sending alert:", error);
      toast.error("Failed to send alert");
    } finally {
      setIsSendingAlert(false);
    }
  };

  // Count subscribers by notification type
  const subscriberStats = {
    total: subscribers.length,
    email: subscribers.filter((s) => s.enableEmail).length,
    push: subscribers.filter((s) => s.enablePush).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/zip-codes")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-3xl font-bold tracking-tight">{cityName}</h1>
            </div>
            <p className="text-muted-foreground">
              Manage contaminant measurements for this location
            </p>
          </div>
        </div>
        <Button onClick={openAlertDialog} variant="outline">
          <Bell className="mr-2 h-4 w-4" />
          Send Alert
        </Button>
      </div>

      {/* Send Alert Dialog */}
      <Dialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Manual Alert</DialogTitle>
            <DialogDescription>
              Send a notification to all subscribers of {cityName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Alert Level</Label>
              <Select
                value={alertLevel}
                onValueChange={(value: AlertLevel) => setAlertLevel(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="danger">
                    <span className="flex items-center gap-2">
                      <Badge variant="destructive">Danger</Badge>
                      <span className="text-muted-foreground">- Critical issue requiring immediate attention</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="warning">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-yellow-500">Warning</Badge>
                      <span className="text-muted-foreground">- Caution advised</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="info">
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary">Info</Badge>
                      <span className="text-muted-foreground">- General notice</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Message (optional)</Label>
              <Textarea
                id="customMessage"
                placeholder="Enter a custom message for the alert..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                If left empty, a default message will be used.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Subscribers Preview</Label>
              <Card>
                <CardContent className="pt-4">
                  {isLoadingSubscribers ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : subscribers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No subscribers for this location
                    </p>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{subscriberStats.total}</span>
                        <span className="text-muted-foreground">total</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{subscriberStats.push} push</Badge>
                        <Badge variant="outline">{subscriberStats.email} email</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAlertDialogOpen(false)}
              disabled={isSendingAlert}
            >
              Cancel
            </Button>
            <Button
              onClick={sendManualAlert}
              disabled={isSendingAlert || subscribers.length === 0}
            >
              {isSendingAlert ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Send Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Measurements</CardTitle>
            <CardDescription>
              {measurements.length} measurement
              {measurements.length !== 1 ? "s" : ""} for this location
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button
              onClick={openCreateDialog}
              disabled={availableContaminants.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Measurement
            </Button>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingMeasurement ? "Edit Measurement" : "Add Measurement"}
                </DialogTitle>
                <DialogDescription>
                  {editingMeasurement
                    ? "Update the measurement value for this location."
                    : "Add a new contaminant measurement for this location."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="contaminantId">Contaminant *</Label>
                  <Select
                    value={formData.contaminantId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, contaminantId: value })
                    }
                    disabled={!!editingMeasurement}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contaminant" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContaminants.map((c) => (
                        <SelectItem
                          key={c.contaminantId}
                          value={c.contaminantId}
                        >
                          {c.name} ({c.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">Value *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="any"
                    placeholder="Enter measured value"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: e.target.value })
                    }
                  />
                  {formData.contaminantId && formData.value && (
                    <p className="text-sm text-muted-foreground">
                      Status will be:{" "}
                      <Badge
                        variant="secondary"
                        className={
                          statStatusColors[
                            calculateStatus(
                              parseFloat(formData.value),
                              getThreshold(formData.contaminantId),
                              getContaminant(formData.contaminantId)
                                ?.higherIsBad ?? true,
                            )
                          ]
                        }
                      >
                        {calculateStatus(
                          parseFloat(formData.value),
                          getThreshold(formData.contaminantId),
                          getContaminant(formData.contaminantId)?.higherIsBad ??
                            true,
                        )}
                      </Badge>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Data Source</Label>
                  <Input
                    id="source"
                    placeholder="e.g., EPA, CDC, Local Health Dept"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    placeholder="https://..."
                    value={formData.sourceUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, sourceUrl: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingMeasurement ? (
                    "Update"
                  ) : (
                    "Add"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : measurements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No measurements for this location yet. Click &quot;Add
              Measurement&quot; to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contaminant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead title="Where the measurement data was obtained — not the regulatory standard">
                    Data Source
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {measurements.map((measurement) => {
                  const contaminant = getContaminant(measurement.contaminantId);
                  const threshold = getThreshold(measurement.contaminantId);
                  const status = calculateStatus(
                    measurement.value,
                    threshold,
                    contaminant?.higherIsBad ?? true,
                  );

                  return (
                    <TableRow key={measurement.id}>
                      <TableCell className="font-medium">
                        {contaminant?.name || measurement.contaminantId}
                      </TableCell>
                      <TableCell>
                        {contaminant?.category && (
                          <Badge
                            variant="secondary"
                            className={
                              contaminantCategoryColors[
                                contaminant.category as ContaminantCategory
                              ]
                            }
                          >
                            {
                              contaminantCategoryNames[
                                contaminant.category as ContaminantCategory
                              ]
                            }
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {measurement.value} {contaminant?.unit}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statStatusColors[status]}
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{measurement.source || "—"}</TableCell>
                      <TableCell>
                        {measurement.measuredAt
                          ? new Date(
                              measurement.measuredAt,
                            ).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(measurement)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(measurement)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
