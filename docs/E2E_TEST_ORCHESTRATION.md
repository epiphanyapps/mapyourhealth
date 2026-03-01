# MapYourHealth E2E Test Orchestration System v1.0

## Overview

This comprehensive test orchestration system transforms individual Maestro E2E tests into a cohesive, automated testing suite ready for MapYourHealth v1.0 validation. The system provides end-to-end test execution, monitoring, reporting, and CI/CD integration.

## 🏗️ Architecture

```
MapYourHealth Test Orchestration
├── Test Runner (scripts/e2e-test-runner.sh)
│   ├── Environment Setup
│   ├── Build Management
│   ├── Device/Simulator Control
│   └── Test Execution
├── Environment Setup (scripts/setup-test-environment.sh)
│   ├── AWS Configuration
│   ├── Platform Dependencies
│   └── Test Data Management
├── Monitoring & Reporting (scripts/test-monitor.js)
│   ├── Real-time Monitoring
│   ├── Report Generation
│   └── Notification System
└── CI/CD Integration (.github/workflows/e2e-orchestration.yml)
    ├── Automated Testing
    ├── Multi-platform Support
    └── Result Analysis
```

## 📦 Components

### 1. Master Test Runner (`scripts/e2e-test-runner.sh`)

**Purpose:** Central orchestration script that manages the entire E2E testing workflow.

**Features:**
- **Test Suite Management:** Smoke, Full, and Regression test categories
- **Platform Support:** iOS simulator, Android device/emulator
- **Environment Configuration:** AWS backend connection, app building
- **Result Aggregation:** Comprehensive test reporting
- **Retry Logic:** Automatic retry of failed tests
- **Cross-platform Compatibility:** Shell-based for macOS/Linux

**Usage:**
```bash
# Run smoke tests on iOS
./scripts/e2e-test-runner.sh --suite smoke --platform ios

# Run full test suite with retries
./scripts/e2e-test-runner.sh --suite full --retry-failed

# Custom output location
./scripts/e2e-test-runner.sh --suite full --output-dir ./custom-results
```

**Test Categories:**
- **Smoke Tests:** Basic app functionality (launch, navigation)
- **Full Tests:** Core features excluding destructive operations
- **Regression Tests:** Complete test suite including account deletion

### 2. Environment Setup (`scripts/setup-test-environment.sh`)

**Purpose:** Automated environment configuration and validation.

**Features:**
- **AWS Configuration:** Validates rayane profile connectivity
- **Platform Setup:** iOS simulators, Android devices
- **Dependency Management:** Maestro, Node.js, platform tools
- **Test Data Structure:** Fixtures and configuration files
- **Environment Validation:** Comprehensive health checks

**Usage:**
```bash
# Complete environment setup
./scripts/setup-test-environment.sh

# Individual components
./scripts/setup-test-environment.sh aws
./scripts/setup-test-environment.sh maestro
./scripts/setup-test-environment.sh ios
```

### 3. Test Monitor (`scripts/test-monitor.js`)

**Purpose:** Real-time test monitoring, reporting, and notification system.

**Features:**
- **Real-time Monitoring:** Live test execution tracking
- **Report Generation:** JSON, HTML, and Markdown formats
- **Historical Archive:** Test result preservation
- **AI Queue Integration:** Automatic failure notifications
- **Dashboard Ready:** Structured data for visualization

**Usage:**
```bash
# Monitor a test run
node scripts/test-monitor.js watch ./scripts/e2e-test-runner.sh --suite smoke

# Generate report from current state
node scripts/test-monitor.js report --html

# Check monitoring status
node scripts/test-monitor.js status
```

### 4. CI/CD Workflow (`.github/workflows/e2e-orchestration.yml`)

**Purpose:** Automated testing in GitHub Actions with intelligent test strategy.

