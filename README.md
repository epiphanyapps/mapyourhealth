# MapYourHealth

A health monitoring platform focused on water quality and environmental contaminants. Users subscribe to locations and receive real-time notifications about water safety data, contaminant levels, and environmental hazards in their areas.

<p align="center">
  <img src="docs/screenshots/01-dashboard.png" alt="Dashboard" width="250" />
  <img src="docs/screenshots/02-dashboard-expanded.png" alt="Dashboard Expanded" width="250" />
  <img src="docs/screenshots/03-category-detail.png" alt="Category Detail" width="250" />
</p>

## Key Features

- **Location-Based Monitoring** — Subscribe to cities/counties and track water quality, air quality, radiation, disease incidence, and more
- **Real-Time Alerts** — Push notifications and email alerts when contaminant levels exceed safety thresholds
- **Jurisdiction Comparison** — Compare contaminant thresholds across WHO, US states, Canadian provinces, and EU standards
- **Hazard Reporting** — Submit and view community hazard reports
- **Trend Analysis** — Visualize historical data and trends for monitored properties
- **Multilingual** — English and French support (i18next)
- **Admin Dashboard** — Manage categories, jurisdictions, thresholds, observations, and data imports

## Tech Stack

| Layer | Technologies |
| ----- | ------------ |
| **Mobile** | React Native 0.81, Expo SDK 54, React 19, React Navigation 7, React Query, React Native Paper |
| **Admin** | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, React Hook Form + Zod |
| **Backend** | AWS Amplify Gen2, AppSync (GraphQL), DynamoDB, Lambda, Cognito, SES |
| **Auth** | AWS Cognito with custom passwordless magic link flow |
| **Notifications** | Expo Push Notifications, AWS SES |
| **Testing** | Jest (unit), Maestro (mobile E2E), Playwright (web E2E) |
| **CI/CD** | GitHub Actions, AWS Amplify Hosting |

## Monorepo Structure

```text
mapyourhealth-monorepo/
├── apps/
│   ├── mobile/              # Expo React Native app (iOS, Android, Web)
│   └── admin/               # Next.js admin dashboard
├── packages/
│   └── backend/             # AWS Amplify Gen2 backend
│       └── amplify/
│           ├── auth/        # Cognito authentication config
│           ├── data/        # DynamoDB schema (AppSync GraphQL)
│           ├── functions/   # Lambda functions
│           └── storage/     # S3 storage config
├── scripts/                 # Build and utility scripts
├── docs/                    # Documentation
└── .github/workflows/       # CI/CD pipelines
```

**Package manager:** Yarn 4.6.0 with workspaces

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn 4.6.0
- AWS CLI configured with the appropriate profile
- Expo CLI (`npm install -g expo-cli`) for mobile development
- iOS Simulator (macOS) or Android Emulator for native development

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/epiphanyapps/mapyourhealth.git && cd mapyourhealth-monorepo

# 2. Install dependencies
yarn install

# 3. Sync Amplify outputs (required for AWS connectivity)
# This copies amplify_outputs.json from the backend package.
# If it doesn't exist yet, run: yarn fetch:outputs
yarn sync:amplify

# 4. Start the mobile app
yarn mobile

# OR start the admin dashboard
cd apps/admin && npm run dev

