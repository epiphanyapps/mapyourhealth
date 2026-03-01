#!/bin/bash

# MapYourHealth E2E Test Orchestration System
# Comprehensive test runner for MapYourHealth v1.0 E2E validation
# Author: Claude (MapYourHealth AI Agent)
# Version: 1.0.0

set -euo pipefail

# ========================================
# Configuration & Environment
# ========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
MOBILE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAESTRO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FLOWS_DIR="$MAESTRO_ROOT/flows"

# Test Configuration
MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.epiphanyapps.mapyourhealth}"
TEST_TIMEOUT="${TEST_TIMEOUT:-300}"
RETRY_ATTEMPTS="${RETRY_ATTEMPTS:-2}"
DEVICE_ID="${DEVICE_ID:-}"
PLATFORM="${PLATFORM:-ios}"
BUILD_TYPE="${BUILD_TYPE:-release}"
AWS_PROFILE="${AWS_PROFILE:-rayane}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test Results
RESULTS_DIR="$MAESTRO_ROOT/results/$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="$RESULTS_DIR/test_report.json"
SUMMARY_FILE="$RESULTS_DIR/test_summary.md"

# ========================================
# Utility Functions
# ========================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo -e "\n${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}\n"
}

cleanup() {
    log "🧹 Cleaning up..."
    if [ "$PLATFORM" = "ios" ] && [ -n "$SIMULATOR_UDID" ]; then
        xcrun simctl shutdown "$SIMULATOR_UDID" 2>/dev/null || true
        log "iOS Simulator shut down"
    fi
    if [ "$PLATFORM" = "android" ] && [ -n "$DEVICE_ID" ]; then
        adb -s "$DEVICE_ID" shell am force-stop "$MAESTRO_APP_ID" 2>/dev/null || true
        log "Android app stopped"
    fi
}

trap cleanup EXIT

# ========================================
# Test Categories & Configuration
# ========================================

# Test categories with their flows
declare -A TEST_CATEGORIES=(
    ["smoke"]="E2E-100-basic-app-launch.yaml E2E-101-basic-navigation.yaml E2E-102-search-functionality.yaml"
    ["core"]="E2E-001-subscription-flow.yaml E2E-002-search-validation.yaml E2E-005-dashboard-accordion.yaml"
    ["features"]="E2E-003-category-reorganization.yaml E2E-004-external-links.yaml E2E-006-risk-factors-display.yaml E2E-007-location-granularity.yaml"
    ["advanced"]="E2E-009-autocomplete-selection.yaml E2E-010-accordion-subitem-selection.yaml"
    ["account"]="E2E-121-signup-only.yaml E2E-121-account-deletion-automated.yaml E2E-121-testid-validation.yaml"
    ["full"]="" # Will be populated with all tests
)

# Populate full test category
all_tests=""
for category in "${!TEST_CATEGORIES[@]}"; do
    if [ "$category" != "full" ]; then
        all_tests="$all_tests ${TEST_CATEGORIES[$category]}"
    fi
done
TEST_CATEGORIES["full"]="$all_tests"

# ========================================
# Test Discovery & Validation
# ========================================

discover_tests() {
    log_section "🔍 Discovering Test Files"
    
    if [ ! -d "$FLOWS_DIR" ]; then
        log_error "Flows directory not found: $FLOWS_DIR"
        exit 1
    fi
    
    local available_tests=$(find "$FLOWS_DIR" -name "E2E-*.yaml" -type f | sort)
    local test_count=$(echo "$available_tests" | wc -l)
    
    log_success "Found $test_count E2E test files:"
    echo "$available_tests" | while read -r test; do
        echo "  • $(basename "$test")"
    done
    
    # Validate test files exist
    local missing_tests=""
    for category in "${!TEST_CATEGORIES[@]}"; do
        for test_file in ${TEST_CATEGORIES[$category]}; do
            if [ ! -f "$FLOWS_DIR/$test_file" ]; then
                missing_tests="$missing_tests\n  • $test_file (category: $category)"
            fi
        done
    done
    
    if [ -n "$missing_tests" ]; then
        log_warning "Missing test files:$missing_tests"
    fi
}

