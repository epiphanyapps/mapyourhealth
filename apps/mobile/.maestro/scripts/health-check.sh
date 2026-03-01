#!/bin/bash

# MapYourHealth E2E Testing System Health Check
# Validates the entire testing infrastructure and reports status
# Author: Claude (MapYourHealth AI Agent)
# Version: 1.0.0

set -euo pipefail

# ========================================
# Configuration
# ========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
MOBILE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAESTRO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Health Check Configuration
CHECK_TIMEOUT=30
VERBOSE=false
OUTPUT_FORMAT="console"  # console, json, markdown

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Health Check Results
HEALTH_RESULTS=()
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# ========================================
# Utility Functions
# ========================================

log() {
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    fi
}

log_success() {
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo -e "${GREEN}✅ $1${NC}"
    fi
}

log_warning() {
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo -e "${YELLOW}⚠️ $1${NC}"
    fi
}

log_error() {
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo -e "${RED}❌ $1${NC}"
    fi
}

log_section() {
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        echo -e "\n${PURPLE}========================================${NC}"
        echo -e "${PURPLE}$1${NC}"
        echo -e "${PURPLE}========================================${NC}\n"
    fi
}

# ========================================
# Health Check Infrastructure
# ========================================

record_check() {
    local name="$1"
    local status="$2"  # pass, fail, warn
    local message="$3"
    local details="${4:-}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $status in
        "pass") PASSED_CHECKS=$((PASSED_CHECKS + 1)) ;;
        "fail") FAILED_CHECKS=$((FAILED_CHECKS + 1)) ;;
        "warn") WARNING_CHECKS=$((WARNING_CHECKS + 1)) ;;
    esac
    
    local result=$(cat << EOF
{
  "name": "$name",
  "status": "$status",
  "message": "$message",
  "details": "$details",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
}
EOF
)
    
    HEALTH_RESULTS+=("$result")
    
    # Console output
    case $status in
        "pass") log_success "$name: $message" ;;
        "fail") log_error "$name: $message" ;;
        "warn") log_warning "$name: $message" ;;
    esac
    
    if [ "$VERBOSE" = true ] && [ -n "$details" ]; then
        echo "  Details: $details"
    fi
}

# ========================================
# System Health Checks
# ========================================

check_system_requirements() {
    log_section "🖥️ System Requirements"
    
    # Check operating system
    local os_info=$(uname -a)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        record_check "Operating System" "pass" "macOS detected" "$os_info"
    else
        record_check "Operating System" "warn" "Non-macOS system detected" "$os_info"
    fi
    
    # Check available disk space
    local disk_usage=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 90 ]; then
        record_check "Disk Space" "pass" "Sufficient disk space ($disk_usage% used)"
    elif [ "$disk_usage" -lt 95 ]; then
        record_check "Disk Space" "warn" "Disk space running low ($disk_usage% used)"
    else
        record_check "Disk Space" "fail" "Disk space critical ($disk_usage% used)"
    fi
    
    # Check available memory
    if command -v vm_stat >/dev/null; then
        local memory_pressure=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        if [ "$memory_pressure" -gt 100000 ]; then
            record_check "Memory" "pass" "Sufficient memory available"
        else
            record_check "Memory" "warn" "Low memory detected"
        fi
    else
        record_check "Memory" "warn" "Unable to check memory status"
    fi
}

check_required_tools() {
    log_section "🛠️ Required Tools"
    
    local tools=(
        "node:Node.js"
        "yarn:Yarn package manager"
        "maestro:Maestro testing framework"
        "xcrun:Xcode command line tools"
        "adb:Android Debug Bridge"
        "aws:AWS CLI"
        "jq:JSON processor"
        "curl:HTTP client"
    )
    
    for tool_spec in "${tools[@]}"; do
        local tool_cmd=$(echo "$tool_spec" | cut -d: -f1)
        local tool_name=$(echo "$tool_spec" | cut -d: -f2)
        
        if command -v "$tool_cmd" >/dev/null 2>&1; then
            local version=$($tool_cmd --version 2>/dev/null | head -1 || echo "version unknown")
            record_check "$tool_name" "pass" "Available" "$version"
        else
            record_check "$tool_name" "fail" "Not found" "Please install $tool_name"
        fi
    done
    
    # Check PATH configuration for Maestro
    if [[ ":$PATH:" == *":$HOME/.maestro/bin:"* ]]; then
        record_check "Maestro PATH" "pass" "Maestro is in PATH"
    else
        record_check "Maestro PATH" "warn" "Maestro may not be in PATH" "Add ~/.maestro/bin to PATH"
    fi
}

