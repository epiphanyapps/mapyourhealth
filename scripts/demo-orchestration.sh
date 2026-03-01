#!/bin/bash
# MapYourHealth E2E Test Orchestration Demo
# Demonstrates the complete test orchestration system

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[DEMO]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_banner() {
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    MapYourHealth E2E Test Orchestration System v1.0          ║
║                                                               ║
║    🧪 Comprehensive Test Suite Demonstration                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo
}

show_system_overview() {
    log_step "System Overview"
    echo
    cat << 'EOF'
📦 Components Overview:
├── 🎯 Master Test Runner (scripts/e2e-test-runner.sh)
│   ├── Environment Setup & Teardown
│   ├── Build Management (iOS/Android)
│   ├── Test Suite Orchestration (Smoke/Full/Regression)
│   └── Result Aggregation & Reporting
│
├── ⚙️  Environment Setup (scripts/setup-test-environment.sh)
│   ├── AWS Configuration (rayane profile)
│   ├── Platform Dependencies (Maestro, iOS, Android)
│   └── Test Data Management
│
├── 📊 Test Monitor (scripts/test-monitor.js)
│   ├── Real-time Monitoring
│   ├── Report Generation (JSON/HTML/Markdown)
│   └── AI Queue Integration
│
└── 🚀 CI/CD Integration (.github/workflows/e2e-orchestration.yml)
    ├── Automated Testing (PR/Push/Manual)
    ├── Multi-platform Support
    └── Result Analysis & Notifications

🎯 Test Categories:
├── Smoke Tests (2-3 min) - Basic functionality validation
├── Full Tests (10-15 min) - Core features excluding destructive ops
└── Regression Tests (20-25 min) - Complete validation including destructive tests
EOF
    echo
}

check_system_readiness() {
    log_step "Checking System Readiness"
    
    local errors=0
    
    # Check scripts exist and are executable
    if [[ ! -x "$SCRIPT_DIR/e2e-test-runner.sh" ]]; then
        log_error "e2e-test-runner.sh not found or not executable"
        ((errors++))
    else
        log_success "Test runner script found"
    fi
    
    if [[ ! -x "$SCRIPT_DIR/setup-test-environment.sh" ]]; then
        log_error "setup-test-environment.sh not found or not executable"
        ((errors++))
    else
        log_success "Environment setup script found"
    fi
    
    if [[ ! -x "$SCRIPT_DIR/test-monitor.js" ]]; then
        log_error "test-monitor.js not found or not executable"
        ((errors++))
    else
        log_success "Test monitor script found"
    fi
    
    # Check GitHub workflow
    if [[ ! -f "$PROJECT_ROOT/.github/workflows/e2e-orchestration.yml" ]]; then
        log_error "CI/CD workflow not found"
        ((errors++))
    else
        log_success "CI/CD workflow found"
    fi
    
    # Check test files
    local test_count=$(find "$PROJECT_ROOT/apps/mobile/.maestro/flows" -name "*.yaml" -type f 2>/dev/null | wc -l)
    if [[ $test_count -gt 0 ]]; then
        log_success "Found $test_count Maestro test files"
    else
        log_error "No Maestro test files found"
        ((errors++))
    fi
    
    if [[ $errors -eq 0 ]]; then
        log_success "System readiness check passed"
        return 0
    else
        log_error "System readiness check failed with $errors errors"
        return 1
    fi
}

demo_environment_setup() {
    log_step "Demo: Environment Setup"
    echo
    
    log "Running environment setup validation..."
    if "$SCRIPT_DIR/setup-test-environment.sh" validate; then
        log_success "Environment is properly configured"
    else
        log_warning "Environment needs setup. Run: $SCRIPT_DIR/setup-test-environment.sh"
        echo
        log "Would you like to run environment setup now? (This will validate AWS, install dependencies, etc.)"
        read -p "Continue with setup? [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            "$SCRIPT_DIR/setup-test-environment.sh"
        else
            log_warning "Skipping environment setup - some demos may not work"
        fi
    fi
    echo
}

demo_test_runner_help() {
    log_step "Demo: Test Runner Help & Options"
    echo
    
    log "Showing test runner help and capabilities..."
    echo
    "$SCRIPT_DIR/e2e-test-runner.sh" --help
    echo
}

