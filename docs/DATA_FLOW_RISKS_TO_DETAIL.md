# Data Flow Review: Risks.xlsx → Detail Page

## Overview

This document traces the complete data journey from the source Excel file to the user-facing detail screens in MapYourHealth.

---

## 1. Source Data: Risks.xlsx

**Location:** `/Risks.xlsx` (690 KB)

### Sheets in the Excel File:

| Sheet | Content |
|-------|---------|
| "Drinking Water Contamination" | 172+ contaminants with thresholds for WHO, EU, US states, CA provinces |
| "Air Pollution - Radon (USA)" | EPA radon zones by county (1-4 zones) |
| "Lyme Disease - Quebec" | Endemic zones by municipality |
| "Lyme Disease - USA" | Incidence rates by county (2001-2023) |

### Water Contaminant Columns:
```
Col 0:  NAME (e.g., "Nitrate")
Col 1:  WHO limit
Col 2:  QUEBEC limit
Col 3:  NY limit
Col 4:  CA limit
Col 5:  TX limit
Col 6:  FL limit
Col 7:  EU limit
Col 8:  KEYWORDS
Col 9:  STUDIES_EN (scientific references)
Col 10: DESCRIPTION_EN (health concerns)
Col 11: STUDIES_EN_ALT
Col 12: DESCRIPTION_FR (French)
```

---

## 2. Parsing Scripts

**Location:** `packages/backend/scripts/`

### parse-risks-excel.ts
- **Input:** Risks.xlsx → "Drinking Water Contamination" sheet
- **Output:** `seed-data.json` (4,981 lines)
- **Extracts:** Contaminants, thresholds, jurisdictions

### parse-risks-excel-om.ts
- **Input:** Risks.xlsx → Radon & Lyme sheets
- **Output:** `seed-om-data.json` (4.8 MB)
- **Extracts:** ObservedProperty, LocationObservation records

### Key Transformations:
```
Excel Cell Value → Database Status
─────────────────────────────────
Numeric         → regulated (with limitValue)
"BANNED"        → banned (null limitValue)
"NOT APPROVED"  → not_approved
Empty/NO STANDARD → not_controlled
```

---

## 3. Database Models (DynamoDB via AppSync)

**Schema:** `packages/backend/amplify/data/resource.ts`

### Core Models:

```
┌─────────────────────┐
│    Jurisdiction     │ WHO, EU, US-NY, CA-QC, etc.
│  (18 jurisdictions) │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     ┌─────────────────────┐
│    Contaminant      │────▶│ContaminantThreshold │
│   (172+ records)    │     │  (1000+ records)    │
│                     │     │                     │
│ - contaminantId     │     │ - contaminantId     │
│ - name/nameFr       │     │ - jurisdictionCode  │
│ - category          │     │ - limitValue        │
│ - unit (μg/L)       │     │ - warningRatio (0.8)│
│ - description       │     │ - status            │
│ - higherIsBad       │     └─────────────────────┘
└─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│     Category        │────▶│    SubCategory      │
│  (water, air, etc.) │     │ (fertilizer, etc.)  │
└─────────────────────┘     └─────────────────────┘

┌─────────────────────┐
│LocationMeasurement  │ Actual values for cities
│ - city, state       │
│ - contaminantId     │
│ - value             │
│ - measuredAt        │
│ - source            │
└─────────────────────┘
```

### O&M Models (Observations & Measurements):
```
ObservedProperty → PropertyThreshold → LocationObservation
(radon, lyme)      (zone mappings)     (county-level data)
```

---

## 4. Seeding Process

```bash
# Step 1: Parse Excel → JSON
cd packages/backend
npm run parse:excel      # → seed-data.json
npm run parse:om         # → seed-om-data.json

# Step 2: Seed DynamoDB (requires admin Cognito user)
COGNITO_EMAIL=admin@example.com COGNITO_PASSWORD=*** npx tsx scripts/seed-contaminants.ts
COGNITO_EMAIL=admin@example.com COGNITO_PASSWORD=*** npx tsx scripts/seed-om-data.ts
COGNITO_EMAIL=admin@example.com COGNITO_PASSWORD=*** npx tsx scripts/seed-categories.ts
```

---

## 5. Frontend Data Fetching

**Service Layer:** `apps/mobile/app/services/amplify/data.ts`

### Key Functions:
- `getContaminants()` → All 172+ contaminant definitions
- `getContaminantThresholds()` → All jurisdiction thresholds
- `getLocationMeasurements(city)` → Measurements for a city
- `getCategories()` / `getSubCategories()` → Category metadata
- `getJurisdictions()` → Jurisdiction definitions

