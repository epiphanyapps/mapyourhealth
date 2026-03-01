#!/bin/bash

# MapYourHealth E2E Test Monitoring & Reporting System
# Provides real-time monitoring, failure analysis, and AI queue integration
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

# AI Queue Configuration
AI_QUEUE_URL="${AI_QUEUE_URL:-http://192.168.1.227:3001}"
AI_QUEUE_TIMEOUT="${AI_QUEUE_TIMEOUT:-10}"

# Monitoring Configuration
MONITOR_INTERVAL="${MONITOR_INTERVAL:-30}"
MAX_LOG_LINES="${MAX_LOG_LINES:-1000}"

# Telegram Configuration (for notifications)
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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
# Test Results Analysis
# ========================================

analyze_test_results() {
    local results_dir="$1"
    
    if [ ! -d "$results_dir" ]; then
        log_error "Results directory not found: $results_dir"
        return 1
    fi
    
    log_section "📊 Analyzing Test Results"
    
    # Load test results
    local test_report="$results_dir/test_report.json"
    local summary_report="$results_dir/test_summary.md"
    
    if [ ! -f "$test_report" ]; then
        log_error "Test report not found: $test_report"
        return 1
    fi
    
    # Extract key metrics
    local total_tests=$(jq -r '.summary.total' "$test_report")
    local passed_tests=$(jq -r '.summary.passed' "$test_report")
    local failed_tests=$(jq -r '.summary.failed' "$test_report")
    local skipped_tests=$(jq -r '.summary.skipped' "$test_report")
    local success_rate=$(jq -r '.summary.success_rate' "$test_report")
    local duration=$(jq -r '.execution.duration' "$test_report")
    
    log "Test Execution Summary:"
    log "  Total Tests: $total_tests"
    log_success "  Passed: $passed_tests"
    if [ "$failed_tests" -gt 0 ]; then
        log_error "  Failed: $failed_tests"
    else
        log "  Failed: $failed_tests"
    fi
    if [ "$skipped_tests" -gt 0 ]; then
        log_warning "  Skipped: $skipped_tests"
    else
        log "  Skipped: $skipped_tests"
    fi
    log "  Success Rate: $success_rate%"
    log "  Duration: ${duration}s"
    
    # Analyze failed tests
    if [ "$failed_tests" -gt 0 ]; then
        analyze_failures "$results_dir"
    fi
    
    # Generate insights
    generate_test_insights "$results_dir"
    
    # Return status based on results
    [ "$failed_tests" -eq 0 ]
}

analyze_failures() {
    local results_dir="$1"
    local test_report="$results_dir/test_report.json"
    
    log_section "🔍 Analyzing Test Failures"
    
    # Get failed tests
    local failed_tests=$(jq -r '.tests[] | select(.status == "FAILED") | .test' "$test_report")
    
    if [ -z "$failed_tests" ]; then
        return 0
    fi
    
    # Analyze each failed test
    echo "$failed_tests" | while IFS= read -r failed_test; do
        if [ -n "$failed_test" ]; then
            analyze_single_failure "$results_dir" "$failed_test"
        fi
    done
    
    # Generate failure summary
    generate_failure_summary "$results_dir"
}

