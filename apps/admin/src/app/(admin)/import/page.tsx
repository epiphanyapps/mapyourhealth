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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  Bell,
  Droplets,
  Wind,
  Bug,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { fetchAuthSession } from "aws-amplify/auth";

type Contaminant = Schema["Contaminant"]["type"];

// Category types for filtering contaminants
type ImportCategory = "water" | "air" | "pathogens";

// Contaminant categories that belong to each import category
const CATEGORY_CONTAMINANT_TYPES: Record<ImportCategory, string[]> = {
  water: ["fertilizer", "pesticide", "radioactive", "disinfectant", "inorganic", "organic", "microbiological"],
  air: ["air"], // radon and other air pollutants
  pathogens: ["pathogen", "disease"], // lyme disease, etc.
};

// Category display information
const CATEGORY_INFO: Record<ImportCategory, { title: string; description: string; icon: typeof Droplets }> = {
  water: {
    title: "Tap Water Quality",
    description: "Import contaminant measurements for water quality (nitrate, lead, arsenic, etc.)",
    icon: Droplets,
  },
  air: {
    title: "Air Pollution",
    description: "Import air quality data including radon levels and other airborne contaminants",
    icon: Wind,
  },
  pathogens: {
    title: "Pathogens",
    description: "Import disease incidence data such as Lyme disease rates and other pathogen risks",
    icon: Bug,
  },
};

