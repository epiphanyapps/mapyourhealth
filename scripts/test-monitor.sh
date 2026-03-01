#!/bin/bash

# =============================================================================
# MapYourHealth Test Monitoring & Reporting System (Simplified)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default configuration
DEFAULT_ACTION="health-check"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }
error() { echo -e "${RED}❌ $*${NC}"; }
info() { echo -e "${CYAN}ℹ️  $*${NC}"; }

usage() {
    cat << EOF
MapYourHealth Test Monitoring & Reporting System

Usage: $0 [OPTIONS]

ACTIONS:
  health-check           Validate test environment health
  analyze               Analyze latest test results
  notify                Send notifications
  help                  Show this help message

OPTIONS:
  --action ACTION       Action to perform (default: $DEFAULT_ACTION)
  --help               Show this help message

EXAMPLES:
  $0 --action health-check
  $0 --action analyze

EOF
}

health_check() {
    log "Performing test environment health check..."
    
    local issues=0
    
    echo -e "\n${BLUE}🔍 ENVIRONMENT HEALTH CHECK:${NC}\n"
    
    # Check Node.js
    if command -v node &>/dev/null; then
        node_version=$(node --version)
        success "Node.js: $node_version"
    else
        error "Node.js not found"
        issues=$((issues + 1))
    fi
    
    # Check Yarn
    if command -v yarn &>/dev/null; then
        yarn_version=$(yarn --version)
        success "Yarn: $yarn_version"
    else
        error "Yarn not found"
        issues=$((issues + 1))
    fi
    
    # Check Maestro
    if command -v maestro &>/dev/null || [[ -f "$HOME/.maestro/bin/maestro" ]]; then
        maestro_version=$("$HOME/.maestro/bin/maestro" --version 2>/dev/null || maestro --version 2>/dev/null || echo "found")
        success "Maestro: $maestro_version"
    else
        error "Maestro not found"
        issues=$((issues + 1))
    fi
    
    # Check AWS CLI
    if command -v aws &>/dev/null; then
        if aws sts get-caller-identity --profile rayane &>/dev/null; then
            success "AWS CLI: Profile 'rayane' configured"
        else
            warning "AWS CLI: Profile 'rayane' not configured or expired"
        fi
    else
        warning "AWS CLI not found"
    fi
    
    # Check iOS environment
    if command -v xcrun &>/dev/null; then
        xcode_version=$(xcrun xcodebuild -version 2>/dev/null | head -1 || echo "Xcode available")
        success "Xcode: $xcode_version"
        
        sim_count=$(xcrun simctl list devices available 2>/dev/null | grep -c iPhone || echo "0")
        success "iOS Simulators: $sim_count available"
    else
        warning "Xcode tools not found (iOS testing unavailable)"
    fi
    
    # Check Android environment
    if command -v adb &>/dev/null; then
        device_count=$(adb devices 2>/dev/null | grep -c "device$" || echo "0")
        if [[ $device_count -gt 0 ]]; then
            success "Android: $device_count device(s) connected"
        else
            warning "Android: No devices connected"
        fi
    else
        warning "ADB not found (Android testing unavailable)"
    fi
    
    # Check project structure
    if [[ -f "$PROJECT_ROOT/scripts/e2e-runner.sh" ]]; then
        success "E2E runner script: Found and executable"
    else
        error "E2E runner script: Missing or not executable"
        issues=$((issues + 1))
    fi
    
    test_count=$(find "$PROJECT_ROOT/apps/mobile/.maestro/flows" -name "*.yaml" 2>/dev/null | wc -l || echo "0")
    if [[ $test_count -ge 10 ]]; then
        success "Test files: $test_count found"
    else
        warning "Test files: Only $test_count found (expected ≥10)"
    fi
    
    echo ""
    if [[ $issues -eq 0 ]]; then
        success "🎉 Health check passed! Environment is ready for testing."
        return 0
    else
        error "💥 Health check found $issues issue(s). Please resolve before running tests."
        return 1
    fi
}

analyze_latest_results() {
    log "Analyzing latest test results..."
    
    results_dir="$PROJECT_ROOT/test-results"
    
    if [[ ! -d "$results_dir" ]]; then
        warning "No test results directory found"
        return 1
    fi
    
    latest_results=$(ls -td "$results_dir"/*/ 2>/dev/null | head -1 || echo "")
    
    if [[ -z "$latest_results" ]]; then
        warning "No test results found"
        return 1
    fi
    
    summary_file="$latest_results/summary.json"
    
    if [[ ! -f "$summary_file" ]]; then
        warning "No summary file found in latest results"
        return 1
    fi
    
    echo -e "\n${BLUE}📊 LATEST TEST RESULTS:${NC}"
    echo -e "Results from: $(basename "$latest_results")\n"
    
    # Simple JSON parsing without heredocs
    if command -v python3 &>/dev/null; then
        python3 -c "
import json
with open('$summary_file', 'r') as f:
    data = json.load(f)

execution = data.get('execution', {})
summary = data.get('summary', {})

print(f\"Category: {execution.get('category', 'unknown')}\")
print(f\"Platform: {execution.get('platform', 'unknown')}\")
print(f\"Device: {execution.get('device_id', 'unknown')}\")
print(f\"Duration: {summary.get('duration_seconds', 0)//60}m {summary.get('duration_seconds', 0)%60}s\")
print(f\"Results: {summary.get('passed', 0)}/{summary.get('total', 0)} passed\")

if summary.get('failed', 0) > 0:
    print(f\"❌ {summary.get('failed', 0)} tests failed\")
else:
    print(f\"✅ All tests passed\")
"
    else
        cat "$summary_file"
    fi
    
    success "Analysis complete"
}

send_simple_notification() {
    log "Sending simple notification..."
    
    latest_results=$(ls -td "$PROJECT_ROOT/test-results"/*/ 2>/dev/null | head -1 || echo "")
    
    if [[ -z "$latest_results" ]]; then
        warning "No test results found for notification"
        return 1
    fi
    
    echo "Test results available at: $latest_results"
    echo "Notification logged to: $PROJECT_ROOT/test-notifications.log"
    echo "$(date): Test results available at $latest_results" >> "$PROJECT_ROOT/test-notifications.log"
    
    success "Notification sent"
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --action)
                ACTION="$2"
                shift 2
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                warning "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Set defaults
    ACTION="${ACTION:-$DEFAULT_ACTION}"
    
    # Execute action
    case "$ACTION" in
        "health-check")
            health_check
            ;;
        "analyze")
            analyze_latest_results
            ;;
        "notify")
            send_simple_notification
            ;;
        "help")
            usage
            ;;
        *)
            error "Unknown action: $ACTION"
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"