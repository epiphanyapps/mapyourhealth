#!/bin/bash

# =============================================================================
# MapYourHealth E2E Test Runner - v1.0 Orchestration System
# =============================================================================
# 
# This script orchestrates all E2E tests for MapYourHealth v1.0 in logical
# sequence with proper environment setup, teardown, and comprehensive reporting.
#
# Usage:
#   ./scripts/e2e-runner.sh --category smoke --platform ios
#   ./scripts/e2e-runner.sh --category full --platform android --device "ZL73232GKP" 
#   ./scripts/e2e-runner.sh --category regression --platform ios --retry 2
#
# Categories:
#   smoke: Essential functionality (5-10 min)
#   full: Complete test suite (15-20 min) 
#   regression: Critical paths + edge cases (25-30 min)
#
# =============================================================================

set -euo pipefail

# Script metadata
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MOBILE_DIR="$PROJECT_ROOT/apps/mobile"
MAESTRO_FLOWS_DIR="$MOBILE_DIR/.maestro/flows"

# Default configuration
DEFAULT_CATEGORY="smoke"
DEFAULT_PLATFORM="ios"
DEFAULT_DEVICE_ID=""
DEFAULT_RETRIES=1
DEFAULT_TIMEOUT=1800  # 30 minutes
VERBOSE=false
DRY_RUN=false

# Test result tracking
RESULTS_DIR="$PROJECT_ROOT/test-results/$(date +%Y%m%d_%H%M%S)"
SUMMARY_FILE="$RESULTS_DIR/summary.json"
LOG_FILE="$RESULTS_DIR/execution.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# Utility Functions
# =============================================================================

log() {
    local msg="${BLUE}[$(date +'%H:%M:%S')]${NC} $*"
    echo -e "$msg"
    if [[ -n "${LOG_FILE:-}" ]] && [[ -f "$LOG_FILE" ]]; then
        echo -e "$msg" >> "$LOG_FILE"
    fi
}

success() {
    local msg="${GREEN}✅ $*${NC}"
    echo -e "$msg"
    if [[ -n "${LOG_FILE:-}" ]] && [[ -f "$LOG_FILE" ]]; then
        echo -e "$msg" >> "$LOG_FILE"
    fi
}

warning() {
    local msg="${YELLOW}⚠️  $*${NC}"
    echo -e "$msg"
    if [[ -n "${LOG_FILE:-}" ]] && [[ -f "$LOG_FILE" ]]; then
        echo -e "$msg" >> "$LOG_FILE"
    fi
}

error() {
    local msg="${RED}❌ $*${NC}"
    echo -e "$msg"
    if [[ -n "${LOG_FILE:-}" ]] && [[ -f "$LOG_FILE" ]]; then
        echo -e "$msg" >> "$LOG_FILE"
    fi
}

info() {
    local msg="${CYAN}ℹ️  $*${NC}"
    echo -e "$msg"
    if [[ -n "${LOG_FILE:-}" ]] && [[ -f "$LOG_FILE" ]]; then
        echo -e "$msg" >> "$LOG_FILE"
    fi
}

debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${PURPLE}🔍 $*${NC}" | tee -a "$LOG_FILE"
    fi
}

usage() {
    cat << EOF
MapYourHealth E2E Test Runner v1.0

Usage: $0 [OPTIONS]

OPTIONS:
  --category CATEGORY    Test category: smoke, full, regression (default: $DEFAULT_CATEGORY)
  --platform PLATFORM   Target platform: ios, android (default: $DEFAULT_PLATFORM) 
  --device DEVICE_ID     Specific device ID (optional, auto-detect if not provided)
  --retry COUNT          Number of retries for failed tests (default: $DEFAULT_RETRIES)
  --timeout SECONDS      Global timeout in seconds (default: $DEFAULT_TIMEOUT)
  --verbose              Enable verbose output
  --dry-run              Show what would be executed without running
  --help                 Show this help message

EXAMPLES:
  # Quick smoke tests on iOS simulator
  $0 --category smoke --platform ios

  # Full test suite on specific Android device with retries
  $0 --category full --platform android --device "ZL73232GKP" --retry 2

  # Regression testing with verbose output
  $0 --category regression --platform ios --verbose

TEST CATEGORIES:
  smoke:      Essential flows (E2E-100, E2E-101, E2E-102) - ~5-10 minutes
  full:       Complete v1.0 test suite - ~15-20 minutes  
  regression: Full + edge cases + stress tests - ~25-30 minutes

EOF
}