check_project_structure() {
    log_section "📁 Project Structure"
    
    local required_paths=(
        "$PROJECT_ROOT:Project root directory"
        "$MOBILE_ROOT:Mobile app directory"
        "$MAESTRO_ROOT:Maestro test directory"
        "$MAESTRO_ROOT/flows:Test flows directory"
        "$MAESTRO_ROOT/scripts:Orchestration scripts"
        "$MAESTRO_ROOT/config:Configuration directory"
    )
    
    for path_spec in "${required_paths[@]}"; do
        local path=$(echo "$path_spec" | cut -d: -f1)
        local name=$(echo "$path_spec" | cut -d: -f2)
        
        if [ -d "$path" ]; then
            local item_count=$(ls -1 "$path" 2>/dev/null | wc -l)
            record_check "$name" "pass" "Directory exists" "$item_count items"
        else
            record_check "$name" "fail" "Directory missing" "$path"
        fi
    done
    
    # Check for test files
    local test_count=$(find "$MAESTRO_ROOT/flows" -name "E2E-*.yaml" -type f 2>/dev/null | wc -l)
    if [ "$test_count" -gt 0 ]; then
        record_check "Test Files" "pass" "$test_count test files found"
    else
        record_check "Test Files" "fail" "No test files found"
    fi
}

check_orchestration_scripts() {
    log_section "🎭 Orchestration Scripts"
    
    local scripts=(
        "test-orchestrator.sh:Main test orchestrator"
        "setup-test-env.sh:Environment setup script"  
        "test-monitor.sh:Test monitoring script"
        "deploy-validation.sh:Deployment validation script"
        "health-check.sh:Health check script (this script)"
    )
    
    for script_spec in "${scripts[@]}"; do
        local script_name=$(echo "$script_spec" | cut -d: -f1)
        local script_desc=$(echo "$script_spec" | cut -d: -f2)
        local script_path="$SCRIPT_DIR/$script_name"
        
        if [ -f "$script_path" ]; then
            if [ -x "$script_path" ]; then
                record_check "$script_desc" "pass" "Script exists and is executable"
            else
                record_check "$script_desc" "warn" "Script exists but not executable" "Run: chmod +x $script_path"
            fi
        else
            record_check "$script_desc" "fail" "Script missing" "$script_path"
        fi
    done
}

check_node_environment() {
    log_section "🟢 Node.js Environment"
    
    cd "$PROJECT_ROOT"
    
    # Check Node.js version
    if command -v node >/dev/null; then
        local node_version=$(node --version)
        local node_major=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)
        
        if [ "$node_major" -ge 18 ]; then
            record_check "Node.js Version" "pass" "Version $node_version"
        else
            record_check "Node.js Version" "warn" "Old version $node_version" "Recommend Node 18+"
        fi
    fi
    
    # Check if dependencies are installed
    if [ -d "node_modules" ]; then
        record_check "Dependencies" "pass" "Node modules installed"
    else
        record_check "Dependencies" "fail" "Dependencies not installed" "Run: yarn install"
    fi
    
    # Check Yarn configuration
    if [ -f ".yarnrc.yml" ]; then
        record_check "Yarn Configuration" "pass" "Yarn configured"
    else
        record_check "Yarn Configuration" "warn" "Yarn configuration missing"
    fi
}

