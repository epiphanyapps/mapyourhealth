# MapYourHealth - Claude Code Instructions

## Project Overview

MapYourHealth is a health monitoring application focused on water quality and environmental contaminants. Users can subscribe to locations and receive notifications about water safety data for their areas.

## Monorepo Structure

```
mapyourhealth-monorepo/
├── apps/
│   ├── mobile/          # Expo React Native app (iOS, Android, Web)
│   └── admin/           # Next.js admin dashboard
├── packages/
│   └── backend/         # AWS Amplify Gen2 backend
│       └── amplify/
│           ├── auth/           # Cognito authentication config
│           ├── data/           # DynamoDB schema (AppSync GraphQL)
│           ├── functions/      # Lambda functions
│           │   ├── create-auth-challenge/
│           │   ├── define-auth-challenge/
│           │   ├── delete-account/
│           │   ├── on-location-measurement-update/
│           │   ├── places-autocomplete/
│           │   ├── process-notifications/
│           │   ├── request-magic-link/
│           │   ├── send-email-alert/
│           │   ├── send-notifications/
│           │   └── verify-auth-challenge/
│           └── storage/        # S3 storage config
├── scripts/             # Build and utility scripts
└── docs/                # Documentation
```

## AWS Configuration

**Always use the `rayane` AWS profile for all AWS CLI commands:**
```bash
aws <command> --profile rayane
```

**Amplify App IDs (ca-central-1):**
- Backend: `d3jl0ykn4qgj9r`
- Mobile Web: `d2z5ddqhlc1q5` (branches: `main`, `staging`)
- Admin Dashboard: `d26q32gc98goap`

## Project URLs

- **Mobile App (Web)**: https://app.mapyourhealth.info/
- **Mobile App (Staging)**: https://staging.d2z5ddqhlc1q5.amplifyapp.com/
- **Admin Dashboard**: https://admin.mapyourhealth.info/

## Region

Primary AWS region: `ca-central-1`

## Package Manager

This project uses **Yarn 4.6.0** with workspaces. Use `yarn` commands:
```bash
yarn install              # Install all dependencies
yarn mobile               # Start mobile dev server
yarn backend:sandbox      # Start Amplify sandbox
yarn sync:amplify         # Sync amplify_outputs.json
```

## Apps

### Mobile App (`apps/mobile`)

**Stack:** Expo SDK 54, React Native 0.81.5, React 19.1.0

**Key Technologies:**
- Navigation: React Navigation 7
- State: React Query (@tanstack/react-query)
- UI: React Native Paper 5.15.0
- Storage: MMKV
- Auth: AWS Amplify
- i18n: i18next

**App Structure:**
```
apps/mobile/app/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── navigators/     # Navigation setup
├── hooks/          # Custom React hooks
├── context/        # React context providers
├── services/       # API and external services
├── config/         # App configuration
├── theme/          # Styling and theming
├── i18n/           # Internationalization
├── utils/          # Utility functions
└── data/           # Data layer
```

**Scripts:**
```bash
cd apps/mobile
npm run start              # Start with dev client
npm run ios                # Run on iOS simulator
npm run android            # Run on Android emulator
npm run build:ios:preview  # Build iOS preview (for E2E)
npm run build:android:preview  # Build Android preview (for E2E)
npm run test               # Run Jest tests
npm run test:maestro       # Run all Maestro E2E tests
npm run lint               # Fix lint issues
npm run lint:check         # Check for lint issues
```

### Admin Dashboard (`apps/admin`)

**Stack:** Next.js 16.1.3, React 19.2.3, Tailwind CSS 4

**Key Technologies:**
- UI: shadcn/ui components (Radix UI)
- Forms: React Hook Form + Zod
- Auth: AWS Amplify UI React
- Notifications: Sonner

**App Structure:**
```
apps/admin/src/
├── app/
│   ├── (admin)/    # Protected admin routes
│   └── login/      # Login page
├── components/     # UI components
├── hooks/          # Custom hooks
├── lib/            # Utilities
└── providers/      # Context providers
```

**Scripts:**
```bash
cd apps/admin
npm run dev          # Start dev server
npm run build        # Build for production
npm run test:e2e     # Run Playwright tests
```

## Location Data Architecture & Known Nuances

