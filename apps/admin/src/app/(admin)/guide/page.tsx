"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Compass,
  Database,
  FileSpreadsheet,
  GitBranch,
  LayoutGrid,
  Lightbulb,
  Smartphone,
  VolumeX,
  ExternalLink,
  MapPin,
  TestTube,
  Droplets,
  Wind,
  Heart,
  AlertTriangle,
} from "lucide-react";
import { adminSectionGroups } from "./data/admin-sections";
import { AdminSectionCard } from "./components/AdminSectionCard";

const crossCuttingTopics = [
  { id: "data-import", title: "Data Import" },
  { id: "entity-types", title: "Entity Types" },
  { id: "silent-import", title: "Silent Import" },
  { id: "relationships", title: "Relationships" },
  { id: "best-practices", title: "Best Practices" },
];

/** One row per admin route. `bulk` reflects what you can do today via
 *  the form / file upload (Yes = file upload, Export only = JSON export
 *  with no matching import path). `mobile` is what end users feel when
 *  you change something here. Keep entries scan-friendly. */
type CapabilityRow = {
  section: string;
  route: string;
  whatYouCanDo: string;
  bulk: "Yes" | "No" | "Export only";
  mobile: string;
};

const capabilityRows: CapabilityRow[] = [
  {
    section: "Dashboard",
    route: "/",
    whatYouCanDo: "Read-only platform stats; entry point to the rest of admin.",
    bulk: "No",
    mobile: "—",
  },
  {
    section: "Analytics",
    route: "/analytics",
    whatYouCanDo: "Aggregate usage and city-traffic analytics.",
    bulk: "No",
    mobile: "—",
  },
  {
    section: "Contaminants",
    route: "/contaminants",
    whatYouCanDo:
      "Define what gets measured (174 contaminants — name EN/FR, category, unit, higherIsBad).",
    bulk: "Export only",
    mobile: "Drives names + categorization on Water/Air drill-down",
  },
  {
    section: "Thresholds",
    route: "/thresholds",
    whatYouCanDo:
      "Per-jurisdiction limit + warningRatio for each contaminant (WHO, US-NY, CA-QC, …).",
    bulk: "No",
    mobile: "Powers safe / warning / danger status colors",
  },
  {
    section: "Jurisdictions",
    route: "/jurisdictions",
    whatYouCanDo:
      "Add or rename regulatory regions (countries, states, EU, WHO).",
    bulk: "No",
    mobile: "Drives WHO vs. local column on water table",
  },
  {
    section: "Categories",
    route: "/categories",
    whatYouCanDo:
      "Top-level dashboard groupings (Water, Air, …): name, icon, color, isActive.",
    bulk: "No",
    mobile: "Dashboard category cards",
  },
  {
    section: "Sub-Categories",
    route: "/subcategories",
    whatYouCanDo:
      "Group contaminants under a category (Fertilizers, Pesticides, Heavy Metals, …).",
    bulk: "No",
    mobile: "Sub-category rows under each category card",
  },
  {
    section: "Measurements",
    route: "/measurements",
    whatYouCanDo:
      "List of cities that have measurements; click Manage to edit measurements one by one.",
    bulk: "No",
    mobile: "Source of the per-city contaminant table",
  },
  {
    section: "Import Data",
    route: "/import",
    whatYouCanDo:
      "Upload CSV / JSON / Excel of LocationMeasurement rows for Water Quality and Air Pollution.",
    bulk: "Yes",
    mobile: "Populates the city's contaminant table after import",
  },
  {
    section: "Warning Banners",
    route: "/banners",
    whatYouCanDo:
      "Post per-location, time-windowed advisories with severity (boil-water, tick alert, etc.).",
    bulk: "No",
    mobile: "Banner at the top of the dashboard for that location",
  },
  {
    section: "Landing Page",
    route: "/landing-page",
    whatYouCanDo:
      "Edit the marketing landing page (hero copy, logo, CTA, theme preview).",
    bulk: "No",
    mobile: "—  (web landing only)",
  },
  {
    section: "Hazard Reports",
    route: "/hazard-reports",
    whatYouCanDo: "Review and moderate user-submitted hazard reports.",
    bulk: "No",
    mobile: '"Report Hazard" button writes here',
  },
  {
    section: "Subscribers",
    route: "/subscribers",
    whatYouCanDo: "View newsletter signups captured by the landing page.",
    bulk: "No",
    mobile: "—",
  },
  {
    section: "Pollution Sources",
    route: "/pollution-sources",
    whatYouCanDo:
      "Plot industrial sites / landfills / spills on a map with severity, impact radius, status.",
    bulk: "No",
    mobile:
      "Orphan — consumer card removed in #309. Decision pending on EPI-25.",
  },
  {
    section: "Guide",
    route: "/guide",
    whatYouCanDo:
      "This page — what each admin section does, how it reaches mobile, and the testing reference.",
    bulk: "No",
    mobile: "—",
  },
  {
    section: "Settings",
    route: "/settings",
    whatYouCanDo:
      "App-wide feature toggles (Coming Soon Gate) + destructive Wipe / Reseed actions.",
    bulk: "No",
    mobile: "Coming Soon Gate flips the unauthenticated mobile entry",
  },
  {
    section: "Properties",
    route: "/properties",
    whatYouCanDo:
      "Define observed-property catalog (radon, lyme_disease, …): zone / endemic / numeric / incidence / binary.",
    bulk: "Export only",
    mobile: "Orphan — no mobile consumer. Decision pending on EPI-25.",
  },
  {
    section: "Property Thresholds",
    route: "/property-thresholds",
    whatYouCanDo:
      "Per-jurisdiction rules per property (zone-mapping JSON, endemic-is-danger flag, incidence cutoffs).",
    bulk: "No",
    mobile: "Orphan — no mobile consumer. Decision pending on EPI-25.",
  },
  {
    section: "Observations",
    route: "/observations",
    whatYouCanDo:
      "Per-location observation (radon zone for a county, Lyme endemic status for a province, …).",
    bulk: "No",
    mobile:
      "Orphan — consumer card removed in #309. Decision pending on EPI-25.",
  },
];

