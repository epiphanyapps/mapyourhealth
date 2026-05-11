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

## Full Wipe and Reseed (`reseed-all.sh`)

Use when you want to reset a test environment to a known-good state with cascade-test fixtures populated. The script runs nine steps end-to-end (~30 min):

```
1. wipe-all-data.ts                  → wipes 10 reference + measurement tables
2. parse-risks-excel.ts + -om.ts     → regenerates seed-data.json + seed-om-data.json
3. seed-dynamodb-direct.ts           → reseeds jurisdictions / contaminants / thresholds / locations / measurements / observed properties / property thresholds
4. seed-cascade-test-rows.ts         → uranium-238 measurements at QC / CA anchors (state + country leg of cascade)
5. seed-cascade-test-observations.ts → radon observations at QC / CA / US anchors
6. seed-categories.ts                → Category + SubCategory (AppSync)
7. seed-om-data.ts --observations-only → 6,660 location observations (AppSync)
8. seed-warning-banners.ts           → 4 test banners (global / country / state / city)
9. seed-pollution-sources.ts         → 5 test sources at varied anchors
```

### Prerequisites

- **Node 20 or 22** — see [Node v25 workaround](#node-v25-incompatibility) below
- AWS CLI configured with `rayane` profile
- `amplify_outputs.json` pointing at the target environment
- Cognito admin user (`seed@mapyourhealth.info` / `SeedAdmin2026!`) exists in the target user pool and is in the `admin` group

### Command

```bash
cd packages/backend
export TABLE_SUFFIX=<env-suffix>
export COGNITO_EMAIL=seed@mapyourhealth.info
export COGNITO_PASSWORD='SeedAdmin2026!'
bash scripts/reseed-all.sh 2>&1 | tee /tmp/reseed.log
```

### TABLE_SUFFIX values

| Environment | Suffix |
|---|---|
| staging | `dwz5zs2ghrc5xplczomoh4fzke-NONE` |
| main (**PRODUCTION**) | `uusoeozunzdy5biliji7vxbjcy-NONE` |

There is no default — the script refuses to run without `TABLE_SUFFIX` explicitly set. For prod, **confirm twice** before pasting.

### Switching `amplify_outputs.json` between environments

Steps 6–9 read `amplify_outputs.json` and hit AppSync. To target staging vs prod, swap the active outputs file before running:

```bash
# Pull staging outputs (writes amplify_outputs.staging.json)
yarn fetch:outputs:staging

# Pull prod outputs (writes amplify_outputs.json directly)
yarn fetch:outputs

# To target staging from a prod-pointed working tree:
cp amplify_outputs.json amplify_outputs.prod-backup.json
cp amplify_outputs.staging.json amplify_outputs.json

# When done, restore prod:
cp amplify_outputs.prod-backup.json amplify_outputs.json
```

Sanity check before running: verify the user pool id matches the target.

```bash
python3 -c "import json; d=json.load(open('amplify_outputs.json')); print(d['auth']['user_pool_id'])"
# staging: ca-central-1_tPykL7wal
# prod:    ca-central-1_YJw20H7Xt
```

### What's preserved

`wipe-all-data.ts` deliberately preserves user-generated tables:
- `UserSubscription`, `NotificationLog`, `HazardReport`, `HealthRecord`
- `WarningBanner`, `PollutionSource` (also not in the wipe list)

The banner and pollution-source seeds **upsert by natural key** (banner `title`, source `sourceId`), so re-running on a populated environment updates seed rows in place without disturbing admin-created rows.

### Production caveats

- `LocationMeasurement` and `LocationObservation` are wiped and re-seeded from `seed-measurements.json` / `seed-om-data.json`. **Any admin-imported rows that aren't in those JSON files are permanently lost** on prod.
- DynamoDB Stream events fire on both deletes and inserts, but the `on-location-measurement-update` Lambda filters out `REMOVE` events and respects `silentImport: true` on inserts — so no push/email notifications go out during a reseed.
- Run staging first, verify, then promote.

### Individual seed scripts

| `yarn` script | Purpose | Auth | TABLE_SUFFIX needed? |
|---|---|---|---|
| `seed` | Upsert contaminants / jurisdictions / thresholds from `seed-data.json` | Cognito | no |
| `seed:om` | Upsert observed properties / thresholds / observations | Cognito | no |
| `seed:cascade-measurements` | uranium-238 fixtures at QC/CA anchors (`source=cascade-coverage-fixture`) | Direct DDB | yes |
| `seed:cascade-observations` | radon fixtures at QC/CA/US anchors | Direct DDB | yes |
| `seed:banners` | 4 test banners upsert by title | Cognito | no |
| `seed:sources` | 5 test pollution sources upsert by sourceId | Cognito | no |
| `validate:seed` | Enum-membership check across all seed JSON files | — | no |

The cascade fixture scripts also accept `--remove` to delete the fixtures without re-inserting them.

### Verification after a reseed

**Mobile staging** (https://staging.d2z5ddqhlc1q5.amplifyapp.com/):
- Search "Sorel-Tracy, QC" → *Showing QC data* badge with a uranium-238 row visible
- Search "Halifax, NS" → *Showing CA data* badge (country cascade)
- Search "Montreal, QC" → 4 simultaneous banners: global + country + QC state + Montreal city
- Search "Toronto, ON" → global + country banners only (no QC, no Montreal)

**Admin staging** (https://staging.d26q32gc98goap.amplifyapp.com/):
- `/banners` → 4 `[SEED]`-prefixed rows
- `/pollution-sources` → 5 `seed-source-*` rows
- `/contaminants` → 6 corrected categories (silver / aluminium / fluoride / boron under `inorganic`; microcystin-lr under `microbiological`; microplastics under `organic`)

### Idempotency

Re-running `reseed-all.sh` on the same environment is safe:
- Wipe step deletes everything fresh
- Cascade fixture scripts delete existing fixtures (matched by `source = "cascade-coverage-fixture"`) before insert
- Banner + source upserts report `0 created, N updated` (or `0 created, 0 updated, N unchanged` on back-to-back runs)

### Node v25 incompatibility

`@aws-amplify/backend-cli` has a transitive dep (`@typescript/vfs`) that calls `localStorage.getItem` at module load. Node 25 dropped a web-API shim that earlier versions had. If `yarn fetch:outputs` fails with:

```
TypeError: localStorage.getItem is not a function
```

switch to Node 22 first:

```bash
nvm use 22
yarn fetch:outputs:staging
```

A `.nvmrc` at the repo root pins this for new contributors (see root README).

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

| Script | Purpose | Auth |
|--------|---------|------|
| `scripts/reseed-all.sh` | Full 9-step wipe + reseed orchestrator (see [section above](#full-wipe-and-reseed-reseed-allsh)) | mixed |
| `scripts/wipe-all-data.ts` | Wipe 10 reference / measurement tables (preserves user data) | Direct DDB |
| `scripts/parse-risks-excel.ts` | Parse Risks.xlsx → `seed-data.json` + `seed-measurements.json` | — |
| `scripts/parse-risks-excel-om.ts` | Parse Risks.xlsx → `seed-om-data.json` (radon, lyme disease) | — |
| `scripts/seed-dynamodb-direct.ts` | Bulk-seed reference + measurements via direct DDB | Direct DDB |
| `scripts/seed-contaminants.ts` | Upsert contaminants / jurisdictions / thresholds from `seed-data.json` | Cognito |
| `scripts/seed-categories.ts` | Seed Category + SubCategory | Cognito |
| `scripts/seed-om-data.ts` | Seed observed properties + thresholds + observations | Cognito |
| `scripts/seed-cascade-test-rows.ts` | Cascade fixtures: uranium-238 at QC/CA anchors | Direct DDB |
| `scripts/seed-cascade-test-observations.ts` | Cascade fixtures: radon at QC/CA/US anchors | Direct DDB |
| `scripts/seed-warning-banners.ts` | 4 test banners (upsert by title) | Cognito |
| `scripts/seed-pollution-sources.ts` | 5 test pollution sources (upsert by sourceId) | Cognito |
| `scripts/update-contaminant-categories.ts` | Targeted EPI-18 category patch (legacy — superseded by `seed-contaminants.ts` upsert) | Cognito |
| `scripts/validate-seed-data.ts` | Enum-membership check across all seed JSON files | — |

## Environment

| Setting | Value |
|---|---|
| **Region** | `ca-central-1` |
| **AWS Profile** | `rayane` |
| **Staging table suffix** | `dwz5zs2ghrc5xplczomoh4fzke-NONE` |
| **Prod table suffix** | `uusoeozunzdy5biliji7vxbjcy-NONE` |
| **Staging Cognito pool** | `ca-central-1_tPykL7wal` |
| **Prod Cognito pool** | `ca-central-1_YJw20H7Xt` |
| **Seed admin user** | `seed@mapyourhealth.info` (in `admin` group on both pools) |