# ========================================
# Environment Setup
# ========================================

setup_environment() {
    log_section "⚙️ Setting Up Test Environment"
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Validate required tools
    local required_tools=("maestro" "node" "yarn")
    if [ "$PLATFORM" = "ios" ]; then
        required_tools+=("xcrun" "xcodebuild")
    elif [ "$PLATFORM" = "android" ]; then
        required_tools+=("adb")
    fi
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    log_success "All required tools are available"
    
    # Set up Maestro environment
    export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}"
    export PATH="$HOME/.maestro/bin:$PATH"
    
    # Validate AWS profile for backend connection
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &>/dev/null; then
        log_warning "AWS profile '$AWS_PROFILE' not configured or accessible"
        log "Tests may fail if backend connectivity is required"
    else
        log_success "AWS profile '$AWS_PROFILE' is configured"
    fi
}

setup_amplify_outputs() {
    log_section "🔗 Setting Up Backend Configuration"
    
    cd "$PROJECT_ROOT"
    
    # Try to sync amplify outputs
    if command -v ampx &> /dev/null; then
        log "Syncing Amplify outputs..."
        AWS_PROFILE="$AWS_PROFILE" AWS_REGION=ca-central-1 \
            npx ampx generate outputs \
            --stack amplify-d3jl0ykn4qgj9r-main-branch-2192fdff47 \
            --out-dir "$MOBILE_ROOT" \
            --format json \
            --profile "$AWS_PROFILE" 2>/dev/null || {
            log_warning "Could not sync Amplify outputs - using stub"
            create_amplify_stub
        }
    else
        log_warning "ampx not available - creating stub"
        create_amplify_stub
    fi
    
    if [ -f "$MOBILE_ROOT/amplify_outputs.json" ]; then
        log_success "Backend configuration ready"
    else
        log_error "Backend configuration failed"
        exit 1
    fi
}

create_amplify_stub() {
    local stub='{
  "version": "1",
  "auth": {
    "aws_region": "ca-central-1",
    "user_pool_id": "ca-central-1_test",
    "user_pool_client_id": "test",
    "identity_pool_id": "ca-central-1:test"
  },
  "data": {
    "url": "https://test.appsync-api.ca-central-1.amazonaws.com/graphql",
    "aws_region": "ca-central-1", 
    "default_authorization_type": "API_KEY",
    "api_key": "da2-test"
  }
}'
    echo "$stub" > "$MOBILE_ROOT/amplify_outputs.json"
    log "Created Amplify outputs stub"
}

# ========================================
# App Building & Installation
# ========================================

build_app() {
    log_section "🏗️ Building Application"
    
    cd "$MOBILE_ROOT"
    
    # Install dependencies
    log "Installing dependencies..."
    yarn install --immutable
    
    # Generate native projects
    log "Generating native project..."
    npx expo prebuild --platform "$PLATFORM" --clean
    
    if [ "$PLATFORM" = "ios" ]; then
        build_ios_app
    elif [ "$PLATFORM" = "android" ]; then
        build_android_app
    fi
}

