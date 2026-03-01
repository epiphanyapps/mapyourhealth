# MapYourHealth E2E Test Orchestration System v1.0

## Overview

This comprehensive E2E test orchestration system transforms MapYourHealth's individual Maestro tests into a cohesive, automated testing suite ready for v1.0 validation. The system provides:

- **Master Test Runner** - Orchestrates all tests in logical sequence with environment setup/teardown
- **GitHub Actions CI/CD** - Automated testing on PR/merge with comprehensive reporting 
- **Test Environment Configuration** - Consistent app builds and AWS backend connectivity
- **Monitoring & Reporting** - Real-time dashboards, failure analysis, and AI Queue integration

## Quick Start

### 1. Setup Test Environment

```bash
# One-time setup (iOS)
./scripts/setup-test-environment.sh --platform ios --environment local

# One-time setup (Android)  
./scripts/setup-test-environment.sh --platform android --environment local

# Validate environment health
./scripts/test-monitor.sh --action health-check
```

### 2. Run Test Suites

```bash
# Smoke tests (5-10 min) - Essential functionality
./scripts/e2e-runner.sh --category smoke --platform ios

# Full test suite (15-20 min) - Complete v1.0 validation
./scripts/e2e-runner.sh --category full --platform ios

# Regression testing (25-30 min) - Full + edge cases
./scripts/e2e-runner.sh --category regression --platform android --device "ZL73232GKP"
```

### 3. Monitor Results

```bash
# Live dashboard
./scripts/test-monitor.sh --action dashboard

# Analyze latest results  
./scripts/test-monitor.sh --action analyze

# Generate HTML report
./scripts/test-monitor.sh --action analyze --format html

# Send notifications
./scripts/test-monitor.sh --action notify --webhook-url "http://localhost:3001/api/notify"
```

## System Components

### 1. Master Test Runner (`scripts/e2e-runner.sh`)

**Purpose**: Orchestrates E2E tests with proper environment setup, execution sequencing, and result aggregation.

**Key Features**:
- ✅ Test category management (smoke, full, regression)
- ✅ Platform support (iOS simulator, Android device)
- ✅ Automatic environment validation and setup
- ✅ Retry logic for flaky tests
- ✅ Comprehensive result tracking and reporting
- ✅ Clean environment teardown

**Usage Examples**:
```bash
# Basic smoke test
./scripts/e2e-runner.sh --category smoke --platform ios

# Full suite with retries
./scripts/e2e-runner.sh --category full --platform android --retry 2

# Verbose output with specific device
./scripts/e2e-runner.sh --category regression --platform android --device "ZL73232GKP" --verbose

# Dry run (show what would execute)
./scripts/e2e-runner.sh --category full --dry-run
```

**Test Categories**:

| Category | Tests | Duration | Purpose |
|----------|-------|----------|---------|
| `smoke` | E2E-100, E2E-101, E2E-102 | 5-10 min | Essential functionality validation |
| `full` | All core v1.0 flows | 15-20 min | Complete feature validation |
| `regression` | Full suite + edge cases | 25-30 min | Comprehensive validation with stress tests |

### 2. GitHub Actions Workflow (`.github/workflows/e2e-orchestration.yml`)

**Purpose**: Automated E2E testing in CI/CD pipeline with comprehensive reporting and artifact collection.

**Workflow Features**:
- ✅ Trigger on PR/push with smart path filtering
- ✅ Manual dispatch with configurable parameters
- ✅ Parallel iOS and Android testing
- ✅ Test result aggregation and unified reporting
- ✅ Artifact collection (screenshots, logs, test reports)
- ✅ PR status checks and comments
- ✅ AI Queue integration for notifications

**Workflow Jobs**:

