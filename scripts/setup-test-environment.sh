#!/bin/bash

# =============================================================================
# MapYourHealth Test Environment Setup
# =============================================================================
#
# This script sets up consistent test environments for E2E testing across
# different platforms and CI/CD systems.
#
# Usage:
#   ./scripts/setup-test-environment.sh --platform ios --environment ci
#   ./scripts/setup-test-environment.sh --platform android --environment local
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default configuration
DEFAULT_PLATFORM="ios"
DEFAULT_ENVIRONMENT="local"
DEFAULT_BUILD_TYPE="release"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }
error() { echo -e "${RED}❌ $*${NC}"; }

usage() {
    cat << EOF
MapYourHealth Test Environment Setup

Usage: $0 [OPTIONS]

OPTIONS:
  --platform PLATFORM      Target platform: ios, android (default: $DEFAULT_PLATFORM)
  --environment ENV         Environment: local, ci (default: $DEFAULT_ENVIRONMENT)
  --build-type TYPE         Build type: debug, release (default: $DEFAULT_BUILD_TYPE)
  --clean                   Clean previous builds and dependencies
  --help                    Show this help message

ENVIRONMENTS:
  local:  Developer workstation setup
  ci:     Continuous integration setup (GitHub Actions)

EOF
}

# =============================================================================
# Environment Setup Functions
# =============================================================================

setup_nodejs_environment() {
    log "Setting up Node.js environment..."
    
    cd "$PROJECT_ROOT"
    
    # Check Node.js version
    local node_version
    node_version=$(node --version 2>/dev/null || echo "not found")
    log "Node.js version: $node_version"
    
    if [[ "$node_version" == "not found" ]]; then
        error "Node.js not found. Please install Node.js 20+"
        exit 1
    fi
    
    # Enable Corepack for Yarn
    corepack enable
    
    # Install dependencies
    log "Installing project dependencies..."
    yarn install --immutable
    
    success "Node.js environment ready"
}

setup_aws_environment() {
    log "Setting up AWS environment..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found. Please install AWS CLI v2"
        exit 1
    fi
    
    # Set AWS profile for backend connection
    export AWS_PROFILE=rayane
    export AWS_REGION=ca-central-1
    
    # Validate AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        warning "AWS credentials not configured for profile 'rayane'"
        log "Please run: aws configure sso --profile rayane"
    else
        local aws_identity
        aws_identity=$(aws sts get-caller-identity --query 'Account' --output text)
        log "AWS Account: $aws_identity (Profile: rayane)"
    fi
    
    success "AWS environment configured"
}

sync_amplify_outputs() {
    log "Syncing Amplify outputs..."
    
    cd "$PROJECT_ROOT"
    
    # Generate Amplify outputs for backend connectivity
    if command -v ampx &>/dev/null; then
        AWS_PROFILE=rayane AWS_REGION=ca-central-1 yarn sync:amplify || {
            warning "Amplify sync failed, using fallback configuration"
            create_amplify_stub
        }
    else
        warning "Amplify CLI not found, creating stub configuration"
        create_amplify_stub
    fi
    
    success "Amplify outputs synchronized"
}

create_amplify_stub() {
    log "Creating Amplify stub configuration for CI..."
    
    local stub_config='{
  "version": "1",
  "auth": {
    "aws_region": "ca-central-1",
    "user_pool_id": "ca-central-1_test",
    "user_pool_client_id": "test-client",
    "identity_pool_id": "ca-central-1:test-identity"
  },
  "data": {
    "url": "https://test.appsync-api.ca-central-1.amazonaws.com/graphql",
    "aws_region": "ca-central-1", 
    "default_authorization_type": "API_KEY",
    "api_key": "da2-test-key"
  }
}'
    
    echo "$stub_config" > apps/mobile/amplify_outputs.json
    echo "$stub_config" > amplify_outputs.json
    
    log "Amplify stub configuration created"
}

# =============================================================================
# Platform-Specific Setup
# =============================================================================