build_ios_app() {
    log "Building iOS app for simulator..."
    
    cd "$MOBILE_ROOT/ios"
    pod install --repo-update
    
    # Determine workspace and scheme
    local workspace=$(ls -d *.xcworkspace | head -1)
    local scheme=$(echo "$workspace" | sed 's/.xcworkspace//')
    
    # Build for simulator
    xcodebuild \
        -workspace "$workspace" \
        -scheme "$scheme" \
        -sdk iphonesimulator \
        -configuration "$([[ "$BUILD_TYPE" == "release" ]] && echo "Release" || echo "Debug")" \
        -derivedDataPath build \
        -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=latest' \
        CODE_SIGNING_ALLOWED=NO \
        | xcbeautify 2>/dev/null || \
    xcodebuild \
        -workspace "$workspace" \
        -scheme "$scheme" \
        -sdk iphonesimulator \
        -configuration "$([[ "$BUILD_TYPE" == "release" ]] && echo "Release" || echo "Debug")" \
        -derivedDataPath build \
        -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=latest' \
        CODE_SIGNING_ALLOWED=NO
    
    log_success "iOS app built successfully"
}

build_android_app() {
    log "Building Android app..."
    
    cd "$MOBILE_ROOT/android"
    
    if [ "$BUILD_TYPE" = "release" ]; then
        ./gradlew assembleRelease
        APK_PATH="app/build/outputs/apk/release/app-release.apk"
    else
        ./gradlew assembleDebug
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    fi
    
    log_success "Android app built successfully: $APK_PATH"
}

# ========================================
# Device/Simulator Management
# ========================================

setup_ios_simulator() {
    log_section "📱 Setting Up iOS Simulator"
    
    # Find or create iPhone 16 Pro simulator
    local device_id=$(xcrun simctl list devices available -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    if 'iOS-18' in runtime or 'iOS-17' in runtime:
        for d in devices:
            if 'iPhone 16 Pro' in d['name'] and d['isAvailable']:
                print(d['udid'])
                sys.exit(0)
# fallback: any available iPhone 16
for runtime, devices in data['devices'].items():
    if 'iOS-18' in runtime or 'iOS-17' in runtime:
        for d in devices:
            if 'iPhone 16' in d['name'] and d['isAvailable']:
                print(d['udid'])
                sys.exit(0)
sys.exit(1)
")
    
    if [ -z "$device_id" ]; then
        log_error "No suitable iOS simulator found"
        exit 1
    fi
    
    export SIMULATOR_UDID="$device_id"
    log "Using iOS Simulator: $SIMULATOR_UDID"
    
    # Boot simulator
    xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true
    xcrun simctl bootstatus "$SIMULATOR_UDID" -b
    
    log_success "iOS Simulator ready"
}

setup_android_device() {
    log_section "🤖 Setting Up Android Device"
    
    if [ -n "$DEVICE_ID" ]; then
        local device_status=$(adb -s "$DEVICE_ID" get-state 2>/dev/null || echo "offline")
        if [ "$device_status" != "device" ]; then
            log_error "Android device $DEVICE_ID is not available (status: $device_status)"
            exit 1
        fi
    else
        # Find first available device
        DEVICE_ID=$(adb devices | grep -v "List of devices attached" | head -1 | awk '{print $1}')
        if [ -z "$DEVICE_ID" ]; then
            log_error "No Android devices found"
            exit 1
        fi
    fi
    
    log_success "Using Android device: $DEVICE_ID"
    
    # Set up port forwarding for development
    adb -s "$DEVICE_ID" reverse tcp:9090 tcp:9090 || true
    adb -s "$DEVICE_ID" reverse tcp:3000 tcp:3000 || true
    adb -s "$DEVICE_ID" reverse tcp:8081 tcp:8081 || true
}

install_app() {
    log_section "📲 Installing Application"
    
    if [ "$PLATFORM" = "ios" ]; then
        local app_path=$(find "$MOBILE_ROOT/ios/build/Build/Products" -name "*.app" -type d | head -1)
        if [ -z "$app_path" ]; then
            log_error "iOS app not found in build directory"
            exit 1
        fi
        
        xcrun simctl install "$SIMULATOR_UDID" "$app_path"
        log_success "App installed on iOS simulator"
        
    elif [ "$PLATFORM" = "android" ]; then
        local apk_path="$MOBILE_ROOT/android/$APK_PATH"
        if [ ! -f "$apk_path" ]; then
            log_error "Android APK not found: $apk_path"
            exit 1
        fi
        
        adb -s "$DEVICE_ID" install -r "$apk_path"
        log_success "App installed on Android device"
    fi
}

# ========================================
# Test Execution Engine
# ========================================

run_test_category() {
    local category="$1"
    local test_files="${TEST_CATEGORIES[$category]}"
    
    if [ -z "$test_files" ]; then
        log_error "Unknown test category: $category"
        return 1
    fi
    
    log_section "🧪 Running Test Category: $category"
    
    local category_results=()
    local passed=0
    local failed=0
    local skipped=0
    
    for test_file in $test_files; do
        run_single_test "$test_file" "$category"
        local result=$?
        
        case $result in
            0) 
                ((passed++))
                category_results+=("$test_file:PASSED")
                ;;
            1) 
                ((failed++))
                category_results+=("$test_file:FAILED")
                ;;
            2) 
                ((skipped++))
                category_results+=("$test_file:SKIPPED")
                ;;
        esac
    done
    
    # Save category results
    save_category_results "$category" "$passed" "$failed" "$skipped" "${category_results[@]}"
    
    log_section "📊 Category Results: $category"
    log_success "Passed: $passed"
    if [ $failed -gt 0 ]; then
        log_error "Failed: $failed"
    else
        log "Failed: $failed"
    fi
    if [ $skipped -gt 0 ]; then
        log_warning "Skipped: $skipped"
    else
        log "Skipped: $skipped"
    fi
    
    return $failed
}