The app migrated from zip/postal code-based lookups to **city-based lookups** using Google Places API. Legacy naming persists in the codebase.

### Data Flow

1. **PlacesSearchBar** → user searches → Google Places API (via backend proxy) returns predictions
2. **resolvePlace(placeId)** → backend mutation resolves place to `{ city, state, country, jurisdictionCode }`
3. **Navigation** carries `{ city, state, country }` as route params
4. **useZipCodeData(city)** fetches `LocationMeasurement` records by city name from DynamoDB
5. **API response** includes `state` and `country` on each measurement — these are used for jurisdiction resolution
6. **CategoryDetailScreen** displays contaminant table with WHO and LOCAL threshold columns

### Jurisdiction Resolution

`getJurisdictionForLocation(state, country)` in `ContaminantsContext` tries:
1. `{country}-{state}` (e.g., `CA-QC`) → exact match
2. `{country}` (e.g., `CA`) → country-level fallback
3. `WHO` → global fallback

Seeded jurisdictions with state-specific thresholds: `CA-QC`, `CA-ON`, `CA-BC`, `CA-AB`, `US-NY`, `US-CA`, `US-TX`, `US-FL`, `US-IL`, `US-WA`, `US-GA`, `US-AZ`, `US-CO`, `US-MA`. Other states fall back to country-level or WHO.

### Legacy Patterns (Tech Debt)

| Pattern | Location | Status |
|---------|----------|--------|
| `useZipCodeData` hook name | `hooks/useZipCodeData.ts` | Takes city names, not zip codes |
| `ZipCodeData` / `ZipCodeStat` types | `data/types/safety.ts` | Still primary types, marked @deprecated |
| `getCityStateForZipCode()` | `hooks/useZipCodeData.ts` | Bundled US zip metadata, unused for city lookups |
| `detectPostalCodeRegion()` | `utils/postalCode.ts` | Postal code pattern matching, fails for city names |
| `CANADIAN_POSTAL_PREFIX_TO_PROVINCE` | `hooks/useZipCodeData.ts` | Hardcoded postal prefix map |
| Query key `byPostalCode` | `hooks/useZipCodeData.ts` | Used with city names |
| `getZipCodeStats()` | `services/amplify/data.ts` | Deprecated alias for `getLocationMeasurements()` |

### Important: ZipCodeData includes `country`

The `ZipCodeData` type includes a `country` field populated from API measurement responses. This is critical for correct jurisdiction resolution. The `state` and `country` values come from the `LocationMeasurement` records in DynamoDB, not from postal code parsing.

## Backend (`packages/backend`)

**Stack:** AWS Amplify Gen2, CDK, TypeScript

### Data Models (DynamoDB via AppSync)

| Model | Description |
|-------|-------------|
| `Contaminant` | Water contaminant definitions (172+ types) |
| `ContaminantThreshold` | Jurisdiction-specific limits |
| `Jurisdiction` | Regulatory jurisdictions (WHO, US states, CA provinces, EU) |
| `Location` | City/county to jurisdiction mapping |
| `LocationMeasurement` | Actual contaminant measurements |
| `UserSubscription` | User location subscriptions with notification prefs |
| `NotificationLog` | Notification audit trail |
| `HazardReport` | User-submitted hazard reports |
| `HealthRecord` | Personal health tracking (owner-only) |

### Lambda Functions

| Function | Purpose |
|----------|---------|
| `request-magic-link` | Passwordless auth via email |
| `create-auth-challenge` | Cognito custom auth |
| `define-auth-challenge` | Cognito custom auth |
| `verify-auth-challenge` | Cognito custom auth |
| `places-autocomplete` | Google Places API proxy with caching |
| `delete-account` | User account + data deletion |
| `send-notifications` | Push notifications (Expo) |
| `send-email-alert` | Email notifications (SES) |
| `process-notifications` | Notification orchestration |
| `on-location-measurement-update` | DynamoDB Stream trigger for auto-notifications |

**Scripts:**
```bash
cd packages/backend
yarn sandbox         # Start local Amplify sandbox
yarn deploy          # Deploy to AWS
yarn seed            # Seed contaminant data
yarn fetch:outputs   # Fetch amplify_outputs.json from AWS
```

### Contaminant Health Effects Data