1. **validate-environment** - Environment validation and test configuration
2. **e2e-ios** - iOS simulator testing with iPhone 16 Pro preference
3. **e2e-android** - Android device testing with Moto E13 (ZL73232GKP)
4. **aggregate-results** - Results consolidation and unified reporting
5. **notify-results** - PR comments, status checks, AI Queue notifications
6. **cleanup** - Environment cleanup and artifact management

**Manual Triggers**:
```bash
# Trigger via GitHub CLI
gh workflow run "E2E Test Orchestration v1.0" \
  --field test_category=full \
  --field platform=both \
  --field retry_count=2

# Or use GitHub web interface
```

### 3. Environment Setup (`scripts/setup-test-environment.sh`)

**Purpose**: Establishes consistent test environments across local development and CI/CD systems.

**Setup Components**:
- ✅ Node.js/Yarn dependency management
- ✅ AWS configuration (rayane profile)
- ✅ Amplify outputs synchronization
- ✅ Platform-specific tooling (Xcode, Android SDK)
- ✅ Maestro installation and configuration
- ✅ Device/simulator detection and setup

**Environment Types**:
- `local` - Developer workstation setup
- `ci` - GitHub Actions runner configuration

**Usage Examples**:
```bash
# Local iOS development setup
./scripts/setup-test-environment.sh --platform ios --environment local

# CI Android setup with clean build
./scripts/setup-test-environment.sh --platform android --environment ci --clean

# Debug build preparation
./scripts/setup-test-environment.sh --platform ios --build-type debug
```

### 4. Monitoring & Reporting (`scripts/test-monitor.sh`)

**Purpose**: Comprehensive monitoring, analysis, and reporting system with AI Queue integration.

**Monitoring Features**:
- ✅ Live test execution dashboard
- ✅ Detailed result analysis with performance insights
- ✅ Test trend analysis over time
- ✅ HTML report generation
- ✅ Health check validation
- ✅ Telegram notifications via AI Queue

**Actions Available**:

| Action | Purpose | Example |
|--------|---------|---------|
| `dashboard` | Live monitoring interface | `--action dashboard` |
| `analyze` | Result analysis and insights | `--action analyze --format html` |
| `notify` | Send notifications | `--action notify --webhook-url URL` |
| `trend` | Historical trend analysis | `--action trend` |
| `health-check` | Environment validation | `--action health-check` |

## Test Environment Configuration

### AWS Backend Connection

The system uses the `rayane` AWS profile for backend connectivity:

```bash
# Configure AWS profile (one-time setup)
aws configure sso --profile rayane

# Profile details:
# Region: ca-central-1
# Output: json
# SSO session: MapYourHealth
```

### Device Requirements

**iOS Testing** (Primary):
- iPhone 16 Pro simulator (preferred)
- Xcode 15+ with command line tools
- iOS 17+ runtime

**Android Testing**:
- Moto E13 device (ID: ZL73232GKP)
- ADB platform tools
- OpenJDK 17

### App Build Configuration

**For E2E Testing** (Maestro compatibility):
```bash
# iOS - Release build for simulator
npx expo prebuild --platform ios --clean
cd ios && xcodebuild ... -configuration Debug -sdk iphonesimulator

# Android - Release APK (NO dev menu)
npx expo prebuild --platform android --clean  
cd android && ./gradlew assembleRelease
```

**Critical**: Always use release builds for Maestro testing to avoid dev menu interference.

## Integration with Existing Systems

### AI Queue System Integration

The orchestration system integrates with the existing AI Queue dashboard for notifications:

```javascript
// AI Queue notification payload
{
  "type": "e2e_test_results",
  "timestamp": "2024-03-01T19:15:30Z",
  "source": "mapyourhealth_e2e",
  "data": {
    "category": "full",
    "platform": "ios", 
    "results": {
      "total": 10,
      "passed": 9,
      "failed": 1,
      "duration_seconds": 1247
    },
    "failed_tests": ["E2E-005-dashboard-accordion.yaml"]
  }
}
```

**Telegram Updates**: Automatic notifications to QueensClaw group on test completion.