const dataPatterns = [
  {
    pattern: "Time-bounded advisory",
    examples: "Boil-water notice, tick-season warning, post-spill plant alert.",
    where: "/banners",
    bulk: "No (one banner per location, per advisory).",
  },
  {
    pattern: "Per-city water/air measurements",
    examples: "Lead, nitrate, atrazine, radon-in-air for a specific city.",
    where: "/import (bulk) or /measurements (per-record)",
    bulk: "Yes — Water Quality + Air Pollution tabs accept CSV / JSON / Excel.",
  },
  {
    pattern: "Reference catalog (orphan — see EPI-25)",
    examples:
      "EPA radon zones, INSPQ Lyme endemic status, landfill location + impact radius.",
    where: "/observations (per-record) or /pollution-sources (map-pin)",
    bulk: "No bulk path today, and the mobile consumer cards were removed in #309 — do not enter data here until EPI-25 closes.",
  },
];

const VALID_TABS = ["sections", "cross-cutting", "testing", "data"] as const;
type GuideTab = (typeof VALID_TABS)[number];

function isValidTab(value: string | null): value is GuideTab {
  return value !== null && (VALID_TABS as readonly string[]).includes(value);
}

function GuidePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: GuideTab = isValidTab(tabParam) ? tabParam : "sections";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "sections") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const query = params.toString();
    router.replace(query ? `/guide?${query}` : "/guide", { scroll: false });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Guide</h1>
        <p className="text-muted-foreground">
          What every admin section does, every form field it exposes, and how
          mobile users will experience your changes.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="cross-cutting">Cross-cutting</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="data">Data &amp; Reseed</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-8">
          <SectionsTab />
        </TabsContent>

        <TabsContent value="cross-cutting" className="space-y-8">
          <CrossCuttingTab />
        </TabsContent>

        <TabsContent value="testing" className="space-y-8">
          <TestingTab />
        </TabsContent>

        <TabsContent value="data" className="space-y-8">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Guide</h1>
          </div>
        </div>
      }
    >
      <GuidePageContent />
    </Suspense>
  );
}

