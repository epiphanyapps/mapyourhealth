#!/bin/bash
# MapYourHealth E2E Test Runner v1.0
# Production-ready test orchestration system for v1.0 validation
# 
# Usage:
#   ./scripts/e2e-test-runner.sh [options]
#
# Options:
#   --suite <smoke|full|regression>  Test suite to run (default: full)
#   --platform <ios|android>        Platform to test (default: ios)
#   --device <simulator|device>      Device type (default: simulator)
#   --env <staging|prod>             Environment (default: staging)
#   --parallel                       Run tests in parallel where possible
#   --report-format <json|html>      Report format (default: json)
#   --output-dir <path>              Output directory (default: ./test-results)
#   --retry-failed                   Retry failed tests once
#   --help                           Show this help

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MOBILE_APP_DIR="$PROJECT_ROOT/apps/mobile"
MAESTRO_FLOWS_DIR="$MOBILE_APP_DIR/.maestro/flows"

# Default configuration
SUITE="full"
PLATFORM="ios"
DEVICE_TYPE="simulator"
ENVIRONMENT="staging"
PARALLEL=false
REPORT_FORMAT="json"
OUTPUT_DIR="$PROJECT_ROOT/test-results"
RETRY_FAILED=false
VERBOSE=false

# Test categorization
SMOKE_TESTS=(
    "E2E-100-basic-app-launch.yaml"
    "E2E-101-basic-navigation.yaml"
)

CRITICAL_TESTS=(
    "E2E-001-subscription-flow.yaml"
    "E2E-002-search-validation.yaml"
    "E2E-102-search-functionality.yaml"
    "E2E-121-signup-only.yaml"
)

DASHBOARD_TESTS=(
    "E2E-003-category-reorganization.yaml"
    "E2E-005-dashboard-accordion.yaml"
    "E2E-010-accordion-subitem-selection.yaml"
    "E2E-009-autocomplete-selection.yaml"
)

FEATURE_TESTS=(
    "E2E-004-external-links.yaml"
    "E2E-006-risk-factors-display.yaml"
    "E2E-007-location-granularity.yaml"
    "E2E-121-testid-validation.yaml"
)

ACCOUNT_TESTS=(
    "E2E-121-account-deletion.yaml"
    "E2E-121-account-deletion-automated.yaml"
)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --suite)
                SUITE="$2"
                shift 2
                ;;
            --platform)
                PLATFORM="$2"
                shift 2
                ;;
            --device)
                DEVICE_TYPE="$2"
                shift 2
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --parallel)
                PARALLEL=true
                shift
                ;;
            --report-format)
                REPORT_FORMAT="$2"
                shift 2
                ;;
            --output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --retry-failed)
                RETRY_FAILED=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
MapYourHealth E2E Test Runner v1.0

Usage: $0 [options]

Options:
  --suite <smoke|full|regression>  Test suite to run (default: full)
  --platform <ios|android>        Platform to test (default: ios)
  --device <simulator|device>      Device type (default: simulator)
  --env <staging|prod>             Environment (default: staging)
  --parallel                       Run tests in parallel where possible
  --report-format <json|html>      Report format (default: json)
  --output-dir <path>              Output directory (default: ./test-results)
  --retry-failed                   Retry failed tests once
  --verbose                        Enable verbose logging
  --help                           Show this help

Test Suites:
  smoke       - Basic functionality (app launch, navigation)
  full        - All tests except destructive account operations
  regression  - Full suite including account deletion tests

Examples:
  # Run smoke tests on iOS simulator
  $0 --suite smoke --platform ios

  # Run full test suite with retry on failures
  $0 --suite full --retry-failed

  # Run all tests in parallel (experimental)
  $0 --suite full --parallel

Environment Variables:
  MAESTRO_APP_ID     - App bundle ID (default: com.epiphanyapps.mapyourhealth)
  AWS_PROFILE        - AWS profile for backend connection (default: rayane)
  CI                 - Set to 'true' for CI environment optimizations
EOF
}

