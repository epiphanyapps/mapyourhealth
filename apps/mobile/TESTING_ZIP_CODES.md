# MapYourHealth Mobile App - Testing Guide

This document provides testing instructions for the MapYourHealth mobile app.

---

## Table of Contents

1. [General Testing](#general-testing)
2. [Sign Up Flow](#sign-up-flow)
3. [CMS Updates](#cms-updates)
4. [Notifications](#notifications)
5. [Zip Code Test Data](#zip-code-test-data)

---

## General Testing

### Prerequisites

1. **Development Environment**
   - Node.js >= 20.0.0
   - Yarn package manager
   - Xcode (for iOS) or Android Studio (for Android)
   - Expo CLI installed globally

2. **Backend Setup**
   - Amplify sandbox running (`npx ampx sandbox` in packages/backend)
   - Seed data populated (see below)

3. **Running the App**
   ```bash
   # From apps/mobile directory
   yarn start           # Start Metro bundler
   yarn ios             # Run on iOS simulator
   yarn android         # Run on Android emulator
   ```

### Seeding Test Data

Before testing, populate the backend with test data:

```bash
# From repository root
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npx tsx apps/admin/scripts/seed-data.ts
```

### Test Accounts

| Role | Email | Password | Auth Method | Notes |
|------|-------|----------|-------------|-------|
| Admin | admin@mapyourhealth.com | (set in env) | Password | Full admin access |
| Test User | test@example.com | Test123! | Password | Standard user for testing |
| Magic Link User | magiclink@example.com | N/A | Magic Link | Passwordless user |

**Note:** Magic link users do not have passwords. They can only authenticate via magic link. Users who sign up with a password can also use magic link to log in.

### Environment Configuration

The app uses different configurations based on environment:

- **Development**: `app/config/config.dev.ts` - Points to sandbox backend
- **Production**: `app/config/config.prod.ts` - Points to production backend

### Testing Magic Link Backend API

The magic link request endpoint is a Lambda Function URL. You can test it directly:

**Get the Function URL:**
After deployment, the URL is exported as a CloudFormation output. Check the Amplify console or run:
```bash
aws cloudformation describe-stacks --stack-name amplify-d3jl0ykn4qgj9r-main-branch-xxx --query "Stacks[0].Outputs[?contains(ExportName, 'RequestMagicLinkUrl')].OutputValue" --output text
```

**Test with curl:**
```bash
# Request a magic link
curl -X POST "https://your-function-url.lambda-url.ca-central-1.on.aws/" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Expected success response:
# {"success": true, "message": "Magic link sent to your email"}

# Expected rate limit response (after 3 requests in 15 min):
# {"success": false, "error": "Too many requests. Please try again later."}
```

**SES Considerations:**
- In sandbox mode, both sender and recipient emails must be verified
- Verify test emails in SES console before testing
- Production requires moving out of SES sandbox

---

## Sign Up Flow

### Overview

The app supports multiple authentication methods:
1. Email/Password registration
2. Magic Link (passwordless) authentication

### Email/Password Sign Up

#### Test Steps

1. **Launch App**
   - Open the app on simulator/device
   - Tap "Sign Up" on the welcome screen

2. **Enter Registration Details**
   - Email: Use a valid email format (e.g., `testuser+1@gmail.com`)
   - Password: Must meet requirements:
     - Minimum 8 characters
     - At least one uppercase letter
     - At least one lowercase letter
     - At least one number
     - At least one special character

3. **Email Verification**
   - Check email for verification code
   - Enter the 6-digit code in the app
   - Verify success message appears

4. **Complete Profile**
   - Enter zip code (use one from test data below)
   - Verify dashboard loads with safety data

#### Edge Cases to Test

| Scenario | Expected Result |
|----------|-----------------|
| Invalid email format | Error: "Please enter a valid email" |
| Weak password | Error: Password requirements not met |
| Existing email | Error: "An account with this email already exists" |
| Invalid verification code | Error: "Invalid code, please try again" |
| Expired verification code | Error: "Code expired, request a new one" |
| Invalid zip code | Error or empty data state |

### Magic Link Sign Up (Passwordless)

Magic link authentication allows users to sign up and log in without a password. A secure one-time link is emailed that authenticates the user when clicked.

#### Technical Details

- **Deep Link Format**: `mapyourhealth://auth/verify?email={encoded_email}&token={token}`
- **Token Expiry**: 15 minutes
- **Rate Limit**: 3 requests per email per 15 minutes
- **Token Length**: 32 bytes (cryptographically random)

#### Test Steps

1. **Launch App**
   - Tap "Sign Up" on welcome screen
   - Tap **"Sign up with email link"** button at the bottom

2. **Enter Email (MagicLinkScreen)**
   - Enter valid email address
   - Tap "Send Magic Link"
   - Screen navigates to MagicLinkSentScreen on success

3. **Check Email Confirmation (MagicLinkSentScreen)**
   - Verify screen shows "Check Your Email" message
   - Verify email address is displayed
   - Verify "Link expires in 15 minutes" hint is shown
   - Available actions:
     - "Resend Link" - sends a new magic link
     - "Open Email App" - opens device email app
     - "Use Different Email" - returns to email entry

4. **Click Magic Link in Email**
   - Email contains link in format: `mapyourhealth://auth/verify?email=...&token=...`
   - Clicking link opens the app via deep link
   - MagicLinkVerifyScreen shows loading spinner during verification

5. **Verification Complete**
   - On success: Auto-navigates to Dashboard
   - On failure: Shows error with "Try Again" option

#### Edge Cases to Test

| Scenario | Expected Result |
|----------|-----------------|
| Invalid email format | Error: "Please enter a valid email address" |
| Empty email | Button disabled or error on submit |
| Link expired (after 15 min) | Error: "Magic link expired. Please request a new one." |
| Invalid/tampered token | Error: "Invalid or expired magic link" |
| Rate limit exceeded (4+ requests) | Error: "Too many requests. Please try again in 15 minutes." |
| Opening link on different device | Works if email matches the token |
| Link clicked twice | Second click fails (token cleared after first use) |
| Network error during verification | Error with retry option |

#### Simulating Deep Links (Testing)

For simulator testing, use these commands:

**iOS Simulator:**
```bash
xcrun simctl openurl booted "mapyourhealth://auth/verify?email=test%40example.com&token=abc123"
```

**Android Emulator:**
```bash
adb shell am start -a android.intent.action.VIEW -d "mapyourhealth://auth/verify?email=test%40example.com&token=abc123"
```

### Login Flow

#### Email/Password Login

1. **Existing User Login**
   - Tap "Log In" on welcome screen
   - Enter registered email and password
   - Verify dashboard loads

2. **Forgot Password**
   - Tap "Forgot Password?" link
   - Follow password reset flow

#### Magic Link Login

1. **Tap "Log In"** on welcome screen
2. **Tap "Email me a link instead"** button below the password field
3. **Enter Email (MagicLinkScreen)**
   - Enter your registered email address
   - Tap "Send Magic Link"
4. **Check Email (MagicLinkSentScreen)**
   - Wait for magic link email
   - Use "Open Email App" for quick access
5. **Click Link in Email**
   - Link opens app and verifies automatically
   - On success, navigates directly to Dashboard

#### Edge Cases to Test

| Scenario | Expected Result |
|----------|-----------------|
| Wrong password | Error: "Incorrect email or password" |
| Non-existent account (password) | Error: "No account found with this email" |
| Non-existent account (magic link) | Creates new account automatically |
| Account locked (too many password attempts) | Error: "Account temporarily locked" |
| Magic link for unregistered email | User is created and logged in |
| Switching between password and magic link | Both methods work for same account |

---

## CMS Updates

### Overview

The admin portal allows updating safety data that reflects in the mobile app.

### Admin Portal Access

```
URL: https://admin.mapyourhealth.com (or localhost:3000 for dev)
```

### Updating Zip Code Stats

#### Via Admin Portal

1. **Login to Admin Portal**
   - Use admin credentials

2. **Navigate to Zip Codes**
   - Select "Zip Code Management" from sidebar

3. **Edit Stats**
   - Search for zip code
   - Click "Edit" on the stat to update
   - Modify value
   - Save changes

4. **Verify in Mobile App**
   - Pull to refresh on dashboard
   - Verify updated values appear

#### Via Seed Script

For bulk updates, modify `apps/admin/scripts/seed-data.ts`:

```typescript
// Example: Update lead levels for 10001
{
  info: { zipCode: "10001", cityName: "New York", state: "NY" },
  stats: [
    { statId: "water-lead", value: 20 }, // Changed from 12 to 20
    // ... other stats
  ],
}
```

Then re-run the seed script.

### Adding New Zip Codes

1. **Add to Seed Data**
   - Open `apps/admin/scripts/seed-data.ts`
   - Add new entry to `zipCodeData` array
   - Include all 11 stat values

2. **Run Seed Script**
   ```bash
   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npx tsx apps/admin/scripts/seed-data.ts
   ```

3. **Verify in App**
   - Search for the new zip code
   - Verify data displays correctly

### Updating Stat Definitions

To modify thresholds or add new stat types:

1. **Edit Stat Definitions**
   - Modify `statDefinitions` array in seed script
   - Update `dangerThreshold` and `warningThreshold` values

2. **Re-run Seed**
   - This will skip existing definitions (check for duplicates)

### CMS Test Scenarios

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Update stat value | Change lead from 12 to 18 for 10001 | Status changes from warning to danger |
| Add new zip code | Add 10004 with all stats | Zip code searchable in app |
| Change threshold | Lower danger threshold for lead | More zip codes show danger |
| Delete stat | Remove stat from zip code | Stat no longer displays |

---

## Notifications

### Overview

The app sends push notifications for:
- Safety alerts when stats change to warning/danger
- Weekly safety summaries
- New data available for tracked zip codes

### Setting Up Push Notifications (Development)

1. **iOS Simulator**
   - Push notifications don't work on iOS simulator
   - Use a physical device for testing

2. **Physical Device**
   - Build with `yarn build:ios:device`
   - Install on device
   - Accept notification permissions when prompted

3. **Android Emulator**
   - Push notifications work on Android emulator
   - Ensure Google Play Services are available

### Test Notification Triggers

#### Safety Alert Notifications

Triggered when a stat crosses into warning or danger:

1. **Setup**
   - User has zip code 10023 (all safe) saved
   - Update 10023's lead value to 16 (danger) via CMS

2. **Expected**
   - Push notification: "Safety Alert: Lead levels in your area have reached dangerous levels"
   - In-app alert badge on dashboard

#### Weekly Summary Notifications

Sent every Monday at 9:00 AM local time:

1. **Testing**
   - Modify notification schedule for testing (set to 1 minute)
   - Wait for notification

2. **Expected**
   - Summary of all tracked zip codes
   - Highlight any warnings or dangers

#### Manual Notification Testing

Use the admin portal to send test notifications:

1. **Navigate to Notifications**
   - Admin Portal > Notifications > Send Test

2. **Select Recipients**
   - All users, specific user, or by zip code

3. **Compose Message**
   - Title and body
   - Optional deep link

4. **Send and Verify**
   - Check device receives notification
   - Tap to verify deep link works

### Notification Test Matrix

| Notification Type | Trigger | Deep Link | Badge |
|-------------------|---------|-----------|-------|
| Danger Alert | Stat >= danger threshold | Dashboard > Category | Yes |
| Warning Alert | Stat >= warning threshold | Dashboard > Category | Yes |
| Weekly Summary | Scheduled (Monday 9 AM) | Dashboard | No |
| New Data | Fresh data available | Dashboard | No |
| System Message | Admin sends manually | Configurable | Optional |

### Edge Cases

| Scenario | Expected Result |
|----------|-----------------|
| Notifications disabled | No push, show in-app only |
| App in foreground | In-app banner, no push |
| App in background | Push notification |
| App killed | Push notification |
| Multiple zip codes with alerts | Grouped notification |
| Rapid stat changes | Debounced (max 1 per hour per stat) |

### Notification Permissions

Test the permission flow:

1. **First Launch**
   - Permission prompt should appear after onboarding
   - Test "Allow" and "Don't Allow" paths

2. **Permission Denied**
   - App should function without notifications
   - Settings should show option to enable

3. **Permission Revoked**
   - Disable in device settings
   - App should handle gracefully

---

## Zip Code Test Data

### Quick Reference

| Zip Code | Location | Key Alerts |
|----------|----------|------------|
| 90210 | Beverly Hills, CA | Wildfire warning |
| 10001 | New York, NY | Air quality, lead, health warnings |
| 33139 | Miami Beach, FL | Flood danger |
| 60601 | Chicago, IL | Lead danger, bacteria warning |
| 98101 | Seattle, WA | All safe |
| 30301 | Atlanta, GA | Air quality, bacteria warnings |
| 75201 | Dallas, TX | Ozone, flood warnings |
| 85001 | Phoenix, AZ | Ozone danger, wildfire danger |
| 80202 | Denver, CO | Wildfire danger |
| 02101 | Boston, MA | Lead, health warnings |

### Manhattan Zip Codes

| Zip Code | Neighborhood | Key Alerts |
|----------|--------------|------------|
| 10001 | Chelsea/Penn Station | Lead warning, air quality warning, health warnings |
| 10002 | Lower East Side | Lead warning, air/health warnings |
| 10003 | Greenwich Village | PM2.5 warning (mostly safe) |
| 10012 | SoHo | PM2.5 warning (mostly safe) |
| 10013 | Tribeca | Flood warning (mostly safe) |
| 10016 | Murray Hill | Lead warning, PM2.5 warning, health warnings |
| 10017 | Midtown East | Air quality warnings, health warnings |
| 10023 | Upper West Side | All safe |
| 10028 | Upper East Side | All safe |
| 10029 | East Harlem | **Lead danger**, air/health warnings |
| 10027 | Harlem | Lead warning, air/health warnings |
| 10032 | Washington Heights | Lead warning, air/health warnings |
| 10038 | Financial District | Flood warning (mostly safe) |

### Queens Zip Codes

| Zip Code | Neighborhood | Key Alerts |
|----------|--------------|------------|
| 11368 | Corona | Lead warning, air/health warnings |
| 11356 | College Point | **Flood danger**, health warnings |
| 11101 | Long Island City | Lead warning, flood warning, health warnings |
| 11102 | Astoria | PM2.5 warning, flood warning |
| 11354 | Flushing | Lead warning, air/health warnings |
| 11372 | Jackson Heights | Lead warning, air/health warnings |
| 11373 | Elmhurst | Lead warning, air/health warnings |
| 11375 | Forest Hills | PM2.5 warning (mostly safe) |
| 11361 | Bayside | Flood warning (mostly safe) |
| 11432 | Jamaica | Lead warning, bacteria warning, air/health warnings |
| 11385 | Ridgewood | Lead warning, health warnings |
| 11693 | Rockaway Beach | **Flood danger**, bacteria warning |

### Other US Cities

| Zip Code | City, State | Key Alerts |
|----------|-------------|------------|
| 90210 | Beverly Hills, CA | Wildfire warning |
| 33139 | Miami Beach, FL | **Flood danger** |
| 60601 | Chicago, IL | **Lead danger**, bacteria warning, flood warning |
| 98101 | Seattle, WA | All safe |
| 30301 | Atlanta, GA | Air quality warnings, bacteria warning, flood warning |
| 75201 | Dallas, TX | Ozone warning, flood warning, wildfire warning |
| 85001 | Phoenix, AZ | **Ozone danger**, **wildfire danger**, air warnings |
| 80202 | Denver, CO | **Wildfire danger**, ozone warning, flood warning |
| 02101 | Boston, MA | Lead warning, bacteria warning, health warnings |

### Test Scenarios by Category

#### Safe Locations (All Green)
- **10023** (Upper West Side) - All metrics safe
- **10028** (Upper East Side) - All metrics safe
- **98101** (Seattle) - All metrics safe

#### Single Danger Alert
- **33139** (Miami Beach) - Only flood danger
- **10029** (East Harlem) - Lead danger

#### Multiple Warnings
- **10001** (New York) - Lead, air, health warnings
- **11372** (Jackson Heights) - Multiple warnings across categories

#### Multiple Dangers
- **85001** (Phoenix) - Ozone danger + wildfire danger
- **60601** (Chicago) - Lead danger + multiple warnings

#### Coastal/Flood Risk
- **11693** (Rockaway Beach) - Flood danger (level 9)
- **11356** (College Point) - Flood danger (level 7)
- **33139** (Miami Beach) - Flood danger (level 8)

#### Air Quality Issues
- **10017** (Midtown East) - AQI 118, PM2.5 28, Ozone 52
- **85001** (Phoenix) - AQI 135, PM2.5 30, Ozone 75 (danger)

#### Water Quality Issues
- **60601** (Chicago) - Lead 18 (danger), bacteria 2
- **10029** (East Harlem) - Lead 16 (danger), bacteria 2

#### Healthcare Access Concerns
- **11693** (Rockaway Beach) - 76% access
- **10029** (East Harlem) - 78% access
- **11432** (Jamaica) - 79% access

### Thresholds Reference

| Stat | Warning | Danger | Notes |
|------|---------|--------|-------|
| Lead (ppb) | >= 10 | >= 15 | EPA action level is 15 |
| Nitrate (mg/L) | >= 7 | >= 10 | EPA limit is 10 |
| Bacteria (CFU/100mL) | >= 1 | >= 5 | Coliform presence |
| AQI | >= 100 | >= 150 | Unhealthy for sensitive groups |
| PM2.5 (µg/m³) | >= 15 | >= 35 | WHO guideline is 15 |
| Ozone (ppb) | >= 50 | >= 70 | EPA standard is 70 |
| COVID (per 100k) | >= 100 | >= 200 | Weekly cases |
| Flu (per 100k) | >= 25 | >= 50 | Weekly cases |
| Healthcare Access (%) | <= 85 | <= 70 | Lower is worse |
| Wildfire Risk (1-10) | >= 4 | >= 7 | Based on conditions |
| Flood Risk (1-10) | >= 4 | >= 7 | Based on terrain/weather |

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| App won't start | Clear Metro cache: `yarn start --reset-cache` |
| Data not loading | Check Amplify sandbox is running |
| Auth errors | Verify amplify_outputs.json is present |
| Notifications not received | Check device permissions, use physical device for iOS |
| Zip code shows no data | Run seed script, verify zip code exists |
| Magic link not received | Check SES sandbox mode, verify sender/recipient emails in SES |
| Magic link deep link not working | Verify URL scheme in app.json, test with simulator commands |
| "Invalid magic link" error | Token expired (15 min) or already used - request new link |
| Rate limit error | Wait 15 minutes or use different email for testing |
| Magic link works but auth fails | Check Cognito custom auth triggers are deployed |

### Debug Tools

- **Reactotron**: Connect for state inspection and network logging
- **Flipper**: iOS/Android debugging
- **Expo DevTools**: Shake device or press `m` in terminal

### Logs

```bash
# View Metro logs
yarn start

# View native iOS logs
npx react-native log-ios

# View native Android logs
npx react-native log-android
```