**Features:**
- **Intelligent Strategy:** Different test suites based on trigger type
- **Multi-platform Matrix:** iOS and Android support
- **Artifact Collection:** Screenshots, logs, test reports
- **PR Integration:** Automatic test result comments
- **Failure Analysis:** Detailed reporting with retry logic

**Triggers:**
- **Pull Requests:** Smoke tests for fast feedback
- **Main Branch Push:** Full test suite with retries
- **Manual Dispatch:** Custom suite/platform selection
- **Scheduled (Optional):** Nightly regression tests

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Clone and navigate to repository
cd ~/Documents/MapYourHealth

# Run environment setup
./scripts/setup-test-environment.sh

# Verify setup
./scripts/setup-test-environment.sh validate
```

### 2. Run Tests Locally

```bash
# Quick smoke test
./scripts/e2e-test-runner.sh --suite smoke

# Full test suite
./scripts/e2e-test-runner.sh --suite full --platform ios --retry-failed

# With monitoring
node scripts/test-monitor.js watch ./scripts/e2e-test-runner.sh --suite smoke
```

### 3. View Results

```bash
# Check test results
ls -la test-results/

# View latest report
cat test-results/test_summary.txt

# Open HTML report
open test-results/reports/test-report-*.html
```

## 📊 Test Suites

### Smoke Tests (Fast - ~2-3 minutes)
```yaml
Tests:
  - E2E-100-basic-app-launch.yaml
  - E2E-101-basic-navigation.yaml

Purpose: Basic functionality validation
When: PR checks, quick validation
```

### Full Tests (Comprehensive - ~10-15 minutes)
```yaml
Tests:
  - All Smoke Tests
  - E2E-001-subscription-flow.yaml
  - E2E-002-search-validation.yaml
  - E2E-003-category-reorganization.yaml
  - E2E-005-dashboard-accordion.yaml
  - E2E-006-risk-factors-display.yaml
  - E2E-007-location-granularity.yaml
  - E2E-009-autocomplete-selection.yaml
  - E2E-010-accordion-subitem-selection.yaml
  - E2E-102-search-functionality.yaml
  - E2E-121-signup-only.yaml
  - E2E-121-testid-validation.yaml

Purpose: Core feature validation
When: Main branch pushes, release validation
```

### Regression Tests (Complete - ~20-25 minutes)
```yaml
Tests:
  - All Full Tests
  - E2E-121-account-deletion.yaml
  - E2E-121-account-deletion-automated.yaml

Purpose: Complete validation including destructive tests
When: Release candidates, manual validation
```

## 🔧 Configuration

### Environment Variables

```bash
# App Configuration
MAESTRO_APP_ID=com.epiphanyapps.mapyourhealth
AWS_PROFILE=rayane
AWS_REGION=ca-central-1

# Maestro Configuration
MAESTRO_DRIVER_STARTUP_TIMEOUT=120000

# Test Configuration
TEST_DATA_DIR=./test-data
TEST_RESULTS_DIR=./test-results

# CI Configuration
CI=false
GITHUB_ACTIONS=false
```

### Test Data Configuration (`test-data/config.json`)

```json
{
  "testEnvironment": {
    "awsProfile": "rayane",
    "awsRegion": "ca-central-1",
    "appId": "com.epiphanyapps.mapyourhealth"
  },
  "testUsers": {
    "guest": {
      "description": "Anonymous user for guest flows"
    },
    "testUser1": {
      "email": "test+e2e@mapyourhealth.com",
      "description": "Test user for authenticated flows"
    }
  },
  "testData": {
    "locations": {
      "newYork": {
        "query": "New York",
        "expectedResults": true,
        "hasData": true
      },
      "losAngeles": {
        "query": "Los Angeles", 
        "expectedResults": true,
        "hasData": false
      }
    }
  }
}
```

## 📱 Platform-Specific Setup

### iOS Simulator Setup

```bash
# Check available simulators
xcrun simctl list devices available

