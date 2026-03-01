#!/bin/bash

# MapYourHealth Test Environment Setup
# Configures consistent test environment for E2E testing
# Author: Claude (MapYourHealth AI Agent)
# Version: 1.0.0

set -euo pipefail

# ========================================
# Configuration
# ========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
MOBILE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Environment Configuration
AWS_PROFILE="${AWS_PROFILE:-rayane}"
AWS_REGION="${AWS_REGION:-ca-central-1}"
AMPLIFY_STACK="${AMPLIFY_STACK:-amplify-d3jl0ykn4qgj9r-main-branch-2192fdff47}"
MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.epiphanyapps.mapyourhealth}"

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
# Environment Validation
# ========================================

validate_prerequisites() {
    log_section "🔍 Validating Prerequisites"
    
    local missing_tools=()
    local required_tools=("node" "yarn" "maestro" "aws")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        echo -e "\nInstallation instructions:"
        for tool in "${missing_tools[@]}"; do
            case $tool in
                "maestro")
                    echo "  • Maestro: curl -Ls \"https://get.maestro.mobile.dev\" | bash"
                    ;;
                "aws")
                    echo "  • AWS CLI: brew install awscli"
                    ;;
                "node")
                    echo "  • Node.js: brew install node"
                    ;;
                "yarn")
                    echo "  • Yarn: corepack enable"
                    ;;
            esac
        done
        exit 1
    fi
    
    log_success "All required tools are available"
}

validate_aws_profile() {
    log_section "🔐 Validating AWS Configuration"
    
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &>/dev/null; then
        log_error "AWS profile '$AWS_PROFILE' is not configured or accessible"
        echo -e "\nTo configure AWS profile:"
        echo "  aws configure --profile $AWS_PROFILE"
        echo "  # Enter your AWS credentials for the rayane profile"
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query 'Account' --output text)
    local user_arn=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query 'Arn' --output text)
    
    log_success "AWS profile '$AWS_PROFILE' is valid"
    log "  Account ID: $account_id"
    log "  User: $(echo "$user_arn" | cut -d'/' -f2)"
}

# ========================================
# Dependency Setup
# ========================================

setup_dependencies() {
    log_section "📦 Installing Dependencies"
    
    cd "$PROJECT_ROOT"
    
    log "Installing workspace dependencies..."
    yarn install --immutable
    
    log_success "Dependencies installed successfully"
}

# ========================================
# Backend Configuration
# ========================================

setup_backend_config() {
    log_section "🔗 Setting Up Backend Configuration"
    
    cd "$PROJECT_ROOT"
    
    # Try to generate real amplify outputs
    if command -v ampx &> /dev/null; then
        log "Generating Amplify outputs from AWS..."
        
        if AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" \
           npx ampx generate outputs \
           --stack "$AMPLIFY_STACK" \
           --out-dir "$MOBILE_ROOT" \
           --format json \
           --profile "$AWS_PROFILE"; then
            log_success "Generated Amplify outputs from AWS"
        else
            log_warning "Failed to generate from AWS, creating test configuration"
            create_test_backend_config
        fi
    else
        log_warning "ampx not available, creating test configuration"
        create_test_backend_config
    fi
    
    # Validate configuration file
    if [ ! -f "$MOBILE_ROOT/amplify_outputs.json" ]; then
        log_error "Backend configuration failed"
        exit 1
    fi
    
    # Show configuration summary
    log "Backend configuration summary:"
    if command -v jq &> /dev/null; then
        local region=$(jq -r '.auth.aws_region // .data.aws_region' "$MOBILE_ROOT/amplify_outputs.json")
        local auth_configured=$(jq -r '.auth.user_pool_id != null' "$MOBILE_ROOT/amplify_outputs.json")
        local data_configured=$(jq -r '.data.url != null' "$MOBILE_ROOT/amplify_outputs.json")
        
        echo "  • Region: $region"
        echo "  • Auth: $([ "$auth_configured" = "true" ] && echo "✅" || echo "❌")"
        echo "  • Data API: $([ "$data_configured" = "true" ] && echo "✅" || echo "❌")"
    fi
}

