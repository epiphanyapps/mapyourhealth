"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Compass,
  Database,
  FileSpreadsheet,
  GitBranch,
  LayoutGrid,
  Lightbulb,
  Smartphone,
  VolumeX,
} from "lucide-react";
import {
  navigationSections,
  observationsSections,
} from "./data/admin-sections";
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
    route: "/stats",
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
    section: "Location Stats",
    route: "/zip-codes",
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
    route: "/reports",
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
    section: "Testing Guide",
    route: "/testing",
    whatYouCanDo:
      "Internal QA reference: staging URLs, test accounts, smoke checklist.",
    bulk: "No",
    mobile: "—",
  },
  {
    section: "Guide",
    route: "/guide",
    whatYouCanDo:
      "This page — what each admin section does and how it reaches mobile.",
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
    where: "/import (bulk) or /zip-codes (per-record)",
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

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Guide</h1>
        <p className="text-muted-foreground">
          What every admin section does, every form field it exposes, and how
          mobile users will experience your changes.
        </p>
      </div>

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

      {/* Table of contents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            On this page
          </CardTitle>
          <CardDescription>
            Jump to any section. Each menu item is documented with its forms,
            actions, and downstream mobile-app effect.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Navigation
            </h3>
            <ul className="space-y-1 text-sm">
              {navigationSections.map((s) => (
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
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Observations &amp; Measurements
            </h3>
            <ul className="space-y-1 text-sm">
              {observationsSections.map((s) => (
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
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Cross-cutting
            </h3>
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
          </div>
        </CardContent>
      </Card>

      {/* Per-page sections — Navigation group */}
      {navigationSections.map((section) => (
        <AdminSectionCard key={section.id} section={section} />
      ))}

      {/* Per-page sections — Observations & Measurements group */}
      {observationsSections.map((section) => (
        <AdminSectionCard key={section.id} section={section} />
      ))}

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
              <code className="px-1 py-0.5 bg-muted rounded">/stats</code> page.
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
              <code className="px-1 py-0.5 bg-muted rounded">/zip-codes</code>{" "}
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
    </div>
  );
}
