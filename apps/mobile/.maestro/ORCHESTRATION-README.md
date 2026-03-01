# MapYourHealth E2E Test Orchestration System

**Version:** 1.0.0  
**Author:** Claude (MapYourHealth AI Agent)  
**Target:** MapYourHealth v1.0 Release Validation  

## 🎯 Overview

This comprehensive test orchestration system transforms the individual E2E tests into a cohesive, automated testing suite ready for production validation. It provides intelligent test execution, failure analysis, real-time monitoring, and seamless CI/CD integration.

## 🏗️ System Architecture

```
MapYourHealth E2E Orchestration
├── 🎭 Test Orchestrator (test-orchestrator.sh)
│   ├── Test categorization and sequencing
│   ├── Environment setup and teardown
│   ├── Build management (iOS/Android)
│   └── Result aggregation
├── ⚙️ Environment Setup (setup-test-env.sh)
│   ├── Dependency validation
│   ├── AWS backend configuration
│   ├── Device/simulator management
│   └── Amplify outputs generation
├── 📊 Test Monitor (test-monitor.sh)
│   ├── Real-time monitoring
│   ├── Failure analysis
│   ├── AI queue integration
│   └── Dashboard generation
├── 🔧 Configuration (config/)
│   ├── Test suite definitions
│   ├── Environment settings
│   └── Platform configurations
└── 🤖 CI/CD Integration (.github/workflows/)
    ├── GitHub Actions workflows
    ├── Matrix testing strategy
    └── Artifact management
```

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Navigate to mobile app directory
cd ~/Documents/MapYourHealth/apps/mobile

# Run environment setup
.maestro/scripts/setup-test-env.sh

# Validate configuration
.maestro/scripts/test-orchestrator.sh validate
```

### 2. Run Tests

```bash
# Run smoke tests (quick validation)
.maestro/scripts/test-orchestrator.sh run smoke

# Run core functionality tests  
.maestro/scripts/test-orchestrator.sh run core

# Run full test suite
.maestro/scripts/test-orchestrator.sh run full --platform ios

# Run with custom configuration
.maestro/scripts/test-orchestrator.sh run features \
  --platform android \
  --device-id ZL73232GKP \
  --retry-attempts 3
```

### 3. View Results

Results are automatically saved to `.maestro/results/[timestamp]/`:
- `test_report.json` - Detailed JSON report
- `test_summary.md` - Human-readable summary  
- `dashboard.html` - Interactive HTML dashboard
- `tests/` - Individual test outputs and screenshots

## 📋 Test Categories

### 🔥 Smoke Tests (`smoke`)
**Purpose:** Quick validation for CI/PR checks  
**Duration:** ~5-8 minutes  
**Tests:**
- Basic app launch validation
- Core navigation functionality  
- Search feature availability

**When to use:** Every PR, quick local validation

### 🎯 Core Features (`core`) 
**Purpose:** Essential application functionality  
**Duration:** ~15-20 minutes  
**Tests:**
- Complete subscription flow
- Search validation with real data
- Dashboard accordion functionality

**When to use:** Before merges, release candidate validation

### ✨ Extended Features (`features`)
**Purpose:** Additional feature validation  
**Duration:** ~20-25 minutes  
**Tests:**
- Category reorganization
- External link functionality
- Risk factors display
- Location granularity

**When to use:** Feature releases, comprehensive testing

### 🔬 Advanced Interactions (`advanced`)
**Purpose:** Complex user workflows  
**Duration:** ~10-15 minutes  
**Tests:**
- Autocomplete selection flows
- Accordion subitem interactions

**When to use:** UI/UX validation, complex workflow testing

### 👤 Account Management (`account`)
**Purpose:** User account lifecycle testing  
**Duration:** ~15-20 minutes  
**Tests:**
- User signup flow
- Account deletion (automated)
- TestID validation

**When to use:** Auth system changes, user management features

### 🌟 Full Suite (`full`)
**Purpose:** Complete end-to-end validation  
**Duration:** ~45-60 minutes  
**Tests:** All of the above categories

**When to use:** Release validation, major deployments

## 🔧 Configuration

### Environment Variables

```bash
# Required
export MAESTRO_APP_ID="com.epiphanyapps.mapyourhealth"
export AWS_PROFILE="rayane"

# Optional
export DEVICE_ID="ZL73232GKP"          # Android device
export TEST_TIMEOUT="300"             # Test timeout in seconds  
export RETRY_ATTEMPTS="2"             # Retry attempts per test
export AI_QUEUE_URL="http://192.168.1.227:3001"  # AI queue endpoint
```

### Platform Configuration

#### iOS Setup
```bash
# Preferred simulators (in order of preference)
- iPhone 16 Pro (iOS 18.x)
- iPhone 16 (iOS 18.x) 
- iPhone 15 Pro (iOS 17.x)