run_single_test() {
    local test_file="$1"
    local category="$2"
    local test_path="$FLOWS_DIR/$test_file"
    
    if [ ! -f "$test_path" ]; then
        log_warning "Test file not found: $test_file"
        return 2 # skipped
    fi
    
    log "🔬 Running: $test_file"
    
    # Create test-specific results directory
    local test_results_dir="$RESULTS_DIR/tests/$(basename "$test_file" .yaml)"
    mkdir -p "$test_results_dir"
    
    local start_time=$(date +%s)
    local test_status="FAILED"
    local attempt=1
    
    while [ $attempt -le $RETRY_ATTEMPTS ]; do
        log "  Attempt $attempt/$RETRY_ATTEMPTS"
        
        # Launch app before each test
        launch_app
        sleep 3
        
        # Run the test with timeout
        local test_output="$test_results_dir/output_attempt_$attempt.log"
        if timeout "$TEST_TIMEOUT" maestro test \
            --env "MAESTRO_APP_ID=$MAESTRO_APP_ID" \
            --output "$test_results_dir" \
            "$test_path" &> "$test_output"; then
            
            test_status="PASSED"
            log_success "  $test_file PASSED (attempt $attempt)"
            break
        else
            log_error "  $test_file FAILED (attempt $attempt)"
            if [ $attempt -lt $RETRY_ATTEMPTS ]; then
                log "  Retrying..."
                sleep 5
            fi
        fi
        
        ((attempt++))
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Save test result
    save_test_result "$test_file" "$category" "$test_status" "$duration" "$attempt"
    
    case $test_status in
        "PASSED") return 0 ;;
        "FAILED") return 1 ;;
        *) return 2 ;;
    esac
}

launch_app() {
    if [ "$PLATFORM" = "ios" ]; then
        xcrun simctl launch "$SIMULATOR_UDID" "$MAESTRO_APP_ID" >/dev/null 2>&1 || true
    elif [ "$PLATFORM" = "android" ]; then
        adb -s "$DEVICE_ID" shell am start -n "$MAESTRO_APP_ID/.MainActivity" >/dev/null 2>&1 || true
    fi
}

# ========================================
# Results & Reporting
# ========================================