The mobile app shows health info modals for each contaminant (issue #175). The data is auto-generated from `seed-data.json` (which is parsed from `Risks.xlsx`).

```bash
cd packages/backend
npx tsx scripts/generate-health-effects.ts
```

This reads `description` and `studies` fields from `seed-data.json` and generates `apps/mobile/app/data/contaminantHealthEffects.ts` with 174 entries. Re-run whenever `seed-data.json` is updated (e.g., after re-parsing `Risks.xlsx`).

## Automatic Notifications

The system automatically sends push/email notifications when water quality data changes.

### How It Works
1. `LocationMeasurement` table has a DynamoDB Stream enabled
2. When records are created or modified, `on-location-measurement-update` Lambda is triggered
3. Lambda invokes `process-notifications` which evaluates subscriber preferences
4. Notifications sent via `send-notifications` (push) and `send-email-alert` (email)
5. All notifications are logged to `NotificationLog` table

### Silent Import
When importing data via Admin Portal, check "Silent import" to suppress automatic notifications.

Use this for:
- Bulk data corrections
- Initial data seeding
- Test imports

The `silentImport` field on `LocationMeasurement` records controls this behavior.

### Notification Preferences
Users control notifications via their subscription settings:
- `alertOnDanger` - Notify when contaminant exceeds danger threshold
- `alertOnWarning` - Notify when contaminant exceeds warning threshold
- `alertOnAnyChange` - Notify on any data update
- `watchContaminants` - Filter to specific contaminants (null = all)
- `notifyWhenDataAvailable` - Notify when new data becomes available

## Linting Rules (MUST FOLLOW)

This project enforces strict ESLint + Prettier. All code MUST pass CI linting.

### Import Order (Mobile App)
- **React imports MUST come first** — `import { ... } from 'react'`
- Then `react-native` imports
- Then Expo imports
- Then third-party imports
- Then internal (`@/`) imports
- Follow the project's `import/order` ESLint rule strictly

### React Native Specific
- **NO inline styles** — use `StyleSheet.create()` instead of `style={{ ... }}`
- **NO color literals in styles** — define colors as constants or use theme values
- **NO raw Text/Button/TextInput** — use custom wrapper components from `@/components`
- **Use SafeAreaView from react-native-safe-area-context**, not from react-native

### React Hooks
- **Always include all dependencies** in `useEffect`, `useCallback`, `useMemo` dependency arrays
- If a dependency should be excluded, add an explicit `// eslint-disable-next-line react-hooks/exhaustive-deps` comment with justification

### Prettier Config (Mobile)
```json
{
  "printWidth": 100,
  "semi": false,
  "singleQuote": false,
  "trailingComma": "all",
  "quoteProps": "consistent"
}
```

### Before Committing
```bash
# Mobile app
npx eslint apps/mobile/app --ext .ts,.tsx
npx prettier --check "apps/mobile/app/**/*.{ts,tsx}"

# Admin app
cd apps/admin && npm run lint
```

## Amplify Outputs (REQUIRED for testing)

The app requires `amplify_outputs.json` for AWS Amplify configuration. This file is **gitignored** and must be fetched before running the app or tests.

```bash
# From repo root — syncs outputs to root + apps/mobile/
yarn sync:amplify
```

This copies from `packages/backend/amplify_outputs.json` → root and mobile. If the backend file doesn't exist, it falls back to the root copy.

**When setting up worktrees or fresh clones, always run `yarn sync:amplify` before starting Metro or running tests.**

If no outputs file exists anywhere, run `yarn fetch:outputs` to download from AWS.

## Testing

### Unit Tests (Jest)
```bash
cd apps/mobile
npm run test           # Run all tests
npm run test:watch     # Watch mode
```

### E2E Tests - Mobile (Maestro)

**IMPORTANT: Maestro tests require non-dev builds (preview/e2e profile).**

Development builds show the Expo dev client UI and wait for Metro bundler - they will NOT work with Maestro automation.

**Build for E2E Testing:**
```bash
cd apps/mobile

# iOS simulator (recommended for local testing)
npm run build:ios:preview

# Android emulator
npm run build:android:preview
```

**Install & Run Tests:**
```bash
# iOS: Install the .app from the build output
xcrun simctl install booted /path/to/MapYourHealth.app

# Run all E2E tests
npm run test:maestro

# Run specific test
npm run test:maestro:e2e
```

**Maestro Test Files:** `apps/mobile/.maestro/flows/`
- `E2E-001-subscription-flow.yaml`
- `E2E-002-search-validation.yaml`
- `E2E-003-category-reorganization.yaml`
- `E2E-121-account-deletion.yaml`
- And more...

**Key Points:**
- Preview/E2E builds are **standalone** - no Metro bundler needed
- Dev builds (`expo run:ios`) include dev client UI - **don't use for Maestro**
- The `e2e` EAS profile sets `E2E_TEST=true` env var if needed for test-specific behavior

### E2E Tests - Admin/Web (Playwright)
```bash
cd apps/admin
npm run test:e2e       # Run Playwright tests
npm run test:e2e:ui    # Run with Playwright UI

cd apps/mobile
npm run test:web       # Run mobile web Playwright tests
```

### E2E Email Testing (SES)

For testing email notifications (magic links, alerts), we use a dedicated subdomain with AWS SES receiving:

```bash
# One-time setup (creates S3 bucket, SES rules, MX record)
cd packages/backend
AWS_PROFILE=rayane yarn setup:e2e-email

# Teardown when no longer needed
AWS_PROFILE=rayane yarn teardown:e2e-email
```

**Architecture:**
- Test emails: `*@e2e.mapyourhealth.info` → SES → S3
- Business emails: `*@mapyourhealth.info` → Google (unchanged)

**Full documentation:** See [docs/E2E_EMAIL_TESTING.md](docs/E2E_EMAIL_TESTING.md)

## CI/CD Workflows

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `lint.yml` | PR, push | ESLint checks |
| `type-check.yml` | PR, push | TypeScript compilation |
| `backend-ci.yml` | Push to `main` or `staging` | Backend CI |
| `backend-seed.yml` | Manual | Seed database |
| `admin-deploy.yml` | Push to `main` or `staging` | Deploy admin dashboard |
| `mobile-deploy.yml` | Push to `main` or `staging` | Deploy mobile web |
| `web-deploy.yml` | Push to `main` or `staging` | Deploy web landing page |
| `e2e-tests.yml` | PR, manual | Run E2E tests |
| `e2e-ios.yml` | Manual | iOS E2E tests |
| `playwright-tests.yml` | PR | Playwright tests |

## GitHub Issue Labels (MUST FOLLOW)

When creating or processing GitHub issues, always apply the appropriate labels:

- **`e2e`** — Any issue involving end-to-end testing, Maestro flows, or device testing
- **`test`** — Any issue related to testing (unit, integration, E2E)
- **`bug`** — Bug reports and fixes
- **`enhancement`** — New features or improvements

Multiple labels can apply (e.g. an E2E testing issue gets both `e2e` and `test`).

## Environment Variables

### Mobile App (`apps/mobile/.env`)
```bash
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=  # Google Places API key
```

### Backend (AWS Secrets/Environment)
- `GOOGLE_PLACES_API_KEY` - For places-autocomplete Lambda
- SES configuration for email sending

### Seed Script Cognito Admin User
- **Email:** `seed@mapyourhealth.info`
- **Password:** `SeedAdmin2026!`
- Used by `seed-categories.ts` and `seed-om-data.ts` (AppSync seeding that requires admin auth)
- Usage: `COGNITO_EMAIL=seed@mapyourhealth.info COGNITO_PASSWORD=SeedAdmin2026! yarn seed:om`

## Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Sync Amplify outputs
yarn sync:amplify

# 3. Start mobile app
yarn mobile

# OR start admin dashboard
cd apps/admin && npm run dev

```

## Feature Branch Testing Workflow

**Default PR target is `staging`.** Every change flows `feat/*` → `staging` → `main`:
1. Open feature PRs against `staging` (`gh pr create --base staging`).
2. Once merged, CI auto-deploys to the staging environment where you smoke-test on the staging URLs.
3. When staging is green, promote with a separate PR from `staging` → `main`.

`staging` has its own backend (Amplify staging env), so breaking it is low-risk. Production (`main`) should only receive changes that have already been validated on staging.

### Staging URLs

- **Web landing (staging)**: https://staging.dv0j563gt073v.amplifyapp.com/
- **Admin (staging)**: https://staging.d26q32gc98goap.amplifyapp.com/
- **Mobile web (staging)**: https://staging.d2z5ddqhlc1q5.amplifyapp.com/

### Testing Strategy by Change Type

| Change Type | How to Test |
|-------------|-------------|
| **Backend only** (schema, Lambda) | Merge PR to `staging` → Amplify backend staging auto-deploys → verify via staging URLs or AppSync console |
| **Mobile only** (UI, hooks, screens) | Merge PR to `staging` → test at mobile staging URL |
| **Admin only** (pages, components) | `cd apps/admin && npm run dev` locally; then merge PR to `staging` and test at admin staging URL |
| **Web landing only** | Merge PR to `staging` → test at web staging URL |
| **Backend + Frontend** | Merge PR to `staging`; backend staging builds first, frontend staging picks up new outputs on next build |
| **Full stack** | Same as above; validate all affected staging URLs before promoting |

### Step-by-Step: Open a Feature PR

```bash
# 1. Branch off the latest main (or staging if it's ahead)
git checkout main && git pull --ff-only
git checkout -b feat/my-feature

# 2. Commit and push
git push -u origin feat/my-feature

# 3. Open a PR targeting staging
gh pr create --base staging --title "feat: my feature" --body "..."

# 4. After merge, smoke-test on the relevant staging URL(s).
```

### Promoting `staging` → `main`

Once staging is validated, open a promotion PR:

```bash
git checkout staging && git pull --ff-only
gh pr create --base main --head staging --title "release: promote staging to main" --body "..."
```

Merge with a regular merge commit so the commit history stays linear and traceable.

### Exceptions — target `main` directly

Only when going through `staging` would be counterproductive:
- **CI/workflow fixes** that would otherwise block the staging pipeline itself.
- **Production hotfixes** validated independently and too urgent for a staging cycle. Back-merge `main` → `staging` immediately after so the branches don't diverge.

### Pre-merge checks (before merging into `staging`)

```bash
# Lint
npx eslint apps/mobile/app --ext .ts,.tsx    # Mobile
cd apps/admin && npm run lint                 # Admin
cd apps/web && npm run lint                   # Web

# Type check
cd apps/mobile && npx tsc --noEmit            # Mobile
cd apps/admin && npx tsc --noEmit             # Admin
cd apps/web && npx tsc --noEmit               # Web

# Unit tests
cd apps/mobile && npm run test                # Jest
```

### Pre-promotion checks (before merging `staging` → `main`)

1. All staging URLs load and the affected flows work end-to-end.
2. No visual regressions on the changed screens.
3. E2E suites (Maestro / Playwright) pass if the feature touches critical flows:
   ```bash
   cd apps/mobile && npm run test:maestro     # requires preview build
   cd apps/admin && npm run test:e2e          # Playwright
   ```

### Merge Order for Related PRs

When multiple PRs touch overlapping files, merge into `staging` in dependency order:
1. Backend-only changes first (schema must exist before frontend uses it).
2. Admin-only changes (independent of mobile).
3. Mobile-only changes (independent of admin).
4. Full-stack changes last (depend on backend being deployed).

Each merge to `staging` auto-deploys. Wait for the deployment to complete before merging the next PR if they share backend dependencies. The same order applies to the eventual `staging` → `main` promotion.

## Known Fallback Values (Tech Debt)

The codebase contains numerous fallback/default values that can silently hide bugs. These are documented here for awareness and future cleanup.

### 1. Jurisdiction Fallbacks → `"WHO"`

When a location's jurisdiction cannot be determined, the system silently falls back to WHO thresholds. This can mask missing jurisdiction data.

| File | Line | Expression |
|------|------|------------|
| `apps/mobile/app/screens/LocationObservationsScreen.tsx` | 103 | `route.params.jurisdictionCode ?? getJurisdictionForLocation(...)?.code ?? "WHO"` |
| `apps/mobile/app/screens/CategoryDetailScreen.tsx` | 88 | `localJurisdiction?.code ?? "WHO"` |
| `apps/mobile/app/screens/DashboardScreen.tsx` | 191 | `getJurisdictionForLocation(...)?.code \|\| "WHO"` |
| `apps/mobile/app/hooks/useZipCodeData.ts` | 222 | `getJurisdictionForLocation(...)?.code \|\| "WHO"` |
| `apps/mobile/app/hooks/useMultiLocationData.ts` | 163 | `getJurisdictionForLocation(...)?.code \|\| "WHO"` |
| `packages/backend/scripts/parse-risks-excel.ts` | 425–459 | `JURISDICTION_FALLBACK` map + `\|\| "WHO"` |

### 2. Warning Ratio Default → `0.8`

When `warningRatio` is null/undefined, the system assumes 80%. This could misrepresent warning thresholds for contaminants that were never explicitly configured.

| File | Line | Expression |
|------|------|------------|
| `apps/mobile/app/context/ContaminantsContext.tsx` | 103 | `amplify.warningRatio ?? 0.8` |
| `apps/mobile/app/context/ContaminantsContext.tsx` | 306 | `threshold.warningRatio ?? 0.8` |
| `apps/mobile/app/hooks/useMultiLocationData.ts` | 70 | `threshold.warningRatio ?? 0.8` |
| `apps/mobile/app/hooks/useZipCodeData.ts` | 159 | `threshold.warningRatio ?? 0.8` |
| `apps/mobile/app/data/types/safety.ts` | 489 | `threshold.warningRatio ?? 0.8` |
| `apps/admin/src/app/(admin)/zip-codes/page.tsx` | 62 | `threshold.warningRatio ?? 0.8` |
| `apps/admin/src/app/(admin)/zip-codes/[zipCode]/page.tsx` | 81 | `threshold.warningRatio ?? 0.8` |
| `apps/admin/scripts/seed-data.ts` | 569 | `t.warningRatio \|\| 0.8` |
| `packages/backend/amplify/data/resource.ts` | 227 | `a.float().default(0.8)` (schema default) |

### 3. `higherIsBad` Default → `true`

Assumes higher contaminant values are always dangerous. Incorrect for beneficial metrics or properties where lower is worse.

| File | Line | Expression |
|------|------|------------|
| `apps/mobile/app/context/ContaminantsContext.tsx` | 91, 295 | `amplify.higherIsBad ?? true` |
| `apps/mobile/app/hooks/useMultiLocationData.ts` | 65, 98 | `contaminant?.higherIsBad ?? true` |
| `apps/mobile/app/hooks/useZipCodeData.ts` | 154 | `contaminant?.higherIsBad ?? true` |
| `apps/mobile/app/hooks/useLocationObservations.ts` | 120 | `prop.higherIsBad ?? true` |
| `apps/mobile/app/screens/StatTrendScreen.tsx` | 100 | `definition?.higherIsBad ?? true` |
| `apps/mobile/app/screens/DashboardScreen.tsx` | 220 | `contaminant?.higherIsBad ?? true` |
| `apps/admin/src/app/(admin)/stats/page.tsx` | 131 | `contaminant.higherIsBad ?? true` |
| `apps/admin/src/app/(admin)/properties/page.tsx` | 137, 216 | `property.higherIsBad ?? true` |
| `apps/admin/src/app/(admin)/zip-codes/[zipCode]/page.tsx` | 583, 591, 690 | `?.higherIsBad ?? true` |
| `packages/backend/scripts/seed-om-data.ts` | 151 | `property.higherIsBad ?? true` |
| `packages/backend/scripts/seed-dynamodb-direct.ts` | 235 | `p.higherIsBad ?? true` |

### 4. Mock/Offline Data Fallbacks

When backend API calls fail, the mobile app silently serves mock data. The `isMock` flag is set but not always surfaced to the user.

| File | Line | Description |
|------|------|-------------|
| `apps/mobile/app/context/ContaminantsContext.tsx` | 138, 153, 168 | Falls back to `mockContaminants`, `mockThresholds`, `mockJurisdictions` |
| `apps/mobile/app/context/CategoriesContext.tsx` | ~120 | Falls back to `mockCategories`, `mockSubCategories` |
| `apps/mobile/app/data/mock/index.ts` | — | Source of all mock fallback data |
| `apps/mobile/app/data/mock/categories.ts` | — | Hardcoded category fallback data |

### 5. Hardcoded Category Display Fallbacks

Multiple files define their own hardcoded category display names, icons, and colors. These can diverge from backend data.

| File | Constant | Values |
|------|----------|--------|
| `apps/mobile/app/components/CategoryIcon.tsx` | `FALLBACK_ICONS` | `water → "water"`, `air → "weather-cloudy"`, `health → "heart"`, `disaster → "fire"` |
| `apps/mobile/app/components/CategoryIcon.tsx` | `CATEGORY_COLORS` | `water → "#3B82F6"`, `air → "#8B5CF6"`, `health → "#EF4444"`, `disaster → "#F97316"` |
| `apps/mobile/app/components/StatCategoryCard.tsx` | `CATEGORY_DISPLAY_NAMES` | `water → "Tap Water Quality"`, `air → "Air Pollution"`, etc. |
| `apps/mobile/app/screens/CompareScreen.tsx` | `CATEGORY_DISPLAY_NAMES` (local copy) | `water → "Water Quality"` (different from StatCategoryCard!) |
| `apps/mobile/app/components/HazardReportForm.tsx` | `FALLBACK_CATEGORY_OPTIONS` | Only `water` and `air` hardcoded |
| `apps/mobile/app/context/CategoriesContext.tsx` | 241, 250 | `category?.color ?? "#6B7280"`, `category?.icon ?? "help-circle"` |

### 6. Notification Defaults

The notification system fills in defaults when data is missing, which can produce misleading alerts.

| File | Line | Expression | Default |
|------|------|------------|---------|
| `process-notifications/handler.ts` | 149 | `alertLevel === 'info' ? 'safe' : alertLevel \|\| 'warning'` | `'warning'` |
| `process-notifications/handler.ts` | 212 | `city \|\| cityName \|\| postalCode \|\| 'your area'` | `'your area'` |
| `process-notifications/handler.ts` | 220 | `alertLevel \|\| 'info'` | `'info'` |
| `process-notifications/handler.ts` | 306 | `event.contaminantId \|\| 'water-quality'` | `'water-quality'` |
| `process-notifications/handler.ts` | 307 | `event.contaminantName \|\| 'Water Quality'` | `'Water Quality'` |
| `process-notifications/handler.ts` | 310–312 | `event.oldStatus \|\| 'safe'`, `event.newStatus \|\| 'warning'`, `event.currentValue \|\| 0` | `'safe'`, `'warning'`, `0` |

### 7. Status Defaults

Missing status values default to the safest option, potentially hiding data integrity issues.

| File | Line | Expression | Default |
|------|------|------------|---------|
| `apps/mobile/app/screens/StatTrendScreen.tsx` | 105 | `stat?.status ?? "safe"` | `"safe"` |
| `apps/mobile/app/context/ContaminantsContext.tsx` | 104 | `amplify.status ?? "regulated"` | `"regulated"` |
| `apps/admin/src/app/(admin)/reports/page.tsx` | 264, 330 | `report.status \|\| "pending"` | `"pending"` |

### 8. Lambda Environment Variable Fallbacks

Lambda functions fall back to empty strings for missing env vars, causing silent failures instead of clear errors.

| File | Line | Variable | Default |
|------|------|----------|---------|
| `resolve-location/handler.ts` | 24–28 | `GOOGLE_PLACES_API_KEY`, `CACHE_TABLE_NAME`, `LOCATION_TABLE_NAME`, `JURISDICTION_TABLE_NAME`, `LOCATION_MEASUREMENT_TABLE_NAME` | `''` |
| `places-autocomplete/handler.ts` | 16–17 | `CACHE_TABLE_NAME`, `GOOGLE_PLACES_API_KEY` | `''` |
| `request-magic-link/handler.ts` | 26–27 | `FROM_EMAIL`, `APP_URL` | `'noreply@mapyourhealth.info'`, `'mapyourhealth://'` |
| `request-magic-link/rate-limiter.ts` | 16 | `RATE_LIMIT_TABLE_NAME` | `'MagicLinkRateLimit'` |
| `send-email-alert/handler.ts` | 183 | `SES_SENDER_EMAIL` | `'alerts@mapyourhealth.info'` |
| `send-notifications/handler.ts` | 135 | `channelId` | `'default'` |

### 9. Location String Defaults

Missing location data is replaced with generic strings instead of surfacing the error.

| File | Line | Expression | Default |
|------|------|------------|---------|
| `apps/mobile/app/screens/LocationObservationsScreen.tsx` | 134 | `city \|\| state \|\| "Unknown Location"` | `"Unknown Location"` |
| `apps/mobile/app/screens/CategoryDetailScreen.tsx` | 140–143 | `cityName \|\| state \|\| "Unknown Location"` | `"Unknown Location"` |
| `apps/admin/src/app/(admin)/zip-codes/page.tsx` | 133 | `m.city ?? "Unknown"` | `"Unknown"` |
| `apps/mobile/app/screens/CompareScreen.tsx` | 76–87 | Multi-level fallback chain | `"Unknown Location"` |

### 10. Measurement "Source" Field vs Threshold Jurisdiction

The `source` field on `LocationMeasurement` records indicates **where the measurement data came from** (e.g., "NY DEC", "EPA", "WHO"), NOT which regulatory threshold standard applies. This is a common source of confusion in the Admin Portal:

- **New York** measurements show `source: "NY DEC"` — data came from NY Dept. of Environmental Conservation
- **Atlanta** measurements show `source: "WHO"` — data was seeded using WHO as the data source label
- The **threshold comparison** (WHO vs Local columns in the mobile app) is determined by the `Jurisdiction` and `ContaminantThreshold` models, NOT by the measurement's `source` field

This means a city can have `source: "WHO"` on its measurements while still being compared against US-GA (Georgia) thresholds. The `source` field is informational only and was set during data seeding. It can be updated per-measurement via the Admin Portal (pencil icon → edit Source).

### 11. Identical WHO and Local Threshold Columns

When a city's jurisdiction has no state-specific thresholds seeded, the threshold resolution falls back to WHO for both columns. This causes the WHO and LOCAL columns in the mobile app's contaminant table to display identical values, which is confusing to users.

**Example:** Atlanta, GA shows the same values in both WHO and LOCAL columns because:
1. No `US-GA` jurisdiction thresholds exist
2. No `US` (federal EPA) thresholds exist for those contaminants
3. Both columns fall back to WHO thresholds

**States with seeded thresholds:** `CA-QC`, `CA-ON`, `CA-BC`, `CA-AB`, `US-NY`, `US-CA`, `US-TX`, `US-FL`, `US-IL`, `US-WA`, `US-GA`, `US-AZ`, `US-CO`, `US-MA` — though having a jurisdiction defined doesn't guarantee all contaminants have thresholds.

**To fix for a specific state:** Add contaminant thresholds in the Admin Portal → Thresholds page for that state's jurisdiction code (e.g., `US-GA`). Alternatively, adding `US`-level EPA thresholds would provide a meaningful fallback for all US states without state-specific data.

## Deployment

**All deployments are triggered by GitHub Actions after a merge to `main` or `staging`.** Amplify auto-build is disabled on both branches; the deploy workflows gate on lint + type check, then call `aws amplify start-job`. There is no manual deploy command for normal flow.

Each Amplify app has both `main` (production) and `staging` branches:

| App | Production | Staging |
|---|---|---|
| Backend (`d3jl0ykn4qgj9r`) | `main` | `staging` |
| Mobile Web (`d2z5ddqhlc1q5`) | https://app.mapyourhealth.info/ | https://staging.d2z5ddqhlc1q5.amplifyapp.com/ |
| Admin (`d26q32gc98goap`) | https://admin.mapyourhealth.info/ | https://staging.d26q32gc98goap.amplifyapp.com/ |
| Web landing (`dv0j563gt073v`) | https://www.mapyourhealth.info/ | https://staging.dv0j563gt073v.amplifyapp.com/ |

```bash
# Default: open a feature PR against staging
gh pr create --base staging --title "feat: my feature" --body "..."

# After staging is validated, promote to production with a follow-up PR
git checkout staging && git pull --ff-only
gh pr create --base main --head staging --title "release: promote staging to main" --body "..."

# Mobile native builds (EAS Build) — unchanged
cd apps/mobile && eas build --profile production --platform all
```

**Monitor deployments:**
```bash
# Check latest deployment status
aws amplify list-jobs --app-id <app-id> --branch-name main --max-items 1 --profile rayane --region ca-central-1
```