### Data Fetching Hook: `useZipCodeData.ts`
```typescript
const { zipData, isLoading, error, isMockData, isCachedData } = useZipCodeData(city)
```

**Features:**
- React Query caching (5-min stale time)
- MMKV offline storage (24-hour TTL)
- Fallback to mock data when offline
- Status calculation (danger/warning/safe)

---

## 6. Context Providers (Global State)

### ContaminantsContext
- Caches all contaminants and thresholds on startup
- Provides threshold resolution with jurisdiction fallback:
  ```
  US-NY → US → WHO (fallback chain)
  ```
- `getThreshold(contaminantId, jurisdictionCode)`
- `calculateMeasurementStatus(value, contaminantId, jurisdictionCode)`

### CategoriesContext
- Caches category and sub-category definitions
- Provides localized names (EN/FR)
- `getCategoryName()`, `getSubCategoriesByCategoryId()`

---

## 7. Navigation Flow

```
DashboardScreen
    │
    │ (tap category card)
    ▼
CategoryDetailScreen
    │
    │ (tap "View Trends")
    ▼
StatTrendScreen
```

---

## 8. Screen Components

### DashboardScreen (`apps/mobile/app/screens/DashboardScreen.tsx`)
- Shows category cards with worst status per category
- Warning banner for highest-priority alert
- Location search bar
- Action buttons: Follow, Share, Compare

### CategoryDetailScreen (`apps/mobile/app/screens/CategoryDetailScreen.tsx`)
- Lists all contaminants in category with values
- Shows ContaminantTable for water (with WHO vs Local columns)
- Shows threshold comparison and status indicators
- External resource links

### Key Display Components:
| Component | Purpose |
|-----------|---------|
| `ContaminantTable` | Tabular view with WHO/Local thresholds |
| `StatItem` | Single measurement with status |
| `ExpandableCategoryCard` | Accordion for subcategories |
| `WarningBanner` | Alert for danger/warning status |
| `StatusIndicator` | Color dot (red/yellow/green) |

---

## 9. Status Calculation Logic

```typescript
// In ContaminantsContext.calculateMeasurementStatus()
if (higherIsBad) {
  if (value >= limit) return "danger"
  if (value >= warningRatio * limit) return "warning"
  return "safe"
} else {
  if (value <= limit) return "danger"
  if (value <= warningRatio * limit) return "warning"
  return "safe"
}
```

**Warning Ratio:** Default 0.8 (80% of limit triggers warning)

---

## 10. Complete Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Risks.xlsx                            │
│  (Water contaminants, Radon zones, Lyme disease data)        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              parse-risks-excel.ts / parse-risks-excel-om.ts  │
│                    (XLSX parsing scripts)                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                seed-data.json / seed-om-data.json            │
│                    (Intermediate JSON files)                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              seed-contaminants.ts / seed-om-data.ts          │
│                    (DynamoDB seeding scripts)                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    DynamoDB Tables                           │
│  Contaminant | ContaminantThreshold | Jurisdiction |         │
│  Category | SubCategory | LocationMeasurement |              │
│  ObservedProperty | PropertyThreshold | LocationObservation  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    AppSync GraphQL API                       │
│                 (Amplify Gen2 backend)                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│            apps/mobile/app/services/amplify/data.ts          │
│                    (Data service layer)                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  ContaminantsContext / CategoriesContext / useZipCodeData    │
│            (Global state + React Query caching)              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│           DashboardScreen → CategoryDetailScreen             │
│                    (User-facing screens)                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 11. Deep Dive: Parsing Logic

### parse-risks-excel.ts Implementation Details

**Category Detection:**
```typescript
// Regex pattern for category rows: "1 FERTILIZER PRODUCTS"
const categoryMatch = name.match(/^(\d+)\s+(.+)$/);
if (categoryMatch) {
  currentCategoryId = categoryMatch[2].toLowerCase().replace(/\s+/g, '-');
  currentCategoryName = categoryMatch[2];
}
```

**Contaminant ID Generation:**
```typescript
// Transform "Nitrate (as N)" → "nitrate-as-n"
const contaminantId = name
  .toLowerCase()
  .replace(/[()]/g, '')
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '');
```

**Threshold Parsing Logic:**
```typescript
function parseThreshold(value: string | number): ThresholdData {
  if (typeof value === 'number') {
    return { status: 'regulated', limitValue: value };
  }

  const strVal = String(value).trim().toUpperCase();

  if (strVal === 'BANNED') {
    return { status: 'banned', limitValue: null };
  }
  if (strVal === 'NOT APPROVED') {
    return { status: 'not_approved', limitValue: null };
  }
  if (strVal === '' || strVal === 'NO STANDARD') {
    return { status: 'not_controlled', limitValue: null };
  }

  // Try parsing as number
  const parsed = parseFloat(strVal);
  if (!isNaN(parsed)) {
    return { status: 'regulated', limitValue: parsed };
  }

  return { status: 'not_controlled', limitValue: null };
}
```