analyze_single_failure() {
    local results_dir="$1"
    local test_name="$2"
    local test_base_name=$(basename "$test_name" .yaml)
    
    log "🔬 Analyzing failure: $test_name"
    
    # Find test output directory
    local test_output_dir="$results_dir/tests/$test_base_name"
    
    if [ ! -d "$test_output_dir" ]; then
        log_warning "  No output directory found for $test_name"
        return 1
    fi
    
    # Look for common failure patterns
    local failure_patterns=(
        "TimeoutException"
        "ElementNotFoundException" 
        "AssertionError"
        "NetworkException"
        "AppCrashException"
        "DeviceDisconnectedException"
    )
    
    local detected_patterns=()
    
    for pattern in "${failure_patterns[@]}"; do
        if find "$test_output_dir" -name "*.log" -exec grep -l "$pattern" {} + 2>/dev/null | head -1 >/dev/null; then
            detected_patterns+=("$pattern")
        fi
    done
    
    if [ ${#detected_patterns[@]} -gt 0 ]; then
        log "  Detected patterns: ${detected_patterns[*]}"
    fi
    
    # Check for screenshots
    local screenshots=$(find "$test_output_dir" -name "*.png" 2>/dev/null | wc -l)
    if [ "$screenshots" -gt 0 ]; then
        log "  Screenshots captured: $screenshots"
    fi
    
    # Extract error context
    extract_error_context "$test_output_dir" "$test_name"
}

extract_error_context() {
    local test_output_dir="$1"
    local test_name="$2"
    
    # Find the most recent log file
    local latest_log=$(find "$test_output_dir" -name "*.log" -type f -exec ls -t {} + | head -1)
    
    if [ -n "$latest_log" ] && [ -f "$latest_log" ]; then
        log "  Error context from $latest_log:"
        
        # Extract last few lines before error
        if grep -n "ERROR\|FAILED\|Exception\|timeout" "$latest_log" | tail -1 | while IFS=: read -r line_num _; do
            if [ -n "$line_num" ]; then
                local start_line=$((line_num - 5))
                [ $start_line -lt 1 ] && start_line=1
                local end_line=$((line_num + 3))
                
                echo "    Context (lines $start_line-$end_line):"
                sed -n "${start_line},${end_line}p" "$latest_log" | sed 's/^/      /'
            fi
        done; then
            :
        else
            # If no specific error pattern, show last few lines
            echo "    Last 5 lines:"
            tail -5 "$latest_log" | sed 's/^/      /'
        fi
    fi
}

generate_failure_summary() {
    local results_dir="$1"
    local test_report="$results_dir/test_report.json"
    local failure_summary="$results_dir/failure_analysis.json"
    
    log "📋 Generating failure summary..."
    
    # Create failure analysis report
    cat > "$failure_summary" << 'EOF'
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "failed_tests": [],
  "common_patterns": {},
  "recommendations": []
}
EOF
    
    # This would be enhanced with more sophisticated analysis
    log_success "Failure analysis saved to: $failure_summary"
}

generate_test_insights() {
    local results_dir="$1"
    local test_report="$results_dir/test_report.json"
    
    log_section "💡 Generating Test Insights"
    
    # Analyze test performance trends
    local avg_duration=$(jq -r '.tests[] | select(.status == "PASSED") | .duration' "$test_report" | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
    local slowest_test=$(jq -r '.tests | max_by(.duration) | .test' "$test_report")
    local fastest_test=$(jq -r '.tests | min_by(.duration) | .test' "$test_report")
    
    log "Performance insights:"
    log "  Average test duration: $(printf "%.1f" "$avg_duration")s"
    log "  Slowest test: $slowest_test"
    log "  Fastest test: $fastest_test"
    
    # Analyze category performance
    local categories=$(jq -r '.categories[]? | .category' "$test_report" 2>/dev/null || echo "")
    if [ -n "$categories" ]; then
        log "Category performance:"
        echo "$categories" | while IFS= read -r category; do
            if [ -n "$category" ]; then
                local cat_passed=$(jq -r --arg cat "$category" '.categories[] | select(.category == $cat) | .summary.passed' "$test_report")
                local cat_total=$(jq -r --arg cat "$category" '.categories[] | select(.category == $cat) | .summary.total' "$test_report")
                local cat_rate=$(awk "BEGIN {printf \"%.1f\", $cat_passed * 100.0 / $cat_total}")
                log "  $category: $cat_passed/$cat_total ($cat_rate%)"
            fi
        done
    fi
}

# ========================================
# Real-time Monitoring
# ========================================

start_test_monitoring() {
    local test_process_id="$1"
    local output_file="$2"
    
    log_section "👀 Starting Real-time Test Monitoring"
    
    log "Monitoring test process: $test_process_id"
    log "Output file: $output_file"
    
    # Create monitoring directory
    local monitor_dir="$MAESTRO_ROOT/monitoring/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$monitor_dir"
    
    # Start monitoring loop
    while kill -0 "$test_process_id" 2>/dev/null; do
        capture_monitoring_snapshot "$monitor_dir"
        sleep "$MONITOR_INTERVAL"
    done
    
    log_success "Test monitoring completed"
    
    # Generate monitoring report
    generate_monitoring_report "$monitor_dir"
}

capture_monitoring_snapshot() {
    local monitor_dir="$1"
    local timestamp=$(date +%s)
    local snapshot_file="$monitor_dir/snapshot_$timestamp.json"
    
    # Capture system metrics
    local cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    local memory_usage=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
    
    # Capture Maestro process info
    local maestro_pid=$(pgrep -f "maestro" || echo "0")
    local maestro_cpu="0"
    local maestro_memory="0"
    
    if [ "$maestro_pid" != "0" ]; then
        maestro_cpu=$(ps -p "$maestro_pid" -o %cpu | tail -1 | awk '{print $1}')
        maestro_memory=$(ps -p "$maestro_pid" -o rss | tail -1 | awk '{print $1}')
    fi
    
    # Create snapshot
    cat > "$snapshot_file" << EOF
{
  "timestamp": $timestamp,
  "system": {
    "cpu_usage": "$cpu_usage",
    "memory_active_pages": "$memory_usage"
  },
  "maestro": {
    "pid": $maestro_pid,
    "cpu_percent": "$maestro_cpu", 
    "memory_kb": "$maestro_memory"
  }
}
EOF
}

generate_monitoring_report() {
    local monitor_dir="$1"
    local report_file="$monitor_dir/monitoring_report.json"
    
    log "📊 Generating monitoring report..."
    
    # Aggregate all snapshots
    local snapshots=$(find "$monitor_dir" -name "snapshot_*.json" | sort)
    local snapshot_count=$(echo "$snapshots" | wc -l)
    
    if [ "$snapshot_count" -eq 0 ]; then
        log_warning "No monitoring snapshots found"
        return 1
    fi
    
    # Calculate averages and trends
    local avg_cpu=$(echo "$snapshots" | xargs cat | jq -r '.maestro.cpu_percent' | awk '{sum+=$1; count++} END {if(count>0) printf "%.2f", sum/count; else print "0"}')
    local max_memory=$(echo "$snapshots" | xargs cat | jq -r '.maestro.memory_kb' | sort -n | tail -1)
    
    cat > "$report_file" << EOF
{
  "monitoring_summary": {
    "duration_minutes": $(awk "BEGIN {print $snapshot_count * $MONITOR_INTERVAL / 60}"),
    "snapshots_collected": $snapshot_count,
    "average_cpu_percent": $avg_cpu,
    "peak_memory_kb": $max_memory
  },
  "snapshots": $(echo "$snapshots" | xargs cat | jq -s '.')
}
EOF
    
    log_success "Monitoring report saved: $report_file"
}

# ========================================
# AI Queue Integration
# ========================================

notify_ai_queue() {
    local notification_type="$1"
    local message="$2"
    local metadata="$3"
    
    if ! curl -f -s --max-time "$AI_QUEUE_TIMEOUT" "$AI_QUEUE_URL/health" >/dev/null 2>&1; then
        log_warning "AI Queue not available - skipping notification"
        return 0
    fi
    
    local payload=$(cat << EOF
{
  "type": "$notification_type",
  "message": "$message", 
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "source": "mapyourhealth-e2e",
  "metadata": $metadata
}
EOF
)
    
    log "🤖 Notifying AI Queue: $notification_type"
    
    if curl -X POST "$AI_QUEUE_URL/api/notifications" \
       -H "Content-Type: application/json" \
       -d "$payload" \
       --max-time "$AI_QUEUE_TIMEOUT" \
       >/dev/null 2>&1; then
        log_success "AI Queue notified successfully"
    else
        log_warning "Failed to notify AI Queue (non-critical)"
    fi
}

send_test_start_notification() {
    local category="$1"
    local platform="$2"
    
    local metadata=$(cat << EOF
{
  "category": "$category",
  "platform": "$platform",
  "app_id": "${MAESTRO_APP_ID}",
  "started_by": "test-orchestrator"
}
EOF
)
    
    notify_ai_queue "e2e_test_started" "E2E tests started for category: $category" "$metadata"
}

send_test_completion_notification() {
    local results_dir="$1"
    
    if [ ! -f "$results_dir/test_report.json" ]; then
        log_warning "No test report found for completion notification"
        return 0
    fi
    
    local test_report="$results_dir/test_report.json"
    local total_tests=$(jq -r '.summary.total' "$test_report")
    local passed_tests=$(jq -r '.summary.passed' "$test_report")
    local failed_tests=$(jq -r '.summary.failed' "$test_report")
    local success_rate=$(jq -r '.summary.success_rate' "$test_report")
    local duration=$(jq -r '.execution.duration' "$test_report")
    
    local status=$([ "$failed_tests" -eq 0 ] && echo "success" || echo "failure")
    local message="E2E tests completed: $passed_tests/$total_tests passed ($success_rate%)"
    
    local metadata=$(cat << EOF
{
  "status": "$status",
  "total_tests": $total_tests,
  "passed_tests": $passed_tests,
  "failed_tests": $failed_tests,
  "success_rate": "$success_rate",
  "duration_seconds": $duration,
  "results_path": "$results_dir"
}
EOF
)
    
    notify_ai_queue "e2e_test_completed" "$message" "$metadata"
}

# ========================================
# Dashboard Generation
# ========================================

generate_dashboard() {
    local results_dir="$1"
    local dashboard_file="$results_dir/dashboard.html"
    
    log_section "📱 Generating Test Dashboard"
    
    if [ ! -f "$results_dir/test_report.json" ]; then
        log_error "Test report not found, cannot generate dashboard"
        return 1
    fi
    
    local test_report="$results_dir/test_report.json"
    local summary_md="$results_dir/test_summary.md"
    
    # Extract key data for dashboard
    local total_tests=$(jq -r '.summary.total' "$test_report")
    local passed_tests=$(jq -r '.summary.passed' "$test_report")
    local failed_tests=$(jq -r '.summary.failed' "$test_report")
    local success_rate=$(jq -r '.summary.success_rate' "$test_report")
    local duration=$(jq -r '.execution.duration' "$test_report")
    local timestamp=$(jq -r '.execution.timestamp' "$test_report")
    
    # Generate HTML dashboard
    cat > "$dashboard_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MapYourHealth E2E Test Results</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
        .stat-card.success { border-left-color: #28a745; }
        .stat-card.danger { border-left-color: #dc3545; }
        .stat-card.warning { border-left-color: #ffc107; }
        .stat-number { font-size: 2.5em; font-weight: bold; margin: 0; }
        .stat-label { color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }
        .content { padding: 30px; }
        .test-list { margin-top: 20px; }
        .test-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #eee; margin-bottom: 10px; border-radius: 6px; }
        .test-item.passed { border-left: 4px solid #28a745; background: #f8fff8; }
        .test-item.failed { border-left: 4px solid #dc3545; background: #fff8f8; }
        .test-item.skipped { border-left: 4px solid #ffc107; background: #fffcf8; }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: bold; text-transform: uppercase; }
        .status-badge.passed { background: #d4edda; color: #155724; }
        .status-badge.failed { background: #f8d7da; color: #721c24; }
        .status-badge.skipped { background: #fff3cd; color: #856404; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 E2E Test Results</h1>
            <p>MapYourHealth v1.0 • Generated $(date)</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">$total_tests</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card success">
                <div class="stat-number">$passed_tests</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-number">$failed_tests</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$success_rate%</div>
                <div class="stat-label">Success Rate</div>
            </div>
        </div>
        
        <div class="content">
            <h2>Test Execution Details</h2>
            <p><strong>Execution Time:</strong> ${duration}s</p>
            <p><strong>Timestamp:</strong> $timestamp</p>
            
            <h3>Test Results</h3>
            <div class="test-list">
EOF
    
    # Add test results to dashboard
    jq -r '.tests[] | "\(.test)|\(.status)|\(.duration)"' "$test_report" | while IFS="|" read -r test status duration; do
        local status_class=$(echo "$status" | tr '[:upper:]' '[:lower:]')
        cat >> "$dashboard_file" << EOF
                <div class="test-item $status_class">
                    <span><strong>$test</strong></span>
                    <div>
                        <span class="status-badge $status_class">$status</span>
                        <span style="margin-left: 10px; color: #666;">$(printf "%.1f" "$duration")s</span>
                    </div>
                </div>
EOF
    done
    
    # Close HTML
    cat >> "$dashboard_file" << EOF
            </div>
        </div>
    </div>
</body>
</html>
EOF
    
    log_success "Dashboard generated: $dashboard_file"
    
    # Try to open dashboard in browser (macOS)
    if command -v open >/dev/null 2>&1; then
        log "Opening dashboard in browser..."
        open "$dashboard_file"
    fi
}

# ========================================
# Usage & Main Function
# ========================================

show_usage() {
    cat << EOF
MapYourHealth E2E Test Monitor v1.0.0

Usage: $0 [OPTIONS] <COMMAND> [ARGS]

Commands:
  analyze RESULTS_DIR     Analyze test results from directory
  monitor PID OUTPUT      Monitor running test process
  dashboard RESULTS_DIR   Generate HTML dashboard
  notify TYPE MESSAGE     Send AI queue notification
  
Options:
  --ai-queue-url URL      AI Queue endpoint (default: http://192.168.1.227:3001)
  --monitor-interval SEC  Monitoring interval in seconds (default: 30)
  --help                  Show this help message

Examples:
  $0 analyze /path/to/results           # Analyze test results
  $0 monitor 12345 /path/to/output.log  # Monitor test process  
  $0 dashboard /path/to/results         # Generate dashboard
  $0 notify test_completed "Tests done" # Send notification

EOF
}

# Parse command line arguments  
COMMAND=""
ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --ai-queue-url)
            AI_QUEUE_URL="$2"
            shift 2
            ;;
        --monitor-interval)
            MONITOR_INTERVAL="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        analyze|monitor|dashboard|notify)
            COMMAND="$1"
            shift
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

# Main execution
main() {
    case "$COMMAND" in
        "analyze")
            if [ ${#ARGS[@]} -lt 1 ]; then
                log_error "Results directory required for analyze command"
                show_usage
                exit 1
            fi
            analyze_test_results "${ARGS[0]}"
            ;;
            
        "monitor")
            if [ ${#ARGS[@]} -lt 2 ]; then
                log_error "PID and output file required for monitor command"
                show_usage
                exit 1
            fi
            start_test_monitoring "${ARGS[0]}" "${ARGS[1]}"
            ;;
            
        "dashboard")
            if [ ${#ARGS[@]} -lt 1 ]; then
                log_error "Results directory required for dashboard command"
                show_usage
                exit 1
            fi
            generate_dashboard "${ARGS[0]}"
            ;;
            
        "notify")
            if [ ${#ARGS[@]} -lt 2 ]; then
                log_error "Notification type and message required"
                show_usage
                exit 1
            fi
            notify_ai_queue "${ARGS[0]}" "${ARGS[1]}" "{}"
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