# Build configuration
- Release builds (for Maestro compatibility)
- Code signing disabled for simulators
- xcbeautify for clean output
```

#### Android Setup  
```bash
# Preferred devices
- ZL73232GKP (Moto E13 - primary test device)
- Any connected Android device (fallback)

# Build configuration
- Release APK for E2E tests
- Debug APK for development
- Port forwarding: 8081, 3000, 9090
```

### Backend Configuration

The system supports multiple backend modes:

1. **Real Backend** (Development/Staging)
   - Uses actual AWS Amplify deployment
   - Requires valid `rayane` AWS profile
   - Full API functionality

2. **Stub Backend** (CI/Testing)
   - Uses mock configuration
   - No AWS dependencies
   - Suitable for UI-only testing

## 🤖 CI/CD Integration

### GitHub Actions Workflows

#### E2E Orchestrated Testing (`.github/workflows/e2e-orchestrated.yml`)

**Triggers:**
- Pull Requests: Smoke tests only
- Main branch pushes: Full test suite
- Manual dispatch: User-selected category

**Features:**
- Matrix testing (iOS + Android)
- Parallel execution where safe
- Automatic retry logic
- Comprehensive artifact collection
- PR result comments
- AI queue notifications

**Usage:**
```yaml
# Manual trigger with custom configuration
gh workflow run e2e-orchestrated.yml \
  -f test_category=core \
  -f platform=ios \
  -f retry_attempts=3
```

### Integration with Existing Workflows

The orchestrated testing integrates seamlessly with existing MapYourHealth CI:

1. **Backend CI** (`backend-ci.yml`) runs first
2. **E2E Orchestrated** runs after backend deployment
3. **Mobile Deploy** (`mobile-deploy.yml`) runs after E2E validation

## 📊 Monitoring & Reporting

### Real-time Monitoring

```bash
# Start monitoring a test run
.maestro/scripts/test-monitor.sh monitor <PID> <output_file>

# Monitor captures:
- System resource usage
- Maestro process metrics  
- Test execution timeline
- Performance bottlenecks
```

### Failure Analysis

The system provides intelligent failure analysis:

**Automatic Pattern Detection:**
- Timeout exceptions
- Element not found errors
- Network connectivity issues
- App crash situations
- Device disconnections

**Analysis Artifacts:**
- Error context extraction
- Screenshot capture on failure
- Log correlation and filtering
- Retry recommendation engine

### Dashboard Generation

```bash
# Generate interactive HTML dashboard
.maestro/scripts/test-monitor.sh dashboard /path/to/results

# Dashboard features:
- Visual test results overview
- Performance metrics
- Failure analysis summary
- Test timeline visualization
- Downloadable artifacts
```

### AI Queue Integration

Automatic notifications to MapYourHealth AI Queue system:

**Notification Types:**
- Test execution started
- Test execution completed
- Individual test failures
- Performance alerts

**Integration Benefits:**
- Telegram notifications to QueensClaw group
- Historical trend analysis
- Automated issue creation for failures
- Performance regression detection

## 🛠️ Advanced Usage

### Custom Test Sequences

```bash
# Run specific test files
.maestro/scripts/test-orchestrator.sh run custom \
  --tests "E2E-001-subscription-flow.yaml E2E-002-search-validation.yaml"

# Skip build phase (use existing installation)
.maestro/scripts/test-orchestrator.sh run smoke --skip-build

# Clean environment and run fresh
.maestro/scripts/test-orchestrator.sh clean
.maestro/scripts/test-orchestrator.sh run core
```

### Environment-specific Configuration

```bash
# Development environment (with real backend)
export TEST_ENVIRONMENT="development"
.maestro/scripts/test-orchestrator.sh run core

# CI environment (with stub backend)  
export TEST_ENVIRONMENT="ci"
.maestro/scripts/test-orchestrator.sh run smoke

# Staging validation
export TEST_ENVIRONMENT="staging"
.maestro/scripts/test-orchestrator.sh run full
```

### Performance Testing

```bash
# Enable performance monitoring
export PERFORMANCE_MONITORING=true
.maestro/scripts/test-orchestrator.sh run core

# Generate performance report
.maestro/scripts/test-monitor.sh analyze /path/to/results
```

## 🔍 Troubleshooting

### Common Issues

#### Test Fails to Start
```bash
# Check environment setup
.maestro/scripts/test-orchestrator.sh validate

# Verify device connectivity
adb devices  # Android
xcrun simctl list devices  # iOS

# Check Amplify configuration
cat amplify_outputs.json
```

#### Tests Timeout Frequently
```bash
# Increase timeout
export TEST_TIMEOUT=600  # 10 minutes
.maestro/scripts/test-orchestrator.sh run core

