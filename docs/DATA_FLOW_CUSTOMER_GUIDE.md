# How Your Safety Data Gets to Your Screen

This guide shows exactly how data from our source spreadsheet appears on your phone.

---

## Screenshots from the App

### 1. Location Overview (City Search)
![Location Overview](screenshots/01-dashboard.png)

When you search for a **city name** (e.g., "New York, NY"), the app shows:
- **Location header** - Your searched city (New York, NY)
- **Warning banner** - Highlights the most critical issue (Lead at 12 μg/L)
- **Category cards** - Water Quality, Air Quality, etc.

### 2. Location Overview (Address Search)
![Location Overview - Address](screenshots/04-dashboard-address.png)

When you search for a **street address** (e.g., "350 Fifth Avenue, New York, NY, USA"), the app:
- Finds the **nearest city** in our database to that address
- Shows: *"Showing data for nearest city to: 350 Fifth Avenue, New York, NY, USA"*
- Displays the same data as a city search, using the resolved city's jurisdiction

### 3. Category Detail View
![Category Detail](screenshots/03-category-detail.png)

The detail view shows:
- **Category header** - Water Quality with icon
- **Description** - Dynamic count of contaminants exceeding limits
- **External links** - WHO guidelines, Local standards
- **Contaminant table** - Side-by-side comparison of WHO vs Local limits

---

## The Source: Risks.xlsx

Our water quality data comes from a master spreadsheet with 172+ contaminants:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  A           │  B      │  C       │  D     │  E     │ ... │  K               │
├──────────────┼─────────┼──────────┼────────┼────────┼─────┼──────────────────┤
│  NAME        │  WHO    │  QUEBEC  │  NY    │  CA    │     │  DESCRIPTION_EN  │
├──────────────┼─────────┼──────────┼────────┼────────┼─────┼──────────────────┤
│  Lead        │  10     │  10      │  15    │  10    │     │  Neurotoxin...   │
│  Nitrate     │  50     │  10      │  10    │  10    │     │  Blue baby...    │
│  Arsenic     │  10     │  10      │  10    │  10    │     │  Carcinogen...   │
└──────────────┴─────────┴──────────┴────────┴────────┴─────┴──────────────────┘
```

---

## Field Mapping: Spreadsheet → App Screen

Here's exactly how each spreadsheet column becomes a UI element on the detail screen:

### The Contaminant Table

Looking at the screenshot, here's how the data maps:

| Spreadsheet Column | Table Column | Example Value |
|-------------------|--------------|---------------|
| **Column A** (NAME) | CONTAMINANT | "Lead" |
| **Column B** (WHO) | WHO | "10 μg/L" |
| **Column D** (NY) | LOCAL | "15 μg/L" |
| *Calculated* | Status dot | 🟡 (yellow = warning) |

### Visual Mapping

```
SPREADSHEET (Risks.xlsx)                    APP SCREEN
─────────────────────────────────────────────────────────────────────────

Column A: "Lead"                    →       CONTAMINANT: "Lead"

Column B: 10                        →       WHO: "10 μg/L"
                                            (We add the unit automatically)