# =============================================================================
# Test Categories Definition
# =============================================================================

get_test_files_for_category() {
    local category="$1"
    local files=""
    
    case "$category" in
        "smoke")
            files="E2E-100-basic-app-launch.yaml E2E-101-basic-navigation.yaml E2E-102-search-functionality.yaml"
            ;;
        "full")
            # All core v1.0 functionality
            files="E2E-100-basic-app-launch.yaml E2E-101-basic-navigation.yaml E2E-102-search-functionality.yaml E2E-001-subscription-flow.yaml E2E-002-search-validation.yaml E2E-003-category-reorganization.yaml E2E-004-external-links.yaml E2E-005-dashboard-accordion.yaml E2E-006-risk-factors-display.yaml E2E-007-location-granularity.yaml"
            ;;
        "regression")
            # Everything including edge cases
            files="E2E-100-basic-app-launch.yaml E2E-101-basic-navigation.yaml E2E-102-search-functionality.yaml E2E-001-subscription-flow.yaml E2E-002-search-validation.yaml E2E-003-category-reorganization.yaml E2E-004-external-links.yaml E2E-005-dashboard-accordion.yaml E2E-006-risk-factors-display.yaml E2E-007-location-granularity.yaml E2E-009-autocomplete-selection.yaml E2E-010-accordion-subitem-selection.yaml E2E-121-account-deletion-automated.yaml E2E-121-signup-only.yaml E2E-121-testid-validation.yaml"
            ;;
        *)
            error "Unknown test category: $category"
            exit 1
            ;;
    esac
    
    echo "$files"
}

# =============================================================================
# Environment Setup and Validation
# =============================================================================

validate_environment() {
    log "Validating test environment..."
    
    # Check if we're in the correct directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]] || [[ ! -d "$MAESTRO_FLOWS_DIR" ]]; then
        error "Must be run from MapYourHealth project root"
        error "Expected: $PROJECT_ROOT"
        exit 1
    fi
    
    # Check Maestro installation
    if ! command -v maestro &> /dev/null; then
        if [[ -f "$HOME/.maestro/bin/maestro" ]]; then
            export PATH="$HOME/.maestro/bin:$PATH"
            debug "Added Maestro to PATH: $HOME/.maestro/bin"
        else
            error "Maestro not found. Install with: curl -Ls \"https://get.maestro.mobile.dev\" | bash"
            exit 1
        fi
    fi
    
    local maestro_version
    maestro_version=$(maestro --version 2>/dev/null || echo "unknown")
    debug "Maestro version: $maestro_version"
    
    # Platform-specific validation
    case "$PLATFORM" in
        "ios")
            validate_ios_environment
            ;;
        "android") 
            validate_android_environment
            ;;
        *)
            error "Unsupported platform: $PLATFORM"
            exit 1
            ;;
    esac
    
    success "Environment validation complete"
}

validate_ios_environment() {
    debug "Validating iOS environment..."
    
    # Check Xcode tools
    if ! command -v xcrun &> /dev/null; then
        error "Xcode command line tools not found"
        exit 1
    fi
    
    # Check available simulators if no device specified
    if [[ -z "$DEVICE_ID" ]]; then
        DEVICE_ID=$(xcrun simctl list devices available -j | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for runtime, devices in data['devices'].items():
        for d in devices:
            if 'iPhone 16' in d['name'] and d['isAvailable']:
                print(d['udid'])
                sys.exit(0)
    # fallback: any available iPhone  
    for runtime, devices in data['devices'].items():
        for d in devices:
            if 'iPhone' in d['name'] and d['isAvailable']:
                print(d['udid']) 
                sys.exit(0)
except:
    pass
sys.exit(1)
" 2>/dev/null)
        
        if [[ -z "$DEVICE_ID" ]]; then
            error "No available iOS simulators found"
            exit 1
        fi
        
        info "Auto-detected iOS simulator: $DEVICE_ID"
    fi
    
    debug "iOS environment validated"
}

validate_android_environment() {
    debug "Validating Android environment..."
    
    # Check ADB
    if ! command -v adb &> /dev/null; then
        error "ADB not found. Install Android SDK Platform-Tools"
        exit 1
    fi
    
    # Check connected devices if no device specified
    if [[ -z "$DEVICE_ID" ]]; then
        local devices
        devices=$(adb devices | grep -v "List of devices" | grep "device$" | awk '{print $1}')
        
        if [[ -z "$devices" ]]; then
            error "No Android devices/emulators found. Connect device or start emulator"
            exit 1
        fi
        
        # Use first available device
        DEVICE_ID=$(echo "$devices" | head -n1)
        info "Auto-detected Android device: $DEVICE_ID"
    fi
    
    # Verify device is responsive
    if ! adb -s "$DEVICE_ID" shell echo "test" &>/dev/null; then
        error "Device $DEVICE_ID not responsive"
        exit 1
    fi
    
    debug "Android environment validated"
}

# =============================================================================
# Application Build and Deployment
# =============================================================================

setup_app_environment() {
    log "Setting up application environment..."
    
    cd "$PROJECT_ROOT"
    
    # Sync Amplify outputs (critical for backend connectivity)
    log "Syncing Amplify outputs..."
    if ! yarn sync:amplify 2>&1 | tee -a "$LOG_FILE"; then
        warning "Amplify sync failed, continuing with existing outputs..."
    fi
    
    cd "$MOBILE_DIR"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log "Installing dependencies..."
        yarn install --immutable
    fi
    
    success "Application environment ready"
}

build_and_deploy_app() {
    log "Building and deploying app for $PLATFORM..."
    
    cd "$MOBILE_DIR"
    
    case "$PLATFORM" in
        "ios")
            build_ios_app
            ;;
        "android")
            build_android_app
            ;;
    esac
    
    success "App built and deployed for $PLATFORM"
}