create_test_backend_config() {
    log "Creating test backend configuration..."
    
    cat > "$MOBILE_ROOT/amplify_outputs.json" << 'EOF'
{
  "version": "1",
  "auth": {
    "aws_region": "ca-central-1",
    "user_pool_id": "ca-central-1_testpool",
    "user_pool_client_id": "test_client_id",
    "identity_pool_id": "ca-central-1:test-identity-pool"
  },
  "data": {
    "url": "https://test-api.appsync-api.ca-central-1.amazonaws.com/graphql",
    "aws_region": "ca-central-1",
    "default_authorization_type": "API_KEY",
    "api_key": "da2-test-api-key"
  },
  "storage": {
    "aws_region": "ca-central-1",
    "bucket_name": "test-storage-bucket"
  }
}
EOF
}

# ========================================
# Native Project Setup  
# ========================================

setup_native_projects() {
    log_section "🏗️ Setting Up Native Projects"
    
    cd "$MOBILE_ROOT"
    
    log "Generating native iOS and Android projects..."
    npx expo prebuild --clean
    
    # iOS setup
    if [ -d "ios" ]; then
        log "Installing iOS dependencies (CocoaPods)..."
        cd ios
        pod install --repo-update
        cd ..
        log_success "iOS project configured"
    fi
    
    # Android setup  
    if [ -d "android" ]; then
        log "Validating Android project..."
        cd android
        ./gradlew --version >/dev/null
        cd ..
        log_success "Android project configured"
    fi
}

# ========================================
# Device Configuration
# ========================================

configure_ios_simulators() {
    log_section "📱 Configuring iOS Simulators"
    
    # Ensure we have the required simulators
    local required_devices=("iPhone 16 Pro" "iPhone 16")
    
    for device in "${required_devices[@]}"; do
        local device_count=$(xcrun simctl list devices -j | 
            jq -r --arg device "$device" '.devices | to_entries[] | .value[] | select(.name | contains($device)) | .name' | 
            wc -l)
        
        if [ "$device_count" -gt 0 ]; then
            log_success "$device simulator available"
        else
            log_warning "$device simulator not found"
        fi
    done
    
    # Clean up any existing simulators in bad state
    log "Shutting down all simulators..."
    xcrun simctl shutdown all 2>/dev/null || true
    
    log_success "iOS simulators configured"
}

configure_android_devices() {
    log_section "🤖 Configuring Android Devices"
    
    # Check for connected devices
    local device_count=$(adb devices | grep -c "device$" || echo "0")
    
    if [ "$device_count" -eq 0 ]; then
        log_warning "No Android devices connected"
        echo "  Connect your Android device or start an emulator"
        echo "  For testing, we recommend using device ID: ZL73232GKP (Moto E13)"
    else
        log_success "$device_count Android device(s) connected"
        adb devices -l
        
        # Set up port forwarding for each device  
        adb devices | grep "device$" | while read -r device _; do
            log "Setting up port forwarding for $device..."
            adb -s "$device" reverse tcp:8081 tcp:8081 2>/dev/null || true
            adb -s "$device" reverse tcp:3000 tcp:3000 2>/dev/null || true
            adb -s "$device" reverse tcp:9090 tcp:9090 2>/dev/null || true
        done
    fi
}

# ========================================
# Test Data Management
# ========================================

setup_test_data() {
    log_section "🗃️ Setting Up Test Data"
    
    # Create test data directory
    local test_data_dir="$MOBILE_ROOT/.maestro/test-data"
    mkdir -p "$test_data_dir"
    
    # Create sample test data files
    cat > "$test_data_dir/test-locations.json" << 'EOF'
{
  "locations": [
    {
      "name": "New York, NY",
      "coordinates": [40.7128, -74.0060],
      "hasData": true,
      "categories": ["water", "air", "health", "disaster"]
    },
    {
      "name": "Los Angeles, CA", 
      "coordinates": [34.0522, -118.2437],
      "hasData": false,
      "categories": []
    },
    {
      "name": "Toronto, ON",
      "coordinates": [43.6532, -79.3832],
      "hasData": true,
      "categories": ["water", "air"]
    }
  ]
}
EOF
    
    cat > "$test_data_dir/test-users.json" << 'EOF'
{
  "users": [
    {
      "type": "test_user",
      "email": "test@mapyourhealth.com",
      "password": "TestPass123!",
      "firstName": "Test",
      "lastName": "User"
    },
    {
      "type": "deletion_test",
      "email": "delete-me@mapyourhealth.com",
      "password": "DeleteMe123!",
      "firstName": "Delete",
      "lastName": "Me"
    }
  ]
}
EOF
    
    log_success "Test data configured"
}

# ========================================
# Maestro Configuration
# ========================================