save_test_result() {
    local test_file="$1"
    local category="$2"
    local status="$3"
    local duration="$4"
    local attempts="$5"
    
    local result_json="{
  \"test\": \"$test_file\",
  \"category\": \"$category\", 
  \"status\": \"$status\",
  \"duration\": $duration,
  \"attempts\": $attempts,
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
  \"platform\": \"$PLATFORM\",
  \"build_type\": \"$BUILD_TYPE\"
}"
    
    echo "$result_json" >> "$RESULTS_DIR/test_results.jsonl"
}

save_category_results() {
    local category="$1"
    local passed="$2"
    local failed="$3"
    local skipped="$4"
    shift 4
    local test_results=("$@")
    
    local category_json="{
  \"category\": \"$category\",
  \"summary\": {
    \"passed\": $passed,
    \"failed\": $failed,
    \"skipped\": $skipped,
    \"total\": $((passed + failed + skipped))
  },
  \"tests\": ["
    
    local first=true
    for result in "${test_results[@]}"; do
        local test=$(echo "$result" | cut -d: -f1)
        local status=$(echo "$result" | cut -d: -f2)
        
        if [ "$first" = true ]; then
            first=false
        else
            category_json+=","
        fi
        
        category_json+="
    {\"test\": \"$test\", \"status\": \"$status\"}"
    done
    
    category_json+="
  ],
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"
}"
    
    echo "$category_json" >> "$RESULTS_DIR/category_results.jsonl"
}

generate_final_report() {
    log_section "📋 Generating Test Report"
    
    local total_passed=0
    local total_failed=0
    local total_skipped=0
    local start_time="$1"
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    # Count totals from results
    if [ -f "$RESULTS_DIR/test_results.jsonl" ]; then
        total_passed=$(grep '"status": "PASSED"' "$RESULTS_DIR/test_results.jsonl" | wc -l)
        total_failed=$(grep '"status": "FAILED"' "$RESULTS_DIR/test_results.jsonl" | wc -l)
        total_skipped=$(grep '"status": "SKIPPED"' "$RESULTS_DIR/test_results.jsonl" | wc -l)
    fi
    
    # Generate JSON report
    local report_json="{
  \"execution\": {
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
    \"duration\": $total_duration,
    \"platform\": \"$PLATFORM\",
    \"build_type\": \"$BUILD_TYPE\",
    \"app_id\": \"$MAESTRO_APP_ID\",
    \"retry_attempts\": $RETRY_ATTEMPTS
  },
  \"summary\": {
    \"total\": $((total_passed + total_failed + total_skipped)),
    \"passed\": $total_passed,
    \"failed\": $total_failed,
    \"skipped\": $total_skipped,
    \"success_rate\": $(awk "BEGIN {printf \"%.2f\", $total_passed * 100.0 / ($total_passed + $total_failed)}")
  },
  \"categories\": $(cat "$RESULTS_DIR/category_results.jsonl" 2>/dev/null | jq -s '.' || echo '[]'),
  \"tests\": $(cat "$RESULTS_DIR/test_results.jsonl" 2>/dev/null | jq -s '.' || echo '[]')
}"
    
    echo "$report_json" | jq '.' > "$REPORT_FILE"
    
    # Generate Markdown summary
    generate_markdown_summary "$total_passed" "$total_failed" "$total_skipped" "$total_duration"
    
    log_success "Reports generated:"
    log "  JSON: $REPORT_FILE"
    log "  Markdown: $SUMMARY_FILE"
}