### Backend CI/CD Integration

The E2E workflow integrates with existing backend workflows:

```yaml
# Trigger E2E tests after backend deployment
on:
  workflow_run:
    workflows: ["Backend CI"]
    branches: [main]
    types: [completed]
```

## Result Formats and Artifacts

### Test Results Structure

```
test-results/
└── 20240301_143012/           # Timestamp-based directory
    ├── summary.json           # Structured test results
    ├── execution.log          # Detailed execution log
    ├── report.md             # Markdown summary
    └── report.html           # HTML report (if generated)
```

### Summary JSON Schema

```json
{
  "execution": {
    "start_time": "2024-03-01T14:30:12Z",
    "end_time": "2024-03-01T14:50:45Z", 
    "category": "full",
    "platform": "ios",
    "device_id": "iPhone-16-Pro-Simulator",
    "retry_count": 1,
    "timeout": 1800
  },
  "environment": {
    "project_root": "/path/to/MapYourHealth",
    "maestro_version": "1.37.8",
    "node_version": "v20.11.0",
    "os": "Darwin"
  },
  "tests": [
    {
      "name": "E2E-100-basic-app-launch.yaml",
      "result": "passed",
      "duration_seconds": 45,
      "attempt": 1,
      "timestamp": "2024-03-01T14:31:00Z"
    }
  ],
  "summary": {
    "total": 10,
    "passed": 9,
    "failed": 1,
    "skipped": 0,
    "duration_seconds": 1233
  }
}
```

## Troubleshooting Guide

### Common Issues

**1. "Maestro not found"**
```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$HOME/.maestro/bin:$PATH"
```

**2. "AWS credentials not configured"**
```bash
# Configure rayane profile
aws configure sso --profile rayane
aws sso login --profile rayane
```

**3. "No iOS simulators found"**
```bash
# List available simulators
xcrun simctl list devices available

# Create iPhone 16 Pro simulator if needed
xcrun simctl create "iPhone 16 Pro" "iPhone 16 Pro" "iOS-17-4"
```

**4. "Android device not responsive"**
```bash
# Check ADB connection
adb devices
adb -s ZL73232GKP shell echo "test"

# Reset ADB if needed
adb kill-server && adb start-server
```

**5. "Amplify outputs sync failed"**
```bash
# Manual sync with rayane profile
AWS_PROFILE=rayane yarn sync:amplify

# Or create stub for CI
echo '{"version":"1","auth":{"aws_region":"ca-central-1"}}' > apps/mobile/amplify_outputs.json
```

### Debug Mode

**Verbose Output**:
```bash
./scripts/e2e-runner.sh --category smoke --platform ios --verbose
```

**Dry Run Testing**:
```bash
./scripts/e2e-runner.sh --category full --dry-run
```

**Health Check**:
```bash
./scripts/test-monitor.sh --action health-check
```

### Log Analysis

**Execution Logs**: `test-results/[timestamp]/execution.log`
**Maestro Logs**: `~/.maestro/tests/`
**GitHub Actions**: Workflow run logs and artifacts

## Performance Optimization

### Test Execution Times

**Target Performance**:
- Smoke tests: < 10 minutes
- Full suite: < 20 minutes  
- Regression: < 30 minutes

**Optimization Strategies**:
1. **Parallel Execution**: iOS and Android run simultaneously in CI
2. **Smart Retries**: Configurable retry count for flaky tests
3. **Efficient Builds**: Release builds cached between test categories
4. **Resource Management**: Simulator/device cleanup between runs

### CI/CD Optimization

**Workflow Triggers**:
- PR: Smoke tests only (fast feedback)
- Push to main: Full test suite
- Manual: All categories available

**Caching Strategy**:
```yaml
- name: Cache dependencies
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'yarn'
```

## Maintenance and Updates

### Regular Maintenance Tasks

