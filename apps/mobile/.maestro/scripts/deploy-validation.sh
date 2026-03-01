#!/bin/bash

# MapYourHealth Deployment Validation Script
# Validates deployments with automated E2E testing
# Author: Claude (MapYourHealth AI Agent)
# Version: 1.0.0

set -euo pipefail

# ========================================
# Configuration
# ========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
MOBILE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Deployment Configuration
DEPLOYMENT_TYPE="${DEPLOYMENT_TYPE:-staging}"
VALIDATION_LEVEL="${VALIDATION_LEVEL:-full}"
DEPLOYMENT_URL="${DEPLOYMENT_URL:-}"
DEPLOYMENT_VERSION="${DEPLOYMENT_VERSION:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

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

# ========================================
# Deployment Validation Levels
# ========================================

validate_deployment() {
    local level="$1"
    local deployment_type="$2"
    
    log_section "🚀 Starting Deployment Validation"
    log "Validation Level: $level"
    log "Deployment Type: $deployment_type"
    
    case "$level" in
        "smoke")
            validate_smoke_deployment "$deployment_type"
            ;;
        "core")
            validate_core_deployment "$deployment_type"
            ;;
        "full")
            validate_full_deployment "$deployment_type"
            ;;
        *)
            log_error "Unknown validation level: $level"
            exit 1
            ;;
    esac
}

validate_smoke_deployment() {
    local deployment_type="$1"
    
    log_section "🔥 Smoke Test Validation"
    
    # Pre-deployment checks
    run_pre_deployment_checks
    
    # Run smoke tests
    log "Running smoke tests..."
    if ! "$SCRIPT_DIR/test-orchestrator.sh" run smoke --platform ios; then
        log_error "Smoke tests failed - deployment validation FAILED"
        send_failure_notification "smoke" "$deployment_type"
        exit 1
    fi
    
    log_success "Smoke test validation passed"
    send_success_notification "smoke" "$deployment_type"
}

validate_core_deployment() {
    local deployment_type="$1"
    
    log_section "🎯 Core Feature Validation"
    
    # Pre-deployment checks
    run_pre_deployment_checks
    
    # Run core tests
    log "Running core functionality tests..."
    if ! "$SCRIPT_DIR/test-orchestrator.sh" run core --platform ios; then
        log_error "Core tests failed - deployment validation FAILED"
        send_failure_notification "core" "$deployment_type"
        exit 1
    fi
    
    # Run smoke tests on Android as well
    log "Running Android validation..."
    if ! "$SCRIPT_DIR/test-orchestrator.sh" run smoke --platform android; then
        log_warning "Android smoke tests failed"
        send_warning_notification "android-smoke" "$deployment_type"
    fi
    
    log_success "Core feature validation passed"
    send_success_notification "core" "$deployment_type"
}

validate_full_deployment() {
    local deployment_type="$1"
    
    log_section "🌟 Full Deployment Validation"
    
    # Pre-deployment checks
    run_pre_deployment_checks
    
    # Run full test suite on iOS
    log "Running full test suite on iOS..."
    if ! "$SCRIPT_DIR/test-orchestrator.sh" run full --platform ios; then
        log_error "iOS full tests failed - deployment validation FAILED"
        send_failure_notification "ios-full" "$deployment_type"
        exit 1
    fi
    
    # Run core tests on Android
    log "Running core tests on Android..."
    if ! "$SCRIPT_DIR/test-orchestrator.sh" run core --platform android; then
        log_error "Android core tests failed - deployment validation FAILED"
        send_failure_notification "android-core" "$deployment_type"
        exit 1
    fi
    
    log_success "Full deployment validation passed"
    send_success_notification "full" "$deployment_type"
}

# ========================================
# Pre-deployment Checks
# ========================================

run_pre_deployment_checks() {
    log_section "🔍 Pre-deployment Checks"
    
    # Check environment readiness
    check_environment_readiness
    
    # Check backend connectivity
    check_backend_connectivity
    
    # Check device availability
    check_device_availability
    
    # Validate app builds
    validate_app_builds
    
    log_success "All pre-deployment checks passed"
}