generate_markdown_summary() {
    local passed="$1"
    local failed="$2"
    local skipped="$3"
    local duration="$4"
    
    cat > "$SUMMARY_FILE" << EOF
# MapYourHealth E2E Test Results

**Execution Date:** $(date)  
**Platform:** $PLATFORM  
**Build Type:** $BUILD_TYPE  
**Duration:** ${duration}s  

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Passed | $passed | $(awk "BEGIN {printf \"%.1f\", $passed * 100.0 / ($passed + $failed + $skipped)}")% |
| ❌ Failed | $failed | $(awk "BEGIN {printf \"%.1f\", $failed * 100.0 / ($passed + $failed + $skipped)}")% |
| ⏭️ Skipped | $skipped | $(awk "BEGIN {printf \"%.1f\", $skipped * 100.0 / ($passed + $failed + $skipped)}")% |
| **Total** | $((passed + failed + skipped)) | 100% |

## Test Categories

EOF

    # Add category results if available
    if [ -f "$RESULTS_DIR/category_results.jsonl" ]; then
        while IFS= read -r line; do
            local category=$(echo "$line" | jq -r '.category')
            local cat_passed=$(echo "$line" | jq -r '.summary.passed')
            local cat_failed=$(echo "$line" | jq -r '.summary.failed')
            local cat_skipped=$(echo "$line" | jq -r '.summary.skipped')
            local cat_total=$(echo "$line" | jq -r '.summary.total')
            
            echo "### $category" >> "$SUMMARY_FILE"
            echo "- Passed: $cat_passed/$cat_total" >> "$SUMMARY_FILE"
            echo "- Failed: $cat_failed" >> "$SUMMARY_FILE"
            echo "- Skipped: $cat_skipped" >> "$SUMMARY_FILE"
            echo "" >> "$SUMMARY_FILE"
        done < "$RESULTS_DIR/category_results.jsonl"
    fi
    
    # Add failed tests details
    if [ $failed -gt 0 ]; then
        echo "## Failed Tests" >> "$SUMMARY_FILE"
        echo "" >> "$SUMMARY_FILE"
        
        if [ -f "$RESULTS_DIR/test_results.jsonl" ]; then
            grep '"status": "FAILED"' "$RESULTS_DIR/test_results.jsonl" | while IFS= read -r line; do
                local test=$(echo "$line" | jq -r '.test')
                local category=$(echo "$line" | jq -r '.category')
                local attempts=$(echo "$line" | jq -r '.attempts')
                echo "- **$test** (category: $category, attempts: $attempts)" >> "$SUMMARY_FILE"
            done
        fi
    fi
    
    cat >> "$SUMMARY_FILE" << EOF

## Environment

- **App ID:** $MAESTRO_APP_ID
- **Platform:** $PLATFORM
- **Device:** ${DEVICE_ID:-$SIMULATOR_UDID}
- **Retry Attempts:** $RETRY_ATTEMPTS
- **AWS Profile:** $AWS_PROFILE

---
*Generated by MapYourHealth Test Orchestrator v1.0.0*
EOF
}

# ========================================
# Usage & Main Function
# ========================================

show_usage() {
    cat << EOF
MapYourHealth E2E Test Orchestrator v1.0.0

Usage: $0 [OPTIONS] <COMMAND> [CATEGORY]

Commands:
  run [CATEGORY]    Run tests for specified category (default: smoke)
  list              List all available test files
  categories        Show test categories and their tests
  validate          Validate test environment and files
  clean             Clean up test results and artifacts

Categories:
  smoke            Basic functionality tests (quick validation)
  core             Core application features
  features         Extended feature tests
  advanced         Advanced interaction tests  
  account          User account management tests
  full             All available tests

Options:
  --platform PLATFORM    Target platform: ios (default) or android
  --device-id ID         Specific device/simulator ID to use
  --build-type TYPE      Build type: release (default) or debug
  --retry-attempts N     Number of retry attempts per test (default: 2)
  --timeout SECONDS      Test timeout in seconds (default: 300)
  --aws-profile PROFILE  AWS profile to use (default: rayane)
  --skip-build          Skip app building (use existing installation)
  --skip-install        Skip app installation
  --help                Show this help message

Examples:
  $0 run smoke                    # Run smoke tests on iOS
  $0 run core --platform android # Run core tests on Android
  $0 run full --retry-attempts 3 # Run all tests with 3 retry attempts
  $0 validate                     # Validate environment setup
  $0 categories                   # Show all test categories

Environment Variables:
  MAESTRO_APP_ID     App bundle/package ID (default: com.epiphanyapps.mapyourhealth)
  DEVICE_ID          Device/simulator ID to use
  AWS_PROFILE        AWS profile for backend connection (default: rayane)
  TEST_TIMEOUT       Test timeout in seconds (default: 300)
  RETRY_ATTEMPTS     Retry attempts per test (default: 2)

EOF
}