build_ios_app() {
    log "Building iOS app for simulator..."
    
    # Generate native project 
    npx expo prebuild --platform ios --clean
    
    cd ios
    
    # Install pods
    pod install --repo-update
    
    # Build for simulator
    local workspace scheme
    workspace=$(ls -d *.xcworkspace | head -1)
    scheme=$(echo "$workspace" | sed 's/.xcworkspace//')
    
    log "Building $scheme in $workspace..."
    
    xcodebuild \
        -workspace "$workspace" \
        -scheme "$scheme" \
        -sdk iphonesimulator \
        -configuration Debug \
        -derivedDataPath build \
        -destination "platform=iOS Simulator,name=iPhone 16,OS=latest" \
        CODE_SIGNING_ALLOWED=NO \
        ARCHS=x86_64 \
        | tee -a "$LOG_FILE"
    
    # Boot simulator
    log "Booting iOS simulator: $DEVICE_ID"
    xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
    sleep 5
    
    # Install app
    local app_path
    app_path=$(find build/Build/Products/Debug-iphonesimulator -name "*.app" -type d | head -1)
    
    if [[ -z "$app_path" ]]; then
        error "Built app not found"
        exit 1
    fi
    
    log "Installing app: $app_path"
    xcrun simctl install "$DEVICE_ID" "$app_path"
    
    cd "$MOBILE_DIR"
}

build_android_app() {
    log "Building Android app (release APK for Maestro)..."
    
    # Generate native project
    npx expo prebuild --platform android --clean
    
    cd android
    
    # Build release APK (required for Maestro - no dev menu interference)
    ./gradlew assembleRelease | tee -a "$LOG_FILE"
    
    # Install on device
    local apk_path="app/build/outputs/apk/release/app-release.apk"
    
    if [[ ! -f "$apk_path" ]]; then
        error "Release APK not found: $apk_path"
        exit 1
    fi
    
    log "Installing APK on device $DEVICE_ID..."
    adb -s "$DEVICE_ID" install -r "$apk_path"
    
    cd "$MOBILE_DIR"
}

# =============================================================================
# Test Execution Engine
# =============================================================================

initialize_results_tracking() {
    mkdir -p "$RESULTS_DIR"
    
    # Initialize summary JSON
    cat > "$SUMMARY_FILE" << EOF
{
  "execution": {
    "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "category": "$CATEGORY",
    "platform": "$PLATFORM", 
    "device_id": "$DEVICE_ID",
    "retry_count": $RETRIES,
    "timeout": $TIMEOUT
  },
  "environment": {
    "project_root": "$PROJECT_ROOT",
    "maestro_version": "$(maestro --version 2>/dev/null || echo 'unknown')",
    "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
    "os": "$(uname -s 2>/dev/null || echo 'unknown')"
  },
  "tests": [],
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "duration_seconds": 0
  }
}
EOF
    
    log "Test results will be saved to: $RESULTS_DIR"
}