**Unit Determination:**
```typescript
function determineUnit(contaminantName: string): string {
  const name = contaminantName.toLowerCase();

  // Radioactive contaminants use Bq/L
  if (name.includes('radium') || name.includes('uranium') ||
      name.includes('radon') || name.includes('gross alpha')) {
    return 'Bq/L';
  }

  // PFAS compounds use ng/L (parts per trillion)
  if (name.includes('pfoa') || name.includes('pfos') ||
      name.includes('pfas') || name.includes('genx')) {
    return 'ng/L';
  }

  // Default: μg/L (micrograms per liter)
  return 'μg/L';
}
```

---

## 12. Deep Dive: Threshold Resolution

### ContaminantsContext Implementation

**Jurisdiction Fallback Chain:**
```typescript
function getThreshold(
  contaminantId: string,
  jurisdictionCode: string
): ContaminantThreshold | null {
  // Try exact match first
  const exactKey = `${contaminantId}:${jurisdictionCode}`;
  if (thresholdMap.has(exactKey)) {
    return thresholdMap.get(exactKey)!;
  }

  // Fallback: Try parent jurisdiction
  // US-NY → US → WHO
  // CA-QC → CA → WHO
  const parentCode = getParentJurisdiction(jurisdictionCode);
  if (parentCode) {
    const parentKey = `${contaminantId}:${parentCode}`;
    if (thresholdMap.has(parentKey)) {
      return thresholdMap.get(parentKey)!;
    }
  }

  // Ultimate fallback: WHO
  const whoKey = `${contaminantId}:WHO`;
  return thresholdMap.get(whoKey) || null;
}

function getParentJurisdiction(code: string): string | null {
  // US state codes: US-NY, US-TX, US-CA, US-FL
  if (code.startsWith('US-')) return 'US';
  // Canadian provinces: CA-QC, CA-ON, CA-BC
  if (code.startsWith('CA-')) return 'CA';
  // EU countries fall back to EU
  if (['DE', 'FR', 'IT', 'ES'].includes(code)) return 'EU';
  return null;
}
```

**Status Calculation with Edge Cases:**
```typescript
function calculateMeasurementStatus(
  value: number | null,
  contaminantId: string,
  jurisdictionCode: string
): 'danger' | 'warning' | 'safe' | 'unknown' {
  // No measurement value
  if (value === null || value === undefined) {
    return 'unknown';
  }

  const threshold = getThreshold(contaminantId, jurisdictionCode);

  // No threshold defined
  if (!threshold || threshold.limitValue === null) {
    return 'unknown';
  }

  const { limitValue, warningRatio = 0.8 } = threshold;
  const contaminant = contaminantMap.get(contaminantId);
  const higherIsBad = contaminant?.higherIsBad ?? true;

  if (higherIsBad) {
    // Most contaminants: higher value = worse
    if (value >= limitValue) return 'danger';
    if (value >= limitValue * warningRatio) return 'warning';
    return 'safe';
  } else {
    // Rare case: lower value = worse (e.g., pH, dissolved oxygen)
    if (value <= limitValue) return 'danger';
    if (value <= limitValue * warningRatio) return 'warning';
    return 'safe';
  }
}
```

**Threshold Status Types:**
| Status | Meaning | UI Display |
|--------|---------|------------|
| `regulated` | Has numeric limit | Shows limit value |
| `banned` | Completely prohibited | "BANNED" label |
| `not_approved` | Not approved for use | "NOT APPROVED" label |
| `not_controlled` | No standard set | "—" or "No Standard" |

---

## 13. Deep Dive: Frontend Display

### CategoryDetailScreen Rendering

**Screen Parameters:**
```typescript
type CategoryDetailParams = {
  category: string;      // "water", "air", etc.
  city: string;          // "New York"
  state: string;         // "NY"
  subCategoryId?: string; // Optional filter
};
```

**Data Processing:**
```typescript
// Filter measurements by category
const categoryMeasurements = measurements.filter(m => {
  const contaminant = getContaminant(m.contaminantId);
  return contaminant?.category === category;
});

// Further filter by subcategory if specified
const filteredMeasurements = subCategoryId
  ? categoryMeasurements.filter(m => {
      const contaminant = getContaminant(m.contaminantId);
      return contaminant?.subCategoryId === subCategoryId;
    })
  : categoryMeasurements;

// Calculate status for each measurement
const measurementsWithStatus = filteredMeasurements.map(m => ({
  ...m,
  status: calculateMeasurementStatus(m.value, m.contaminantId, jurisdictionCode),
  threshold: getThreshold(m.contaminantId, jurisdictionCode),
}));
```

