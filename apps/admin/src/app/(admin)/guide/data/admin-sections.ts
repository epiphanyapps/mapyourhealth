import type { ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Droplets,
  Eye,
  Factory,
  FileText,
  FolderTree,
  Gauge,
  Globe,
  Layers,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  Scale,
  Settings,
  TestTube,
  Upload,
} from "lucide-react";

export type AdminField = {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  description: string;
  gotcha?: string;
};

export type AdminAction = {
  label: string;
  description: string;
  destructive?: boolean;
};

export type AdminList = {
  title: string;
  columns?: string[];
  filters?: string[];
};

export type MobileSurface = {
  screen: string;
  behavior: string;
};

export type MobileImpact = {
  summary: string;
  surfaces?: MobileSurface[];
  edgeCases?: string[];
};

export type AdminSectionGroupId =
  | "daily-ops"
  | "reference-data"
  | "web-marketing"
  | "system"
  | "orphan";

export type AdminSection = {
  id: string;
  title: string;
  route: string;
  icon: ComponentType<{ className?: string }>;
  group: AdminSectionGroupId;
  purpose: string;
  lists?: AdminList[];
  fields?: AdminField[];
  actions?: AdminAction[];
  mobileImpact: MobileImpact;
  notes?: string[];
};

const allSections: AdminSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    route: "/",
    icon: LayoutDashboard,
    group: "daily-ops",
    purpose:
      "Read-only landing page that summarizes platform state. The first screen an admin sees after login. No data is created or modified here.",
    lists: [
      {
        title: "Stat cards",
        columns: [
          "Contaminants",
          "Jurisdictions",
          "Thresholds",
          "Locations covered",
          "Pending Reports",
        ],
      },
    ],
    actions: [
      {
        label: "Quick action links",
        description:
          "Six navigation cards that jump to the key admin pages (Stats, Thresholds, Jurisdictions, Locations, Reports, Import).",
      },
    ],
    mobileImpact: {
      summary: "No direct downstream effect — viewing the dashboard does not change anything users see.",
    },
  },
  {
    id: "analytics",
    title: "Analytics",
    route: "/analytics",
    icon: BarChart3,
    group: "daily-ops",
    purpose:
      "Real-time inventory of platform usage. Use this to verify that recent imports landed and that visit traffic looks reasonable.",
    lists: [
      {
        title: "Stat cards",
        columns: [
          "Location Visits (clickable)",
          "Total Measurements",
          "Cities Tracked",
          "Contaminants",
          "Subscribers",
        ],
      },
      {
        title: "Charts",
        columns: ["Category distribution (pie)", "City measurements (bar)"],
      },
      {
        title: "Visits modal",
        columns: ["City", "State", "Visits"],
        filters: ["Sort by visits"],
      },
    ],
    mobileImpact: {
      summary: "No direct downstream effect — analytics is observational only.",
    },
  },
  {
    id: "contaminants",
    title: "Contaminants",
    route: "/contaminants",
    icon: Droplets,
    group: "reference-data",
    purpose:
      "Defines every contaminant the platform tracks (lead, nitrate, radon, PM2.5, etc.). A contaminant is the row that appears in a category's standards table on mobile, with its name, unit, and description. Edits here change what mobile users read.",
    lists: [
      {
        title: "Table",
        columns: ["ID", "Name", "Category", "Unit", "Higher Is", "Actions"],
      },
    ],
    fields: [
      {
        name: "contaminantId",
        type: "text",
        required: true,
        description:
          "Stable lowercase identifier referenced by measurements and thresholds.",
        gotcha:
          "Disabled on edit. Renaming a contaminant requires deleting and recreating, which orphans existing measurements and thresholds.",
      },
      {
        name: "category",
        type: "select",
        required: true,
        description: "Top-level grouping shown to users on the dashboard.",
        gotcha: "Options: Water, Air, Health, Disaster.",
      },
      {
        name: "name / nameFr",
        type: "text",
        required: true,
        description:
          "Display name shown in the contaminant table on mobile. nameFr is shown to French-locale users; missing nameFr falls back to name.",
      },
      {
        name: "unit",
        type: "text",
        description:
          "Unit appended to measurement values (e.g. ppb, μg/L, Bq/m³).",
        gotcha:
          "If you change unit on a contaminant that already has measurements, every existing value will be re-rendered with the new unit label without conversion — values can become misleading.",
      },
      {
        name: "higherIsBad",
        type: "select",
        default: "true (Bad)",
        description:
          'Controls safety logic. "Bad" (true) = higher values are dangerous (most contaminants). "Good" (false) = lower values are dangerous (e.g. dissolved oxygen, pH proxies).',
        gotcha:
          "If unset, the mobile app assumes Bad. Wrong setting flips green/red badges and can mislead users.",
      },
      {
        name: "description / descriptionFr",
        type: "textarea (markdown)",
        description:
          "Long-form explanation shown in the health-effects modal when a user taps a contaminant on mobile. Supports markdown.",
      },
      {
        name: "studies",
        type: "textarea",
        description:
          "Citations and external scientific references. Displayed alongside the description on mobile.",
      },
    ],
    actions: [
      { label: "New Contaminant", description: "Open the create dialog." },
      { label: "Edit", description: "Open the edit dialog (contaminantId disabled)." },
      {
        label: "Delete",
        description:
          "Remove the contaminant. Confirmation required. Existing measurements pointing to a deleted contaminant are silently dropped from the mobile UI.",
        destructive: true,
      },
    ],
    mobileImpact: {
      summary:
        "Contaminant edits ripple immediately to every mobile user once their cache refreshes. Renames, unit changes, and higherIsBad toggles change the meaning of every measurement that uses this contaminant.",
      surfaces: [
        {
          screen: "CategoryDetailScreen",
          behavior:
            "Each contaminant is one row showing name, value, unit, and a green/orange/red status badge. Tapping the row opens the health-effects modal.",
        },
        {
          screen: "Health-effects modal",
          behavior:
            "Renders the description (markdown) and studies fields. If both are empty, the modal hides those sections.",
        },
        {
          screen: "DashboardScreen",
          behavior:
            "Category cards summarize how many contaminants in that category are in warning or danger. Adding a new contaminant raises the per-category count for affected locations.",
        },
      ],
      edgeCases: [
        "Missing icon on parent category → falls back to help-circle (CategoryIcon FALLBACK_ICONS).",
        "Missing description → modal renders but the description block is omitted.",
        "higherIsBad=false with no PropertyThreshold equivalent → safety status calculation reverses (lower = danger).",
      ],
    },
  },
  {
    id: "thresholds",
    title: "Thresholds",
    route: "/thresholds",
    icon: Scale,
    group: "reference-data",
    purpose:
      "One row per (contaminant, jurisdiction) pair — the numeric limit the mobile safety badge (green/orange/red) is computed from. The jurisdiction is the rulebook the limit comes from (WHO, US EPA, US-NY, CA-QC…), NOT the city — cities are resolved to a jurisdiction at read time. When a row is missing for the resolved jurisdiction, the mobile app silently cascades to that jurisdiction's parentCode and finally to WHO (US-NY → US → WHO). That cascade is also why deleting a threshold may not visibly change anything: a parent row may already be answering for it.",
    lists: [
      {
        title: "Table",
        columns: [
          "Contaminant",
          "Jurisdiction",
          "Limit Value",
          "Warning Ratio (%)",
          "Status",
          "Actions",
        ],
        filters: ["Contaminant", "Jurisdiction"],
      },
    ],
    fields: [
      {
        name: "contaminantId",
        type: "select",
        required: true,
        description: "Which contaminant this threshold applies to.",
        gotcha: "Disabled on edit — threshold identity is (contaminant, jurisdiction).",
      },
      {
        name: "jurisdictionCode",
        type: "select",
        required: true,
        description:
          'Which regulatory body this limit comes from (e.g. "WHO", "US-NY", "CA-QC").',
        gotcha: "Disabled on edit.",
      },
      {
        name: "limitValue",
        type: "number",
        description:
          'The danger threshold. A measurement at or above this value renders red.',
        gotcha:
          'Leave empty to mark the contaminant as banned in this jurisdiction. Banned + any non-zero presence → danger; banned + value=0 → safe.',
      },
      {
        name: "warningRatio",
        type: "number 0–1",
        default: "0.8",
        description:
          "Fraction of the limit that triggers an orange warning. Default 0.8 means 80% of the limit raises a warning.",
        gotcha:
          "If not set, mobile assumes 0.8 silently. A contaminant near the limit can flip safe→warning when this is changed.",
      },
      {
        name: "status",
        type: "select",
        default: "active",
        description: 'Lifecycle: "active", "pending", "archived".',
        gotcha:
          "Only active thresholds participate in safety calculations on mobile. Pending/archived behave the same as missing.",
      },
    ],
    actions: [
      { label: "New Threshold", description: "Open the create dialog." },
      { label: "Edit", description: "Open the edit dialog (immutable identity fields)." },
      {
        label: "Delete",
        description:
          "Remove the threshold. The mobile app cascades to the parent jurisdiction, then to WHO, so a delete may not visibly change anything if a parent threshold exists.",
        destructive: true,
      },
    ],
    mobileImpact: {
      summary:
        "Thresholds drive the safety badge color and the WHO vs LOCAL columns on the contaminant table. A bad threshold edit can flip an entire city from green to red.",
      surfaces: [
        {
          screen: "CategoryDetailScreen",
          behavior:
            "Each row shows two threshold columns side-by-side: WHO and LOCAL. The LOCAL column shows the resolved jurisdiction limit (US-NY → US → WHO cascade). If no local-specific threshold exists, both columns show identical WHO values.",
        },
        {
          screen: "Safety badge",
          behavior:
            "value ≥ limit → red (danger). value ≥ limit × warningRatio → orange (warning). Below that → green (safe). When status=banned: any non-zero value → danger.",
        },
      ],
      edgeCases: [
        "Missing threshold for (contaminant, jurisdiction) → cascade to parentCode jurisdiction, then to WHO.",
        "limitValue=null and status≠banned → mobile shows status as safe regardless of measurement.",
        "warningRatio=null on the record → mobile substitutes 0.8 silently.",
      ],
    },
  },
  {
    id: "jurisdictions",
    title: "Jurisdictions",
    route: "/jurisdictions",
    icon: Globe,
    group: "reference-data",
    purpose:
      "Catalog of regulatory standards — the laws and guidelines used to judge whether a measurement is safe (WHO, US federal EPA, US-NY, CA-QC, EU, etc.). This is NOT a list of places; cities and measurements live in the Locations and Measurements sections. A jurisdiction is the rulebook (\"what New York State's regulations say about lead\"), not the geography. Each location resolves to one jurisdiction, and the parentCode chain provides cascade fallback (US-NY → US → WHO) when a state-specific threshold isn't seeded.",
    lists: [
      {
        title: "Table",
        columns: ["Code", "Name", "Country", "Region", "Parent", "Default", "Actions"],
      },
    ],
    fields: [
      {
        name: "code",
        type: "text (uppercase)",
        required: true,
        description:
          'Stable identifier (e.g. "WHO", "US", "US-NY", "CA-QC"). Referenced by thresholds and the location-resolver.',
        gotcha: "Disabled on edit. Renaming requires re-pointing every threshold by hand.",
      },
      {
        name: "country",
        type: "text",
        required: true,
        description:
          'ISO country code (e.g. "US", "CA", "MX") this regulator belongs to. Used to match a measurement\'s country to the right rulebook — it does NOT mean this jurisdiction is "located in" that country in any geographic sense.',
      },
      {
        name: "name / nameFr",
        type: "text",
        required: true,
        description: 'Display name shown above the standards table on mobile (e.g. "New York", "Quebec").',
      },
      {
        name: "region",
        type: "text",
        description:
          'Optional state/province code this regulator governs (e.g. "NY" for the State of New York\'s rules, "QC" for Quebec\'s). Used to match a measurement\'s state to the right rulebook. Leave blank for country-level (e.g. US federal EPA) or global (WHO) standards.',
      },
      {
        name: "parentCode",
        type: "select",
        description:
          'Cascade fallback. When a threshold is missing for this jurisdiction, the mobile app looks up the parent (e.g. US-NY → US → WHO).',
        gotcha:
          "If left empty, missing thresholds skip directly to WHO without any country-level fallback.",
      },
      {
        name: "isDefault",
        type: "switch",
        default: "false",
        description:
          'Marks this jurisdiction as the global default (typically only WHO is set true). Used as the final cascade target.',
      },
    ],
    actions: [
      { label: "New Jurisdiction", description: "Open the create dialog." },
      { label: "Export JSON", description: "Download the full jurisdiction list as JSON." },
      { label: "Edit", description: "Open the edit dialog (code disabled)." },
      {
        label: "Delete",
        description:
          "Remove the jurisdiction. Children that pointed to it via parentCode will lose their fallback chain.",
        destructive: true,
      },
    ],
    mobileImpact: {
      summary:
        "Jurisdictions decide which threshold a user sees in the LOCAL column. Editing a parentCode rewires the cascade and can change badges across an entire country.",
      surfaces: [
        {
          screen: "CategoryDetailScreen header",
          behavior:
            "Shows the resolved jurisdiction name (e.g. \"QC\", \"US\", \"WHO\") above the standards table.",
        },
        {
          screen: "getJurisdictionForLocation",
          behavior:
            "Tries {country}-{state} first, then {country}, then WHO. The result decides which threshold rows are read.",
        },
      ],
      edgeCases: [
        "Missing jurisdiction for a location → defaults to WHO.",
        "Missing nameFr in French locale → falls back to name, then to the uppercased state code.",
        "parentCode unset → no country-level cascade; threshold lookups skip to WHO.",
      ],
    },
  },
  {
    id: "categories",
    title: "Categories",
    route: "/categories",
    icon: FolderTree,
    group: "reference-data",
    purpose:
      "Defines the top-level groupings on the mobile dashboard (Water, Air, Health, Disaster). Each category card on mobile takes its icon, color, name, sort order, and optional external links from this page.",
    lists: [
      {
        title: "Table",
        columns: ["Sort Order", "Preview", "ID", "Name", "Icon", "Status", "Actions"],
      },
    ],
    fields: [
      {
        name: "categoryId",
        type: "text (lowercase)",
        required: true,
        description: 'Stable identifier (e.g. "water", "air", "health", "disaster").',
        gotcha: "Disabled on edit.",
      },
      {
        name: "sortOrder",
        type: "number",
        required: true,
        description: "Position on the mobile dashboard. Lower numbers appear first.",
      },
      {
        name: "name / nameFr",
        type: "text",
        required: true,
        description: "Display label on the dashboard card. nameFr falls back to name.",
      },
      {
        name: "icon",
        type: "select (~50 MaterialCommunityIcons)",
        description:
          'Icon shown on the mobile card and detail screen header (e.g. "water", "weather-cloudy", "heart", "fire").',
        gotcha: 'If unset, mobile falls back to "help-circle".',
      },
      {
        name: "color",
        type: "color picker / hex",
        description:
          "Card accent color on the mobile dashboard. Used as background tint and badge color.",
        gotcha: 'Missing → mobile uses the gray fallback "#6B7280".',
      },
      {
        name: "description / descriptionFr",
        type: "textarea (markdown)",
        description:
          'Sub-text shown under the category title on mobile. Supports the {count} placeholder, which is replaced with the number of contaminants in warning/danger.',
        gotcha:
          'If you forget {count}, the literal text is shown without substitution. If a translation omits it, that locale loses the count.',
      },
      {
        name: "links",
        type: "array { label, url }",
        description:
          'External resources (e.g. "Learn about WHO standards"). Rendered as tappable rows in CategoryDetailScreen.',
      },
      {
        name: "isActive",
        type: "switch",
        default: "true",
        description:
          "Hides the category from mobile users when off. Use to stage a new category before publishing.",
        gotcha: "Inactive categories are filtered out client-side; their contaminants and measurements still exist in the database.",
      },
      {
        name: "showStandardsTable",
        type: "switch",
        default: "true",
        description:
          "Whether the WHO vs LOCAL standards table appears on the category detail screen.",
      },
    ],
    actions: [
      { label: "New Category", description: "Open the create dialog." },
      { label: "Edit", description: "Open the edit dialog (categoryId disabled)." },
      {
        label: "Delete",
        description:
          "Remove the category. Contaminants pointing to it become orphaned and disappear from the mobile dashboard.",
        destructive: true,
      },
    ],
    mobileImpact: {
      summary:
        "Categories are the most visible admin-controlled UI on mobile. Renaming a category, changing its color, or toggling isActive all show up immediately on the dashboard.",
      surfaces: [
        {
          screen: "DashboardScreen",
          behavior:
            "Renders one card per active category in sortOrder order. The card uses icon, color, name, and the description with {count} substituted.",
        },
        {
          screen: "CategoryDetailScreen",
          behavior:
            "Header shows category icon + name. Body lists each contaminant for the category. Links section renders the external links list.",
        },
        {
          screen: "Health-effects modal",
          behavior:
            "Inherits the category color for the contaminant badge.",
        },
      ],
      edgeCases: [
        "isActive=false → category not rendered on mobile (filtered in CategoriesContext).",
        "Missing icon → \"help-circle\".",
        "Missing color → \"#6B7280\".",
        "Missing description → empty subtitle on the dashboard card.",
        '{count} placeholder forgotten → mobile shows the literal "{count}" string.',
      ],
    },
  },
  {
    id: "subcategories",
    title: "Sub-Categories",
    route: "/subcategories",
    icon: Layers,
    group: "reference-data",
    purpose:
      "Optional second level of grouping under a category (e.g. Pesticides, Fertilizers under Water). Sub-categories can inherit the parent's icon and color.",
    lists: [
      {
        title: "Table",
        columns: ["Sort Order", "Category", "ID", "Name", "Status", "Actions"],
        filters: ["Category"],
      },
    ],
    fields: [
      {
        name: "subCategoryId",
        type: "text (lowercase)",
        required: true,
        description: "Stable identifier scoped to the parent category.",
        gotcha: "Disabled on edit.",
      },
      {
        name: "categoryId",
        type: "select",
        required: true,
        description: "Parent category.",
      },
      {
        name: "name / nameFr",
        type: "text",
        required: true,
        description: "Display label.",
      },
      {
        name: "sortOrder",
        type: "number",
        required: true,
        description: "Position within the parent category.",
      },
      {
        name: "icon",
        type: "text",
        description: "Optional. Inherits parent category icon if blank.",
      },
      {
        name: "color",
        type: "color picker / hex",
        description: "Optional. Inherits parent category color if blank.",
      },
      {
        name: "description / descriptionFr",
        type: "textarea (markdown)",
        description: "Sub-grouping description shown on mobile.",
      },
      { name: "links", type: "array { label, url }", description: "External links." },
      {
        name: "isActive",
        type: "switch",
        default: "true",
        description: "Hide from mobile when off.",
      },
    ],
    actions: [
      { label: "New Sub-Category", description: "Open the create dialog." },
      { label: "Edit", description: "Open the edit dialog (subCategoryId disabled)." },
      { label: "Delete", description: "Remove the sub-category.", destructive: true },
    ],
    mobileImpact: {
      summary:
        "Sub-categories appear as nested groupings inside CategoryDetailScreen. Inheritance means an unset icon or color silently picks up the parent's value.",
      surfaces: [
        {
          screen: "CategoryDetailScreen",
          behavior:
            "Contaminants are grouped under their sub-category headings, ordered by sortOrder.",
        },
      ],
      edgeCases: [
        "icon/color blank → inherits from parent category, not from the global gray fallback.",
        "isActive=false → sub-category and its contaminants disappear from mobile.",
      ],
    },
  },
  {
    id: "location-stats",
    title: "Location Stats",
    route: "/measurements",
    icon: MapPin,
    group: "daily-ops",
    purpose:
      "Coverage view across the three cascade levels the mobile app reads from: by-city, by-state, and by-country. Mobile resolves a user's selected city by trying city-anchored rows first, then state, then country. Use this page to verify recent imports and to add a new city as a target for future imports. Drilling into Manage opens per-contaminant editing for that city. NOTE: the \"source\" field on each measurement (e.g. \"EPA\", \"NY DEC\", \"WHO\") is informational data-provenance ONLY — it records where the number came from. It does NOT determine which threshold rulebook is applied to it; that is decided by the city's resolved jurisdiction on the Thresholds page.",
    lists: [
      {
        title: "By City table",
        columns: ["City", "State", "Measurement Count", "Status", "Last Updated", "Manage"],
        filters: ["Search by city/state/country"],
      },
      {
        title: "By State table",
        columns: ["State", "Country", "Measurement Count", "Status", "Last Updated"],
      },
      {
        title: "By Country table",
        columns: ["Country", "Measurement Count", "Status", "Last Updated"],
      },
    ],
    fields: [
      { name: "city", type: "text", required: true, description: "City name to add." },
      { name: "state", type: "text", required: true, description: "State or province code." },
      { name: "country", type: "text", required: true, description: "ISO country code." },
    ],
    actions: [
      {
        label: "Add new city",
        description:
          "Creates a Location record. Imports targeting this city/state/country will then aggregate here.",
      },
      {
        label: "Manage",
        description:
          "Drills into /measurements/[city] for per-contaminant editing of that city's measurements.",
      },
    ],
    mobileImpact: {
      summary:
        "Locations + measurements drive everything on the mobile dashboard once a user picks a place. The cascade tables here mirror what the user sees: city → state → country → none.",
      surfaces: [
        {
          screen: "PlacesSearchBar → resolvePlace → useZipCodeData",
          behavior:
            "When a user picks a city, mobile fetches measurements at that city level. If empty, it cascades to state, then country.",
        },
        {
          screen: "LocationScopeBadge",
          behavior:
            'Tells the user where their data came from: "Showing Toronto data" (city), "Showing Ontario data" (state), "Showing Canada data" (country), or "No data available".',
        },
      ],
      edgeCases: [
        "No data at any level → empty state on the dashboard.",
        "User offline → cached MMKV data used (\"isCachedData=true\"), with a stale timestamp shown.",
      ],
    },
  },
  {
    id: "import",
    title: "Import Data",
    route: "/import",
    icon: Upload,
    group: "daily-ops",
    purpose:
      "Bulk-import LocationMeasurement records from CSV, JSON, or Excel. The Silent Import checkbox is the single most consequential control on this page — without it, every imported row triggers push and email alerts.",
    lists: [
      {
        title: "Tabs",
        columns: ["Water Quality", "Air Pollution"],
      },
      {
        title: "Preview table",
        columns: ["Status icon", "Data fields", "Error message"],
        filters: ["Max 50 rows"],
      },
    ],
    fields: [
      {
        name: "File upload",
        type: "CSV / JSON / XLSX / XLS",
        required: true,
        description:
          "Required columns: city, state, country, contaminantId, value, source. First row of CSV/Excel must be headers; first sheet of Excel is read.",
      },
      {
        name: "Silent Import",
        type: "checkbox",
        default: "false",
        description:
          'Sets the silentImport flag on each record. The DynamoDB Stream still fires, but process-notifications skips records with this flag set.',
        gotcha:
          "If you forget to check this on a bulk correction, every subscribed user receives one push + one email per row. There is no undo.",
      },
    ],
    actions: [
      {
        label: "Import",
        description:
          "Disabled until at least one row passes preview validation. On click, creates LocationMeasurement records and shows a success/failure breakdown.",
      },
      { label: "Cancel", description: "Discards the previewed file without writing." },
    ],
    mobileImpact: {
      summary:
        "Imports are how new data reaches users. Each non-silent record may trigger a push notification and an email, depending on subscriber preferences.",
      surfaces: [
        {
          screen: "Push notification",
          behavior:
            'On non-silent imports: "Lead in drinking water at 15 μg/L (exceeds local limit)" or similar, sent to subscribers whose alertOnDanger/alertOnWarning flags match.',
        },
        {
          screen: "Email alert",
          behavior:
            "Sent in parallel to push for users with enableEmail=true.",
        },
        {
          screen: "DashboardScreen + CategoryDetailScreen",
          behavior:
            "The new measurement appears immediately when the user re-opens or pulls to refresh. The category card's risk count and the row's badge color update from the new value.",
        },
      ],
      edgeCases: [
        "silentImport=true → measurement is written but no push/email is sent.",
        "Mismatched city/state/country (typo, wrong case) → no fallback; the row is skipped on the mobile side.",
        "No matching contaminant definition → row is silently dropped on mobile.",
        "Future-dated measuredAt → the measurement may appear ahead of others and confuse the timeline.",
      ],
    },
  },
  {
    id: "banners",
    title: "Warning Banners",
    route: "/banners",
    icon: Megaphone,
    group: "daily-ops",
    purpose:
      "Show alert banners at the top of the mobile dashboard. Use for boil-water advisories, infrastructure outages, regulatory updates, or any time-bounded user-facing message. Scope is determined by the city/state/country fields — leave them all blank for a global banner.",
    lists: [
      {
        title: "Table",
        columns: ["Severity", "Title", "Location", "Start", "Expire", "Status", "Actions"],
      },
    ],
    fields: [
      { name: "title / titleFr", type: "text", required: true, description: "Headline shown on the banner. titleFr falls back to title." },
      { name: "description / descriptionFr", type: "textarea", required: true, description: "Body text rendered below the title." },
      {
        name: "severity",
        type: "select",
        required: true,
        description:
          'Determines color and icon. critical = red (alert-octagon). warning = orange (alert-circle). info = blue (information).',
        gotcha: "If unset, mobile defaults to warning.",
      },
      {
        name: "city",
        type: "text",
        description:
          "Restricts the banner to users at this city. Leave blank to scope wider.",
      },
      {
        name: "state",
        type: "text",
        description:
          "Restricts to users at this state. Combine with empty city for state-wide.",
      },
      {
        name: "country",
        type: "text",
        description:
          "Restricts to users in this country. All three blank = global banner shown to everyone.",
      },
      {
        name: "startsAt",
        type: "datetime-local",
        description: "Banner is hidden before this time. Leave empty for immediate.",
      },
      {
        name: "expiresAt",
        type: "datetime-local",
        description: "Banner is hidden at and after this time. Leave empty for permanent.",
        gotcha:
          "Validation: expiresAt must be greater than startsAt. Banners are filtered client-side; an expired banner still exists in the database.",
      },
      {
        name: "isActive",
        type: "switch",
        default: "true",
        description: "Manual on/off independent of the schedule.",
      },
    ],
    actions: [
      { label: "New Banner", description: "Open the create dialog." },
      { label: "Edit", description: "Open the edit dialog." },
      {
        label: "Delete",
        description: "Remove the banner. Confirmation required.",
        destructive: true,
      },
    ],
    mobileImpact: {
      summary:
        "Banners appear at the top of the mobile dashboard with a colored card per severity. A misconfigured global banner is visible to every user immediately.",
      surfaces: [
        {
          screen: "DashboardScreen (top of scroll)",
          behavior:
            "Active banners render as stacked cards. Critical: red bg + alert-octagon. Warning: orange bg + alert-circle. Info: blue bg + information.",
        },
      ],
      edgeCases: [
        "expiresAt ≤ now → hidden (filtered in useWarningBanners).",
        "startsAt > now → hidden until that time.",
        "All location fields null → global; visible to every user.",
        "Location mismatch (banner for Vancouver, user in Toronto) → not shown.",
        "Missing titleFr in French locale → falls back to title.",
      ],
    },
  },
  {
    id: "landing-page",
    title: "Landing Page",
    route: "/landing-page",
    icon: FileText,
    group: "web-marketing",
    purpose:
      "Edit text and theme colors on the marketing landing site (apps/web). EN and FR copy are managed independently via the override system; the Theme tab tunes the site's color tokens. This section does not affect the mobile app.",
    lists: [
      {
        title: "Tabs",
        columns: ["EN", "FR", "Theme"],
      },
    ],
    fields: [
      {
        name: "Text fields (per section)",
        type: "text / textarea (markdown)",
        description:
          "Each landing-page section exposes its strings here. An override indicator (• edited) appears when the value differs from the default.",
      },
      {
        name: "Theme color tokens",
        type: "color picker / hex",
        description:
          "Tailwind theme tokens. Hex values must match #[0-9a-f]{3,8}.",
        gotcha: "Invalid hex → save fails with a validation error.",
      },
    ],
    actions: [
      { label: "Save", description: "Persist edits for the active tab (EN, FR, or Theme)." },
      {
        label: "Reset",
        description: "Per field — discards the override and reverts to the default value.",
      },
    ],
    mobileImpact: {
      summary:
        "No mobile-app surface — this page only affects apps/web. The mobile ComingSoonScreen uses static i18n strings and does not read any landing-page overrides.",
    },
  },
  {
    id: "reports",
    title: "Hazard Reports",
    route: "/hazard-reports",
    icon: AlertTriangle,
    group: "daily-ops",
    purpose:
      "Moderate user-submitted hazard reports. Reports arrive with status=pending; admins review the description, decide whether the report is actionable, and update the status. Notes are private to admins.",
    lists: [
      {
        title: "Table",
        columns: ["Category", "Description", "Location", "Status", "Submitted", "View"],
        filters: ["Status (Pending/Reviewed/Dismissed/Resolved)", "Category"],
      },
    ],
    fields: [
      {
        name: "Admin notes",
        type: "textarea",
        description:
          "Free-form moderator notes. Visible only to admins; never sent back to the user.",
      },
    ],
    actions: [
      {
        label: "Mark Reviewed",
        description: "Acknowledges the report without resolution.",
      },
      {
        label: "Dismiss",
        description: "Closes the report as not actionable.",
      },
      {
        label: "Mark Resolved",
        description: "Closes the report as resolved.",
      },
    ],
    mobileImpact: {
      summary:
        "Reports flow one-way: mobile users submit them via HazardReportForm; admin moderation status is never displayed back. The user only sees the in-form success or error message at submission time.",
      surfaces: [
        {
          screen: "ReportScreen / HazardReportForm",
          behavior:
            "Submission shows a green confirmation on success and a red error message on failure. There is no inbox, status indicator, or admin-notes display anywhere on mobile.",
        },
      ],
      edgeCases: [
        "Admin dismisses or resolves a report → user is never notified.",
        "User not authenticated → ReportScreen redirects to Login before submission.",
      ],
    },
  },
  {
    id: "subscribers",
    title: "Subscribers",
    route: "/subscribers",
    icon: Mail,
    group: "web-marketing",
    purpose:
      "Manage newsletter signups captured from the landing site. Distinct from mobile UserSubscription records (which gate location alerts) — this page only handles email-list subscribers.",
    lists: [
      {
        title: "Stats",
        columns: ["Total", "Confirmed", "Pending Confirmation"],
      },
      {
        title: "Table",
        columns: ["Email", "Name", "Source", "Location", "Status", "Created", "Actions"],
        filters: ["Status (All/Confirmed/Pending)", "Email search", "Date range"],
      },
    ],
    actions: [
      {
        label: "Resend confirmation",
        description: "For pending subscribers — re-emails the confirmation link.",
      },
      {
        label: "Delete",
        description: "Remove the subscriber.",
        destructive: true,
      },
      {
        label: "Export CSV",
        description:
          "Downloads the filtered list. Columns: email, name, source, country, zip, confirmed, createdAt.",
      },
    ],
    mobileImpact: {
      summary:
        "No mobile-app surface — newsletter signups are landing-site only. Mobile users have UserSubscription records (location-based push/email alerts) that are managed inside the mobile app, not here.",
    },
  },
  {
    id: "pollution-sources",
    title: "Pollution Sources",
    route: "/pollution-sources",
    icon: Factory,
    group: "orphan",
    purpose:
      "Pin known pollution sources (industrial sites, landfills, etc.) to the map. Each source has a location, an impact radius, a severity, and a status. Mobile renders these on the dedicated PollutionSourcesScreen.",
    lists: [
      {
        title: "Source list (sidebar)",
        columns: ["Name", "Location", "Severity"],
        filters: ["Source Type", "Severity", "Status", "Jurisdiction"],
      },
      {
        title: "Map",
        columns: ["Pins"],
      },
    ],
    fields: [
      { name: "name", type: "text", required: true, description: "Display name." },
      { name: "latitude", type: "number", required: true, description: "Decimal latitude. Auto-filled when you click the map." },
      { name: "longitude", type: "number", required: true, description: "Decimal longitude. Auto-filled when you click the map." },
      {
        name: "impactRadius",
        type: "number (meters)",
        default: "500",
        description: "Radius circle drawn on the mobile map.",
      },
      { name: "city / state / country", type: "text", description: "Cascade scope. Same rules as banners — blank fields scope wider." },
      {
        name: "sourceType",
        type: "select",
        description: "Type label (industrial, waste, etc.). Drives the map pin icon.",
      },
      { name: "severity", type: "select", description: "Low / Medium / High / Critical." },
      { name: "status", type: "select", description: "Active / Inactive / Monitoring." },
      { name: "address", type: "text", description: "Optional postal address." },
      { name: "jurisdictionCode", type: "select", description: "Reference to the jurisdiction this source falls under." },
      {
        name: "primaryContaminants",
        type: "multi-select",
        description: "Contaminants this source emits. Used for cross-referencing on the mobile detail card.",
      },
      { name: "description", type: "textarea", description: "Public description shown on mobile." },
      { name: "notes", type: "textarea", description: "Internal admin notes." },
    ],
    actions: [
      { label: "Add Pollution Source", description: "Click the map to place a pin and open the create dialog." },
      { label: "Save", description: "Persist edits." },
      { label: "Edit", description: "Open the edit dialog from the source list." },
      { label: "Delete", description: "Remove the source.", destructive: true },
    ],
    mobileImpact: {
      summary:
        "ORPHAN (EPI-25): no current mobile consumer. Service helpers exist in apps/mobile/app/services/amplify/data.ts but no screen, hook, or component renders pollution sources. Edits here are not visible to users today.",
      edgeCases: [
        "If EPI-25 reinstates a PollutionSourcesScreen, the cascade rules (city → state → country) will mirror banners and measurements.",
      ],
    },
  },
  {
    id: "testing",
    title: "Testing Guide",
    route: "/guide?tab=testing",
    icon: TestTube,
    group: "system",
    purpose:
      "Static reference page. Lists the production and staging URLs, the 34 seeded test locations (major cities + NYC neighborhoods), the testing scenarios, and the seed-script command. No data is written from this page.",
    mobileImpact: {
      summary:
        "No direct downstream effect — this is documentation. Running the seed script (referenced here) does change mobile data, but the page itself is read-only.",
    },
  },
  {
    id: "guide",
    title: "Guide",
    route: "/guide",
    icon: BookOpen,
    group: "system",
    purpose:
      "This page. The long-form admin reference. Each section above documents one menu item; each cross-cutting card below covers a behavior that spans pages.",
    mobileImpact: {
      summary:
        "No direct downstream effect — this is documentation. Edits made elsewhere in admin take effect regardless of whether anyone reads this guide.",
    },
  },
  {
    id: "settings",
    title: "Settings",
    route: "/settings",
    icon: Settings,
    group: "system",
    purpose:
      "Application-wide feature toggles and destructive database operations. Wipes and reseeds in this page affect every mobile user immediately. Confirmation phrases are case-sensitive and must be typed exactly.",
    fields: [
      {
        name: "comingSoonGate",
        type: "switch (AppConfig)",
        description:
          "When on, unauthenticated mobile users see ComingSoonScreen instead of the dashboard. Authenticated users always bypass the gate.",
        gotcha:
          "If config fails to fetch on cold start, the gate defaults to enabled (safe default).",
      },
    ],
    actions: [
      {
        label: "Wipe Contaminants",
        description:
          'Deletes all Contaminant records. Confirmation: type "DELETE" (case-sensitive).',
        destructive: true,
      },
      {
        label: "Wipe Locations",
        description:
          'Deletes all Location and LocationMeasurement records. Confirmation: type "DELETE".',
        destructive: true,
      },
      {
        label: "Wipe All",
        description:
          'Deletes all reference data (Contaminants, Thresholds, Jurisdictions, Categories, Sub-Categories, Locations, Measurements). Confirmation: type "DELETE ALL". User data (UserSubscription, HazardReport) is preserved.',
        destructive: true,
      },
      {
        label: "Reseed All",
        description:
          'Repopulates reference data from the canonical seed source. Confirmation: type "RESEED". Takes 1–3 minutes; the action button shows a spinner while running.',
        destructive: true,
      },
    ],
    mobileImpact: {
      summary:
        "The Coming Soon gate decides whether unauthenticated users can see the app at all. Wipes leave the app in a mock-data fallback state until reseed completes.",
      surfaces: [
        {
          screen: "ComingSoonScreen",
          behavior:
            "Shown to unauthenticated users when comingSoonGate=true. Authenticated users skip it.",
        },
        {
          screen: "DashboardScreen + CategoryDetailScreen (during/after wipe)",
          behavior:
            "ContaminantsContext and CategoriesContext fall back to mockData; the user sees demo categories and 'No contaminants exceeding safety thresholds' empty states.",
        },
      ],
      edgeCases: [
        "User in-app when gate toggles → next cold start applies the new value.",
        "Reseed in progress → user may see partially populated data; pull-to-refresh resolves.",
        "User subscriptions are NOT deleted by Wipe All — only reference data is cleared.",
      ],
    },
  },
  {
    id: "properties",
    title: "Properties",
    route: "/properties",
    icon: Activity,
    group: "orphan",
    purpose:
      "Defines observable phenomena beyond classical numeric contaminants — radon zones, endemic disease flags, incidence rates, binary presence indicators. Each property declares its observationType, which dictates how thresholds and observations are entered and rendered.",
    lists: [
      {
        title: "Table",
        columns: ["Property ID", "Name", "Category", "Type", "Unit", "Actions"],
        filters: ["Category", "Observation Type"],
      },
    ],
    fields: [
      {
        name: "propertyId",
        type: "text (lowercase)",
        required: true,
        description: "Stable identifier (e.g. radon_zone, malaria_endemic).",
        gotcha: "Disabled on edit.",
      },
      { name: "unit", type: "text", description: "Unit label, when applicable (e.g. Bq/m³)." },
      { name: "name / nameFr", type: "text", required: true, description: "Display name on mobile." },
      {
        name: "category",
        type: "select",
        required: true,
        description: "Top-level grouping (Water/Air/Health/Disaster).",
      },
      {
        name: "observationType",
        type: "select",
        required: true,
        description:
          "Determines the value shape. Options: numeric, zone, endemic, incidence, binary. PropertyThreshold and Observation forms switch their conditional fields based on this.",
        gotcha:
          "Changing observationType after observations exist will leave old records with mismatched value shapes; mobile will skip records it can't render.",
      },
      { name: "description / descriptionFr", type: "textarea", description: "Long-form explanation." },
      {
        name: "higherIsBad",
        type: "switch",
        default: "true",
        description: "Same semantics as on Contaminants — decides badge direction for numeric properties.",
      },
    ],
    actions: [
      { label: "New Property", description: "Open the create dialog." },
      { label: "Export JSON", description: "Download the full property list." },
      { label: "Edit", description: "Open the edit dialog (propertyId disabled)." },
      { label: "Delete", description: "Remove the property and orphan its thresholds and observations.", destructive: true },
    ],
    mobileImpact: {
      summary:
        "Properties are how the app handles non-numeric data such as radon zones and endemic flags. Mobile rendering of properties is currently more limited than for contaminants.",
      surfaces: [
        {
          screen: "Future / partial",
          behavior:
            "Fetched via getObservedProperties but not yet integrated into CategoryDetailScreen the same way contaminants are. Expected uses: radon zone level (1–4), endemic flag, per-100k incidence rates.",
        },
      ],
      edgeCases: [
        "higherIsBad=false → reverses display logic (lower numeric values render red).",
        "Missing PropertyThreshold → mobile cannot determine status; shows safe by default.",
      ],
    },
  },
  {
    id: "property-thresholds",
    title: "Property Thresholds",
    route: "/property-thresholds",
    icon: Gauge,
    group: "orphan",
    purpose:
      "Per-jurisdiction thresholds for non-numeric properties. The form fields you see depend on the parent property's observationType.",
    lists: [
      {
        title: "Table",
        columns: ["Property", "Jurisdiction", "Warning", "Limit/Danger", "Status", "Actions"],
        filters: ["Property", "Jurisdiction"],
      },
    ],
    fields: [
      {
        name: "propertyId",
        type: "select",
        required: true,
        description: "Which property this threshold applies to.",
        gotcha: "Disabled on edit.",
      },
      {
        name: "jurisdictionCode",
        type: "select",
        required: true,
        description: "Jurisdiction.",
        gotcha: "Disabled on edit.",
      },
      { name: "status", type: "select", description: "Lifecycle status (active/pending/archived)." },
      { name: "notes", type: "textarea", description: "Internal notes." },
      {
        name: "warningValue (numeric only)",
        type: "number",
        description: "Lower bound that triggers the warning badge.",
      },
      {
        name: "limitValue (numeric only)",
        type: "number",
        description: "Lower bound that triggers the danger badge.",
      },
      {
        name: "zoneMapping (zone only)",
        type: "JSON textarea",
        description:
          'Maps zone codes to safety levels — e.g. {"A": "safe", "B": "warning", "C": "danger"}.',
      },
      {
        name: "endemicIsDanger (endemic only)",
        type: "switch",
        default: "false",
        description: "When true, an endemic=true observation is rendered as danger; when false, as warning.",
      },
      {
        name: "incidenceWarningThreshold (incidence only)",
        type: "number per 100k",
        description: "Per-100,000 incidence rate that triggers warning.",
      },
      {
        name: "incidenceDangerThreshold (incidence only)",
        type: "number per 100k",
        description: "Per-100,000 incidence rate that triggers danger.",
      },
    ],
    actions: [
      { label: "New Property Threshold", description: "Open the create dialog." },
      { label: "Edit", description: "Open the edit dialog (immutable identity fields)." },
      { label: "Delete", description: "Remove the threshold.", destructive: true },
    ],
    mobileImpact: {
      summary:
        "Drives the safety status of non-numeric properties. The badge logic differs by observationType, so a single mistake in zoneMapping JSON can mis-color an entire region.",
      surfaces: [
        {
          screen: "Future / partial",
          behavior:
            "Where observations are rendered, the safety badge follows: numeric → ratio against limit; zone → zoneMapping lookup; endemic → flag honors endemicIsDanger; incidence → per-100k threshold compare.",
        },
      ],
      edgeCases: [
        "zoneMapping invalid JSON → save fails; existing records unaffected.",
        "Missing threshold for a property × jurisdiction → cascade fallback applies (same model as contaminant thresholds).",
      ],
    },
  },
  {
    id: "observations",
    title: "Observations",
    route: "/observations",
    icon: Eye,
    group: "orphan",
    purpose:
      "Records of measured property values. The value field on the form changes based on the property's observationType. Location uses the same city/state/country cascade as banners and pollution sources — blank fields scope wider.",
    lists: [
      {
        title: "Table",
        columns: ["Location", "Property", "Value", "Observed Date", "Source", "Actions"],
        filters: ["Property", "Country", "State"],
      },
    ],
    fields: [
      { name: "city", type: "text", description: "Blank = state-level or country-level observation." },
      { name: "county", type: "text", description: "Optional county scope." },
      { name: "state", type: "text", description: "Blank = country-level observation." },
      { name: "country", type: "text", required: true, description: "ISO country code." },
      {
        name: "propertyId",
        type: "select",
        required: true,
        description: "Property being observed.",
        gotcha: "Disabled on edit.",
      },
      {
        name: "observedAt",
        type: "datetime-local",
        default: "now",
        description: "When the observation was made.",
      },
      {
        name: "validUntil",
        type: "datetime-local",
        description: "Optional expiry. Mobile may stop using the value after this date.",
      },
      { name: "source", type: "text", description: "Free-form source attribution." },
      { name: "sourceUrl", type: "url", description: "Optional link rendered with an external-link icon on mobile." },
      { name: "notes", type: "textarea", description: "Free-form notes." },
      {
        name: "numericValue (numeric only)",
        type: "number",
        description: "Compared against PropertyThreshold warningValue/limitValue.",
      },
      { name: "zoneValue (zone only)", type: "text", description: "Zone code keyed in zoneMapping." },
      { name: "endemicValue (endemic only)", type: "switch", description: "Boolean endemic flag." },
      { name: "incidenceValue (incidence only)", type: "number per 100k", description: "Rate per 100,000 people." },
      { name: "binaryValue (binary only)", type: "switch", description: "Yes/no presence." },
    ],
    actions: [
      { label: "New Observation", description: "Open the create dialog." },
      { label: "Edit", description: "Open the edit dialog (propertyId disabled)." },
      { label: "Delete", description: "Remove the observation.", destructive: true },
    ],
    mobileImpact: {
      summary:
        "Observations mirror the LocationMeasurement path for non-numeric data. Each new observation can change a status badge for users at that scope.",
      surfaces: [
        {
          screen: "useLocationData (observations branch)",
          behavior:
            "Fetches observations for the user's resolved location, cascading city → state → country. The associated property's observationType controls how the value is rendered.",
        },
      ],
      edgeCases: [
        "validUntil < now → mobile may treat the observation as stale.",
        "City + state + country all set → city-scoped only; state/country observations are not implicitly inherited.",
        "Property's observationType changed after this record was created → mobile skips records whose value shape no longer matches.",
      ],
    },
  },
];

export const adminSections = allSections;

export type AdminSectionGroup = {
  id: AdminSectionGroupId;
  label: string;
  description: string;
  sections: AdminSection[];
};

const groupOrder: { id: AdminSectionGroupId; label: string; description: string }[] = [
  {
    id: "daily-ops",
    label: "Mobile App — Daily Ops",
    description: "Drives the location detail screen. Edits here are visible to mobile users immediately.",
  },
  {
    id: "reference-data",
    label: "Reference Data",
    description: "Catalogs that classify the daily-ops data. Rarely edited but high blast-radius.",
  },
  {
    id: "web-marketing",
    label: "Web & Marketing",
    description: "Landing site and newsletter. No effect on the mobile app.",
  },
  {
    id: "system",
    label: "System",
    description: "Feature flags and documentation.",
  },
  {
    id: "orphan",
    label: "Orphaned (EPI-25)",
    description: "Routes whose mobile consumer was removed. Pending the EPI-25 decision.",
  },
];

export const adminSectionGroups: AdminSectionGroup[] = groupOrder.map((g) => ({
  ...g,
  sections: allSections.filter((s) => s.group === g.id),
}));