Column D: 15                        →       LOCAL: "15 μg/L"
(NY column, based on your location)         (Shows YOUR state's limit)

Measured value: 12 μg/L             →       Status: 🟡
(from LocationMeasurement table)            (12 is 80% of 15 = warning)
```

---

## How Your Address Becomes a Jurisdiction

When you type an address or city name, the app resolves it to a regulatory jurisdiction in three steps:

### Step 1: Find Your City

```
You type: "350 Fifth Avenue, New York"
                    │
                    ▼
        ┌───────────────────────────────┐
        │  Search Local Database         │ ← We check our Location table first
        │  (172+ cities indexed)         │
        └───────────┬───────────────────┘
                    │
              Found match? ──── Yes ──→ Use city/state from database
                    │
                    No
                    │
                    ▼
        ┌───────────────────────────────┐
        │  Google Places API             │ ← Fallback for addresses not in DB
        │  (US & Canada only)            │
        └───────────┬───────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │  Resolve Coordinates           │ ← Get lat/lng from the address
        │  Find Nearest City             │ ← Match to closest city we have
        │  in our Location table         │    data for
        └───────────────────────────────┘
```

**Result:** `city: "New York"`, `state: "NY"`, `country: "US"`

This is why the app shows *"Showing data for nearest city to: 350 Fifth Avenue, New York, NY, USA"* when you search by address (see Screenshot 2 above).

### Step 2: Map State to Jurisdiction Code

Your state or province is mapped to a jurisdiction code:

| Your State/Province | Jurisdiction Code | Meaning |
|---------------------|-------------------|---------|
| New York | US-NY | New York state regulations |
| California | US-CA | California state regulations |
| Texas | US-TX | Texas state regulations |
| Florida | US-FL | Florida state regulations |
| Quebec | CA-QC | Quebec provincial regulations |
| Ontario | CA-ON | Ontario provincial regulations |

If your state doesn't have specific regulations, we fall back:
1. **State-specific** (e.g., `US-NY`) — first choice
2. **Country federal** (e.g., `US`) — if no state-level data exists
3. **WHO** — global default

### Step 3: Look Up Safety Limits (Thresholds)

The jurisdiction code determines which "LOCAL" column you see:

| Jurisdiction Code | Spreadsheet Column | What Shows as "LOCAL" |
|-------------------|-------------------|----------------------|
| US-NY | Column D (NY) | NY state limits |
| US-CA | Column E (CA) | CA state limits |
| US-TX | Column F (TX) | TX state limits |
| US-FL | Column G (FL) | FL state limits |
| CA-QC | Column C (QUEBEC) | Quebec limits |

---

## What Is a Threshold?

A **threshold** is the maximum safe level of a contaminant allowed by a specific jurisdiction. Each threshold record in our database contains:

| Field | Description | Example |
|-------|-------------|---------|
| **Contaminant** | Which substance | Lead |
| **Jurisdiction** | Who sets the limit | US-NY (New York) |
| **Limit Value** | Maximum allowed concentration | 15 μg/L |
| **Warning Ratio** | % of limit that triggers a warning | 0.80 (80%) |
| **Status** | Regulatory status | regulated |

### Why Thresholds Matter

Different jurisdictions set different limits for the same contaminant. For example, Lead:

| Jurisdiction | Limit | Meaning |
|-------------|-------|---------|
| WHO | 10 μg/L | International guideline |
| US-NY (New York) | 15 μg/L | NY state law allows more |
| US-CA (California) | 10 μg/L | CA matches WHO |

The app always shows **two thresholds** side by side — WHO (international) and LOCAL (your jurisdiction) — so you can compare how your area's regulations stack up against global health recommendations.

### Threshold Statuses

Not every contaminant has a numeric limit. A threshold can have one of these statuses:

| Status | What It Means | How It Appears in the App |
|--------|---------------|---------------------------|
| **Regulated** | Has a numeric limit (e.g., 15 μg/L) | `15 μg/L` |
| **Banned** | Completely prohibited — no amount is allowed | `BANNED` |
| **Not Approved** | Not approved for use in this jurisdiction | `NOT APPROVED` |
| **Not Controlled** | No standard has been set | `NO STANDARD` |

### The Warning Ratio

Each threshold has a **warning ratio** (default: 0.80 or 80%). This determines when the app shows a warning *before* a contaminant reaches its legal limit.

```text
Example: Lead in New York (limit = 15 μg/L, warning ratio = 0.80)

Warning threshold = 15 × 0.80 = 12 μg/L

  0 μg/L          12 μg/L          15 μg/L
  |─── 🟢 SAFE ───|─── 🟡 WARNING ──|─── 🔴 DANGER ──→
```

This gives you an early heads-up when contaminant levels are approaching the legal limit, even if they haven't exceeded it yet.

---

## Status Colors Explained

The colored dot indicates risk level, based on the threshold and warning ratio:

| Color | Meaning | Calculation |
|-------|---------|-------------|
| 🔴 Red | **DANGER** | Measured value ≥ Local limit |
| 🟡 Yellow | **WARNING** | Measured value ≥ (limit × warning ratio) |
| 🟢 Green | **SAFE** | Measured value < (limit × warning ratio) |

### Example: Lead in New York

From the screenshot:
- **WHO limit**: 10 μg/L (from Column B)
- **Local limit**: 15 μg/L (from Column D - NY)
- **Measured value**: 12 μg/L (from your water report)

**Calculation:**
```
Warning threshold = 15 × 0.80 = 12 μg/L

Is 12 ≥ 15?  → No  → Not danger
Is 12 ≥ 12?  → Yes → WARNING (🟡)
```

---

## Special Values in the Spreadsheet

| Spreadsheet Value | What It Means | How It Appears |
|-------------------|---------------|----------------|
| `10` (number) | Regulated at 10 μg/L | `10 μg/L` |
| `BANNED` | Completely prohibited | `BANNED` |
| `NOT APPROVED` | Not approved for use | `NOT APPROVED` |
| (empty cell) | No standard set | `NO STANDARD` |

---

## Why Two Standards?

We show both **WHO** and **LOCAL** so you can see:

1. **WHO** - The international health benchmark
2. **LOCAL** - What your state/province legally requires

In the Lead example:
- WHO says: Keep it under **10 μg/L**
- New York says: Keep it under **15 μg/L**

The WHO standard is stricter. Your water (12 μg/L) meets NY requirements but exceeds WHO recommendations - hence the warning.

---

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RISKS.XLSX (Source)                                 │
│                                                                             │
│    Lead  │  10  │  10  │  15  │  10  │  ...  │  Neurotoxin affecting...    │
│          │ WHO  │  QC  │  NY  │  CA  │       │  (description)              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       PARSING SCRIPT          │
                    │  • Extract: "Lead"            │
                    │  • WHO limit: 10              │
                    │  • US-NY limit: 15            │
                    │  • Unit: μg/L                 │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │         DATABASE              │
                    │  Contaminant: lead            │
                    │  ContaminantThreshold:        │
                    │    WHO: 10 μg/L               │
                    │    US-NY: 15 μg/L             │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │    LOCATION MEASUREMENT       │
                    │  City: New York               │
                    │  State: NY                    │
                    │  Lead: 12 μg/L                │
                    │  Source: Water utility report │
                    └───────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APP SCREEN (What You See)                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CONTAMINANT    │    WHO       │   LOCAL      │  STATUS             │   │
│  ├────────────────┼──────────────┼──────────────┼─────────────────────┤   │
│  │ Lead           │  10 μg/L     │  15 μg/L     │    🟡               │   │
│  └────────────────┴──────────────┴──────────────┴─────────────────────┘   │
│                                                                             │
│  Status is WARNING because 12 μg/L is ≥ 80% of the 15 μg/L limit           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Questions?

If you notice discrepancies between our data and official reports, please let us know. We continuously update our database as regulations change.

If you'd like to add other data sources, consume data from an external API, or notice anything missing from this guide, please let us know — we're happy to integrate new sources and keep this document up to date.