configure_maestro() {
    log_section "🎭 Configuring Maestro"
    
    # Ensure Maestro is in PATH
    export PATH="$HOME/.maestro/bin:$PATH"
    
    # Validate Maestro installation
    if ! maestro --version &>/dev/null; then
        log_error "Maestro is not properly installed or not in PATH"
        exit 1
    fi
    
    local maestro_version=$(maestro --version)
    log_success "Maestro is configured (version: $maestro_version)"
    
    # Set up Maestro environment variables
    export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}"
    
    # Create Maestro configuration directory
    mkdir -p "$HOME/.maestro/config"
    
    # Create Maestro configuration file
    cat > "$HOME/.maestro/config/config.yaml" << EOF
# MapYourHealth Maestro Configuration
driver:
  startup_timeout: ${MAESTRO_DRIVER_STARTUP_TIMEOUT}
  
reporting:
  output_dir: "$MOBILE_ROOT/.maestro/results"
  
environment:
  app_id: "$MAESTRO_APP_ID"
  platform: "ios"  # default platform
EOF
    
    log_success "Maestro configuration created"
}

# ========================================
# Environment Summary
# ========================================

show_environment_summary() {
    log_section "📋 Environment Summary"
    
    echo -e "${GREEN}✅ Test Environment Ready${NC}"
    echo ""
    echo "Configuration:"
    echo "  • Project Root: $PROJECT_ROOT"
    echo "  • Mobile App: $MOBILE_ROOT" 
    echo "  • AWS Profile: $AWS_PROFILE"
    echo "  • App ID: $MAESTRO_APP_ID"
    echo "  • Maestro: $(maestro --version 2>/dev/null || echo 'Not found')"
    echo ""
    echo "To run tests:"
    echo "  cd $MOBILE_ROOT"
    echo "  .maestro/scripts/test-orchestrator.sh run smoke"
    echo ""
    echo "Available commands:"
    echo "  • .maestro/scripts/test-orchestrator.sh categories  # Show test categories"
    echo "  • .maestro/scripts/test-orchestrator.sh validate    # Validate setup"
    echo "  • .maestro/scripts/test-orchestrator.sh run [category] # Run tests"
    echo ""
}

# ========================================
# Usage & Main Function
# ========================================

show_usage() {
    cat << EOF
MapYourHealth Test Environment Setup v1.0.0

Usage: $0 [OPTIONS] [COMMAND]

Commands:
  setup     Full environment setup (default)
  validate  Validate existing setup
  backend   Setup backend configuration only
  devices   Configure devices/simulators only
  clean     Clean up generated files

Options:
  --aws-profile PROFILE  AWS profile to use (default: rayane)
  --aws-region REGION    AWS region (default: ca-central-1)
  --app-id ID           App bundle ID (default: com.epiphanyapps.mapyourhealth)
  --help                Show this help message

Examples:
  $0                           # Full setup with defaults
  $0 validate                  # Validate current setup
  $0 backend --aws-profile dev # Setup backend with dev profile
  $0 devices                   # Configure devices only

EOF
}

# Parse command line arguments
COMMAND="setup"

while [[ $# -gt 0 ]]; do
    case $1 in
        --aws-profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --aws-region)
            AWS_REGION="$2"
            shift 2
            ;;
        --app-id)
            MAESTRO_APP_ID="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        setup|validate|backend|devices|clean)
            COMMAND="$1"
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
    log_section "🚀 MapYourHealth Test Environment Setup v1.0.0"
    
    case "$COMMAND" in
        "setup")
            validate_prerequisites
            validate_aws_profile
            setup_dependencies
            setup_backend_config
            setup_native_projects
            configure_ios_simulators
            configure_android_devices
            setup_test_data
            configure_maestro
            show_environment_summary
            ;;
            
        "validate")
            validate_prerequisites
            validate_aws_profile
            configure_maestro
            log_success "Environment validation completed"
            ;;
            
        "backend")
            validate_aws_profile
            setup_backend_config
            log_success "Backend configuration completed"
            ;;
            
        "devices")
            configure_ios_simulators
            configure_android_devices
            log_success "Device configuration completed"
            ;;
            
        "clean")
            log_section "🧹 Cleaning Environment"
            cd "$MOBILE_ROOT"
            rm -rf ios android .expo
            rm -f amplify_outputs.json
            rm -rf .maestro/results
            log_success "Cleanup completed"
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