# Boot iPhone 16 Pro (preferred)
xcrun simctl boot "iPhone 16 Pro"

# Install app (done automatically by test runner)
xcrun simctl install <device-id> <app-path>
```

**Requirements:**
- Xcode 15.0+
- iPhone 16 Pro simulator (or fallback iPhone)
- iOS 17.0+

### Android Device Setup

```bash
# Check connected devices
adb devices

# Install APK (done automatically by test runner)
adb install -r app-release.apk

# Setup port forwarding for development
adb reverse tcp:8081 tcp:8081
```

**Requirements:**
- Android SDK with ADB
- Physical device or emulator
- Android 8.0+ (API 26+)

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The orchestration workflow provides:

1. **Strategy Determination:** Intelligent test selection based on trigger
2. **Parallel Execution:** iOS and Android tests when applicable
3. **Result Analysis:** Comprehensive failure analysis and reporting
4. **Artifact Management:** Screenshots, logs, and reports preservation
5. **Notification Integration:** AI Queue system alerts for failures

### Workflow Triggers

| Trigger | Test Suite | Platforms | Retry |
|---------|------------|-----------|-------|
| Pull Request | Smoke | iOS | No |
| Push to Main | Full | iOS | Yes |
| Manual Dispatch | Configurable | Configurable | Configurable |
| Scheduled | Regression | Both | Yes |

### CI Environment Setup

```yaml
environment:
  MAESTRO_APP_ID: com.epiphanyapps.mapyourhealth
  AWS_PROFILE: rayane
  JAVA_HOME: /usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
  
runners:
  - self-hosted
  - macOS  # Required for iOS simulator access
```

## 📈 Monitoring & Reporting

### Real-time Monitoring

The test monitor provides live visibility into test execution:

```bash
# Start monitoring
node scripts/test-monitor.js start "full-suite" "ios"

# Monitor external script
node scripts/test-monitor.js watch ./scripts/e2e-test-runner.sh

