# MapYourHealth - Claude Code Instructions

## AWS Configuration

**Always use the `rayane` AWS profile for all AWS CLI commands:**
```bash
aws <command> --profile rayane
```

## Project URLs

- **Mobile App (Web)**: https://app.mapyourhealth.info/
- **Admin Dashboard**: https://admin.mapyourhealth.info/

## Region

Primary AWS region: `ca-central-1`

## Linting Rules (MUST FOLLOW)

This project enforces strict ESLint + Prettier. All code MUST pass CI linting.

### Import Order
- **React imports MUST come first** — `import { ... } from 'react'` must appear before any third-party imports like `@tanstack/react-query`
- Follow the project's `import/order` ESLint rule strictly

### React Native
- **NO inline styles** — use `StyleSheet.create()` instead of `style={{ ... }}`
- **NO color literals in styles** — define colors as constants or use theme values, not raw strings like `'transparent'`, `'#fff'`, etc.

### React Hooks
- **Always include all dependencies** in `useEffect`, `useCallback`, `useMemo` dependency arrays. If a dependency should be excluded, add an explicit `// eslint-disable-next-line react-hooks/exhaustive-deps` comment with justification.

### Prettier
- Follow the project's Prettier config strictly. Do not introduce formatting that conflicts with it.
- Keep JSX props on one line when they fit within the line length limit.

## Amplify Outputs (REQUIRED for testing)

The app requires `amplify_outputs.json` for AWS Amplify configuration. This file is **gitignored** and must be fetched before running the app or tests.

```bash
# From repo root — syncs outputs to root + apps/mobile/
yarn sync:amplify
```

This copies from `packages/backend/amplify_outputs.json` → root and mobile. If the backend file doesn't exist, it falls back to the root copy.

**When setting up worktrees or fresh clones, always run `yarn sync:amplify` before starting Metro or running tests.**

If no outputs file exists anywhere, run `yarn backend:sandbox` to generate one from AWS.

## GitHub Issue Labels (MUST FOLLOW)

When creating or processing GitHub issues, always apply the appropriate labels:

- **`e2e`** — Any issue involving end-to-end testing, Maestro flows, or device testing
- **`test`** — Any issue related to testing (unit, integration, E2E)
- **`bug`** — Bug reports and fixes
- **`enhancement`** — New features or improvements

Multiple labels can apply (e.g. an E2E testing issue gets both `e2e` and `test`).

### Before Committing
- Run `npx eslint apps/mobile/app --ext .ts,.tsx` to check for lint errors
- Run `npx prettier --check "apps/mobile/app/**/*.{ts,tsx}"` to check formatting
- Fix ALL errors before committing

## Maestro E2E Testing

**IMPORTANT: Maestro tests require non-dev builds (preview/e2e profile).**

Development builds show the Expo dev client UI and wait for Metro bundler - they will NOT work with Maestro automation.

### Build for E2E Testing

```bash
cd apps/mobile

# iOS simulator (recommended for local testing)
npm run build:ios:preview

# Android emulator
npm run build:android:preview
```

### Install & Run Tests

```bash
# iOS: Install the .app from the build output
xcrun simctl install booted /path/to/MapYourHealth.app

# Run all E2E tests
npm run test:maestro

# Run specific test
npm run test:maestro:e2e
```

### Key Points
- Preview/E2E builds are **standalone** - no Metro bundler needed
- Dev builds (`expo run:ios`) include dev client UI - **don't use for Maestro**
- The `e2e` EAS profile sets `E2E_TEST=true` env var if needed for test-specific behavior