demo_test_categorization() {
    log_step "Demo: Test Categorization"
    echo
    
    log "Analyzing available test files by category..."
    echo
    
    local flows_dir="$PROJECT_ROOT/apps/mobile/.maestro/flows"
    
    if [[ ! -d "$flows_dir" ]]; then
        log_error "Maestro flows directory not found: $flows_dir"
        return 1
    fi
    
    # Categorize tests based on the runner script's logic
    echo "📱 Available Test Files:"
    echo "======================"
    
    echo
    echo "🟢 Smoke Tests (Basic functionality):"
    echo "   - E2E-100-basic-app-launch.yaml"
    echo "   - E2E-101-basic-navigation.yaml"
    
    echo
    echo "🔵 Critical Tests (Core features):"
    echo "   - E2E-001-subscription-flow.yaml"
    echo "   - E2E-002-search-validation.yaml"
    echo "   - E2E-102-search-functionality.yaml"
    echo "   - E2E-121-signup-only.yaml"
    
    echo
    echo "🟡 Dashboard Tests (UI interactions):"
    echo "   - E2E-003-category-reorganization.yaml"
    echo "   - E2E-005-dashboard-accordion.yaml"
    echo "   - E2E-010-accordion-subitem-selection.yaml"
    echo "   - E2E-009-autocomplete-selection.yaml"
    
    echo
    echo "🟠 Feature Tests (Extended functionality):"
    echo "   - E2E-004-external-links.yaml"
    echo "   - E2E-006-risk-factors-display.yaml"
    echo "   - E2E-007-location-granularity.yaml"
    echo "   - E2E-121-testid-validation.yaml"
    
    echo
    echo "🔴 Account Tests (Destructive operations):"
    echo "   - E2E-121-account-deletion.yaml"
    echo "   - E2E-121-account-deletion-automated.yaml"
    
    echo
    # Show actual files found
    echo "📁 Actual Files Found:"
    echo "====================="
    find "$flows_dir" -name "*.yaml" -type f | sort | sed 's|.*/||' | while read file; do
        if [[ -f "$flows_dir/$file" ]]; then
            echo "   ✅ $file"
        fi
    done
    echo
}

demo_dry_run() {
    log_step "Demo: Test Runner Dry Run"
    echo
    
    log "Demonstrating test runner configuration validation..."
    echo
    
    # Create a temporary dry-run version of the test runner
    log "Simulating smoke test suite execution..."
    
    cat << 'EOF'
🧪 Test Execution Simulation (Dry Run)
=====================================

1. Environment Validation
   ✅ Prerequisites check (Node.js, Yarn, Platform tools)
   ✅ AWS profile 'rayane' connectivity
   ✅ Maestro installation verification

2. Test Suite: smoke
   📱 Platform: iOS (Simulator)
   📱 Device: iPhone 16 Pro (preferred)
   
3. Build Process
   🔧 Sync Amplify outputs
   🔧 Install dependencies (yarn install)
   🔧 Expo prebuild (iOS)
   🔧 CocoaPods install
   🔧 Xcode build (Release configuration)

4. Device Setup
   📱 Boot iPhone 16 Pro simulator
   📱 Install app bundle
   📱 Launch app for testing

5. Test Execution Plan
   🟢 E2E-100-basic-app-launch.yaml (~30s)
   🟢 E2E-101-basic-navigation.yaml (~45s)
   
   Estimated Duration: 2-3 minutes
   Output Directory: ./test-results/smoke-TIMESTAMP

6. Results & Reporting
   📊 Test results CSV
   📄 JSON report
   📋 Human-readable summary
   🗃️  Archive to historical results

EOF
    echo
}

demo_monitoring_system() {
    log_step "Demo: Test Monitoring System"
    echo
    
    log "Demonstrating test monitoring capabilities..."
    echo
    
    # Show monitor help
    node "$SCRIPT_DIR/test-monitor.js" 2>/dev/null || cat << 'EOF'
📊 Test Monitor Capabilities:
===========================

🔍 Real-time Monitoring:
   - Live test execution tracking
   - Test status updates (running/passed/failed)
   - Duration tracking
   - Error capture

📈 Report Generation:
   - JSON reports (machine-readable)
   - HTML reports (visual dashboard)
   - Markdown summaries (documentation)
   - Historical archival

🔔 Notification Integration:
   - AI Queue system alerts
   - Failure notifications
   - Success rate monitoring

💾 State Management:
   - Persistent execution state
   - Resume capability after interruption
   - Historical data retention

📋 Usage Examples:
   # Monitor a test run
   node scripts/test-monitor.js watch ./scripts/e2e-test-runner.sh --suite smoke
   
   # Generate report from current state
   node scripts/test-monitor.js report --html
   
   # Check current status
   node scripts/test-monitor.js status

EOF
    echo
}