run_test_suite() {
    log "Running $CATEGORY test suite on $PLATFORM..."
    
    local test_files
    test_files=$(get_test_files_for_category "$CATEGORY")
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local start_time end_time
    
    start_time=$(date +%s)
    
    # Launch app first 
    case "$PLATFORM" in
        "ios")
            xcrun simctl launch "$DEVICE_ID" "com.epiphanyapps.mapyourhealth"
            sleep 10
            ;;
        "android")
            adb -s "$DEVICE_ID" shell am start -n "com.epiphanyapps.mapyourhealth/.MainActivity"
            sleep 10
            ;;
    esac
    
    # Execute each test with retry logic
    for test_file in $test_files; do
        local test_path="$MAESTRO_FLOWS_DIR/$test_file"
        
        if [[ ! -f "$test_path" ]]; then
            warning "Test file not found: $test_file"
            continue
        fi
        
        total_tests=$((total_tests + 1))
        
        log "Running test: $test_file"
        
        if run_single_test "$test_path" "$test_file"; then
            success "✅ PASSED: $test_file"
            passed_tests=$((passed_tests + 1))
        else
            error "❌ FAILED: $test_file"
            failed_tests=$((failed_tests + 1))
        fi
    done
    
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Update summary
    update_summary_results $total_tests $passed_tests $failed_tests 0 $duration
    
    # Generate final report
    generate_final_report
    
    log "Test suite completed: $passed_tests/$total_tests passed"
    
    # Return exit code based on results
    if [[ $failed_tests -gt 0 ]]; then
        return 1
    else
        return 0
    fi
}

run_single_test() {
    local test_path="$1" 
    local test_name="$2"
    local attempt=1
    
    while [[ $attempt -le $((RETRIES + 1)) ]]; do
        if [[ $attempt -gt 1 ]]; then
            warning "Retry $((attempt - 1))/$RETRIES for $test_name"
        fi
        
        local test_start test_end test_duration result
        test_start=$(date +%s)
        
        # Run maestro test with timeout
        local maestro_cmd="maestro"
        
        case "$PLATFORM" in
            "ios")
                maestro_cmd="maestro --device $DEVICE_ID"
                ;;
            "android")
                maestro_cmd="maestro --device $DEVICE_ID"
                ;;
        esac
        
        if timeout $TIMEOUT $maestro_cmd test \
            --env MAESTRO_APP_ID=com.epiphanyapps.mapyourhealth \
            "$test_path" 2>&1 | tee -a "$LOG_FILE"; then
            result="passed"
        else
            result="failed"
        fi
        
        test_end=$(date +%s)
        test_duration=$((test_end - test_start))
        
        # Record test result
        record_test_result "$test_name" "$result" $test_duration $attempt
        
        if [[ "$result" == "passed" ]]; then
            return 0
        fi
        
        attempt=$((attempt + 1))
        
        if [[ $attempt -le $((RETRIES + 1)) ]]; then
            sleep 5  # Brief pause before retry
        fi
    done
    
    return 1
}

record_test_result() {
    local test_name="$1"
    local result="$2" 
    local duration="$3"
    local attempt="$4"
    
    # Update summary JSON with test result
    python3 << EOF
import json
import sys

try:
    with open("$SUMMARY_FILE", "r") as f:
        data = json.load(f)
    
    test_result = {
        "name": "$test_name",
        "result": "$result", 
        "duration_seconds": $duration,
        "attempt": $attempt,
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
    
    data["tests"].append(test_result)
    
    with open("$SUMMARY_FILE", "w") as f:
        json.dump(data, f, indent=2)
        
except Exception as e:
    print(f"Error recording test result: {e}", file=sys.stderr)
    sys.exit(1)
EOF
}

update_summary_results() {
    local total="$1"
    local passed="$2" 
    local failed="$3"
    local skipped="$4"
    local duration="$5"
    
    python3 << EOF
import json

try:
    with open("$SUMMARY_FILE", "r") as f:
        data = json.load(f)
    
    data["summary"] = {
        "total": $total,
        "passed": $passed,
        "failed": $failed,
        "skipped": $skipped,
        "duration_seconds": $duration
    }
    
    data["execution"]["end_time"] = "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    with open("$SUMMARY_FILE", "w") as f:
        json.dump(data, f, indent=2)
        
except Exception as e:
    print(f"Error updating summary: {e}")
EOF
}

# =============================================================================
# Cleanup and Reporting
# =============================================================================

cleanup_environment() {
    log "Cleaning up test environment..."
    
    case "$PLATFORM" in
        "ios")
            if [[ -n "$DEVICE_ID" ]]; then
                xcrun simctl shutdown "$DEVICE_ID" 2>/dev/null || true
                debug "Shutdown iOS simulator: $DEVICE_ID"
            fi
            ;;
        "android")
            # Kill any hanging app processes
            adb -s "$DEVICE_ID" shell am force-stop com.epiphanyapps.mapyourhealth 2>/dev/null || true
            debug "Killed app processes on Android device: $DEVICE_ID"
            ;;
    esac
    
    debug "Cleanup completed"
}