check_aws_configuration() {
    log_section "☁️ AWS Configuration"
    
    # Check AWS CLI
    if command -v aws >/dev/null; then
        local aws_version=$(aws --version 2>&1 | head -1)
        record_check "AWS CLI" "pass" "Available" "$aws_version"
        
        # Check rayane profile
        if aws configure list-profiles | grep -q "rayane"; then
            if aws sts get-caller-identity --profile rayane >/dev/null 2>&1; then
                local account_id=$(aws sts get-caller-identity --profile rayane --query 'Account' --output text)
                record_check "AWS rayane Profile" "pass" "Profile accessible" "Account: $account_id"
            else
                record_check "AWS rayane Profile" "fail" "Profile not accessible" "Check credentials"
            fi
        else
            record_check "AWS rayane Profile" "fail" "Profile not configured" "Run: aws configure --profile rayane"
        fi
    else
        record_check "AWS CLI" "fail" "AWS CLI not installed"
    fi
    
    # Check Amplify outputs
    if [ -f "$MOBILE_ROOT/amplify_outputs.json" ]; then
        if jq . "$MOBILE_ROOT/amplify_outputs.json" >/dev/null 2>&1; then
            record_check "Amplify Outputs" "pass" "Configuration file valid"
        else
            record_check "Amplify Outputs" "fail" "Configuration file invalid JSON"
        fi
    else
        record_check "Amplify Outputs" "warn" "Configuration file missing" "Run environment setup"
    fi
}

check_ios_environment() {
    log_section "📱 iOS Environment"
    
    # Check Xcode
    if command -v xcodebuild >/dev/null; then
        local xcode_version=$(xcodebuild -version | head -1)
        record_check "Xcode" "pass" "Available" "$xcode_version"
        
        # Check simulators
        local simulator_count=$(xcrun simctl list devices available -j | jq -r '.devices | to_entries[] | select(.key | contains("iOS-17") or contains("iOS-18")) | .value[] | select(.isAvailable) | .name' | grep -c "iPhone" || echo "0")
        
        if [ "$simulator_count" -gt 0 ]; then
            record_check "iOS Simulators" "pass" "$simulator_count simulators available"
        else
            record_check "iOS Simulators" "fail" "No iOS simulators available"
        fi
        
        # Check CocoaPods
        if command -v pod >/dev/null; then
            local pod_version=$(pod --version)
            record_check "CocoaPods" "pass" "Available" "Version $pod_version"
        else
            record_check "CocoaPods" "warn" "CocoaPods not found" "May be needed for iOS builds"
        fi
    else
        record_check "Xcode" "fail" "Xcode command line tools not found"
    fi
}

check_android_environment() {
    log_section "🤖 Android Environment"
    
    # Check ADB
    if command -v adb >/dev/null; then
        local adb_version=$(adb version | head -1)
        record_check "ADB" "pass" "Available" "$adb_version"
        
        # Check connected devices
        local device_count=$(adb devices | grep -c "device$" || echo "0")
        if [ "$device_count" -gt 0 ]; then
            local devices=$(adb devices | grep "device$" | awk '{print $1}' | tr '\n' ',' | sed 's/,$//')
            record_check "Android Devices" "pass" "$device_count device(s) connected" "Devices: $devices"
        else
            record_check "Android Devices" "warn" "No Android devices connected" "Connect device or start emulator"
        fi
    else
        record_check "ADB" "fail" "Android Debug Bridge not found"
    fi
}

check_ai_queue_integration() {
    log_section "🤖 AI Queue Integration"
    
    local ai_queue_url="http://192.168.1.227:3001"
    
    # Check AI Queue availability
    if curl -f -s --max-time 5 "$ai_queue_url/health" >/dev/null 2>&1; then
        record_check "AI Queue Service" "pass" "Service is accessible"
        
        # Check specific endpoints
        if curl -f -s --max-time 5 "$ai_queue_url/api/status" >/dev/null 2>&1; then
            record_check "AI Queue API" "pass" "API endpoints responding"
        else
            record_check "AI Queue API" "warn" "API endpoints may not be fully functional"
        fi
    else
        record_check "AI Queue Service" "warn" "Service not accessible" "Check if AI queue dashboard is running"
    fi
}

