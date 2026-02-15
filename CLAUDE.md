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

### Before Committing
- Run `npx eslint apps/mobile/app --ext .ts,.tsx` to check for lint errors
- Run `npx prettier --check "apps/mobile/app/**/*.{ts,tsx}"` to check formatting
- Fix ALL errors before committing