# OR start the backend sandbox (local Amplify environment)
yarn backend:sandbox
```

## Apps

### Mobile App (`apps/mobile`)

Cross-platform app built with Expo targeting iOS, Android, and Web.

**Main screens:** Dashboard, Category Detail, Compare, Location Observations, Trend Analysis, Subscriptions Settings, Hazard Reports, Profile, Onboarding

```bash
cd apps/mobile
npm run start              # Start Expo dev server
npm run ios                # Run on iOS simulator
npm run android            # Run on Android emulator
npm run test               # Run Jest tests
npm run lint               # Fix lint issues
```

### Admin Dashboard (`apps/admin`)

Internal dashboard for managing environmental data, categories, jurisdictions, thresholds, and observations.

**Routes:** Categories, Subcategories, Jurisdictions, Thresholds, Observed Properties, Property Thresholds, Observations, Data Import, Hazard Reports, ZIP Code Mappings, Stats

```bash
cd apps/admin
npm run dev                # Start dev server (http://localhost:3000)
npm run build              # Production build
npm run test:e2e           # Run Playwright tests
```

## Backend (`packages/backend`)

Serverless backend powered by AWS Amplify Gen2 with infrastructure-as-code.

### Data Models

| Model | Description |
| ----- | ----------- |
| `Category` / `SubCategory` | Hierarchical category system (water, air, health, disaster) |
| `Contaminant` | Water contaminant definitions (172+ types) |
| `ContaminantThreshold` | Jurisdiction-specific safety limits |
| `ObservedProperty` | Master catalog of measurable properties |
| `PropertyThreshold` | Jurisdiction-specific thresholds for observations |
| `Jurisdiction` | Regulatory authorities (WHO, US states, CA provinces, EU) |
| `Location` | City/county to jurisdiction mapping |
| `LocationMeasurement` | Contaminant measurements |
| `LocationObservation` | Observations (numeric, zone, endemic, incidence, binary) |
| `UserSubscription` | User location subscriptions with notification preferences |
| `NotificationLog` | Notification audit trail |
| `HazardReport` | User-submitted hazard reports |
| `HealthRecord` | Personal health tracking (owner-only) |

### Lambda Functions

| Function | Purpose |
| -------- | ------- |
| `request-magic-link` | Passwordless auth via email magic links |
| `create-auth-challenge` | Cognito custom auth challenge |
| `define-auth-challenge` | Cognito custom auth flow definition |
| `verify-auth-challenge` | Cognito challenge verification |
| `places-autocomplete` | Google Places API proxy with caching |
| `delete-account` | User account and data deletion |
| `send-notifications` | Push notifications via Expo |
| `send-email-alert` | Email alerts via AWS SES |
| `process-notifications` | Notification orchestration and routing |
| `on-location-measurement-update` | DynamoDB Stream trigger for automatic alerts |

### Automatic Notifications

When water quality data changes, the system automatically notifies subscribers:

1. A `LocationMeasurement` record is created or updated (DynamoDB Stream)
2. `on-location-measurement-update` Lambda fires
3. `process-notifications` evaluates subscriber preferences
4. Notifications dispatched via push (Expo) and/or email (SES)
5. All notifications logged to `NotificationLog`

Users control alerts through subscription settings: danger thresholds, warning thresholds, any-change alerts, specific contaminant filters, and new-data-available notifications.

## Testing

### Unit Tests

```bash
cd apps/mobile
npm run test               # Run Jest tests
npm run test:watch         # Watch mode
```

### Mobile E2E (Maestro)

Maestro tests require non-dev builds (preview/e2e profile):

```bash
cd apps/mobile

# Build for E2E
npm run build:ios:preview       # iOS simulator build
npm run build:android:preview   # Android emulator build

# Run tests
npm run test:maestro            # All Maestro flows
```

Test flows are in `apps/mobile/.maestro/flows/`.

### Web E2E (Playwright)

```bash
cd apps/admin
npm run test:e2e           # Run Playwright tests
npm run test:e2e:ui        # With Playwright UI
```

### Monorepo-Level Commands

```bash
yarn test:e2e              # Run all E2E suites
yarn lint                  # Lint all workspaces
yarn type-check            # Type-check all workspaces
```

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
| -------- | ------- | ------- |
| `lint.yml` | PR, push | ESLint checks |
| `type-check.yml` | PR, push | TypeScript compilation |
| `backend-ci.yml` | PR to main | Backend CI |
| `backend-seed.yml` | Manual | Seed database |
| `admin-deploy.yml` | Push to main | Deploy admin dashboard |
| `mobile-deploy.yml` | Push to main | Deploy mobile web |
| `e2e-tests.yml` | PR, manual | E2E test suite |
| `e2e-ios.yml` | Manual | iOS E2E tests |
| `playwright-tests.yml` | PR | Web Playwright tests |

Deployments are managed via AWS Amplify Hosting — pushes to `main` auto-deploy backend, mobile web, and admin dashboard.

## Project URLs

- **Mobile App (Web):** <https://app.mapyourhealth.info/>
- **Admin Dashboard:** <https://admin.mapyourhealth.info/>

## Configuration

### Mobile App (`apps/mobile/.env`)

| Variable | Description |
| -------- | ----------- |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | Google Places API key for location search |

### Backend (AWS Secrets/Environment)

| Variable | Description |
| -------- | ----------- |
| `GOOGLE_PLACES_API_KEY` | Google Places API key for the `places-autocomplete` Lambda |
| SES configuration | AWS SES must be configured in `ca-central-1` for email sending |

### Amplify Outputs

The app requires `amplify_outputs.json` for AWS Amplify connectivity. This file is gitignored and must be synced before running the app:

```bash
yarn sync:amplify        # Copy from backend package to root + mobile
yarn fetch:outputs       # Download from AWS if no local copy exists
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the project's linting rules (see `CLAUDE.md` for full details)
3. Run lint, type-check, and tests before opening a PR:
   ```bash
   yarn lint && yarn type-check
   cd apps/mobile && npm run test
   ```
4. Push to `staging` branch to test via the [staging environment](https://staging.d2z5ddqhlc1q5.amplifyapp.com/) before merging
5. Open a PR against `main`

## Documentation

- [Data Flow Customer Guide](docs/DATA_FLOW_CUSTOMER_GUIDE.md)
- [E2E Email Testing](docs/E2E_EMAIL_TESTING.md)
- [E2E Test Orchestration](docs/E2E_ORCHESTRATION.md)
- [Testing Locations](docs/TESTING_LOCATIONS.md)
