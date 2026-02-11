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

// Lambda function name for notifications - should match the deployed function
const NOTIFICATIONS_LAMBDA_FUNCTION =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_LAMBDA || "process-notifications";

type Contaminant = Schema["Contaminant"]["type"];

// Category types for filtering contaminants
type ImportCategory = "water" | "air" | "pathogens";

// Contaminant categories that belong to each import category
const CATEGORY_CONTAMINANT_TYPES: Record<ImportCategory, string[]> = {
  water: [
    "fertilizer",
    "pesticide",
    "radioactive",
    "disinfectant",
    "inorganic",
    "organic",
    "microbiological",
  ],
  air: ["air"], // radon and other air pollutants
  pathogens: ["pathogen", "disease"], // lyme disease, etc.
};

// Category display information
const CATEGORY_INFO: Record<
  ImportCategory,
  { title: string; description: string; icon: typeof Droplets }
> = {
  water: {
    title: "Tap Water Quality",
    description:
      "Import contaminant measurements for water quality (nitrate, lead, arsenic, etc.)",
    icon: Droplets,
  },
  air: {
    title: "Air Pollution",
    description:
      "Import air quality data including radon levels and other airborne contaminants",
    icon: Wind,
  },
  pathogens: {
    title: "Pathogens",
    description:
      "Import disease incidence data such as Lyme disease rates and other pathogen risks",
    icon: Bug,
  },
};

// CSV templates for each category
const CSV_TEMPLATES: Record<
  ImportCategory,
  { example: string; fields: string[] }
> = {
  water: {
    example: `city,state,country,contaminantId,value,source
Beverly Hills,CA,US,nitrate,12500,EPA
Beverly Hills,CA,US,lead,8.2,Local Lab
New York,NY,US,arsenic,5.5,EPA`,
    fields: [
      "city",
      "state",
      "country",
      "contaminantId",
      "value",
      "source (optional)",
    ],
  },
  air: {
    example: `city,state,country,contaminantId,value,source
Beverly Hills,CA,US,radon,4.2,EPA
New York,NY,US,radon,2.1,State Survey
Montreal,QC,CA,radon,3.8,Health Canada`,
    fields: [
      "city",
      "state",
      "country",
      "contaminantId (e.g., radon)",
      "value (pCi/L)",
      "source (optional)",
    ],
  },
  pathogens: {
    example: `city,state,country,contaminantId,value,source
New York,NY,US,lyme_disease,15.2,CDC
Hartford,CT,US,lyme_disease,8.5,State Health Dept
Montreal,QC,CA,lyme_disease,3.2,PHAC`,
    fields: [
      "city",
      "state",
      "country",
      "contaminantId (e.g., lyme_disease)",
      "value (incidence per 100k)",
      "source (optional)",
    ],
  },
};