check_github_actions() {
    log_section "🔄 GitHub Actions Configuration"
    
    local workflows_dir="$PROJECT_ROOT/.github/workflows"
    
    if [ -d "$workflows_dir" ]; then
        local workflow_count=$(find "$workflows_dir" -name "*.yml" -o -name "*.yaml" | wc -l)
        record_check "Workflows Directory" "pass" "$workflow_count workflow files found"
        
        # Check for specific workflows
        local required_workflows=(
            "e2e-orchestrated.yml:E2E Orchestrated Testing"
            "e2e-tests.yml:Legacy E2E Tests"
            "backend-ci.yml:Backend CI"
        )
        
        for workflow_spec in "${required_workflows[@]}"; do
            local workflow_file=$(echo "$workflow_spec" | cut -d: -f1)
            local workflow_name=$(echo "$workflow_spec" | cut -d: -f2)
            
            if [ -f "$workflows_dir/$workflow_file" ]; then
                record_check "$workflow_name" "pass" "Workflow file exists"
            else
                record_check "$workflow_name" "warn" "Workflow file missing" "$workflow_file"
            fi
        done
    else
        record_check "GitHub Actions" "fail" "Workflows directory missing"
    fi
}

# ========================================
# Test Execution Health Check
# ========================================

check_test_execution() {
    log_section "🧪 Test Execution Health"
    
    # Check if we can validate the orchestrator
    if timeout "$CHECK_TIMEOUT" "$SCRIPT_DIR/test-orchestrator.sh" validate >/dev/null 2>&1; then
        record_check "Test Orchestrator" "pass" "Validation passed"
    else
        record_check "Test Orchestrator" "fail" "Validation failed" "Check orchestrator logs"
    fi
    
    # Check test categories
    if timeout "$CHECK_TIMEOUT" "$SCRIPT_DIR/test-orchestrator.sh" categories >/dev/null 2>&1; then
        record_check "Test Categories" "pass" "Categories accessible"
    else
        record_check "Test Categories" "fail" "Cannot load test categories"
    fi
    
    # Check recent test results
    local results_dir="$MAESTRO_ROOT/results"
    if [ -d "$results_dir" ]; then
        local recent_results=$(find "$results_dir" -name "test_report.json" -mtime -7 | wc -l)
        if [ "$recent_results" -gt 0 ]; then
            record_check "Recent Test Results" "pass" "$recent_results test runs in last 7 days"
        else
            record_check "Recent Test Results" "warn" "No recent test results found"
        fi
    else
        record_check "Test Results Directory" "warn" "Results directory not found"
    fi
}

# ========================================
# Output Generation
# ========================================

generate_health_report() {
    case "$OUTPUT_FORMAT" in
        "json")
            generate_json_report
            ;;
        "markdown")
            generate_markdown_report
            ;;
        "console"|*)
            generate_console_report
            ;;
    esac
}

generate_console_report() {
    log_section "📊 Health Check Summary"
    
    local status="HEALTHY"
    local status_color="$GREEN"
    
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        status="UNHEALTHY"
        status_color="$RED"
    elif [ "$WARNING_CHECKS" -gt 0 ]; then
        status="DEGRADED"
        status_color="$YELLOW"
    fi
    
    echo -e "${status_color}Overall Status: $status${NC}"
    echo ""
    echo "Summary:"
    echo "  ✅ Passed: $PASSED_CHECKS"
    echo "  ⚠️  Warnings: $WARNING_CHECKS"
    echo "  ❌ Failed: $FAILED_CHECKS"
    echo "  📊 Total: $TOTAL_CHECKS"
    
    local success_rate=$(awk "BEGIN {printf \"%.1f\", $PASSED_CHECKS * 100.0 / $TOTAL_CHECKS}")
    echo "  📈 Success Rate: $success_rate%"
    
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        echo ""
        echo "❌ Failed Checks:"
        for result in "${HEALTH_RESULTS[@]}"; do
            local status=$(echo "$result" | jq -r '.status')
            if [ "$status" = "fail" ]; then
                local name=$(echo "$result" | jq -r '.name')
                local message=$(echo "$result" | jq -r '.message')
                echo "  • $name: $message"
            fi
        done
    fi
    
    if [ "$WARNING_CHECKS" -gt 0 ]; then
        echo ""
        echo "⚠️ Warnings:"
        for result in "${HEALTH_RESULTS[@]}"; do
            local status=$(echo "$result" | jq -r '.status')
            if [ "$status" = "warn" ]; then
                local name=$(echo "$result" | jq -r '.name')
                local message=$(echo "$result" | jq -r '.message')
                echo "  • $name: $message"
            fi
        done
    fi
}