setup_ios_environment() {
    log "Setting up iOS test environment..."
    
    # Check Xcode installation
    if ! command -v xcrun &> /dev/null; then
        error "Xcode command line tools not found"
        error "Install with: xcode-select --install"
        exit 1
    fi
    
    local xcode_version
    xcode_version=$(xcrun xcodebuild -version | head -1)
    log "Xcode: $xcode_version"
    
    # Check available simulators
    log "Available iOS Simulators:"
    xcrun simctl list devices available | grep iPhone | head -5
    
    # Setup preferred simulator
    local preferred_sim
    preferred_sim=$(xcrun simctl list devices available -j | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for runtime, devices in data['devices'].items():
        for d in devices:
            if 'iPhone 16 Pro' in d['name'] and d['isAvailable']:
                print(d['udid'])
                sys.exit(0)
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
    
    if [[ -n "$preferred_sim" ]]; then
        export IOS_SIMULATOR_UDID="$preferred_sim"
        log "Preferred iOS Simulator: $preferred_sim"
    else
        warning "No suitable iOS simulator found"
    fi
    
    success "iOS environment ready"
}

setup_android_environment() {
    log "Setting up Android test environment..."
    
    # Check ADB installation
    if ! command -v adb &> /dev/null; then
        error "ADB not found. Install Android SDK Platform-Tools"
        exit 1
    fi
    
    # Check Java installation
    if [[ -z "${JAVA_HOME:-}" ]]; then
        if [[ -d "/usr/local/opt/openjdk@17/libexec/openjdk.jdk" ]]; then
            export JAVA_HOME="/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
            export PATH="/usr/local/opt/openjdk@17/bin:$PATH"
            log "Using Java: $JAVA_HOME"
        else
            error "JAVA_HOME not set. Install OpenJDK 17"
            exit 1
        fi
    fi
    
    # List connected devices
    log "Connected Android devices:"
    adb devices
    
    # Check for test device
    local test_device="ZL73232GKP"
    if adb devices | grep -q "$test_device"; then
        export ANDROID_DEVICE_ID="$test_device"
        log "Using test device: $test_device"
        
        # Verify device connectivity
        if adb -s "$test_device" shell echo "test" &>/dev/null; then
            success "Device $test_device is responsive"
        else
            warning "Device $test_device not responsive"
        fi
    else
        warning "Preferred test device $test_device not found"
        
        # Use first available device
        local first_device
        first_device=$(adb devices | grep -v "List of devices" | grep "device$" | head -1 | awk '{print $1}')
        if [[ -n "$first_device" ]]; then
            export ANDROID_DEVICE_ID="$first_device"
            log "Using alternative device: $first_device"
        fi
    fi
    
    success "Android environment ready"
}

# =============================================================================
# Test Tool Setup
# =============================================================================

setup_maestro() {
    log "Setting up Maestro..."
    
    # Check if Maestro is installed
    if ! command -v maestro &> /dev/null; then
        if [[ -f "$HOME/.maestro/bin/maestro" ]]; then
            export PATH="$HOME/.maestro/bin:$PATH"
            log "Found Maestro at $HOME/.maestro/bin"
        else
            log "Installing Maestro..."
            curl -Ls "https://get.maestro.mobile.dev" | bash
            export PATH="$HOME/.maestro/bin:$PATH"
        fi
    fi
    
    # Verify installation
    local maestro_version
    maestro_version=$(maestro --version 2>/dev/null || echo "unknown")
    log "Maestro version: $maestro_version"
    
    # Set Maestro environment variables
    export MAESTRO_APP_ID="com.epiphanyapps.mapyourhealth"
    export MAESTRO_DRIVER_STARTUP_TIMEOUT="120000"
    
    success "Maestro ready"
}

# =============================================================================
# Build Preparation
# =============================================================================

prepare_mobile_build() {
    log "Preparing mobile app build..."
    
    cd "$PROJECT_ROOT/apps/mobile"
    
    # Clean previous build if requested
    if [[ "${CLEAN_BUILD:-false}" == "true" ]]; then
        log "Cleaning previous builds..."
        
        case "$PLATFORM" in
            "ios")
                rm -rf ios/build ios/DerivedData
                npx expo prebuild --platform ios --clean
                ;;
            "android")
                rm -rf android/app/build android/build
                npx expo prebuild --platform android --clean
                ;;
        esac
    fi
    
    # Generate native projects
    log "Generating native project for $PLATFORM..."
    case "$PLATFORM" in
        "ios")
            npx expo prebuild --platform ios
            cd ios && pod install --repo-update
            ;;
        "android")
            npx expo prebuild --platform android
            ;;
    esac
    
    success "Mobile build preparation complete"
}