**Weekly**:
- Review test trends for performance regression
- Clean up old test result directories
- Update device/simulator availability

**Monthly**:
- Update Maestro version
- Review and optimize flaky tests
- Update documentation with new patterns

**Before Releases**:
- Run full regression suite
- Generate comprehensive reports
- Validate all platform combinations

### Adding New Tests

1. **Create Test File**: Add to `apps/mobile/.maestro/flows/`
2. **Update Categories**: Modify `get_test_files_for_category()` in e2e-runner.sh
3. **Test Locally**: Validate with `--dry-run` and manual execution
4. **Update Documentation**: Add to test category descriptions

### System Updates

**Upgrading Maestro**:
```bash
# Update Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Validate compatibility
./scripts/test-monitor.sh --action health-check
```

**Updating Dependencies**:
```bash
# Update Node.js packages
yarn upgrade

# Re-validate environment
./scripts/setup-test-environment.sh --platform ios --clean
```

## Team Adoption Guide

### For Developers

**Daily Workflow**:
1. Run smoke tests before pushing: `./scripts/e2e-runner.sh --category smoke`
2. Use live dashboard during development: `./scripts/test-monitor.sh --action dashboard`
3. Check health before starting work: `./scripts/test-monitor.sh --action health-check`

**PR Workflow**:
1. Automated smoke tests run on PR creation
2. View results in PR comments
3. Address any failures before merge

### For QA Team

**Test Planning**:
1. Use full suite for feature validation
2. Run regression tests for release candidates
3. Generate HTML reports for stakeholders

**Bug Reproduction**:
1. Use specific test files for issue reproduction
2. Leverage retry logic for intermittent issues
3. Collect artifacts for developer handoff

### For DevOps/Release Team

**Release Pipeline**:
1. Automated full suite on main branch
2. Manual regression tests before releases
3. AI Queue notifications for release readiness

**Monitoring**:
1. Dashboard for real-time status
2. Trend analysis for quality metrics
3. Integration with existing monitoring systems

## Advanced Usage

### Custom Test Categories

Create custom test categories by modifying `get_test_files_for_category()`:

```bash
# Add new category
"custom-auth")
    files="E2E-001-subscription-flow.yaml E2E-121-signup-only.yaml E2E-121-account-deletion.yaml"
    ;;
```

### Extended Reporting

Generate custom reports with additional metrics:

```bash
# Generate comprehensive HTML report with trends
./scripts/test-monitor.sh --action analyze --format html

# Export results to JSON for external processing
./scripts/test-monitor.sh --action analyze --format json > results.json
```

### Integration with External Systems

**Webhook Notifications**:
```bash
# Send results to external monitoring
./scripts/test-monitor.sh --action notify --webhook-url "https://monitoring.company.com/api/webhook"
```

**Database Integration**:
```python
# Process JSON results for database storage
import json
with open('test-results/latest/summary.json') as f:
    results = json.load(f)
    # Store in database...
```

## Conclusion

The MapYourHealth E2E Test Orchestration System v1.0 provides a production-ready, comprehensive testing infrastructure that:

✅ **Transforms** individual tests into cohesive test suites  
✅ **Automates** testing across PR and release workflows  
✅ **Integrates** with existing AI Queue and backend systems  
✅ **Provides** real-time monitoring and comprehensive reporting  
✅ **Supports** both local development and CI/CD environments  
✅ **Enables** easy team adoption and maintenance

The system is ready for immediate use and can scale with the project's testing needs as MapYourHealth moves toward v1.0 release.

---

**Need Help?**
- Run health check: `./scripts/test-monitor.sh --action health-check`
- View live dashboard: `./scripts/test-monitor.sh --action dashboard`  
- Check environment: `./scripts/setup-test-environment.sh --help`
- Run tests: `./scripts/e2e-runner.sh --help`

**System Status**: ✅ Production Ready | 📱 iOS + Android | 🤖 AI Queue Integration