# Validate prerequisites
validate_prerequisites() {
    log "Validating prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -d "$MOBILE_APP_DIR" ]]; then
        log_error "Mobile app directory not found: $MOBILE_APP_DIR"
        exit 1
    fi
    
    if [[ ! -d "$MAESTRO_FLOWS_DIR" ]]; then
        log_error "Maestro flows directory not found: $MAESTRO_FLOWS_DIR"
        exit 1
    fi
    
    # Check Maestro installation
    if ! command -v maestro &> /dev/null; then
        log_warning "Maestro not found in PATH, checking ~/.maestro/bin/"
        if [[ -f "$HOME/.maestro/bin/maestro" ]]; then
            export PATH="$PATH:$HOME/.maestro/bin"
        else
            log_error "Maestro not found. Install with: curl -Ls \"https://get.maestro.mobile.dev\" | bash"
            exit 1
        fi
    fi
    
    # Check platform-specific requirements
    if [[ "$PLATFORM" == "ios" ]]; then
        if ! command -v xcrun &> /dev/null; then
            log_error "Xcode command line tools not found"
            exit 1
        fi
        
        if ! command -v xcodebuild &> /dev/null; then
            log_error "xcodebuild not found"
            exit 1
        fi
    elif [[ "$PLATFORM" == "android" ]]; then
        if ! command -v adb &> /dev/null; then
            log_error "Android Debug Bridge (adb) not found"
            exit 1
        fi
    fi
    
    # Check Node.js and Yarn
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found"
        exit 1
    fi
    
    if ! command -v yarn &> /dev/null; then
        log_error "Yarn not found"
        exit 1
    fi
    
    log_success "Prerequisites validation completed"
}