demo_ci_cd_integration() {
    log_step "Demo: CI/CD Integration"
    echo
    
    log "Showing GitHub Actions workflow configuration..."
    echo
    
    cat << 'EOF'
🚀 GitHub Actions Workflow Features:
===================================

📋 Intelligent Test Strategy:
   - Pull Requests: Smoke tests (fast feedback)
   - Main Branch Push: Full test suite with retries
   - Manual Dispatch: Custom suite/platform selection
   - Scheduled: Nightly regression tests (optional)

🎯 Multi-platform Support:
   - iOS Simulator (iPhone 16 Pro preferred)
   - Android Device/Emulator
   - Matrix builds for parallel execution

📦 Artifact Management:
   - Test results (JSON/HTML reports)
   - Failure screenshots
   - Execution logs
   - 30-day retention for results, 7-day for failures

🔔 Notification Integration:
   - PR comments with test results
   - AI Queue system alerts for failures
   - Slack/email notifications (configurable)

⚡ Performance Optimization:
   - Self-hosted macOS runners
   - Build caching
   - Parallel test execution
   - Intelligent retry logic

📊 Result Analysis:
   - Success rate tracking
   - Failure pattern detection
   - Historical trend analysis
   - Performance metrics

EOF
    
    echo
    log "Workflow triggers configured:"
    echo "  - Pull Request: apps/mobile/** changes"
    echo "  - Push to main: Automatic full test suite"
    echo "  - Manual dispatch: Custom test configuration"
    echo "  - Schedule: Disabled (uncomment for nightly runs)"
    echo
}

demo_integration_with_ai_queue() {
    log_step "Demo: AI Queue Integration"
    echo
    
    log "Demonstrating AI Queue system integration..."
    echo
    
    cat << 'EOF'
🤖 AI Queue System Integration:
==============================

📡 Notification Endpoints:
   - Test failure alerts
   - Success rate monitoring
   - Performance degradation warnings
   - Historical trend analysis

🔄 Automated Workflow:
   1. E2E test execution completes
   2. Results analyzed by test monitor
   3. If failures detected → AI Queue notification
   4. AI system processes failure patterns
   5. Automatic issue creation (if configured)
   6. Team notification via Telegram/Slack

💌 Notification Format:
   {
     "message": "🧪 MapYourHealth E2E Test Failure Alert",
     "type": "e2e_failure", 
     "priority": "high",
     "metadata": {
       "suite": "full",
       "platform": "ios",
       "successRate": 75,
       "failedCount": 3
     }
   }

🔗 Integration Points:
   - Test Monitor: Real-time failure detection
   - CI/CD Workflow: Automated notifications
   - AI Queue Dashboard: http://localhost:3001
   - Telegram Bot: QueensClaw group updates

EOF
    echo
}

run_quick_validation() {
    log_step "Running Quick System Validation"
    echo
    
    log "This will perform a quick validation of the orchestration system..."
    echo
    
    local temp_dir="$PROJECT_ROOT/test-results/validation-$(date +%s)"
    mkdir -p "$temp_dir"
    
    # Test 1: Environment validation
    log "1. Testing environment setup validation..."
    if "$SCRIPT_DIR/setup-test-environment.sh" validate > "$temp_dir/env-validation.log" 2>&1; then
        log_success "Environment validation passed"
    else
        log_warning "Environment validation had issues (check $temp_dir/env-validation.log)"
    fi
    
    # Test 2: Test runner help
    log "2. Testing test runner help output..."
    if "$SCRIPT_DIR/e2e-test-runner.sh" --help > "$temp_dir/runner-help.log" 2>&1; then
        log_success "Test runner help generated successfully"
    else
        log_warning "Test runner help had issues"
    fi
    
    # Test 3: Monitor system
    log "3. Testing monitoring system..."
    if node "$SCRIPT_DIR/test-monitor.js" status > "$temp_dir/monitor-status.log" 2>&1; then
        log_success "Monitor system functional"
    else
        log_warning "Monitor system had issues"
    fi
    
    # Test 4: Check test files
    log "4. Validating test files..."
    local test_files=$(find "$PROJECT_ROOT/apps/mobile/.maestro/flows" -name "*.yaml" -type f 2>/dev/null | wc -l)
    if [[ $test_files -gt 0 ]]; then
        log_success "Found $test_files test files"
    else
        log_warning "No test files found"
    fi
    
    # Test 5: Documentation
    log "5. Checking documentation..."
    if [[ -f "$PROJECT_ROOT/docs/E2E_TEST_ORCHESTRATION.md" ]]; then
        log_success "Documentation available"
    else
        log_warning "Documentation not found"
    fi
    
    echo
    log_success "Quick validation completed. Results in: $temp_dir"
    echo
}