interface ImportRow {
  city: string;
  state: string;
  country: string;
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
  const activeCategoryRef = useRef<ImportCategory>("water");
  const [activeCategory, setActiveCategory] = useState<ImportCategory>("water");
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
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
      if (
        categoryTypes.some((type) => c.category?.toLowerCase().includes(type))
      ) {
        contaminantMap.set(c.contaminantId, c);
      }
    }

    return contaminantMap;
  };

  const validateRow = (
    row: Partial<ImportRow>,
    contaminantMap: Map<string, Contaminant>,
    category: ImportCategory,
  ): ImportRow => {
    const errors: string[] = [];

    if (!row.city || row.city.length < 1) {
      errors.push("City is required");
    }

    if (!row.state || row.state.length < 1) {
      errors.push("State is required");
    }

    if (!row.country || row.country.length < 1) {
      errors.push("Country is required");
    }

    if (!row.contaminantId) {
      errors.push("Missing contaminant ID");
    } else if (!contaminantMap.has(row.contaminantId)) {
      // Check if it's a valid contaminant but wrong category
      errors.push(
        `Unknown contaminant ID for ${CATEGORY_INFO[category].title}`,
      );
    }

    if (row.value === undefined || isNaN(row.value)) {
      errors.push("Invalid value");
    }

    return {
      city: row.city || "",
      state: row.state || "",
      country: row.country || "",
      contaminantId: row.contaminantId || "",
      value: row.value || 0,
      source: row.source,
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  };

  // Parse a CSV line handling quoted values with commas
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        // Check for escaped quote ""
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const parseCSV = (
    content: string,
  ): { rows: Partial<ImportRow>[]; error?: string } => {
    const lines = content.trim().split("\n");
    if (lines.length === 0) {
      return { rows: [], error: "Empty CSV file" };
    }

    const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase());

    // Find column indices
    const cityIdx = header.indexOf("city");
    const stateIdx = header.indexOf("state");
    const countryIdx = header.indexOf("country");
    const contaminantIdIdx =
      ["contaminantid", "contaminant_id", "statid", "stat_id"]
        .map((name) => header.indexOf(name))
        .find((idx) => idx !== -1) ?? -1;
    const valueIdx = header.indexOf("value");
    const sourceIdx = header.indexOf("source");

    // Validate required columns exist
    const missingColumns: string[] = [];
    if (cityIdx === -1) missingColumns.push("city");
    if (stateIdx === -1) missingColumns.push("state");
    if (countryIdx === -1) missingColumns.push("country");
    if (contaminantIdIdx === -1) missingColumns.push("contaminantId");
    if (valueIdx === -1) missingColumns.push("value");

    if (missingColumns.length > 0) {
      return {
        rows: [],
        error: `Missing required columns: ${missingColumns.join(", ")}`,
      };
    }

    const rows = lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const values = parseCSVLine(line);
        return {
          city: values[cityIdx] || "",
          state: values[stateIdx] || "",
          country: values[countryIdx] || "",
          contaminantId: values[contaminantIdIdx] || "",
          value: parseFloat(values[valueIdx]) || 0,
          source: sourceIdx !== -1 ? values[sourceIdx] : undefined,
        };
      });

    return { rows };
  };

  const parseJSON = (content: string): Partial<ImportRow>[] => {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error("JSON must be an array");
    }
    return data.map((item: Record<string, unknown>) => ({
      city: String(item.city || ""),
      state: String(item.state || ""),
      country: String(item.country || ""),
      contaminantId: String(
        item.contaminantId ||
          item.contaminant_id ||
          item.statId ||
          item.stat_id ||
          "",
      ),
      value: Number(item.value) || 0,
      source: item.source ? String(item.source) : undefined,
    }));
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Capture the category at the start to detect race conditions
    const categoryAtStart = activeCategory;

    setImportResult(null);
    setIsProcessingFile(true);

    try {
      const contaminantMap = await fetchContaminants(categoryAtStart);
      const content = await file.text();

      // Check if category changed during async operation (race condition prevention)
      if (categoryAtStart !== activeCategoryRef.current) {
        toast.info("Category changed. Please re-upload the file.");
        setIsProcessingFile(false);
        return;
      }

      let rows: Partial<ImportRow>[];
      if (file.name.endsWith(".json")) {
        rows = parseJSON(content);
      } else if (file.name.endsWith(".csv")) {
        const result = parseCSV(content);
        if (result.error) {
          toast.error(result.error);
          setIsProcessingFile(false);
          return;
        }
        rows = result.rows;
      } else {
        toast.error("Unsupported file format. Use CSV or JSON.");
        setIsProcessingFile(false);
        return;
      }

      const validatedRows = rows.map((row) =>
        validateRow(row, contaminantMap, categoryAtStart),
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
    } finally {
      setIsProcessingFile(false);
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
            city: row.city,
            state: row.state,
            country: row.country,
            contaminantId: row.contaminantId,
            value: row.value,
            measuredAt: new Date().toISOString(),
            source: row.source || null,
          });

          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push(
            `${row.city}, ${row.state}/${row.contaminantId}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      setImportResult(result);

      if (result.failed === 0) {
        toast.success(`Successfully imported ${result.success} rows`);
        setPreviewData([]);
      } else {
        toast.warning(
          `Imported ${result.success} rows, ${result.failed} failed`,
        );
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
    // Get unique cities from imported data
    const cities = [
      ...new Set(importedRows.map((r) => `${r.city}|${r.state}|${r.country}`)),
    ];

    if (cities.length === 0) return;

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

      // Send notification for each city
      for (const cityKey of cities) {
        const [city, state, country] = cityKey.split("|");
        try {
          const command = new InvokeCommand({
            FunctionName: NOTIFICATIONS_LAMBDA_FUNCTION,
            InvocationType: "RequestResponse",
            Payload: Buffer.from(
              JSON.stringify({
                city,
                state,
                country,
                triggerType: "data_update",
                adminTriggered: true,
              }),
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
          console.error(
            `Failed to send notifications for ${city}, ${state}:`,
            error,
          );
        }
      }

      if (notifiedCount > 0) {
        toast.success(
          `Notified ${notifiedCount} subscriber(s) about the update`,
        );
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
    const newCategory = category as ImportCategory;
    activeCategoryRef.current = newCategory;
    setActiveCategory(newCategory);
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
                  <CardDescription>
                    Array of objects with same fields
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                    {`[
  ${CSV_TEMPLATES[category].example
    .split("\n")
    .slice(1, 3)
    .map((line) => {
      const [city, state, country, contaminantId, value, source] =
        line.split(",");
      return `{"city": "${city}", "state": "${state}", "country": "${country}", "contaminantId": "${contaminantId}", "value": ${value}${source ? `, "source": "${source}"` : ""}}`;
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
            disabled={isProcessingFile}
          />
          <Button
            variant="outline"
            size="lg"
            className="w-full h-32 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile}
          >
            {isProcessingFile ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                <span>Processing file...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span>Click to upload CSV or JSON file</span>
                <span className="text-xs text-muted-foreground">
                  Validating against {CATEGORY_INFO[activeCategory].title}{" "}
                  contaminants
                </span>
              </div>
            )}
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
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Contaminant ID</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 50).map((row, index) => (
                  <TableRow
                    key={index}
                    className={
                      !row.isValid ? "bg-red-50 dark:bg-red-950/30" : ""
                    }
                  >
                    <TableCell>
                      {row.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>{row.city}</TableCell>
                    <TableCell>{row.state}</TableCell>
                    <TableCell>{row.country}</TableCell>
                    <TableCell>{row.contaminantId}</TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell>{row.source || "-"}</TableCell>
                    <TableCell className="text-red-600 dark:text-red-400 text-sm">
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
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                {importResult.success} Imported
              </Badge>
              {importResult.failed > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {importResult.failed} Failed
                </Badge>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-md">
                <p className="font-medium text-red-800 dark:text-red-300 mb-2">
                  Errors:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside">
                  {importResult.errors.slice(0, 10).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
                {importResult.errors.length > 10 && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
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