# Parse command line arguments
COMMAND=""
CATEGORY="smoke"
SKIP_BUILD=false
SKIP_INSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --device-id)
            DEVICE_ID="$2"
            shift 2
            ;;
        --build-type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        --retry-attempts)
            RETRY_ATTEMPTS="$2"
            shift 2
            ;;
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --aws-profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        run|list|categories|validate|clean)
            COMMAND="$1"
            shift
            ;;
        smoke|core|features|advanced|account|full)
            if [ "$COMMAND" = "run" ]; then
                CATEGORY="$1"
            fi
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    local start_time=$(date +%s)
    
    # Show banner
    log_section "🧪 MapYourHealth E2E Test Orchestrator v1.0.0"
    log "Platform: $PLATFORM | Build: $BUILD_TYPE | Category: $CATEGORY"
    log "Results will be saved to: $RESULTS_DIR"
    
    case "$COMMAND" in
        "run")
            if [ -z "${TEST_CATEGORIES[$CATEGORY]:-}" ]; then
                log_error "Unknown test category: $CATEGORY"
                log "Available categories: ${!TEST_CATEGORIES[*]}"
                exit 1
            fi
            
            setup_environment
            discover_tests
            
            if [ "$SKIP_BUILD" = false ]; then
                setup_amplify_outputs
                build_app
            fi
            
            if [ "$PLATFORM" = "ios" ]; then
                setup_ios_simulator
            elif [ "$PLATFORM" = "android" ]; then
                setup_android_device
            fi
            
            if [ "$SKIP_INSTALL" = false ]; then
                install_app
            fi
            
            run_test_category "$CATEGORY"
            local test_exit_code=$?
            
            generate_final_report "$start_time"
            
            # Show final results
            local total_tests=$(grep -c '"test"' "$RESULTS_DIR/test_results.jsonl" 2>/dev/null || echo 0)
            local passed_tests=$(grep -c '"status": "PASSED"' "$RESULTS_DIR/test_results.jsonl" 2>/dev/null || echo 0)
            local failed_tests=$(grep -c '"status": "FAILED"' "$RESULTS_DIR/test_results.jsonl" 2>/dev/null || echo 0)
            
            log_section "🎯 Final Results"
            if [ $failed_tests -eq 0 ]; then
                log_success "All tests passed! ($passed_tests/$total_tests)"
                exit 0
            else
                log_error "$failed_tests tests failed out of $total_tests total"
                exit $test_exit_code
            fi
            ;;
            
        "list")
            discover_tests
            ;;
            
        "categories")
            log_section "📋 Test Categories"
            for category in "${!TEST_CATEGORIES[@]}"; do
                echo -e "${CYAN}$category:${NC}"
                for test in ${TEST_CATEGORIES[$category]}; do
                    echo "  • $test"
                done
                echo
            done
            ;;
            
        "validate")
            setup_environment
            discover_tests
            log_success "Environment validation completed"
            ;;
            
        "clean")
            log_section "🧹 Cleaning Up"
            rm -rf "$MAESTRO_ROOT/results"
            rm -rf "$MOBILE_ROOT/build"
            rm -rf "$MOBILE_ROOT/ios/build"
            rm -rf "$MOBILE_ROOT/android/build"
            log_success "Cleanup completed"
            ;;
            
        "")
            log_error "No command specified"
            show_usage
            exit 1
            ;;
            
        *)
            log_error "Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"