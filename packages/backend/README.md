# MapYourHealth Backend

AWS Amplify Gen2 backend for the MapYourHealth water quality monitoring platform.

## Data Models

### Reference Data (seeded from Risks.xlsx)

| Model | Description |
|-------|-------------|
| **Jurisdiction** | Regulatory bodies (WHO, EU, US, CA, US-NY, CA-QC, etc.) with hierarchical fallback |
| **Contaminant** | 174 water contaminants (nitrate, lead, arsenic, PFAS, etc.) with categories and units |
| **ContaminantThreshold** | Jurisdiction-specific limits for each contaminant (e.g., nitrate limit is 50,000 μg/L for WHO, 10,000 for CA-QC) |

### Operational Data (uploaded via Admin Dashboard)

| Model | Description |
|-------|-------------|
| **LocationMeasurement** | Actual measured values at postal codes (e.g., H2X1Y6 has 8500 μg/L nitrate) |
| **Location** | Postal code to jurisdiction mapping |
| **UserSubscription** | User notification preferences for locations |
| **NotificationLog** | Audit trail for sent notifications |
| **HazardReport** | User-submitted hazard reports |

## Seeding Process

### Prerequisites

- Node.js 18+
- AWS CLI configured with `rayane` profile
- Amplify backend deployed (`amplify_outputs.json` exists)

### Step 1: Parse Risks.xlsx to JSON

The `Risks.xlsx` file contains contaminant definitions and regulatory thresholds. Parse it to generate `seed-data.json`:

```bash
cd packages/backend

# Install dependencies (from repo root)
cd ../.. && yarn install && cd packages/backend

# Parse Excel to JSON
npx tsx scripts/parse-risks-excel.ts
```

**Input:** `../../Risks.xlsx` (Excel file with "Drinking Water Contamination" sheet)

**Output:** `scripts/seed-data.json` containing:
- 18 jurisdictions
- 174 contaminants
- 414 thresholds

#### Excel Structure Expected

| Column | Content |
|--------|---------|
| A | Contaminant Name |
| B | WHO limit |
| C | Quebec limit |
| D | NY limit |
| E | CA limit |
| F | TX limit |
| G | FL limit |
| H | EU limit |
| I | Keywords |
| J | Studies (EN) |
| K | Description (EN) |
| L | Studies (EN alt) |
| M | Description (FR) |

Category headers are detected automatically (e.g., "2 Fertilizers", "68 Pesticides").

### Step 2: Seed DynamoDB

Upload the parsed data directly to DynamoDB:

```bash
cd packages/backend

# Seed the database
AWS_PROFILE=rayane npx tsx scripts/seed-dynamodb-direct.ts

# To clear existing data first:
AWS_PROFILE=rayane npx tsx scripts/seed-dynamodb-direct.ts --clear
```

This populates:
- `Jurisdiction-*` table (18 records)
- `Contaminant-*` table (174 records)
- `ContaminantThreshold-*` table (414 records)

### Step 3: Verify Seeding

```bash
# Check record counts
aws dynamodb scan --table-name "Contaminant-uusoeozunzdy5biliji7vxbjcy-NONE" \
  --profile rayane --region ca-central-1 --select COUNT

aws dynamodb scan --table-name "ContaminantThreshold-uusoeozunzdy5biliji7vxbjcy-NONE" \
  --profile rayane --region ca-central-1 --select COUNT

aws dynamodb scan --table-name "Jurisdiction-uusoeozunzdy5biliji7vxbjcy-NONE" \
  --profile rayane --region ca-central-1 --select COUNT
```

## Uploading Measurement Data

After seeding reference data, upload actual water quality measurements via the Admin Dashboard.

### Admin Dashboard

URL: https://admin.mapyourhealth.info/import

### CSV Format

```csv
postalCode,contaminantId,value,source
H2X1Y6,nitrate,8500,MELCC
H2X1Y6,lead,3.2,MELCC
10001,arsenic,6.1,EPA
90210,perfluorooctanoic-acid-pfoa,18,California Water Board
```

| Column | Required | Description |
|--------|----------|-------------|
| `postalCode` | Yes | ZIP code (US) or postal code (CA) |
| `contaminantId` | Yes | Must match a seeded contaminant ID (e.g., `nitrate`, `lead`, `perfluorooctanoic-acid-pfoa`) |
| `value` | Yes | Measured value in the contaminant's unit |
| `source` | No | Data source (EPA, MELCC, Health Canada, etc.) |

### Finding Valid Contaminant IDs

```bash
# List all contaminant IDs
aws dynamodb scan --table-name "Contaminant-uusoeozunzdy5biliji7vxbjcy-NONE" \
  --profile rayane --region ca-central-1 \
  --query 'Items[*].{id:contaminantId.S,name:name.S}' --output table
```

### Notify Subscribers

Toggle "Notify subscribers" in the import page to send push/email alerts to users subscribed to affected postal codes.

## Data Flow

```
Risks.xlsx
    │
    ▼ (parse-risks-excel.ts)
seed-data.json
    │
    ▼ (seed-dynamodb-direct.ts)
┌─────────────────────────────────────────────┐
│  DynamoDB                                   │
│  ├── Jurisdiction (18)                      │
│  ├── Contaminant (174)                      │
│  └── ContaminantThreshold (414)             │
└─────────────────────────────────────────────┘
    │
    ▼ (Admin Dashboard CSV Import)
┌─────────────────────────────────────────────┐
│  DynamoDB                                   │
│  └── LocationMeasurement (varies)           │
└─────────────────────────────────────────────┘
    │
    ▼ (Mobile App)
┌─────────────────────────────────────────────┐
│  User enters postal code                    │
│  App fetches measurements + thresholds      │
│  Calculates safety status (safe/warning/    │
│  danger) based on jurisdiction limits       │
└─────────────────────────────────────────────┘
```

## Safety Status Calculation

```
value >= limit                    → DANGER
value >= limit × warningRatio     → WARNING
value < limit × warningRatio      → SAFE
```

Default `warningRatio` is 0.8 (80% of limit).

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `scripts/parse-risks-excel.ts` | Parse Risks.xlsx → seed-data.json |
| `scripts/seed-dynamodb-direct.ts` | Seed DynamoDB directly (bypasses AppSync auth) |
| `scripts/seed-contaminants.ts` | Seed via Amplify client (requires Cognito auth) |

## Environment

- **Region:** ca-central-1
- **AWS Profile:** rayane
- **Table Suffix:** uusoeozunzdy5biliji7vxbjcy-NONE