# Setup test environment
setup_environment() {
    log "Setting up test environment..."
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Set environment variables
    export MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.epiphanyapps.mapyourhealth}"
    export AWS_PROFILE="${AWS_PROFILE:-rayane}"
    export MAESTRO_DRIVER_STARTUP_TIMEOUT="120000"
    
    # Platform-specific Java setup for macOS
    if [[ "$OSTYPE" == "darwin"* ]] && [[ -d "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]]; then
        export JAVA_HOME="/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
        export PATH="/usr/local/opt/openjdk@17/bin:$PATH"
    fi
    
    log_success "Environment setup completed"
    log "App ID: $MAESTRO_APP_ID"
    log "AWS Profile: $AWS_PROFILE"
    log "Platform: $PLATFORM"
    log "Device Type: $DEVICE_TYPE"
    log "Test Suite: $SUITE"
}

# Sync Amplify outputs
sync_amplify_outputs() {
    log "Syncing Amplify outputs..."
    cd "$PROJECT_ROOT"
    
    if [[ -f "scripts/sync-amplify-outputs.sh" ]]; then
        bash scripts/sync-amplify-outputs.sh
        log_success "Amplify outputs synced"
    else
        log_warning "sync-amplify-outputs.sh not found, running manual sync"
        cd "$MOBILE_APP_DIR"
        yarn run amplify:outputs || log_warning "Failed to sync Amplify outputs automatically"
    fi
}

# Build application
build_application() {
    log "Building application for $PLATFORM..."
    cd "$MOBILE_APP_DIR"
    
    # Install dependencies
    log "Installing dependencies..."
    yarn install --immutable
    
    if [[ "$PLATFORM" == "ios" ]]; then
        build_ios_app
    elif [[ "$PLATFORM" == "android" ]]; then
        build_android_app
    fi
}

build_ios_app() {
    log "Building iOS application..."
    
    # Generate native project
    npx expo prebuild --platform ios --clean
    cd ios
    
    # Install CocoaPods dependencies
    pod install --repo-update
    
    # Build for simulator
    if [[ "$DEVICE_TYPE" == "simulator" ]]; then
        WORKSPACE=$(ls -d *.xcworkspace | head -1)
        SCHEME=$(echo "$WORKSPACE" | sed 's/.xcworkspace//')
        
        log "Building $SCHEME for iOS Simulator..."
        xcodebuild \
            -workspace "$WORKSPACE" \
            -scheme "$SCHEME" \
            -sdk iphonesimulator \
            -configuration Release \
            -derivedDataPath build \
            -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=latest' \
            CODE_SIGNING_ALLOWED=NO \
            | xcbeautify 2>/dev/null || xcodebuild \
            -workspace "$WORKSPACE" \
            -scheme "$SCHEME" \
            -sdk iphonesimulator \
            -configuration Release \
            -derivedDataPath build \
            -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=latest' \
            CODE_SIGNING_ALLOWED=NO
    fi
    
    log_success "iOS application built successfully"
}

build_android_app() {
    log "Building Android application..."
    
    # Generate native project
    npx expo prebuild --platform android --clean
    cd android
    
    # Build release APK for Maestro (no dev menu)
    ./gradlew assembleRelease
    
    log_success "Android application built successfully"
}

# Setup device/simulator
setup_device() {
    log "Setting up device/simulator..."
    
    if [[ "$PLATFORM" == "ios" && "$DEVICE_TYPE" == "simulator" ]]; then
        setup_ios_simulator
    elif [[ "$PLATFORM" == "android" ]]; then
        setup_android_device
    fi
}

setup_ios_simulator() {
    log "Setting up iOS Simulator..."
    
    # Find and boot iPhone 16 Pro simulator
    DEVICE_ID=$(xcrun simctl list devices available -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    for d in devices:
        if 'iPhone 16 Pro' in d['name'] and d['isAvailable']:
            print(d['udid'])
            sys.exit(0)
# Fallback to any iPhone 16
for runtime, devices in data['devices'].items():
    for d in devices:
        if 'iPhone 16' in d['name'] and d['isAvailable']:
            print(d['udid'])
            sys.exit(0)
# Fallback to any available iPhone
for runtime, devices in data['devices'].items():
    for d in devices:
        if 'iPhone' in d['name'] and d['isAvailable']:
            print(d['udid'])
            sys.exit(0)
sys.exit(1)
" 2>/dev/null)
    
    if [[ -z "$DEVICE_ID" ]]; then
        log_error "No suitable iOS simulator found"
        exit 1
    fi
    
    export SIMULATOR_UDID="$DEVICE_ID"
    log "Using iOS Simulator: $DEVICE_ID"
    
    # Boot simulator
    xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
    sleep 5
    
    # Install app
    APP_PATH=$(find "$MOBILE_APP_DIR/ios/build/Build/Products/Release-iphonesimulator" -name "*.app" -type d | head -1)
    if [[ -n "$APP_PATH" ]]; then
        log "Installing app: $APP_PATH"
        xcrun simctl install "$DEVICE_ID" "$APP_PATH"
        log_success "App installed on simulator"
    else
        log_error "App bundle not found"
        exit 1
    fi
}

setup_android_device() {
    log "Setting up Android device..."
    
    # Check for connected devices
    if ! adb devices | grep -q "device$"; then
        log_error "No Android devices found. Connect a device or start an emulator."
        exit 1
    fi
    
    # Install APK
    APK_PATH=$(find "$MOBILE_APP_DIR/android/app/build/outputs/apk/release" -name "*.apk" | head -1)
    if [[ -n "$APK_PATH" ]]; then
        log "Installing APK: $APK_PATH"
        adb install -r "$APK_PATH"
        log_success "APK installed on device"
    else
        log_error "APK not found"
        exit 1
    fi
}

# Get test files for suite
get_test_files() {
    local suite="$1"
    local test_files=()
    
    case "$suite" in
        smoke)
            test_files=("${SMOKE_TESTS[@]}")
            ;;
        full)
            test_files=("${SMOKE_TESTS[@]}" "${CRITICAL_TESTS[@]}" "${DASHBOARD_TESTS[@]}" "${FEATURE_TESTS[@]}")
            ;;
        regression)
            test_files=("${SMOKE_TESTS[@]}" "${CRITICAL_TESTS[@]}" "${DASHBOARD_TESTS[@]}" "${FEATURE_TESTS[@]}" "${ACCOUNT_TESTS[@]}")
            ;;
        *)
            log_error "Unknown test suite: $suite"
            exit 1
            ;;
    esac
    
    # Filter to only include files that exist
    local existing_files=()
    for test_file in "${test_files[@]}"; do
        if [[ -f "$MAESTRO_FLOWS_DIR/$test_file" ]]; then
            existing_files+=("$test_file")
        else
            log_warning "Test file not found: $test_file"
        fi
    done
    
    printf '%s\n' "${existing_files[@]}"
}

# Run single test
run_single_test() {
    local test_file="$1"
    local test_name="${test_file%.yaml}"
    local output_file="$OUTPUT_DIR/${test_name}_$(date +%s)"
    
    log "Running test: $test_name"
    
    # Launch app before test
    if [[ "$PLATFORM" == "ios" ]]; then
        xcrun simctl launch "$SIMULATOR_UDID" "$MAESTRO_APP_ID" || true
    elif [[ "$PLATFORM" == "android" ]]; then
        adb shell am start -n "$MAESTRO_APP_ID/.MainActivity" || true
    fi
    
    sleep 3
    
    # Run Maestro test
    local start_time=$(date +%s)
    local exit_code=0
    
    if maestro test "$MAESTRO_FLOWS_DIR/$test_file" \
        --env "MAESTRO_APP_ID=$MAESTRO_APP_ID" \
        --output "$output_file" > "${output_file}.log" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "Test passed: $test_name (${duration}s)"
        echo "PASS,$test_name,$duration" >> "$OUTPUT_DIR/results.csv"
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_error "Test failed: $test_name (${duration}s)"
        echo "FAIL,$test_name,$duration" >> "$OUTPUT_DIR/results.csv"
        exit_code=1
        
        # Save failure details
        if [[ -f "${output_file}.log" ]]; then
            cp "${output_file}.log" "$OUTPUT_DIR/failures/${test_name}_failure.log"
        fi
    fi
    
    return $exit_code
}