# Check device performance
.maestro/scripts/test-monitor.sh monitor <PID> <output>
```

#### Backend Connection Issues
```bash
# Validate AWS profile
aws sts get-caller-identity --profile rayane

# Regenerate Amplify outputs
.maestro/scripts/setup-test-env.sh backend
```

#### Build Failures
```bash
# Clean and rebuild
.maestro/scripts/test-orchestrator.sh clean
cd ios && rm -rf build && pod install
cd ../android && ./gradlew clean
```

### Debug Mode

```bash
# Enable verbose logging
export DEBUG=true
export MAESTRO_DRIVER_STARTUP_TIMEOUT=240000

# Run with debugging
.maestro/scripts/test-orchestrator.sh run smoke --retry-attempts 1
```

### Log Locations

- **Test Results:** `.maestro/results/[timestamp]/`
- **Maestro Logs:** `~/.maestro/tests/`
- **Build Logs:** `ios/build/` and `android/build/`
- **Monitoring Data:** `.maestro/monitoring/[timestamp]/`

## 🚦 Best Practices

### Development Workflow

1. **Local Testing:**
   ```bash
   # Quick validation before PR
   .maestro/scripts/test-orchestrator.sh run smoke
   ```

2. **Feature Development:**
   ```bash
   # Test specific feature area
   .maestro/scripts/test-orchestrator.sh run core
   ```

3. **Pre-release Validation:**
   ```bash
   # Full validation suite
   .maestro/scripts/test-orchestrator.sh run full
   ```

### CI/CD Best Practices

1. **PR Validation:** Always run smoke tests
2. **Merge Protection:** Require smoke tests to pass
3. **Release Gates:** Require full test suite for releases
4. **Artifact Retention:** Keep test results for 14 days

### Performance Optimization

1. **Test Ordering:** Run fast tests first (smoke → core → features)
2. **Parallel Execution:** Enable for independent test categories
3. **Resource Management:** Monitor and limit concurrent tests
4. **Cleanup:** Regular cleanup of old results and artifacts

## 📈 Metrics & Analytics

### Key Metrics Tracked

- **Test Success Rate:** Overall and per-category
- **Execution Duration:** Trends and performance regression
- **Failure Patterns:** Common failure types and frequencies
- **Platform Differences:** iOS vs Android success rates
- **Retry Effectiveness:** Success rate after retries

### Performance Baselines

- **Smoke Tests:** < 10 minutes
- **Core Tests:** < 20 minutes  
- **Full Suite:** < 60 minutes
- **Individual Test:** < 5 minutes average

### Quality Gates

- **PR Merge:** 100% smoke test pass rate required
- **Release Candidate:** 95% full suite pass rate required
- **Performance:** No more than 20% regression in execution time

## 🔄 Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Review test execution trends
   - Update test data as needed
   - Clean old result artifacts

2. **Monthly:**  
   - Update test categories based on new features
   - Review and optimize slow tests
   - Update documentation

3. **Quarterly:**
   - Performance baseline review
   - Tool version updates (Maestro, etc.)
   - Configuration audit

### Updates and Versioning

- **System Version:** Tracked in orchestration scripts
- **Configuration Version:** Tracked in test-suites.yaml
- **Compatibility:** Backwards compatible within major versions

## 🤝 Contributing

### Adding New Tests

1. Create test file in `.maestro/flows/`
2. Follow naming convention: `E2E-XXX-description.yaml`
3. Update test categories in `config/test-suites.yaml`
4. Test locally with orchestrator
5. Update documentation

### Modifying Categories

1. Edit `config/test-suites.yaml`
2. Update category dependencies as needed
3. Validate with `test-orchestrator.sh categories`
4. Update this documentation

### Extending Monitoring

1. Add metrics to `test-monitor.sh`
2. Update dashboard template
3. Add AI queue notification types
4. Test with real executions

## 📞 Support

### Getting Help

1. **Documentation:** This README and inline script help
2. **AI Queue Dashboard:** http://192.168.1.227:3001
3. **GitHub Issues:** Create issues for bugs/features
4. **QueensClaw Group:** Real-time support in Telegram

### Emergency Procedures

If the orchestration system is down:

1. **Fall back to individual tests:**
   ```bash
   maestro test .maestro/flows/E2E-100-basic-app-launch.yaml
   ```

2. **Check system status:**
   ```bash
   .maestro/scripts/test-orchestrator.sh validate
   ```

3. **Reset environment:**
   ```bash
   .maestro/scripts/setup-test-env.sh setup
   ```

---

**🎉 Ready for MapYourHealth v1.0 Validation!**

This orchestration system provides enterprise-grade E2E testing capabilities that scale with your development workflow. The intelligent categorization, failure analysis, and CI/CD integration ensure reliable, fast feedback for the entire team.

For questions or improvements, contact the MapYourHealth AI team through the usual channels. Happy testing! 🚀