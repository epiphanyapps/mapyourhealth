# E2E-001: Subscription and Notification Flow

## Overview

Foundational end-to-end test validating the complete user journey from guest browsing through receiving notifications for subscribed zip codes.

## Test ID

- **ID:** E2E-001
- **Title:** Subscription and Notification Flow
- **Priority:** High
- **Type:** End-to-End Integration Test

## Prerequisites

- [ ] Mobile app running (web or native)
- [ ] Admin portal accessible
- [ ] Test user account (or ability to create one)
- [ ] Admin account with CMS access
- [ ] Email access for test user

## Test Procedure

### Part 1: Guest Browsing

1. Open mobile app at root URL
2. Verify Dashboard loads with guest empty state
3. Search for a zip code (e.g., 90210)
4. View safety stats and categories
5. **Expected:** All data visible without login

### Part 2: Follow Action (Auth Gate)

1. Tap "Follow" button on zip code
2. **Expected:** Redirected to Login/Signup screen
3. Verify "Sign Up" option is available

### Part 3: User Signup

1. Tap "Sign Up"
2. Enter email and password
3. Submit signup form
4. Check email for confirmation code
5. Enter confirmation code
6. **Expected:** Account created, redirected to onboarding

### Part 4: Subscribe to Zip Codes

1. On onboarding screen, search for zip code
2. Select one or more zip codes
3. Complete onboarding
4. **Expected:** Subscriptions saved, user on Dashboard

### Part 5: Admin Updates Data

1. Open Admin Portal
2. Login with admin credentials
3. Navigate to Zip Codes
4. Select subscribed zip code
5. Update a stat value to "danger" threshold OR add warning
6. Save changes
7. **Expected:** Data saved successfully

### Part 6: Notification Delivery

1. Wait for notification processing (may take up to 5 minutes)
2. Check test user's email inbox
3. **Expected:** Email received with:
   - Zip code mentioned
   - Updated stat or warning details
   - Link to view in app

## Automated Test Coverage

### Playwright Tests (Web)

Location: `apps/admin/e2e/`

**Mobile Web Tests** (`e2e/mobile-web/e2e-001-subscription.spec.ts`):
| Test | Status |
|------|--------|
| guest sees empty state with search prompt | ✅ Passing |
| guest can search for zip codes and view data | ✅ Passing |
| guest can search for a different zip code | ✅ Passing |
| follow button triggers auth gate for guests | ✅ Passing |
| can navigate from login to signup | ✅ Passing |
| share button is accessible after searching | ✅ Passing |
| compare button navigates correctly | ✅ Passing |

**Admin Portal Tests** (`e2e/admin/zip-code-edit.spec.ts`):
| Test | Status |
|------|--------|
| redirects to login when not authenticated | ✅ Passing |
| login page renders correctly | ✅ Passing |
| shows error for invalid credentials | ✅ Passing |
| can access zip codes page | ⏭️ Skipped (requires credentials) |
| can view zip code detail page | ⏭️ Skipped (requires credentials) |
| can open add stat dialog | ⏭️ Skipped (requires credentials) |
| displays stat table when stats exist | ⏭️ Skipped (requires credentials) |

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run only mobile web tests
npm run test:e2e:mobile-web

# Run only admin tests
npm run test:e2e:admin

# Run with UI mode (interactive)
npm run test:e2e:ui
```

### Running with Admin Credentials

To run admin tests that require authentication:

```bash
ADMIN_TEST_EMAIL=your-admin@email.com \
ADMIN_TEST_PASSWORD=your-password \
npm run test:e2e:admin
```

### Maestro Tests (Native Mobile)

Location: `apps/mobile/.maestro/flows/E2E-001-subscription-flow.yaml`

Run with:
```bash
cd apps/mobile
maestro test .maestro/flows/E2E-001-subscription-flow.yaml
```

## Verification Checklist

- [x] Guest can browse without login (sees search prompt)
- [x] Guest can search and view zip code data
- [x] Follow button triggers auth gate
- [x] Can navigate from login to signup
- [ ] Signup flow completes successfully (requires manual testing)
- [ ] Subscriptions are persisted (requires manual testing)
- [x] Admin login page works correctly
- [ ] Admin can update zip code data (requires valid credentials)
- [ ] Email notification is delivered (requires manual testing)
- [ ] Email contains correct information (requires manual testing)

## Known Limitations

- Push notifications not yet implemented (future enhancement)
- Email delivery may have slight delay
- Notification Lambda must be deployed
- Signup/subscription tests require email confirmation (manual step)

## Related Issues

- Issue #9: Zip Code Subscriptions (completed)
- Issue #8: User Authentication (completed)
- Issue #11: Admin Portal (completed)
- Issue #49: E2E-001 Test Implementation

## Last Test Run

- **Date:** 2026-01-19
- **Environment:** Local development
- **Results:** 10 passed, 4 skipped (require admin credentials)