function SectionsTab() {
  return (
    <>
      {/* Capabilities at a glance — every admin route in one scan-friendly table. */}
      <Card id="capabilities-overview" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Capabilities at a glance
          </CardTitle>
          <CardDescription>
            Every admin section in one row: what you can do, whether bulk upload
            exists, and how a mobile user feels your change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Section</th>
                  <th className="py-2 pr-4 font-medium">Route</th>
                  <th className="py-2 pr-4 font-medium">What you can do</th>
                  <th className="py-2 pr-4 font-medium">Bulk</th>
                  <th className="py-2 font-medium">Mobile surface</th>
                </tr>
              </thead>
              <tbody>
                {capabilityRows.map((row) => (
                  <tr
                    key={row.route}
                    className="border-b last:border-0 align-top"
                  >
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">
                      {row.section}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">
                        {row.route}
                      </code>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.whatYouCanDo}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span
                        className={
                          row.bulk === "Yes"
                            ? "text-green-700 dark:text-green-400 font-medium"
                            : row.bulk === "Export only"
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-muted-foreground"
                        }
                      >
                        {row.bulk}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">{row.mobile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Three patterns — answers "where do I add X?" */}
      <Card id="data-patterns" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Where do I add this kind of data?
          </CardTitle>
          <CardDescription>
            Pick the pattern that matches your data, then jump to the section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Pattern</th>
                  <th className="py-2 pr-4 font-medium">Examples</th>
                  <th className="py-2 pr-4 font-medium">Where</th>
                  <th className="py-2 font-medium">Bulk</th>
                </tr>
              </thead>
              <tbody>
                {dataPatterns.map((row) => (
                  <tr
                    key={row.pattern}
                    className="border-b last:border-0 align-top"
                  >
                    <td className="py-2 pr-4 font-medium">{row.pattern}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.examples}
                    </td>
                    <td className="py-2 pr-4">
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">
                        {row.where}
                      </code>
                    </td>
                    <td className="py-2 text-muted-foreground">{row.bulk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Table of contents — grouped by mobile impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            On this page
          </CardTitle>
          <CardDescription>
            Sections are grouped by how they affect the mobile location detail
            screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adminSectionGroups.map((group) =>
            group.sections.length === 0 ? null : (
              <div key={group.id}>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  {group.label}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {group.description}
                </p>
                <ul className="space-y-1 text-sm">
                  {group.sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="text-foreground hover:underline"
                      >
                        {s.title}
                      </a>{" "}
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">
                        {s.route}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </CardContent>
      </Card>

      {/* Per-section cards, grouped */}
      {adminSectionGroups.map((group) =>
        group.sections.length === 0 ? null : (
          <div key={group.id} className="space-y-4">
            <div className="border-b pb-2">
              <h2 className="text-xl font-semibold">{group.label}</h2>
              <p className="text-sm text-muted-foreground">
                {group.description}
              </p>
            </div>
            {group.sections.map((section) => (
              <AdminSectionCard key={section.id} section={section} />
            ))}
          </div>
        ),
      )}
    </>
  );
}

function CrossCuttingTab() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            On this tab
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {crossCuttingTopics.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="text-foreground hover:underline"
                >
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Data Import */}
      <Card id="data-import" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Data Import
          </CardTitle>
          <CardDescription>
            How to import data via CSV, JSON, and Excel formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">CSV Format</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Upload a CSV file with the following columns. The first row must
              be headers.
            </p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>city,state,country,contaminantId,value,source</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">JSON Format</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Upload a JSON file containing an array of measurement objects.
            </p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`[
  {
    "city": "Beverly Hills",
    "state": "CA",
    "country": "US",
    "contaminantId": "lead",
    "value": 4.2,
    "source": "EPA Report 2026"
  }
]`}</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Excel Format</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Upload an Excel file (
              <code className="px-1 py-0.5 bg-muted rounded">.xlsx</code>) with
              the same column structure as CSV. The first sheet will be read.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Required Fields</h3>
            <ul className="text-sm space-y-1 list-disc ml-6 text-muted-foreground">
              <li>
                <code className="px-1 py-0.5 bg-muted rounded text-foreground">
                  city
                </code>{" "}
                — City name (e.g., &quot;Beverly Hills&quot;)
              </li>
              <li>
                <code className="px-1 py-0.5 bg-muted rounded text-foreground">
                  state
                </code>{" "}
                — State or province code (e.g., &quot;CA&quot;, &quot;QC&quot;)
              </li>
              <li>
                <code className="px-1 py-0.5 bg-muted rounded text-foreground">
                  country
                </code>{" "}
                — Country code (e.g., &quot;US&quot;, &quot;CA&quot;)
              </li>
              <li>
                <code className="px-1 py-0.5 bg-muted rounded text-foreground">
                  contaminantId
                </code>{" "}
                — ID of the contaminant (e.g.,{" "}
                <code className="px-1 py-0.5 bg-muted rounded">lead</code>,{" "}
                <code className="px-1 py-0.5 bg-muted rounded">nitrate</code>,{" "}
                <code className="px-1 py-0.5 bg-muted rounded">radon</code>)
              </li>
              <li>
                <code className="px-1 py-0.5 bg-muted rounded text-foreground">
                  value
                </code>{" "}
                — Numeric measurement value
              </li>
              <li>
                <code className="px-1 py-0.5 bg-muted rounded text-foreground">
                  source
                </code>{" "}
                — Data source attribution (optional, e.g., &quot;EPA Report
                2026&quot;)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Entity Types */}
      <Card id="entity-types" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Entity Types
          </CardTitle>
          <CardDescription>
            Key data models in the system and their purpose
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-1">Contaminants</h3>
            <p className="text-sm text-muted-foreground">
              Definitions of water contaminants and environmental hazards
              tracked by the system. There are 172+ contaminant types, each with
              a unique ID, name, unit of measurement, and category (e.g., Water,
              Air, Health, Disaster). Managed from the{" "}
              <code className="px-1 py-0.5 bg-muted rounded">/contaminants</code>{" "}
              page.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Thresholds</h3>
            <p className="text-sm text-muted-foreground">
              Jurisdiction-specific safety limits for each contaminant. A
              threshold defines the warning and danger levels for a contaminant
              within a given jurisdiction. For example, the EPA may set a lead
              threshold of 15 ppb, while a state jurisdiction may set 10 ppb.
              Managed from the{" "}
              <code className="px-1 py-0.5 bg-muted rounded">/thresholds</code>{" "}
              page.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Jurisdictions</h3>
            <p className="text-sm text-muted-foreground">
              Regulatory bodies that define safety standards (e.g., WHO, US
              federal, individual US states, Canadian provinces, EU). Each
              jurisdiction owns a set of thresholds. Managed from the{" "}
              <code className="px-1 py-0.5 bg-muted rounded">
                /jurisdictions
              </code>{" "}
              page.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Locations</h3>
            <p className="text-sm text-muted-foreground">
              Geographic areas (cities, counties) that are mapped to one or more
              jurisdictions. Locations are what users subscribe to for
              notifications. Each location is linked to the jurisdictions whose
              thresholds apply to it. Managed from the{" "}
              <code className="px-1 py-0.5 bg-muted rounded">/measurements</code>{" "}
              page.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Measurements</h3>
            <p className="text-sm text-muted-foreground">
              Actual recorded values for a contaminant at a specific location
              and point in time. These are compared against thresholds to
              determine if a location is safe, in warning, or in danger.
              Imported via the{" "}
              <code className="px-1 py-0.5 bg-muted rounded">/import</code>{" "}
              page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Silent Import */}
      <Card id="silent-import" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VolumeX className="h-5 w-5" />
            Silent Import
          </CardTitle>
          <CardDescription>
            Suppress automatic notifications during data imports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When you check the{" "}
            <span className="font-medium text-foreground">
              &quot;Silent import&quot;
            </span>{" "}
            checkbox on the Import Data page, the{" "}
            <code className="px-1 py-0.5 bg-muted rounded">silentImport</code>{" "}
            flag is set on each{" "}
            <code className="px-1 py-0.5 bg-muted rounded">
              LocationMeasurement
            </code>{" "}
            record. This prevents the DynamoDB Stream trigger from sending push
            notifications or email alerts to subscribed users.
          </p>

          <div>
            <h3 className="font-semibold mb-2">When to Use Silent Import</h3>
            <ul className="text-sm space-y-1 list-disc ml-6 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">
                  Bulk data corrections
                </span>{" "}
                — Fixing incorrect measurements without notifying users about
                each change
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Initial data seeding
                </span>{" "}
                — Populating a new location with historical data
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Test imports
                </span>{" "}
                — Importing test data during development or QA
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How Notifications Work</h3>
            <p className="text-sm text-muted-foreground">
              Without silent import, the notification pipeline is triggered
              automatically: the{" "}
              <code className="px-1 py-0.5 bg-muted rounded">
                LocationMeasurement
              </code>{" "}
              DynamoDB Stream fires the{" "}
              <code className="px-1 py-0.5 bg-muted rounded">
                on-location-measurement-update
              </code>{" "}
              Lambda, which invokes{" "}
              <code className="px-1 py-0.5 bg-muted rounded">
                process-notifications
              </code>{" "}
              to evaluate subscriber preferences and send push/email alerts
              accordingly.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Relationships */}
      <Card id="relationships" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Relationships
          </CardTitle>
          <CardDescription>
            How entities relate to each other in the data model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-semibold mb-1">
                Location → Jurisdiction → Thresholds
              </h3>
              <p className="text-muted-foreground">
                Each Location is associated with one or more Jurisdictions.
                Jurisdictions define the Thresholds (warning/danger levels) that
                apply to contaminants in that location. When a measurement is
                recorded, the system looks up the applicable jurisdiction
                thresholds to determine the safety status.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">Location → Measurements</h3>
              <p className="text-muted-foreground">
                Measurements are recorded against a specific Location and
                Contaminant. Each measurement has a value, unit, timestamp, and
                source. The most recent measurement for each
                contaminant/location pair is used to determine current status.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">
                Contaminant → Category → Sub-Category
              </h3>
              <p className="text-muted-foreground">
                Contaminants are organized into Categories (e.g., Water, Air,
                Health) and Sub-Categories for easier navigation. This hierarchy
                is reflected in the mobile app when users browse contaminant
                data for their subscribed locations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">
                UserSubscription → Location
              </h3>
              <p className="text-muted-foreground">
                Users subscribe to Locations to receive notifications. Each
                subscription has notification preferences (alert on danger,
                warning, any change) and optional contaminant filters. When new
                measurements are imported, the system evaluates each
                subscription to determine whether to notify the user.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card id="best-practices" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Best Practices
          </CardTitle>
          <CardDescription>
            Tips for data management and common mistakes to avoid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Data Management Tips</h3>
            <ul className="text-sm space-y-2 list-disc ml-6 text-muted-foreground">
              <li>
                Always create the Location and Contaminant records before
                importing measurements that reference them.
              </li>
              <li>
                Ensure Jurisdictions have appropriate Thresholds defined before
                importing measurements, so safety statuses can be calculated
                correctly.
              </li>
              <li>
                Use the{" "}
                <code className="px-1 py-0.5 bg-muted rounded">measuredAt</code>{" "}
                field accurately — it determines the temporal ordering of
                measurements and which one is considered &quot;current.&quot;
              </li>
              <li>
                Include a meaningful{" "}
                <code className="px-1 py-0.5 bg-muted rounded">source</code>{" "}
                value for traceability (e.g., &quot;EPA Annual Report 2026&quot;
                rather than just &quot;EPA&quot;).
              </li>
              <li>
                When updating measurements, import the corrected data with
                silent import enabled, then verify the results before doing a
                non-silent import if notifications are needed.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Common Mistakes to Avoid</h3>
            <ul className="text-sm space-y-2 list-disc ml-6 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">
                  Importing without silent mode during bulk updates
                </span>{" "}
                — This will trigger notifications for every single measurement,
                potentially flooding users with alerts.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Mismatched location fields
                </span>{" "}
                — The <code className="px-1 py-0.5 bg-muted rounded">city</code>
                , <code className="px-1 py-0.5 bg-muted rounded">state</code>,
                and{" "}
                <code className="px-1 py-0.5 bg-muted rounded">country</code> in
                your import file must match existing Location records. Check for
                typos and case sensitivity.
              </li>
              <li>
                <span className="font-medium text-foreground">Wrong units</span>{" "}
                — Ensure the unit matches what the contaminant expects. For
                example, lead is measured in ppb, not mg/L. Using wrong units
                will produce incorrect safety assessments.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Missing thresholds
                </span>{" "}
                — If a jurisdiction has no threshold defined for a contaminant,
                the system cannot determine if a measurement is safe, warning,
                or danger. Always verify thresholds exist before importing.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Future dates in measuredAt
                </span>{" "}
                — Setting measurement dates in the future can cause confusing
                behavior in the mobile app. Always use the actual measurement
                date.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function TestingTab() {
  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Testing Locations
        </h2>
        <p className="text-muted-foreground">
          Reference for testing with seeded data.
        </p>
      </div>

      {/* Production URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Production URLs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Mobile App:</span>
            <a
              href="https://app.mapyourhealth.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://app.mapyourhealth.info/
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Admin Dashboard:</span>
            <a
              href="https://admin.mapyourhealth.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://admin.mapyourhealth.info/
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Web Landing:</span>
            <a
              href="https://www.mapyourhealth.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://www.mapyourhealth.info/
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Staging URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Staging URLs
          </CardTitle>
          <CardDescription>
            Validate changes here before promoting to production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Mobile App:</span>
            <a
              href="https://staging.d2z5ddqhlc1q5.amplifyapp.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://staging.d2z5ddqhlc1q5.amplifyapp.com/
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Admin Dashboard:</span>
            <a
              href="https://staging.d26q32gc98goap.amplifyapp.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://staging.d26q32gc98goap.amplifyapp.com/
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Web Landing:</span>
            <a
              href="https://staging.dv0j563gt073v.amplifyapp.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://staging.dv0j563gt073v.amplifyapp.com/
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Seeded Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Seeded Locations (34 total)
          </CardTitle>
          <CardDescription>
            Pre-populated with test data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Major US Cities (10)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Notable Conditions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {majorCities.map((city) => (
                  <TableRow key={city.city}>
                    <TableCell className="font-medium">{city.city}</TableCell>
                    <TableCell>{city.state}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {city.conditions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Queens, NY (12)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Neighborhood</TableHead>
                  <TableHead>Notable Conditions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queensNeighborhoods.map((loc) => (
                  <TableRow key={loc.neighborhood}>
                    <TableCell className="font-medium">
                      {loc.neighborhood}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {loc.conditions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Manhattan, NY (12)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Neighborhood</TableHead>
                  <TableHead>Notable Conditions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manhattanNeighborhoods.map((loc) => (
                  <TableRow key={loc.neighborhood}>
                    <TableCell className="font-medium">
                      {loc.neighborhood}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {loc.conditions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Testing Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Testing Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Mobile App</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="font-medium">Safe area:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">Seattle</code> -
                should show mostly green/safe
              </li>
              <li>
                <span className="font-medium">Mixed warnings:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">New York</code> -
                should show multiple yellow warnings
              </li>
              <li>
                <span className="font-medium">Danger alerts:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">Chicago</code> -
                should show red danger for lead
              </li>
              <li>
                <span className="font-medium">Flood risk:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">
                  Miami Beach
                </code>{" "}
                - should show flood danger
              </li>
              <li>
                <span className="font-medium">Wildfire risk:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">Phoenix</code> -
                should show wildfire danger
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">GPS Location Feature</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="font-medium">Use My Location button:</span> Tap
                the GPS icon (crosshairs) next to the search bar
              </li>
              <li>
                <span className="font-medium">Permission prompt:</span> Grant
                location permission when prompted
              </li>
              <li>
                <span className="font-medium">Auto-populate:</span> Verify city
                is auto-populated from device location
              </li>
              <li>
                <span className="font-medium">Loading state:</span> GPS button
                shows spinner while fetching location
              </li>
              <li>
                <span className="font-medium">Permission denied:</span> Decline
                permission - should show alert explaining how to enable
              </li>
              <li>
                <span className="font-medium">Location unavailable:</span> Test
                with location services disabled - should show error message
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Admin Dashboard</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="font-medium">Measurements page:</span>{" "}
                <code className="px-1 py-0.5 bg-muted rounded">
                  /measurements
                </code>{" "}
                - should list all 34 locations
              </li>
              <li>
                <span className="font-medium">Contaminants page:</span>{" "}
                <code className="px-1 py-0.5 bg-muted rounded">
                  /contaminants
                </code>{" "}
                - should show 11 stat definitions
              </li>
              <li>
                <span className="font-medium">Location detail:</span>{" "}
                <code className="px-1 py-0.5 bg-muted rounded">
                  /measurements/New%20York
                </code>{" "}
                - should show all stats for NYC
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Stat Definitions */}
      <Card>
        <CardHeader>
          <CardTitle>Stat Definitions (11 total)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">Water (3)</span>
            </div>
            <ul className="text-sm space-y-1 ml-6">
              <li>
                <code className="text-xs bg-muted px-1 rounded">
                  water-lead
                </code>{" "}
                - Lead Levels (ppb)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">
                  water-nitrate
                </code>{" "}
                - Nitrate Levels (mg/L)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">
                  water-bacteria
                </code>{" "}
                - Bacteria Count (CFU/100mL)
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Air (3)</span>
            </div>
            <ul className="text-sm space-y-1 ml-6">
              <li>
                <code className="text-xs bg-muted px-1 rounded">air-aqi</code> -
                Air Quality Index
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">air-pm25</code>{" "}
                - PM2.5 Levels (µg/m³)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">air-ozone</code>{" "}
                - Ozone Levels (ppb)
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-semibold">Health (3)</span>
            </div>
            <ul className="text-sm space-y-1 ml-6">
              <li>
                <code className="text-xs bg-muted px-1 rounded">
                  health-covid
                </code>{" "}
                - COVID-19 Cases (per 100k)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">
                  health-flu
                </code>{" "}
                - Flu Cases (per 100k)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">
                  health-access
                </code>{" "}
                - Healthcare Access (%)
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-semibold">Disaster (2)</span>
            </div>
            <ul className="text-sm space-y-1 ml-6">
              <li>
                <code className="text-xs bg-muted px-1 rounded">
                  disaster-wildfire
                </code>{" "}
                - Wildfire Risk (level 1-10)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">
                  disaster-flood
                </code>{" "}
                - Flood Risk (level 1-10)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Seed Script */}
      <Card>
        <CardHeader>
          <CardTitle>Running the Seed Script</CardTitle>
          <CardDescription>
            From the repository root, run the following command.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
            <code>
              ADMIN_EMAIL=your-admin@email.com ADMIN_PASSWORD=your-password yarn
              seed:data
            </code>
          </pre>
          <p className="text-sm text-muted-foreground mt-3">
            The seed script is idempotent — it skips existing records and only
            creates missing ones.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function DataTab() {
  return (
    <>
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            In plain English
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              We track ~174 substances (Lead, Fluoride, etc.) and their legal
              limits in each country and state. All of that comes from{" "}
              <strong>Risks.xlsx</strong>.
            </li>
            <li>
              Actual readings (&quot;Montreal had 12 μg/L of lead on
              2026-05-01&quot;) are stored separately and grow over time as
              admins import data.
            </li>
            <li>
              <strong>Reseed All</strong> wipes the reference data and
              re-imports it from Risks.xlsx. Takes 1–3 minutes. Your users&apos;
              alerts, subscriptions, and reports are never touched.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            All entities, in order of how the data flows
          </CardTitle>
          <CardDescription>
            What every table stores, what gets wiped vs preserved by Reseed
            All. Cascade comes from rows having their own city/state/country
            fields (no FK to Location).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-relaxed">
          <div>
            <p className="mb-2 font-medium">
              Reference data — wiped + reseeded by Reseed All
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Entity</TableHead>
                    <TableHead>What it is</TableHead>
                    <TableHead className="w-[80px] text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Jurisdiction</TableCell>
                    <TableCell>
                      Regulatory bodies (WHO, US-NY, CA-QC, EU). <code>code</code>{" "}
                      + optional <code>parentCode</code> for hierarchy.
                    </TableCell>
                    <TableCell className="text-right">~18</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Contaminant</TableCell>
                    <TableCell>
                      The <em>substances</em> we track (Lead, Fluoride, PFAS,
                      Silver). <code>contaminantId</code> is a slug, not a UUID.
                    </TableCell>
                    <TableCell className="text-right">~174</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      ContaminantThreshold
                    </TableCell>
                    <TableCell>
                      Legal limit per (contaminant × jurisdiction).
                    </TableCell>
                    <TableCell className="text-right">~414</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Location</TableCell>
                    <TableCell>
                      City → jurisdiction lookup cache. Seeded for known cities;
                      expanded on demand via Google Places when users search a
                      new city.
                    </TableCell>
                    <TableCell className="text-right">~18</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      LocationMeasurement
                    </TableCell>
                    <TableCell>
                      Actual <em>readings</em> of contaminants at places.
                      Carries its OWN city/state/country (no FK to Location).
                    </TableCell>
                    <TableCell className="text-right">~1,771</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      Category / SubCategory
                    </TableCell>
                    <TableCell>
                      Taxonomy: Water/Air × Organic/Inorganic/etc.
                    </TableCell>
                    <TableCell className="text-right">4 + 9</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      ObservedProperty
                    </TableCell>
                    <TableCell>
                      Non-contaminant environmental properties (radon, Lyme
                      disease).
                    </TableCell>
                    <TableCell className="text-right">2</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      PropertyThreshold
                    </TableCell>
                    <TableCell>Limits per property × jurisdiction.</TableCell>
                    <TableCell className="text-right">3</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      LocationObservation
                    </TableCell>
                    <TableCell>
                      Actual radon / Lyme readings per city. Same
                      city/state/country pattern as LocationMeasurement.
                    </TableCell>
                    <TableCell className="text-right">~6,660</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="mb-2 font-medium">
              Preserved across reseeds — admin-curated or user-submitted
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Entity</TableHead>
                    <TableHead>What it is</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">WarningBanner</TableCell>
                    <TableCell>
                      Admin alerts (boil-water advisories, etc.). Scoped by
                      city/state/country (any can be null → cascade scope; all
                      null → global).
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">HazardReport</TableCell>
                    <TableCell>User-submitted hazard reports.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      PollutionSource
                    </TableCell>
                    <TableCell>
                      Admin-entered point sources (lat/lng + city/state/country
                      + sourceType).
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      UserSubscription
                    </TableCell>
                    <TableCell>
                      Per-user notification preferences (which city, which
                      contaminants, which severity threshold).
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      NotificationLog
                    </TableCell>
                    <TableCell>
                      Audit trail of every push / email sent.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">HealthRecord</TableCell>
                    <TableCell>User personal health (owner-only).</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Contaminant vs LocationMeasurement
          </CardTitle>
          <CardDescription>
            The two most-confused entities. Easy to mix up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>
                Contaminant = a <em>definition</em>.
              </strong>{" "}
              &quot;Lead is a heavy metal, dangerous above 10 μg/L per WHO.&quot;
              Fixed list of ~174 substances; sourced from Risks.xlsx.
            </li>
            <li>
              <strong>
                LocationMeasurement = a <em>reading</em>.
              </strong>{" "}
              &quot;Montreal had 12 μg/L of lead on 2026-05-01.&quot; Grows
              over time as admins import data.
            </li>
          </ul>
          <p className="text-muted-foreground">
            A periodic-table column vs a weather reading.
          </p>
          <p>
            The link between them: a measurement stores{" "}
            <code>contaminantId: &quot;lead&quot;</code> (a slug) and looks up
            the Contaminant via the <code>byContaminantId</code> GSI on the
            Contaminant table.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            How Reseed All works
          </CardTitle>
          <CardDescription>
            What Settings → <strong>Reseed All Data</strong> does, step by
            step. ~1–3 minutes end-to-end. Don&apos;t close the page mid-run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <div>
            <p className="font-medium">1. Wipe — 10 reference tables in one sweep</p>
            <p className="ml-4 mt-1 text-muted-foreground">
              Jurisdiction · Contaminant · ContaminantThreshold · Location ·
              LocationMeasurement · LocationObservation · Category ·
              SubCategory · ObservedProperty · PropertyThreshold
            </p>
          </div>

          <div>
            <p className="font-medium">2. Refill in dependency order</p>
            <ol className="ml-6 mt-2 list-decimal space-y-1">
              <li>Jurisdictions — the regulatory hierarchy</li>
              <li>Contaminants — the substances, from Risks.xlsx</li>
              <li>Thresholds — limits per substance × jurisdiction</li>
              <li>Locations — city lookup cache</li>
              <li>
                ObservedProperties + PropertyThresholds — radon / Lyme and
                their limits
              </li>
              <li>Measurements — ~1,771 actual readings</li>
              <li>Categories + SubCategories — the taxonomy</li>
              <li>Observations — ~6,660 radon / Lyme readings</li>
            </ol>
          </div>

          <div className="rounded-md border border-muted bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Preserved untouched
            </p>
            <p className="mt-2">
              UserSubscription, NotificationLog, HazardReport, HealthRecord,
              WarningBanner, PollutionSource — admin-curated and user-submitted
              data is never touched by the wipe.
            </p>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-900 dark:text-amber-200">
              Source-of-truth caveat
            </p>
            <p className="mt-2 text-amber-900 dark:text-amber-200">
              Seed values come from JSON files bundled into the{" "}
              <code>manage-data</code> Lambda at the{" "}
              <strong>last backend deploy</strong>. Edits to Risks.xlsx only
              land in a reseed after a backend redeploy.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

const majorCities = [
  { city: "Beverly Hills", state: "CA", conditions: "Wildfire warning" },
  { city: "New York", state: "NY", conditions: "Air quality & lead warnings" },
  { city: "Miami Beach", state: "FL", conditions: "Flood danger" },
  { city: "Chicago", state: "IL", conditions: "Lead danger, bacteria warning" },
  { city: "Seattle", state: "WA", conditions: "Very safe overall" },
  { city: "Atlanta", state: "GA", conditions: "Air quality warnings" },
  { city: "Dallas", state: "TX", conditions: "Ozone & flood warnings" },
  { city: "Phoenix", state: "AZ", conditions: "Ozone danger, wildfire danger" },
  { city: "Denver", state: "CO", conditions: "Wildfire danger" },
  { city: "Boston", state: "MA", conditions: "Lead & flu warnings" },
];

const queensNeighborhoods = [
  { neighborhood: "Corona", conditions: "Dense urban, multiple warnings" },
  { neighborhood: "College Point", conditions: "Flood danger (coastal)" },
  {
    neighborhood: "Long Island City",
    conditions: "Industrial area, flood warning",
  },
  { neighborhood: "Astoria", conditions: "Good transit, moderate air" },
  { neighborhood: "Flushing", conditions: "Busy commercial, air warnings" },
  { neighborhood: "Jackson Heights", conditions: "Dense, health warnings" },
  { neighborhood: "Elmhurst", conditions: "Dense residential" },
  { neighborhood: "Forest Hills", conditions: "Suburban feel, mostly safe" },
  { neighborhood: "Bayside", conditions: "Quiet residential" },
  { neighborhood: "Jamaica", conditions: "Transit hub, multiple warnings" },
  { neighborhood: "Ridgewood", conditions: "Border with Brooklyn" },
  { neighborhood: "Rockaway Beach", conditions: "Flood danger (coastal)" },
];

const manhattanNeighborhoods = [
  {
    neighborhood: "Lower East Side",
    conditions: "Older buildings, lead warning",
  },
  { neighborhood: "Greenwich Village", conditions: "Generally good" },
  { neighborhood: "SoHo", conditions: "Moderate air quality" },
  {
    neighborhood: "Tribeca",
    conditions: "Excellent healthcare, flood warning",
  },
  { neighborhood: "Murray Hill", conditions: "Dense residential" },
  { neighborhood: "Midtown East", conditions: "High traffic, air warnings" },
  { neighborhood: "Upper West Side", conditions: "Family-friendly, safe" },
  {
    neighborhood: "Upper East Side",
    conditions: "Affluent, excellent services",
  },
  {
    neighborhood: "East Harlem",
    conditions: "Lead danger, health disparities",
  },
  { neighborhood: "Harlem", conditions: "Aging infrastructure" },
  { neighborhood: "Washington Heights", conditions: "Diverse community" },
  {
    neighborhood: "Financial District",
    conditions: "Modern infrastructure, flood warning",
  },
];