# Run tests
run_tests() {
    log "Running $SUITE test suite..."
    
    # Initialize results tracking
    echo "Status,Test,Duration" > "$OUTPUT_DIR/results.csv"
    mkdir -p "$OUTPUT_DIR/failures"
    
    local test_files
    readarray -t test_files < <(get_test_files "$SUITE")
    
    log "Found ${#test_files[@]} tests to run"
    
    local total_tests=${#test_files[@]}
    local passed_tests=0
    local failed_tests=0
    local failed_test_names=()
    
    # Run tests sequentially (parallel option for future)
    for test_file in "${test_files[@]}"; do
        if run_single_test "$test_file"; then
            ((passed_tests++))
        else
            ((failed_tests++))
            failed_test_names+=("${test_file%.yaml}")
        fi
        
        # Short pause between tests
        sleep 2
    done
    
    # Retry failed tests if requested
    if [[ "$RETRY_FAILED" == "true" && ${#failed_test_names[@]} -gt 0 ]]; then
        log "Retrying ${#failed_test_names[@]} failed tests..."
        local retry_passed=0
        
        for test_name in "${failed_test_names[@]}"; do
            if run_single_test "${test_name}.yaml"; then
                ((retry_passed++))
                ((passed_tests++))
                ((failed_tests--))
            fi
        done
        
        log "Retry results: $retry_passed tests now passing"
    fi
    
    # Generate summary
    generate_test_report "$total_tests" "$passed_tests" "$failed_tests"
    
    # Return non-zero if any tests failed
    [[ $failed_tests -eq 0 ]]
}

# Generate test report
generate_test_report() {
    local total_tests="$1"
    local passed_tests="$2"
    local failed_tests="$3"
    local success_rate=$((passed_tests * 100 / total_tests))
    
    local report_file="$OUTPUT_DIR/test_report.json"
    local summary_file="$OUTPUT_DIR/test_summary.txt"
    
    # JSON report
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "platform": "$PLATFORM",
  "device_type": "$DEVICE_TYPE",
  "test_suite": "$SUITE",
  "environment": "$ENVIRONMENT",
  "summary": {
    "total_tests": $total_tests,
    "passed_tests": $passed_tests,
    "failed_tests": $failed_tests,
    "success_rate": $success_rate
  },
  "configuration": {
    "app_id": "$MAESTRO_APP_ID",
    "aws_profile": "$AWS_PROFILE",
    "retry_failed": $RETRY_FAILED,
    "parallel": $PARALLEL
  }
}
EOF
    
    # Human-readable summary
    cat > "$summary_file" << EOF
MapYourHealth E2E Test Results
==============================
Date: $(date)
Platform: $PLATFORM ($DEVICE_TYPE)
Suite: $SUITE
Environment: $ENVIRONMENT

Results Summary:
- Total Tests: $total_tests
- Passed: $passed_tests
- Failed: $failed_tests
- Success Rate: $success_rate%

App Configuration:
- Bundle ID: $MAESTRO_APP_ID
- AWS Profile: $AWS_PROFILE
- Retry Failed: $RETRY_FAILED

Test Details:
$(cat "$OUTPUT_DIR/results.csv" | column -t -s ',')

Output Directory: $OUTPUT_DIR
EOF
    
    # Display summary
    echo
    log_success "Test execution completed!"
    echo
    cat "$summary_file"
    
    if [[ "$failed_tests" -gt 0 ]]; then
        echo
        log_warning "Failed test logs available in: $OUTPUT_DIR/failures/"
    fi
}

# Cleanup
cleanup() {
    log "Performing cleanup..."
    
    if [[ "$PLATFORM" == "ios" && -n "${SIMULATOR_UDID:-}" ]]; then
        xcrun simctl shutdown "$SIMULATOR_UDID" 2>/dev/null || true
    fi
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    trap cleanup EXIT
    
    log "MapYourHealth E2E Test Runner v1.0"
    
    parse_args "$@"
    validate_prerequisites
    setup_environment
    sync_amplify_outputs
    build_application
    setup_device
    run_tests
}

# Run main function with all arguments
main "$@"