show_usage_examples() {
    log_step "Usage Examples"
    echo
    
    cat << 'EOF'
💡 Common Usage Patterns:
========================

🚀 Quick Start:
   # Complete setup
   ./scripts/setup-test-environment.sh
   
   # Run smoke tests
   ./scripts/e2e-test-runner.sh --suite smoke
   
   # View results
   cat test-results/test_summary.txt

🧪 Development Workflow:
   # Before committing changes
   ./scripts/e2e-test-runner.sh --suite smoke --platform ios
   
   # Before release
   ./scripts/e2e-test-runner.sh --suite full --retry-failed
   
   # Full validation
   ./scripts/e2e-test-runner.sh --suite regression --platform ios

📊 With Monitoring:
   # Monitor test execution
   node scripts/test-monitor.js watch ./scripts/e2e-test-runner.sh --suite full
   
   # Generate HTML report
   node scripts/test-monitor.js report --html
   
   # Check current status
   node scripts/test-monitor.js status

🔧 CI/CD Integration:
   # Manual GitHub Actions trigger
   gh workflow run e2e-orchestration.yml -f test_suite=full -f platform=ios
   
   # View workflow status
   gh workflow view e2e-orchestration.yml
   
   # Download artifacts
   gh run download --name e2e-ios-results-123

🎯 Custom Configuration:
   # Custom output location
   ./scripts/e2e-test-runner.sh --suite full --output-dir ./custom-results
   
   # Verbose logging
   ./scripts/e2e-test-runner.sh --suite smoke --verbose
   
   # Different platform
   ./scripts/e2e-test-runner.sh --suite full --platform android

EOF
    echo
}

show_next_steps() {
    log_step "Next Steps & Recommendations"
    echo
    
    cat << 'EOF'
🎯 Immediate Actions:
====================

1. 🔧 Setup & Validation:
   ./scripts/setup-test-environment.sh
   
2. 🧪 First Test Run:
   ./scripts/e2e-test-runner.sh --suite smoke
   
3. 📊 Review Results:
   open test-results/test_summary.txt
   
4. 📚 Read Documentation:
   open docs/E2E_TEST_ORCHESTRATION.md

🏆 Best Practices:
==================

✅ Always run smoke tests before committing
✅ Use full test suite for release candidates  
✅ Review failure logs before retrying tests
✅ Update test documentation when adding new tests
✅ Monitor CI results and investigate failures promptly

🔄 Maintenance Tasks:
====================

📅 Weekly:
   - Review test stability and success rates
   - Clean up old test result archives
   - Update test data if needed

📅 Monthly:  
   - Update Maestro and platform dependencies
   - Review and optimize test execution times
   - Update CI/CD workflow configurations

📅 Per Release:
   - Run full regression test suite
   - Document any new test requirements
   - Update team training materials

🚀 Advanced Features:
====================

🔮 Future Enhancements:
   - Parallel test execution optimization
   - Cross-platform test result comparison
   - Advanced failure pattern analysis
   - Automated test healing and retry strategies
   - Integration with external monitoring tools

🤖 AI Queue Integration:
   - Automatic failure analysis
   - Intelligent test selection
   - Predictive failure detection
   - Automated fix suggestions

EOF
    echo
}

# Main demo execution
main() {
    show_banner
    
    # Check if system is ready
    if ! check_system_readiness; then
        log_error "System not ready. Please ensure all components are installed."
        exit 1
    fi
    
    show_system_overview
    
    echo "🎯 Demo Menu:"
    echo "============="
    echo "1. Environment Setup Demo"
    echo "2. Test Runner Help & Options"
    echo "3. Test Categorization"
    echo "4. Execution Simulation (Dry Run)"
    echo "5. Monitoring System Demo" 
    echo "6. CI/CD Integration Overview"
    echo "7. AI Queue Integration"
    echo "8. Run Quick Validation"
    echo "9. Usage Examples"
    echo "10. Next Steps & Recommendations"
    echo "11. Run All Demos"
    echo "0. Exit"
    echo
    
    while true; do
        read -p "Select demo (0-11): " choice
        echo
        
        case $choice in
            1) demo_environment_setup ;;
            2) demo_test_runner_help ;;
            3) demo_test_categorization ;;
            4) demo_dry_run ;;
            5) demo_monitoring_system ;;
            6) demo_ci_cd_integration ;;
            7) demo_integration_with_ai_queue ;;
            8) run_quick_validation ;;
            9) show_usage_examples ;;
            10) show_next_steps ;;
            11) 
                log "Running all demos..."
                demo_environment_setup
                demo_test_runner_help
                demo_test_categorization
                demo_dry_run
                demo_monitoring_system
                demo_ci_cd_integration
                demo_integration_with_ai_queue
                run_quick_validation
                show_usage_examples
                show_next_steps
                ;;
            0) 
                log "Thanks for exploring the MapYourHealth E2E Test Orchestration System!"
                exit 0
                ;;
            *)
                log_error "Invalid choice. Please select 0-11."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue or Ctrl+C to exit..."
        echo
    done
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi