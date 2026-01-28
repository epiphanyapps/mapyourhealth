"use client";

import { useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Upload, FileJson, FileSpreadsheet, Loader2, CheckCircle, XCircle, Bell } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { fetchAuthSession } from "aws-amplify/auth";

type Contaminant = Schema["Contaminant"]["type"];

interface ImportRow {
  postalCode: string;
  contaminantId: string;
  value: number;
  source?: string;
  isValid: boolean;
  error?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [contaminants, setContaminants] = useState<Map<string, Contaminant>>(new Map());
  const [notifySubscribers, setNotifySubscribers] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const fetchContaminants = async () => {
    const client = generateClient<Schema>();
    const { data } = await client.models.Contaminant.list({ limit: 1000 });

    const contaminantMap = new Map<string, Contaminant>();
    for (const c of data || []) {
      contaminantMap.set(c.contaminantId, c);
    }
    setContaminants(contaminantMap);
    return contaminantMap;
  };

  const validateRow = (row: Partial<ImportRow>, contaminantMap: Map<string, Contaminant>): ImportRow => {
    const errors: string[] = [];

    if (!row.postalCode || row.postalCode.length < 2) {
      errors.push("Invalid postal code");
    }

    if (!row.contaminantId || !contaminantMap.has(row.contaminantId)) {
      errors.push("Unknown contaminant ID");
    }

    if (row.value === undefined || isNaN(row.value)) {
      errors.push("Invalid value");
    }

    return {
      postalCode: row.postalCode || "",
      contaminantId: row.contaminantId || "",
      value: row.value || 0,
      source: row.source,
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  };

  const parseCSV = (content: string): Partial<ImportRow>[] => {
    const lines = content.trim().split("\n");
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());

    const postalCodeIdx = header.indexOf("postalcode") !== -1 ? header.indexOf("postalcode") :
                          header.indexOf("postal_code") !== -1 ? header.indexOf("postal_code") :
                          header.indexOf("zipcode") !== -1 ? header.indexOf("zipcode") : header.indexOf("zip_code");
    const contaminantIdIdx = header.indexOf("contaminantid") !== -1 ? header.indexOf("contaminantid") :
                             header.indexOf("contaminant_id") !== -1 ? header.indexOf("contaminant_id") :
                             header.indexOf("statid") !== -1 ? header.indexOf("statid") : header.indexOf("stat_id");
    const valueIdx = header.indexOf("value");
    const sourceIdx = header.indexOf("source");

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return {
        postalCode: values[postalCodeIdx] || "",
        contaminantId: values[contaminantIdIdx] || "",
        value: parseFloat(values[valueIdx]) || 0,
        source: sourceIdx !== -1 ? values[sourceIdx] : undefined,
      };
    });
  };

  const parseJSON = (content: string): Partial<ImportRow>[] => {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error("JSON must be an array");
    }
    return data.map((item: Record<string, unknown>) => ({
      postalCode: String(item.postalCode || item.postal_code || item.zipCode || item.zip_code || ""),
      contaminantId: String(item.contaminantId || item.contaminant_id || item.statId || item.stat_id || ""),
      value: Number(item.value) || 0,
      source: item.source ? String(item.source) : undefined,
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportResult(null);

    try {
      const contaminantMap = await fetchContaminants();
      const content = await file.text();

      let rows: Partial<ImportRow>[];
      if (file.name.endsWith(".json")) {
        rows = parseJSON(content);
      } else if (file.name.endsWith(".csv")) {
        rows = parseCSV(content);
      } else {
        toast.error("Unsupported file format. Use CSV or JSON.");
        return;
      }

      const validatedRows = rows.map((row) => validateRow(row, contaminantMap));
      setPreviewData(validatedRows);

      const invalidCount = validatedRows.filter((r) => !r.isValid).length;
      if (invalidCount > 0) {
        toast.warning(`${invalidCount} row(s) have validation errors`);
      } else {
        toast.success(`${validatedRows.length} rows ready to import`);
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse file");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    const validRows = previewData.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setIsImporting(true);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    try {
      const client = generateClient<Schema>();

      for (const row of validRows) {
        try {
          await client.models.LocationMeasurement.create({
            postalCode: row.postalCode,
            contaminantId: row.contaminantId,
            value: row.value,
            measuredAt: new Date().toISOString(),
            source: row.source || null,
          });

          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push(`${row.postalCode}/${row.contaminantId}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      setImportResult(result);

      if (result.failed === 0) {
        toast.success(`Successfully imported ${result.success} rows`);
        setPreviewData([]);
      } else {
        toast.warning(`Imported ${result.success} rows, ${result.failed} failed`);
      }

      // Send notifications if enabled and we had successful imports
      if (notifySubscribers && result.success > 0) {
        await sendNotifications(validRows);
      }
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const sendNotifications = async (importedRows: ImportRow[]) => {
    // Get unique postal codes from imported data
    const postalCodes = [...new Set(importedRows.map((r) => r.postalCode))];

    if (postalCodes.length === 0) return;

    setIsNotifying(true);
    let notifiedCount = 0;

    try {
      // Get AWS credentials from Amplify Auth
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

      // Send notification for each postal code
      for (const postalCode of postalCodes) {
        try {
          const command = new InvokeCommand({
            FunctionName: "process-notifications",
            InvocationType: "RequestResponse",
            Payload: Buffer.from(JSON.stringify({
              postalCode,
              triggerType: "data_update",
              adminTriggered: true,
            })),
          });

          const response = await lambdaClient.send(command);

          if (response.Payload) {
            const result = JSON.parse(Buffer.from(response.Payload).toString());
            if (result.subscribersNotified > 0) {
              notifiedCount += result.subscribersNotified;
            }
          }
        } catch (error) {
          console.error(`Failed to send notifications for ${postalCode}:`, error);
        }
      }

      if (notifiedCount > 0) {
        toast.success(`Notified ${notifiedCount} subscriber(s) about the update`);
      } else {
        toast.info("No subscribers to notify for these locations");
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
      toast.error("Failed to send some notifications");
    } finally {
      setIsNotifying(false);
    }
  };

  const validCount = previewData.filter((r) => r.isValid).length;
  const invalidCount = previewData.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground">
          Bulk import location measurements from CSV or JSON files
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              CSV Format
            </CardTitle>
            <CardDescription>Comma-separated values file</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`postalCode,contaminantId,value,source
90210,nitrate,12500,EPA
90210,lead,8.2,Local
10001,arsenic,5.5,EPA`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              JSON Format
            </CardTitle>
            <CardDescription>JavaScript Object Notation file</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`[
  {"postalCode": "90210", "contaminantId": "nitrate", "value": 12500, "source": "EPA"},
  {"postalCode": "90210", "contaminantId": "lead", "value": 8.2}
]`}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Select a CSV or JSON file to preview and import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="lg"
            className="w-full h-32 border-dashed"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span>Click to upload CSV or JSON file</span>
            </div>
          </Button>
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {validCount} valid, {invalidCount} invalid rows
              </CardDescription>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="notify-subscribers"
                  checked={notifySubscribers}
                  onCheckedChange={setNotifySubscribers}
                />
                <Label htmlFor="notify-subscribers" className="flex items-center gap-1.5 cursor-pointer">
                  <Bell className="h-4 w-4" />
                  Notify subscribers
                </Label>
              </div>
              <Button onClick={handleImport} disabled={isImporting || isNotifying || validCount === 0}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : isNotifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Notifying...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import {validCount} Rows
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Postal Code</TableHead>
                  <TableHead>Contaminant ID</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 50).map((row, index) => (
                  <TableRow key={index} className={!row.isValid ? "bg-red-50" : ""}>
                    <TableCell>
                      {row.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>{row.postalCode}</TableCell>
                    <TableCell>{row.contaminantId}</TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell>{row.source || "-"}</TableCell>
                    <TableCell className="text-red-600 text-sm">
                      {row.error}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {previewData.length > 50 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Showing first 50 of {previewData.length} rows
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {importResult.success} Imported
              </Badge>
              {importResult.failed > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {importResult.failed} Failed
                </Badge>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="bg-red-50 p-3 rounded-md">
                <p className="font-medium text-red-800 mb-2">Errors:</p>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {importResult.errors.slice(0, 10).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
                {importResult.errors.length > 10 && (
                  <p className="text-sm text-red-600 mt-2">
                    ...and {importResult.errors.length - 10} more errors
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
