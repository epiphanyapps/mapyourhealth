# MapYourHealth Mobile App - Developer Testing Guide

This document contains technical testing instructions for developers working on the MapYourHealth mobile app.

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Backend Setup](#backend-setup)
3. [Testing Magic Link API](#testing-magic-link-api)
4. [Deep Link Testing](#deep-link-testing)
5. [Push Notification Testing](#push-notification-testing)
6. [Debug Tools](#debug-tools)
7. [Troubleshooting](#troubleshooting)

---

## Development Environment Setup

### Prerequisites

- Node.js >= 20.0.0
- Yarn package manager
- Xcode (for iOS) or Android Studio (for Android)
- Expo CLI installed globally

### Environment Variables

Copy the example environment file and configure it:

```bash
# From apps/mobile directory
cp .env.example .env
```

Edit `.env` and add your Google Places API key:

```
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_api_key_here
```

**Note:** For production builds via Amplify Console, the `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` environment variable is configured in the Amplify Console under **Hosting** → **Environment variables**. The `amplify.yml` build script writes this to `.env` before the Expo build.

### Running the App

```bash
# From apps/mobile directory
yarn start           # Start Metro bundler
yarn ios             # Run on iOS simulator
yarn android         # Run on Android emulator
```

---

## Backend Setup

### Running Amplify Sandbox

```bash
# From packages/backend directory
npx ampx sandbox
```

### Seeding Test Data

Before testing, populate the backend with test data:

```bash
# From repository root
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npx tsx apps/admin/scripts/seed-data.ts
```

### Adding New Zip Codes

1. **Add to Seed Data**
   - Open `apps/admin/scripts/seed-data.ts`
   - Add new entry to `zipCodeData` array
   - Include all 11 stat values

2. **Run Seed Script**
   ```bash
   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npx tsx apps/admin/scripts/seed-data.ts
   ```

### Updating Stat Definitions

To modify thresholds or add new stat types:

1. **Edit Stat Definitions**
   - Modify `statDefinitions` array in seed script
   - Update `dangerThreshold` and `warningThreshold` values

2. **Re-run Seed**
   - This will skip existing definitions (check for duplicates)

---

## Testing Magic Link API

The magic link request endpoint is a Lambda Function URL. You can test it directly.

### Get the Function URL

After deployment, the URL is exported as a CloudFormation output. Check the Amplify console or run:

```bash
aws cloudformation describe-stacks --stack-name amplify-d3jl0ykn4qgj9r-main-branch-xxx --query "Stacks[0].Outputs[?contains(ExportName, 'RequestMagicLinkUrl')].OutputValue" --output text
```

### Test with curl

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

### SES Considerations

- In sandbox mode, both sender and recipient emails must be verified
- Verify test emails in SES console before testing
- Production requires moving out of SES sandbox

### Magic Link Technical Details

- **Deep Link Format**: `mapyourhealth://auth/verify?email={encoded_email}&token={token}`
- **Token Expiry**: 15 minutes
- **Rate Limit**: 3 requests per email per 15 minutes
- **Token Length**: 32 bytes (cryptographically random)

---

## Deep Link Testing

### Simulating Deep Links

For simulator testing, use these commands:

**iOS Simulator:**
```bash
xcrun simctl openurl booted "mapyourhealth://auth/verify?email=test%40example.com&token=abc123"
```

**Android Emulator:**
```bash
adb shell am start -a android.intent.action.VIEW -d "mapyourhealth://auth/verify?email=test%40example.com&token=abc123"
```

---

## Push Notification Testing

### Setup

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

---

## Debug Tools

- **Reactotron**: Connect for state inspection and network logging
- **Flipper**: iOS/Android debugging
- **Expo DevTools**: Shake device or press `m` in terminal

### Viewing Logs

```bash
# View Metro logs
yarn start

# View native iOS logs
npx react-native log-ios

# View native Android logs
npx react-native log-android
```

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
| Google Places autocomplete not working | Check `.env` has `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`, restart Metro |
| Google Places API errors | Verify API key has Places API enabled in Google Cloud Console |