generate_final_report() {
    log "Generating final test report..."
    
    local report_file="$RESULTS_DIR/report.md"
    
    # Extract data from summary JSON for report
    local category platform device_id total passed failed duration
    category=$(python3 -c "import json; data=json.load(open('$SUMMARY_FILE')); print(data['execution']['category'])")
    platform=$(python3 -c "import json; data=json.load(open('$SUMMARY_FILE')); print(data['execution']['platform'])")
    device_id=$(python3 -c "import json; data=json.load(open('$SUMMARY_FILE')); print(data['execution']['device_id'])")
    total=$(python3 -c "import json; data=json.load(open('$SUMMARY_FILE')); print(data['summary']['total'])")
    passed=$(python3 -c "import json; data=json.load(open('$SUMMARY_FILE')); print(data['summary']['passed'])")
    failed=$(python3 -c "import json; data=json.load(open('$SUMMARY_FILE')); print(data['summary']['failed'])")
    duration=$(python3 -c "import json; data=json.load(open('$SUMMARY_FILE')); print(data['summary']['duration_seconds'])")
    
    cat > "$report_file" << EOF
# MapYourHealth E2E Test Report

**Execution Summary:**
- **Category:** $category
- **Platform:** $platform  
- **Device:** $device_id
- **Duration:** ${duration}s ($(printf "%.1f" $(echo "scale=1; $duration/60" | bc))m)
- **Results:** $passed/$total passed ($failed failed)

## Test Results

| Test | Result | Duration |
|------|---------|----------|
EOF
    
    # Add individual test results
    python3 << EOF >> "$report_file"
import json

with open("$SUMMARY_FILE", "r") as f:
    data = json.load(f)

for test in data["tests"]:
    status_emoji = "✅" if test["result"] == "passed" else "❌"
    print(f"| {test['name']} | {status_emoji} {test['result']} | {test['duration_seconds']}s |")
EOF
    
    echo "" >> "$report_file"
    echo "**Generated:** $(date)" >> "$report_file"
    
    info "Test report saved: $report_file"
    info "Raw results: $SUMMARY_FILE"
    info "Execution log: $LOG_FILE"
}

# =============================================================================
# Main Execution Flow
# =============================================================================

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --category)
                CATEGORY="$2"
                shift 2
                ;;
            --platform)
                PLATFORM="$2"
                shift 2
                ;;
            --device)
                DEVICE_ID="$2"
                shift 2
                ;;
            --retry)
                RETRIES="$2"
                shift 2
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Set defaults
    CATEGORY="${CATEGORY:-$DEFAULT_CATEGORY}"
    PLATFORM="${PLATFORM:-$DEFAULT_PLATFORM}"
    DEVICE_ID="${DEVICE_ID:-$DEFAULT_DEVICE_ID}"
    RETRIES="${RETRIES:-$DEFAULT_RETRIES}"
    TIMEOUT="${TIMEOUT:-$DEFAULT_TIMEOUT}"
    
    # Initialize results tracking first (creates directories and log file)
    initialize_results_tracking
    
    # Show configuration
    info "MapYourHealth E2E Test Runner v1.0"
    info "Category: $CATEGORY | Platform: $PLATFORM | Device: ${DEVICE_ID:-auto-detect} | Retries: $RETRIES"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN - Would execute:"
        local test_files
        test_files=$(get_test_files_for_category "$CATEGORY")
        for file in $test_files; do
            echo "  - $file"
        done
        exit 0
    fi
    
    # Set up trap for cleanup
    trap cleanup_environment EXIT
    
    # Execute test flow
    local exit_code=0
    
    validate_environment || exit_code=1
    
    if [[ $exit_code -eq 0 ]]; then
        setup_app_environment || exit_code=1
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        build_and_deploy_app || exit_code=1
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        run_test_suite || exit_code=1
    fi
    
    # Final status
    if [[ $exit_code -eq 0 ]]; then
        success "🎉 All tests completed successfully!"
    else
        error "💥 Test execution failed!"
    fi
    
    exit $exit_code
}

# Run main function with all arguments
main "$@"