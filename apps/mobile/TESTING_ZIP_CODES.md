# MapYourHealth Mobile App - Test Scenarios

This document describes test scenarios for QA testing the MapYourHealth mobile app.

For developer setup and technical details, see [DEV_TESTING.md](./DEV_TESTING.md).

---

## Table of Contents

1. [Test Accounts](#test-accounts)
2. [Sign Up Flow](#sign-up-flow)
3. [Login Flow](#login-flow)
4. [Location Search](#location-search)
5. [CMS Updates](#cms-updates)
6. [Notifications](#notifications)
7. [Zip Code Test Data](#zip-code-test-data)

---

## Test Accounts

| Role | Email | Password | Auth Method | Notes |
|------|-------|----------|-------------|-------|
| Admin | admin@mapyourhealth.com | (set in env) | Password | Full admin access |
| Test User | test@example.com | Test123! | Password | Standard user for testing |
| Magic Link User | magiclink@example.com | N/A | Magic Link | Passwordless user |

**Note:** Magic link users do not have passwords. They can only authenticate via magic link. Users who sign up with a password can also use magic link to log in.

---

## Sign Up Flow

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

Magic link authentication allows users to sign up and log in without a password.

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
   - Email contains link that opens the app
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

---

## Login Flow

### Email/Password Login

1. **Existing User Login**
   - Tap "Log In" on welcome screen
   - Enter registered email and password
   - Verify dashboard loads

2. **Forgot Password**
   - Tap "Forgot Password?" link
   - Follow password reset flow

### Magic Link Login

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

### Edge Cases to Test

| Scenario | Expected Result |
|----------|-----------------|
| Wrong password | Error: "Incorrect email or password" |
| Non-existent account (password) | Error: "No account found with this email" |
| Non-existent account (magic link) | Creates new account automatically |
| Account locked (too many password attempts) | Error: "Account temporarily locked" |
| Magic link for unregistered email | User is created and logged in |
| Switching between password and magic link | Both methods work for same account |

---

## Location Search

### Overview

The app uses Google Places Autocomplete for location search, allowing users to find zip codes by typing addresses, cities, or place names.

### Test Steps

1. **Navigate to Search**
   - From Dashboard, tap the search bar
   - Or during onboarding, use the zip code entry screen

2. **Test Autocomplete**
   - Type a partial address (e.g., "123 Main")
   - Verify autocomplete suggestions appear
   - Tap a suggestion to select it

3. **Verify Zip Code Extraction**
   - After selecting a place, verify the zip code is extracted
   - The dashboard should load with safety data for that zip code

### Test Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| US Address | "350 Fifth Avenue, New York" | Extracts 10118 (Empire State Building) |
| City Name | "Miami Beach, FL" | Shows multiple suggestions, extracts zip on selection |
| Zip Code Direct | "90210" | Shows Beverly Hills suggestions |
| Partial Address | "123 Main St" | Shows autocomplete suggestions |
| International Address | "London, UK" | No results or shows international locations (non-US not supported) |
| Empty Search | Clear search field | Suggestions disappear |
| No Results | "xyzabc123" | No suggestions shown |

### Edge Cases to Test

| Scenario | Expected Result |
|----------|-----------------|
| Network offline | Error message or cached suggestions |
| API key invalid | No suggestions, graceful degradation |
| Rapid typing | Debounced requests, smooth UX |
| Special characters | Handled gracefully |
| Very long input | Input truncated or handled |

---

## CMS Updates

### Overview

The admin portal allows updating safety data that reflects in the mobile app.

### Admin Portal Access

```
URL: https://admin.mapyourhealth.info
```

### Updating Zip Code Stats

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

### Test Notification Triggers

#### Safety Alert Notifications

Triggered when a stat crosses into warning or danger:

1. **Setup**
   - User has zip code 10023 (all safe) saved
   - Update 10023's lead value to 16 (danger) via CMS

2. **Expected**
   - Push notification: "Safety Alert: Lead levels in your area have reached dangerous levels"
   - In-app alert badge on dashboard

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

### Thresholds Reference

| Stat | Warning | Danger | Notes |
|------|---------|--------|-------|
| Lead (ppb) | >= 10 | >= 15 | EPA action level is 15 |
| Nitrate (mg/L) | >= 7 | >= 10 | EPA limit is 10 |
| Bacteria (CFU/100mL) | >= 1 | >= 5 | Coliform presence |
| AQI | >= 100 | >= 150 | Unhealthy for sensitive groups |
| PM2.5 (ug/m3) | >= 15 | >= 35 | WHO guideline is 15 |
| Ozone (ppb) | >= 50 | >= 70 | EPA standard is 70 |
| COVID (per 100k) | >= 100 | >= 200 | Weekly cases |
| Flu (per 100k) | >= 25 | >= 50 | Weekly cases |
| Healthcare Access (%) | <= 85 | <= 70 | Lower is worse |
| Wildfire Risk (1-10) | >= 4 | >= 7 | Based on conditions |
| Flood Risk (1-10) | >= 4 | >= 7 | Based on terrain/weather |