// CSV templates for each category
const CSV_TEMPLATES: Record<ImportCategory, { example: string; fields: string[] }> = {
  water: {
    example: `postalCode,contaminantId,value,source
90210,nitrate,12500,EPA
90210,lead,8.2,Local Lab
10001,arsenic,5.5,EPA`,
    fields: ["postalCode", "contaminantId", "value", "source (optional)"],
  },
  air: {
    example: `postalCode,contaminantId,value,source
90210,radon,4.2,EPA
10001,radon,2.1,State Survey
H2X1Y6,radon,3.8,Health Canada`,
    fields: ["postalCode", "contaminantId (e.g., radon)", "value (pCi/L)", "source (optional)"],
  },
  pathogens: {
    example: `postalCode,contaminantId,value,source
10001,lyme_disease,15.2,CDC
06001,lyme_disease,8.5,State Health Dept
H2X1Y6,lyme_disease,3.2,PHAC`,
    fields: ["postalCode", "contaminantId (e.g., lyme_disease)", "value (incidence per 100k)", "source (optional)"],
  },
};

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
  const [activeCategory, setActiveCategory] = useState<ImportCategory>("water");
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [contaminantsMap, setContaminantsMap] = useState<Map<string, Contaminant>>(new Map());
  const [notifySubscribers, setNotifySubscribers] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const fetchContaminants = async (category: ImportCategory) => {
    const client = generateClient<Schema>();
    const { data } = await client.models.Contaminant.list({ limit: 1000 });

    // Filter contaminants by category
    const categoryTypes = CATEGORY_CONTAMINANT_TYPES[category];
    const contaminantMap = new Map<string, Contaminant>();

    for (const c of data || []) {
      // Include if contaminant's category matches any of the category types
      if (categoryTypes.some(type => c.category?.toLowerCase().includes(type))) {
        contaminantMap.set(c.contaminantId, c);
      }
    }

    setContaminantsMap(contaminantMap);
    return contaminantMap;
  };

  const validateRow = (
    row: Partial<ImportRow>,
    contaminantMap: Map<string, Contaminant>,
    category: ImportCategory
  ): ImportRow => {
    const errors: string[] = [];

    if (!row.postalCode || row.postalCode.length < 2) {
      errors.push("Invalid postal code");
    }

    if (!row.contaminantId) {
      errors.push("Missing contaminant ID");
    } else if (!contaminantMap.has(row.contaminantId)) {
      // Check if it's a valid contaminant but wrong category
      errors.push(`Unknown contaminant ID for ${CATEGORY_INFO[category].title}`);
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

    const postalCodeIdx =
      header.indexOf("postalcode") !== -1
        ? header.indexOf("postalcode")
        : header.indexOf("postal_code") !== -1
          ? header.indexOf("postal_code")
          : header.indexOf("zipcode") !== -1
            ? header.indexOf("zipcode")
            : header.indexOf("zip_code");
    const contaminantIdIdx =
      header.indexOf("contaminantid") !== -1
        ? header.indexOf("contaminantid")
        : header.indexOf("contaminant_id") !== -1
          ? header.indexOf("contaminant_id")
          : header.indexOf("statid") !== -1
            ? header.indexOf("statid")
            : header.indexOf("stat_id");
    const valueIdx = header.indexOf("value");
    const sourceIdx = header.indexOf("source");

    return lines.slice(1).filter(line => line.trim()).map((line) => {
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
      postalCode: String(
        item.postalCode || item.postal_code || item.zipCode || item.zip_code || ""
      ),
      contaminantId: String(
        item.contaminantId || item.contaminant_id || item.statId || item.stat_id || ""
      ),
      value: Number(item.value) || 0,
      source: item.source ? String(item.source) : undefined,
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportResult(null);

    try {
      const contaminantMap = await fetchContaminants(activeCategory);
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

      const validatedRows = rows.map((row) =>
        validateRow(row, contaminantMap, activeCategory)
      );
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
          result.errors.push(
            `${row.postalCode}/${row.contaminantId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
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
            Payload: Buffer.from(
              JSON.stringify({
                postalCode,
                triggerType: "data_update",
                adminTriggered: true,
              })
            ),
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

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category as ImportCategory);
    setPreviewData([]);
    setImportResult(null);
  };

  const validCount = previewData.filter((r) => r.isValid).length;
  const invalidCount = previewData.filter((r) => !r.isValid).length;

  const CategoryIcon = CATEGORY_INFO[activeCategory].icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground">
          Bulk import location measurements by category
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="water" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Water Quality
          </TabsTrigger>
          <TabsTrigger value="air" className="flex items-center gap-2">
            <Wind className="h-4 w-4" />
            Air Pollution
          </TabsTrigger>
          <TabsTrigger value="pathogens" className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Pathogens
          </TabsTrigger>
        </TabsList>

        {(["water", "air", "pathogens"] as ImportCategory[]).map((category) => (
          <TabsContent key={category} value={category} className="space-y-6">
            {/* Category Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category === "water" && <Droplets className="h-5 w-5" />}
                  {category === "air" && <Wind className="h-5 w-5" />}
                  {category === "pathogens" && <Bug className="h-5 w-5" />}
                  {CATEGORY_INFO[category].title}
                </CardTitle>
                <CardDescription>
                  {CATEGORY_INFO[category].description}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Format Examples */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    CSV Format
                  </CardTitle>
                  <CardDescription>
                    Required fields: {CSV_TEMPLATES[category].fields.join(", ")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                    {CSV_TEMPLATES[category].example}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileJson className="h-5 w-5" />
                    JSON Format
                  </CardTitle>
                  <CardDescription>Array of objects with same fields</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                    {`[
  ${CSV_TEMPLATES[category].example
    .split("\n")
    .slice(1, 3)
    .map((line) => {
      const [postalCode, contaminantId, value, source] = line.split(",");
      return `{"postalCode": "${postalCode}", "contaminantId": "${contaminantId}", "value": ${value}${source ? `, "source": "${source}"` : ""}}`;
    })
    .join(",\n  ")}
]`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Upload Card - shared across all categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CategoryIcon className="h-5 w-5" />
            Upload {CATEGORY_INFO[activeCategory].title} Data
          </CardTitle>
          <CardDescription>
            Select a CSV or JSON file to preview and import into{" "}
            {CATEGORY_INFO[activeCategory].title}
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
              <span className="text-xs text-muted-foreground">
                Validating against {CATEGORY_INFO[activeCategory].title} contaminants
              </span>
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
                <Label
                  htmlFor="notify-subscribers"
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  Notify subscribers
                </Label>
              </div>
              <Button
                onClick={handleImport}
                disabled={isImporting || isNotifying || validCount === 0}
              >
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
                    <TableCell className="text-red-600 text-sm">{row.error}</TableCell>
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
