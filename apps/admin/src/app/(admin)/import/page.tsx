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
import { Upload, FileJson, FileSpreadsheet, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ImportRow {
  zipCode: string;
  statId: string;
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
  const [statDefinitions, setStatDefinitions] = useState<Map<string, { dangerThreshold: number; warningThreshold: number; higherIsBad: boolean }>>(new Map());

  const fetchStatDefinitions = async () => {
    const client = generateClient<Schema>();
    const { data } = await client.models.StatDefinition.list();

    const defsMap = new Map();
    for (const def of data || []) {
      defsMap.set(def.statId, {
        dangerThreshold: def.dangerThreshold,
        warningThreshold: def.warningThreshold,
        higherIsBad: def.higherIsBad ?? true,
      });
    }
    setStatDefinitions(defsMap);
    return defsMap;
  };

  const validateRow = (row: Partial<ImportRow>, defs: Map<string, { dangerThreshold: number; warningThreshold: number; higherIsBad: boolean }>): ImportRow => {
    const errors: string[] = [];

    if (!row.zipCode || !/^\d{5}$/.test(row.zipCode)) {
      errors.push("Invalid zip code");
    }

    if (!row.statId || !defs.has(row.statId)) {
      errors.push("Unknown stat ID");
    }

    if (row.value === undefined || isNaN(row.value)) {
      errors.push("Invalid value");
    }

    return {
      zipCode: row.zipCode || "",
      statId: row.statId || "",
      value: row.value || 0,
      source: row.source,
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  };

  const parseCSV = (content: string): Partial<ImportRow>[] => {
    const lines = content.trim().split("\n");
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());

    const zipCodeIdx = header.indexOf("zipcode") !== -1 ? header.indexOf("zipcode") : header.indexOf("zip_code");
    const statIdIdx = header.indexOf("statid") !== -1 ? header.indexOf("statid") : header.indexOf("stat_id");
    const valueIdx = header.indexOf("value");
    const sourceIdx = header.indexOf("source");

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return {
        zipCode: values[zipCodeIdx] || "",
        statId: values[statIdIdx] || "",
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
      zipCode: String(item.zipCode || item.zip_code || ""),
      statId: String(item.statId || item.stat_id || ""),
      value: Number(item.value) || 0,
      source: item.source ? String(item.source) : undefined,
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportResult(null);

    try {
      const defs = await fetchStatDefinitions();
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

      const validatedRows = rows.map((row) => validateRow(row, defs));
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

  const calculateStatus = (value: number, def: { dangerThreshold: number; warningThreshold: number; higherIsBad: boolean }): "danger" | "warning" | "safe" => {
    if (def.higherIsBad) {
      if (value >= def.dangerThreshold) return "danger";
      if (value >= def.warningThreshold) return "warning";
      return "safe";
    } else {
      if (value <= def.dangerThreshold) return "danger";
      if (value <= def.warningThreshold) return "warning";
      return "safe";
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
          const def = statDefinitions.get(row.statId);
          if (!def) {
            result.failed++;
            result.errors.push(`${row.zipCode}/${row.statId}: Unknown stat`);
            continue;
          }

          const status = calculateStatus(row.value, def);

          await client.models.ZipCodeStat.create({
            zipCode: row.zipCode,
            statId: row.statId,
            value: row.value,
            status,
            lastUpdated: new Date().toISOString(),
            source: row.source || null,
          });

          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push(`${row.zipCode}/${row.statId}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      setImportResult(result);

      if (result.failed === 0) {
        toast.success(`Successfully imported ${result.success} rows`);
        setPreviewData([]);
      } else {
        toast.warning(`Imported ${result.success} rows, ${result.failed} failed`);
      }
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = previewData.filter((r) => r.isValid).length;
  const invalidCount = previewData.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground">
          Bulk import zip code stats from CSV or JSON files
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
{`zipCode,statId,value,source
90210,lead_levels,12.5,EPA
90210,aqi,85,EPA
10001,lead_levels,8.2,Local`}
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
  {"zipCode": "90210", "statId": "lead_levels", "value": 12.5, "source": "EPA"},
  {"zipCode": "90210", "statId": "aqi", "value": 85}
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
            <Button onClick={handleImport} disabled={isImporting || validCount === 0}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import {validCount} Rows
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Zip Code</TableHead>
                  <TableHead>Stat ID</TableHead>
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
                    <TableCell>{row.zipCode}</TableCell>
                    <TableCell>{row.statId}</TableCell>
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