# Check status
node scripts/test-monitor.js status
```

### Report Formats

**JSON Report** (`test-report-*.json`):
```json
{
  "metadata": {
    "suite": "full",
    "platform": "ios",
    "duration": 780000
  },
  "summary": {
    "total": 12,
    "passed": 11,
    "failed": 1,
    "successRate": 92
  },
  "tests": [...]
}
```

**HTML Report** (Visual dashboard with charts and failure details)

**Markdown Summary** (Human-readable results for documentation)

### Notification Integration

Automatic notifications to AI Queue system:

```javascript
// Failure notification
{
  "message": "🧪 MapYourHealth E2E Test Failure Alert",
  "type": "e2e_failure",
  "priority": "high",
  "metadata": {
    "suite": "full",
    "successRate": 75,
    "failedCount": 3
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**1. App Build Failures**
```bash
# Clean and rebuild
cd apps/mobile
npx expo prebuild --platform ios --clean
cd ios && pod install --repo-update
```

**2. Simulator Connection Issues**
```bash
# Reset simulator
xcrun simctl shutdown all
xcrun simctl boot "iPhone 16 Pro"
```

**3. AWS Authentication Errors**
```bash
# Verify AWS profile
aws sts get-caller-identity --profile rayane

# Re-sync Amplify outputs
yarn sync:amplify
```

**4. Maestro Installation Issues**
```bash
# Reinstall Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
```

### Debug Mode

Enable verbose logging:
```bash
# Test runner debug mode
./scripts/e2e-test-runner.sh --suite smoke --verbose

# Monitor with detailed logging
node scripts/test-monitor.js watch ./scripts/e2e-test-runner.sh --verbose
```

### Log Locations

```
test-results/
├── monitoring/
│   ├── test-monitor.log      # Monitor system logs
│   └── current-state.json    # Current execution state
├── reports/
│   ├── test-report-*.json    # Test results (JSON)
│   ├── test-report-*.html    # Test results (HTML)
│   └── test-report-*.md      # Test results (Markdown)
├── failures/
│   └── *_failure.log         # Individual test failure logs
└── historical/
    └── YYYY-MM-DD/           # Archived results by date
```

## 🔧 Customization

### Adding New Test Categories

1. **Define test array in runner:**
```bash
NEW_CATEGORY_TESTS=(
    "E2E-XXX-new-feature.yaml"
    "E2E-YYY-another-test.yaml"
)
```

2. **Add to test suite selection:**
```bash
case "$suite" in
    new-category)
        test_files=("${NEW_CATEGORY_TESTS[@]}")
        ;;
esac
```

### Custom Reporting

Extend the test monitor for custom report formats:

```javascript
class CustomTestMonitor extends TestMonitor {
    generateCustomReport(report) {
        // Custom report logic
        return customFormat;
    }
}
```

### Platform Extensions

Add new platform support:

```bash
# Add platform in test runner
elif [[ "$PLATFORM" == "new-platform" ]]; then
    build_new_platform_app
    setup_new_platform_device
fi
```

## 📚 Advanced Usage

### Parallel Test Execution (Experimental)

```bash
# Enable parallel execution
./scripts/e2e-test-runner.sh --suite full --parallel
```

### Custom Test Data

```bash
# Override test data directory
TEST_DATA_DIR=/custom/path ./scripts/e2e-test-runner.sh --suite full
```

### Integration with External Systems

```javascript
// Custom notification webhook
await fetch('https://your-webhook.com/notify', {
    method: 'POST',
    body: JSON.stringify(testResults)
});
```

## 🔄 Maintenance

### Regular Tasks

1. **Update dependencies:** Monthly Maestro and platform tool updates
2. **Archive old results:** Clean up historical test data  
3. **Review test stability:** Analyze flaky tests and improve reliability
4. **Update test data:** Keep location and user test data current

### Performance Optimization

1. **Test Parallelization:** Consider splitting test suites for faster execution
2. **Device Management:** Optimize simulator/device startup times
3. **Build Caching:** Implement app build caching for faster test cycles
4. **Resource Monitoring:** Track memory and CPU usage during test runs

## 📖 Team Adoption

### Getting Started for Team Members

1. **Clone repository and run setup:**
```bash
cd ~/Documents/MapYourHealth
./scripts/setup-test-environment.sh
```

2. **Run your first test:**
```bash
./scripts/e2e-test-runner.sh --suite smoke
```

3. **View results:**
```bash
open test-results/test_summary.txt
```

### Best Practices

1. **Always run smoke tests** before committing changes
2. **Use full test suite** for release candidates
3. **Review failure logs** before retrying tests
4. **Update test documentation** when adding new tests
5. **Monitor CI results** and investigate failures promptly

### Training Resources

- **Maestro Documentation:** [maestro.mobile.dev](https://maestro.mobile.dev)
- **AWS Amplify Docs:** For backend integration understanding
- **GitHub Actions:** For CI/CD workflow customization
- **Test Writing Guide:** See existing test files for patterns

## 🎯 Success Metrics

### Test Health Metrics

- **Success Rate:** Target >95% for smoke tests, >90% for full tests
- **Execution Time:** Smoke <5min, Full <20min, Regression <30min
- **Flaky Test Rate:** <5% of tests should have intermittent failures
- **Coverage:** All critical user journeys should be covered

### CI/CD Performance

- **PR Feedback Time:** Smoke tests should complete within 10 minutes
- **Main Branch Testing:** Full tests should complete within 25 minutes
- **Failure Response Time:** Test failures should be investigated within 2 hours
- **Fix Time:** Critical test failures should be resolved within 24 hours

---

**Version:** 1.0  
**Last Updated:** March 1, 2025  
**Maintained By:** MapYourHealth Development Team

For questions or improvements, please create an issue in the repository or contact the development team.