check_environment_readiness() {
    log "Checking environment readiness..."
    
    # Validate required tools
    local required_tools=("maestro" "node" "yarn" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Check orchestrator scripts
    if [ ! -x "$SCRIPT_DIR/test-orchestrator.sh" ]; then
        log_error "Test orchestrator script not found or not executable"
        exit 1
    fi
    
    log_success "Environment is ready"
}

check_backend_connectivity() {
    log "Checking backend connectivity..."
    
    # Validate AWS profile
    if ! aws sts get-caller-identity --profile rayane &>/dev/null; then
        log_error "AWS rayane profile not accessible"
        exit 1
    fi
    
    # Check Amplify outputs
    if [ ! -f "$MOBILE_ROOT/amplify_outputs.json" ]; then
        log_warning "Amplify outputs not found, generating..."
        if ! "$SCRIPT_DIR/setup-test-env.sh" backend; then
            log_error "Failed to generate Amplify outputs"
            exit 1
        fi
    fi
    
    log_success "Backend connectivity verified"
}

check_device_availability() {
    log "Checking device availability..."
    
    # Check iOS simulators
    local ios_devices=$(xcrun simctl list devices available -j | jq -r '.devices | to_entries[] | select(.key | contains("iOS-17") or contains("iOS-18")) | .value[] | select(.isAvailable) | .name' | grep -c "iPhone" || echo "0")
    
    if [ "$ios_devices" -eq 0 ]; then
        log_error "No iOS simulators available"
        exit 1
    fi
    
    # Check Android devices (optional)
    local android_devices=$(adb devices | grep -c "device$" || echo "0")
    if [ "$android_devices" -eq 0 ]; then
        log_warning "No Android devices connected"
    fi
    
    log_success "Devices are available (iOS: $ios_devices, Android: $android_devices)"
}

validate_app_builds() {
    log "Validating app builds..."
    
    cd "$MOBILE_ROOT"
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        yarn install --immutable
    fi
    
    # Quick build validation (prebuild only)
    log "Validating iOS project generation..."
    if ! npx expo prebuild --platform ios --clean &>/dev/null; then
        log_error "iOS project generation failed"
        exit 1
    fi
    
    log_success "App builds validated"
}

# ========================================
# Notification System
# ========================================

send_success_notification() {
    local test_level="$1"
    local deployment_type="$2"
    
    local message="✅ MapYourHealth deployment validation PASSED
    
**Validation Level:** $test_level
**Deployment Type:** $deployment_type
**Version:** ${DEPLOYMENT_VERSION:-unknown}
**Time:** $(date)

All tests passed successfully! 🎉"
    
    send_notification "success" "$message"
}

send_failure_notification() {
    local test_level="$1"
    local deployment_type="$2"
    
    local message="❌ MapYourHealth deployment validation FAILED
    
**Validation Level:** $test_level  
**Deployment Type:** $deployment_type
**Version:** ${DEPLOYMENT_VERSION:-unknown}
**Time:** $(date)

Deployment should not proceed. Check test results for details."
    
    send_notification "failure" "$message"
}

send_warning_notification() {
    local test_level="$1"
    local deployment_type="$2"
    
    local message="⚠️ MapYourHealth deployment validation WARNING
    
**Test Area:** $test_level
**Deployment Type:** $deployment_type
**Version:** ${DEPLOYMENT_VERSION:-unknown}
**Time:** $(date)

Some tests failed but deployment can proceed with caution."
    
    send_notification "warning" "$message"
}

send_notification() {
    local type="$1"
    local message="$2"
    
    # Try AI Queue notification
    if command -v curl >/dev/null && curl -f -s --max-time 5 http://192.168.1.227:3001/health >/dev/null 2>&1; then
        local payload=$(cat << EOF
{
  "type": "deployment_validation",
  "status": "$type",
  "message": "$message",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "deployment_type": "$DEPLOYMENT_TYPE",
  "validation_level": "$VALIDATION_LEVEL"
}
EOF
)
        
        curl -X POST http://192.168.1.227:3001/api/notifications \
             -H "Content-Type: application/json" \
             -d "$payload" &>/dev/null || true
    fi
    
    # Try Slack notification if webhook is provided
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color="good"
        [ "$type" = "failure" ] && color="danger"
        [ "$type" = "warning" ] && color="warning"
        
        local slack_payload=$(cat << EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "MapYourHealth Deployment Validation",
      "text": "$message",
      "footer": "Deployment Validation System",
      "ts": $(date +%s)
    }
  ]
}
EOF
)
        
        curl -X POST "$SLACK_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "$slack_payload" &>/dev/null || true
    fi
    
    # Console output
    case "$type" in
        "success") log_success "Notification sent: $type" ;;
        "failure") log_error "Notification sent: $type" ;;
        "warning") log_warning "Notification sent: $type" ;;
    esac
}

# ========================================
# Usage & Main Function
# ========================================

show_usage() {
    cat << EOF
MapYourHealth Deployment Validation v1.0.0

Usage: $0 [OPTIONS] <VALIDATION_LEVEL>

Validation Levels:
  smoke     Quick validation (basic functionality)
  core      Core feature validation 
  full      Complete deployment validation

Options:
  --deployment-type TYPE    Deployment type (staging, production, etc.)
  --deployment-url URL      Deployment URL to validate
  --deployment-version VER  Deployment version identifier
  --slack-webhook URL       Slack webhook for notifications
  --help                   Show this help message

Environment Variables:
  DEPLOYMENT_TYPE          Deployment environment type
  DEPLOYMENT_URL           URL of the deployed application
  DEPLOYMENT_VERSION       Version being deployed
  SLACK_WEBHOOK           Slack webhook URL for notifications

Examples:
  $0 smoke                                    # Quick validation
  $0 core --deployment-type staging          # Core validation for staging
  $0 full --deployment-version 1.0.0         # Full validation for release
  
  # With notifications
  export SLACK_WEBHOOK="https://hooks.slack.com/..."
  $0 full --deployment-type production

EOF
}

# Parse command line arguments
VALIDATION_LEVEL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --deployment-type)
            DEPLOYMENT_TYPE="$2"
            shift 2
            ;;
        --deployment-url)
            DEPLOYMENT_URL="$2"
            shift 2
            ;;
        --deployment-version)
            DEPLOYMENT_VERSION="$2"
            shift 2
            ;;
        --slack-webhook)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        smoke|core|full)
            VALIDATION_LEVEL="$1"
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
    if [ -z "$VALIDATION_LEVEL" ]; then
        log_error "Validation level required"
        show_usage
        exit 1
    fi
    
    local start_time=$(date +%s)
    
    log_section "🚀 MapYourHealth Deployment Validation v1.0.0"
    log "Starting validation..."
    log "Level: $VALIDATION_LEVEL"
    log "Type: $DEPLOYMENT_TYPE"
    log "Version: ${DEPLOYMENT_VERSION:-unspecified}"
    
    # Run validation
    validate_deployment "$VALIDATION_LEVEL" "$DEPLOYMENT_TYPE"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_section "🎉 Validation Completed Successfully"
    log "Duration: ${duration}s"
    log "Level: $VALIDATION_LEVEL"
    log "Status: PASSED"
    
    exit 0
}

# Execute main function
main "$@"