# =============================================================================
# Configuration Validation
# =============================================================================

validate_configuration() {
    log "Validating test configuration..."
    
    # Check required files
    local required_files=(
        "$PROJECT_ROOT/package.json"
        "$PROJECT_ROOT/apps/mobile/.maestro/flows"
        "$PROJECT_ROOT/scripts/e2e-runner.sh"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -e "$file" ]]; then
            error "Required file/directory missing: $file"
            exit 1
        fi
    done
    
    # Validate Maestro test files
    local test_count
    test_count=$(find "$PROJECT_ROOT/apps/mobile/.maestro/flows" -name "*.yaml" | wc -l)
    log "Found $test_count Maestro test files"
    
    if [[ $test_count -lt 10 ]]; then
        warning "Expected at least 10 test files, found $test_count"
    fi
    
    # Check test runner executable
    if [[ ! -x "$PROJECT_ROOT/scripts/e2e-runner.sh" ]]; then
        warning "Test runner not executable, fixing..."
        chmod +x "$PROJECT_ROOT/scripts/e2e-runner.sh"
    fi
    
    success "Configuration validation complete"
}

create_environment_summary() {
    log "Creating environment summary..."
    
    local summary_file="$PROJECT_ROOT/test-environment-summary.json"
    
    cat > "$summary_file" << EOF
{
  "setup": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "platform": "$PLATFORM",
    "environment": "$ENVIRONMENT",
    "build_type": "$BUILD_TYPE"
  },
  "tools": {
    "node_version": "$(node --version 2>/dev/null || echo 'not found')",
    "yarn_version": "$(yarn --version 2>/dev/null || echo 'not found')",
    "maestro_version": "$(maestro --version 2>/dev/null || echo 'not found')",
    "aws_cli_version": "$(aws --version 2>/dev/null || echo 'not found')"
  },
  "platform_specific": {
    "ios_simulator_udid": "${IOS_SIMULATOR_UDID:-}",
    "android_device_id": "${ANDROID_DEVICE_ID:-}",
    "xcode_version": "$(xcrun xcodebuild -version 2>/dev/null | head -1 || echo 'not found')",
    "java_home": "${JAVA_HOME:-}"
  },
  "aws": {
    "profile": "${AWS_PROFILE:-}",
    "region": "${AWS_REGION:-}"
  }
}
EOF
    
    log "Environment summary saved: $summary_file"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --platform)
                PLATFORM="$2"
                shift 2
                ;;
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --build-type)
                BUILD_TYPE="$2"
                shift 2
                ;;
            --clean)
                CLEAN_BUILD=true
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
    PLATFORM="${PLATFORM:-$DEFAULT_PLATFORM}"
    ENVIRONMENT="${ENVIRONMENT:-$DEFAULT_ENVIRONMENT}"
    BUILD_TYPE="${BUILD_TYPE:-$DEFAULT_BUILD_TYPE}"
    
    log "Setting up MapYourHealth test environment..."
    log "Platform: $PLATFORM | Environment: $ENVIRONMENT | Build: $BUILD_TYPE"
    
    # Execute setup steps
    setup_nodejs_environment
    setup_aws_environment
    sync_amplify_outputs
    
    case "$PLATFORM" in
        "ios")
            setup_ios_environment
            ;;
        "android")
            setup_android_environment
            ;;
        *)
            error "Unsupported platform: $PLATFORM"
            exit 1
            ;;
    esac
    
    setup_maestro
    validate_configuration
    
    if [[ "$BUILD_TYPE" == "release" ]] || [[ "$ENVIRONMENT" == "ci" ]]; then
        prepare_mobile_build
    fi
    
    create_environment_summary
    
    success "🎉 Test environment setup complete!"
    log "Ready to run: ./scripts/e2e-runner.sh --platform $PLATFORM"
}

# Run main function
main "$@"