generate_json_report() {
    local overall_status="healthy"
    [ "$FAILED_CHECKS" -gt 0 ] && overall_status="unhealthy"
    [ "$FAILED_CHECKS" -eq 0 ] && [ "$WARNING_CHECKS" -gt 0 ] && overall_status="degraded"
    
    local success_rate=$(awk "BEGIN {printf \"%.2f\", $PASSED_CHECKS * 100.0 / $TOTAL_CHECKS}")
    
    cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "overall_status": "$overall_status",
  "summary": {
    "total_checks": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "warnings": $WARNING_CHECKS,
    "failed": $FAILED_CHECKS,
    "success_rate": $success_rate
  },
  "checks": [$(IFS=','; echo "${HEALTH_RESULTS[*]}")],
  "system_info": {
    "hostname": "$(hostname)",
    "os": "$(uname -s)",
    "arch": "$(uname -m)",
    "timestamp": "$(date)"
  }
}
EOF
}

generate_markdown_report() {
    local status="🟢 HEALTHY"
    [ "$FAILED_CHECKS" -gt 0 ] && status="🔴 UNHEALTHY"
    [ "$FAILED_CHECKS" -eq 0 ] && [ "$WARNING_CHECKS" -gt 0 ] && status="🟡 DEGRADED"
    
    local success_rate=$(awk "BEGIN {printf \"%.1f\", $PASSED_CHECKS * 100.0 / $TOTAL_CHECKS}")
    
    cat << EOF
# MapYourHealth E2E Testing System Health Report

**Generated:** $(date)  
**Overall Status:** $status  
**Success Rate:** $success_rate%

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Passed | $PASSED_CHECKS | $(awk "BEGIN {printf \"%.1f\", $PASSED_CHECKS * 100.0 / $TOTAL_CHECKS}")% |
| ⚠️ Warnings | $WARNING_CHECKS | $(awk "BEGIN {printf \"%.1f\", $WARNING_CHECKS * 100.0 / $TOTAL_CHECKS}")% |
| ❌ Failed | $FAILED_CHECKS | $(awk "BEGIN {printf \"%.1f\", $FAILED_CHECKS * 100.0 / $TOTAL_CHECKS}")% |
| **Total** | $TOTAL_CHECKS | 100% |

## Detailed Results

EOF

    for result in "${HEALTH_RESULTS[@]}"; do
        local name=$(echo "$result" | jq -r '.name')
        local status=$(echo "$result" | jq -r '.status')
        local message=$(echo "$result" | jq -r '.message')
        local details=$(echo "$result" | jq -r '.details')
        
        local icon="✅"
        [ "$status" = "warn" ] && icon="⚠️"
        [ "$status" = "fail" ] && icon="❌"
        
        echo "### $icon $name"
        echo "**Status:** $message"
        if [ "$details" != "null" ] && [ -n "$details" ]; then
            echo "**Details:** $details"
        fi
        echo ""
    done
}

# ========================================
# Usage & Main Function
# ========================================

show_usage() {
    cat << EOF
MapYourHealth E2E Testing System Health Check v1.0.0

Usage: $0 [OPTIONS]

Options:
  --verbose             Show detailed information
  --output FORMAT       Output format: console (default), json, markdown
  --timeout SECONDS     Timeout for individual checks (default: 30)
  --help               Show this help message

Examples:
  $0                           # Basic health check
  $0 --verbose                 # Detailed health check
  $0 --output json             # JSON format output
  $0 --output markdown > report.md  # Generate markdown report

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --timeout)
            CHECK_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
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
    if [ "$OUTPUT_FORMAT" = "console" ]; then
        log_section "🏥 MapYourHealth E2E Testing System Health Check v1.0.0"
        log "Starting comprehensive health check..."
    fi
    
    # Run all health checks
    check_system_requirements
    check_required_tools
    check_project_structure
    check_orchestration_scripts
    check_node_environment
    check_aws_configuration
    check_ios_environment
    check_android_environment
    check_ai_queue_integration
    check_github_actions
    check_test_execution
    
    # Generate report
    generate_health_report
    
    # Exit with appropriate code
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        exit 1
    elif [ "$WARNING_CHECKS" -gt 0 ]; then
        exit 2
    else
        exit 0
    fi
}

# Execute main function
main "$@"