### ContaminantTable Component

**For Water Category (tabular view):**
```
┌─────────────────┬─────────┬─────────┬──────────┬────────┐
│ Contaminant     │ Value   │ WHO     │ Local    │ Status │
├─────────────────┼─────────┼─────────┼──────────┼────────┤
│ Nitrate         │ 8.2     │ 50      │ 10       │ 🟢     │
│ Lead            │ 12.5    │ 10      │ 15       │ 🟡     │
│ Arsenic         │ 18.0    │ 10      │ 10       │ 🔴     │
└─────────────────┴─────────┴─────────┴──────────┴────────┘
```

### StatItem Component

**For Other Categories (list view):**
```typescript
<StatItem
  name={contaminant.name}
  value={measurement.value}
  unit={contaminant.unit}
  status={measurement.status}
  threshold={threshold?.limitValue}
  onPress={() => navigateToTrend(measurement)}
/>
```

### Status Indicator Colors

```typescript
const STATUS_COLORS = {
  danger: {
    background: '#FFEBEE',  // Light red
    text: '#C62828',        // Dark red
    icon: '#D32F2F',        // Red
  },
  warning: {
    background: '#FFF3E0',  // Light orange
    text: '#E65100',        // Dark orange
    icon: '#FF9800',        // Orange
  },
  safe: {
    background: '#E8F5E9',  // Light green
    text: '#2E7D32',        // Dark green
    icon: '#4CAF50',        // Green
  },
  unknown: {
    background: '#F5F5F5',  // Light gray
    text: '#616161',        // Gray
    icon: '#9E9E9E',        // Gray
  },
};
```

### Priority Sorting

Dashboard shows worst status first:
```typescript
const priorityOrder = { danger: 0, warning: 1, safe: 2, unknown: 3 };

const sortedMeasurements = measurementsWithStatus.sort((a, b) =>
  priorityOrder[a.status] - priorityOrder[b.status]
);
```

---

## 14. Key Files Reference

| Layer | File Path |
|-------|-----------|
| Source | `/Risks.xlsx` |
| Parser | `packages/backend/scripts/parse-risks-excel.ts` |
| Parser (O&M) | `packages/backend/scripts/parse-risks-excel-om.ts` |
| Seed Data | `packages/backend/scripts/seed-data.json` |
| Schema | `packages/backend/amplify/data/resource.ts` |
| Seeder | `packages/backend/scripts/seed-contaminants.ts` |
| Data Service | `apps/mobile/app/services/amplify/data.ts` |
| Fetch Hook | `apps/mobile/app/hooks/useZipCodeData.ts` |
| Contaminants Context | `apps/mobile/app/context/ContaminantsContext.tsx` |
| Categories Context | `apps/mobile/app/context/CategoriesContext.tsx` |
| Dashboard | `apps/mobile/app/screens/DashboardScreen.tsx` |
| Category Detail | `apps/mobile/app/screens/CategoryDetailScreen.tsx` |
| ContaminantTable | `apps/mobile/app/components/ContaminantTable.tsx` |
| StatItem | `apps/mobile/app/components/StatItem.tsx` |
| StatusIndicator | `apps/mobile/app/components/StatusIndicator.tsx` |

---

## 15. Common Data Issues & Debugging

### Issue: Contaminant shows "unknown" status
**Check:**
1. Is `limitValue` null in `ContaminantThreshold`?
2. Is `value` null in `LocationMeasurement`?
3. Does jurisdiction fallback chain resolve?

### Issue: Wrong threshold displayed
**Check:**
1. Verify `jurisdictionCode` on `Location` record
2. Check fallback: local → country → WHO
3. Confirm threshold exists in `ContaminantThreshold` table

### Issue: Missing contaminants in category
**Check:**
1. Verify `category` field in `Contaminant` record
2. Check `subCategoryId` if filtering by subcategory
3. Confirm measurement exists in `LocationMeasurement`

### Useful Debug Queries (AppSync):
```graphql
# Get all thresholds for a contaminant
query {
  listContaminantThresholds(filter: {
    contaminantId: { eq: "nitrate" }
  }) {
    items { jurisdictionCode limitValue status }
  }
}

# Get measurements for a city
query {
  listLocationMeasurements(filter: {
    city: { eq: "New York" }
    state: { eq: "NY" }
  }) {
    items { contaminantId value measuredAt }
  }
}
```
