# MapYourHealth E2E Tests

This directory contains end-to-end tests for the MapYourHealth mobile app using [Maestro](https://maestro.mobile.dev/).

## 📁 Directory Structure

```
.maestro/
├── flows/                    # Maestro test flows
│   ├── E2E-121-*.yaml      # Account deletion test suite
│   └── E2E-XXX-*.yaml      # Other app feature tests
├── shared/                  # Reusable flow components  
│   ├── _OnFlowStart.yaml   # App launch & dev client handling
│   └── _auth.yaml          # Authentication flows
├── scripts/                 # Test orchestration
│   └── run-account-deletion-e2e.sh
└── README.md               # This file
```

## 🧪 Test Categories

### Account Management Tests (Issue #121)

Tests the complete account lifecycle including Paper Dialog integration:

| Test File | Purpose | Usage |
|-----------|---------|-------|
| **E2E-121-account-deletion.yaml** | Full manual test flow | Interactive testing |
| **E2E-121-signup-only.yaml** | Account creation only | Automated Part 1 |
| **E2E-121-account-deletion-automated.yaml** | Sign-in + deletion | Automated Part 2 |
| **E2E-121-testid-validation.yaml** | TestID infrastructure | Quick validation |

## 🚀 Running Tests

### Prerequisites

1. **Maestro installed**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **iOS Simulator with release build**:
   ```bash
   # Build release version (no Metro dependency)
   cd apps/mobile
   npx expo prebuild --platform ios --clean
   cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
   xcodebuild -workspace MapYourHealth.xcworkspace -scheme MapYourHealth \
     -configuration Release -sdk iphonesimulator \
     -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
     CODE_SIGNING_ALLOWED=NO
   
   # Install on simulator
   xcrun simctl install booted path/to/MapYourHealth.app
   ```

3. **AWS CLI configured** (for automated tests):
   ```bash
   aws configure --profile rayane
   # Needs Cognito admin permissions
   ```

### Quick TestID Validation

```bash
cd apps/mobile
export MAESTRO_APP_ID=com.epiphanyapps.mapyourhealth
maestro test .maestro/flows/E2E-121-testid-validation.yaml
```

### Manual Account Deletion Test

```bash
cd apps/mobile  
export MAESTRO_APP_ID=com.epiphanyapps.mapyourhealth
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="TestPass123!"
maestro test .maestro/flows/E2E-121-account-deletion.yaml
```

### Automated Full Test Suite

```bash
cd apps/mobile/.maestro/scripts
./run-account-deletion-e2e.sh
```

## 🎯 Key Features Tested

### ✅ Paper Dialog Integration
- React Native Paper Dialog renders in React Native (not native iOS)
- Maestro can interact with Paper Dialog components  
- testIDs work correctly: `delete-account-dialog-confirm`

### ✅ TestID Infrastructure
- Profile menu: `profile-menu-button`, `profile-menu-sheet`
- Menu items: `menu-item-create-account`, `menu-item-sign-in`, `menu-item-settings`
- Forms: `signup-submit-button`, `login-submit-button`  
- Account deletion: `delete-account-button`

### ✅ Backend Integration
- Cognito user creation via signup form
- Admin confirmation via AWS CLI (bypasses email verification)
- Server-side account deletion (Lambda + Cognito cleanup)
- DynamoDB data cleanup verification

### ✅ Location Onboarding Bypass
- Simplified flow that skips Montreal search hang issue
- Waits for main screen elements to appear
- Critical for E2E test reliability

## 🔧 Troubleshooting

### "Development servers" Screen Stuck
- **Cause**: Using dev build that needs Metro bundler
- **Solution**: Use release build or start Metro: `npx expo start --dev-client`

### TestID Not Found
- **Cause**: Component not using testID or incorrect mapping  
- **Debug**: Use Maestro hierarchy command: `maestro hierarchy`
- **iOS Note**: TextInput accessibility labels work better than testIDs

### Location Onboarding Hangs
- **Cause**: Montreal search causes Maestro to hang
- **Solution**: Tests use simplified bypass approach (30s timeout)

### CocoaPods Encoding Error
- **Cause**: Terminal UTF-8 encoding issue
- **Solution**: `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`

## 📋 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MAESTRO_APP_ID` | iOS app bundle identifier | `com.epiphanyapps.mapyourhealth` |
| `TEST_EMAIL` | Test account email | `test@example.com` |
| `TEST_PASSWORD` | Test account password | `TestPass123!` |
| `SIMULATOR_ID` | iOS Simulator UDID | `9618FE77-C2D9-41E7-8A6C-5B2B257F5737` |
| `COGNITO_POOL` | AWS Cognito User Pool ID | `ca-central-1_YJw20H7Xt` |
| `AWS_PROFILE` | AWS CLI profile name | `rayane` |

## 🎉 Success Criteria

A successful E2E-121 account deletion test validates:

1. **✅ Account Creation** - Signup form creates Cognito user
2. **✅ Email Verification** - Admin confirmation works 
3. **✅ Authentication** - Sign-in with confirmed credentials
4. **✅ Navigation** - Profile menu → Settings flow  
5. **✅ Paper Dialog** - Delete confirmation UI works
6. **✅ Backend Deletion** - User removed from Cognito + DynamoDB
7. **✅ Frontend State** - User returned to guest state

## 📚 Related Documentation

- **Issue #121**: [Account Deletion E2E Tests](https://github.com/epiphanyapps/mapyourhealth/issues/121)
- **PR #120**: [Paper Dialog + testID Infrastructure](https://github.com/epiphanyapps/mapyourhealth/pull/120)  
- **Maestro Docs**: [maestro.mobile.dev](https://maestro.mobile.dev/)
- **React Native Paper**: [Paper Dialog Components](https://callstack.github.io/react-native-paper/)

---

**💡 Pro Tip**: Use the `run-account-deletion-e2e.sh` script for the most reliable automated testing experience!