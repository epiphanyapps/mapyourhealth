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
│           │   ├── on-zipcode-stat-update/
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
- Mobile Web: `d2z5ddqhlc1q5`
- Admin Dashboard: `d26q32gc98goap`

## Project URLs

- **Mobile App (Web)**: https://app.mapyourhealth.info/
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

**Scripts:**
```bash
cd packages/backend
yarn sandbox         # Start local Amplify sandbox
yarn deploy          # Deploy to AWS
yarn seed            # Seed contaminant data
yarn fetch:outputs   # Fetch amplify_outputs.json from AWS
```

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

If no outputs file exists anywhere, run `yarn backend:sandbox` to generate one from AWS.

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

## CI/CD Workflows

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `lint.yml` | PR, push | ESLint checks |
| `type-check.yml` | PR, push | TypeScript compilation |
| `backend-ci.yml` | PR to main | Backend CI |
| `backend-seed.yml` | Manual | Seed database |
| `admin-deploy.yml` | Push to main | Deploy admin dashboard |
| `mobile-deploy.yml` | Push to main | Deploy mobile web |
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

# OR start backend sandbox
yarn backend:sandbox
```

## Deployment

Deployments are managed via AWS Amplify Hosting:

1. **Backend**: Auto-deploys on push to `main` from `packages/backend`
2. **Mobile Web**: Auto-deploys on push to `main` from `apps/mobile`
3. **Admin**: Auto-deploys on push to `main` from `apps/admin`

Manual deployment:
```bash
# Backend
cd packages/backend && yarn deploy

# Mobile (EAS Build)
cd apps/mobile && eas build --profile production --platform all
```
