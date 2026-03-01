#!/bin/bash

# =============================================================================
# MapYourHealth E2E Orchestration System - Setup Validation
# =============================================================================
#
# This script validates that the complete E2E orchestration system has been
# properly installed and is ready for use.
#
# Usage: ./scripts/validate-orchestration-setup.sh
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }
error() { echo -e "${RED}❌ $*${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $*${NC}"; }

echo -e "${BLUE}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║              MapYourHealth E2E Orchestration Setup Validation               ║
║                                    v1.0                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

validation_errors=0

log "Validating E2E Test Orchestration System installation..."

# =============================================================================
# 1. Core Script Files
# =============================================================================

echo -e "\n${BLUE}📋 1. Core Script Files${NC}"

required_scripts=(
    "scripts/e2e-runner.sh"
    "scripts/setup-test-environment.sh" 
    "scripts/test-monitor.sh"
    "scripts/validate-orchestration-setup.sh"
)

for script in "${required_scripts[@]}"; do
    if [[ -f "$PROJECT_ROOT/$script" ]]; then
        if [[ -x "$PROJECT_ROOT/$script" ]]; then
            success "$script (executable)"
        else
            warning "$script (not executable)"
            chmod +x "$PROJECT_ROOT/$script"
            success "$script (made executable)"
        fi
    else
        error "$script (missing)"
        validation_errors=$((validation_errors + 1))
    fi
done

# =============================================================================
# 2. GitHub Workflows
# =============================================================================

echo -e "\n${BLUE}📋 2. GitHub Actions Workflows${NC}"

required_workflows=(
    ".github/workflows/e2e-orchestration.yml"
)

for workflow in "${required_workflows[@]}"; do
    if [[ -f "$PROJECT_ROOT/$workflow" ]]; then
        success "$workflow"
    else
        error "$workflow (missing)"
        validation_errors=$((validation_errors + 1))
    fi
done

# =============================================================================
# 3. Documentation
# =============================================================================

echo -e "\n${BLUE}📋 3. Documentation${NC}"

required_docs=(
    "docs/E2E_ORCHESTRATION.md"
)

for doc in "${required_docs[@]}"; do
    if [[ -f "$PROJECT_ROOT/$doc" ]]; then
        success "$doc"
    else
        error "$doc (missing)"
        validation_errors=$((validation_errors + 1))
    fi
done

# =============================================================================
# 4. Test Infrastructure
# =============================================================================

echo -e "\n${BLUE}📋 4. Test Infrastructure${NC}"

# Check Maestro flows directory
if [[ -d "$PROJECT_ROOT/apps/mobile/.maestro/flows" ]]; then
    test_count=$(find "$PROJECT_ROOT/apps/mobile/.maestro/flows" -name "*.yaml" | wc -l)
    if [[ $test_count -ge 10 ]]; then
        success "Maestro test flows ($test_count files)"
    else
        warning "Maestro test flows ($test_count files - expected ≥10)"
    fi
else
    error "Maestro flows directory missing"
    validation_errors=$((validation_errors + 1))
fi

# Check shared test utilities
if [[ -f "$PROJECT_ROOT/apps/mobile/.maestro/shared/_OnFlowStart.yaml" ]]; then
    success "Shared test utilities"
else
    error "Shared test utilities missing"
    validation_errors=$((validation_errors + 1))
fi

# =============================================================================
# 5. Package.json Scripts
# =============================================================================

echo -e "\n${BLUE}📋 5. Package.json Integration${NC}"

if [[ -f "$PROJECT_ROOT/apps/mobile/package.json" ]]; then
    if grep -q "test:maestro" "$PROJECT_ROOT/apps/mobile/package.json"; then
        success "Maestro test scripts in package.json"
    else
        warning "Maestro test scripts not found in package.json"
    fi
    
    if grep -q "amplify:outputs" "$PROJECT_ROOT/apps/mobile/package.json"; then
        success "Amplify output scripts"
    else
        warning "Amplify output scripts not found"
    fi
else
    error "apps/mobile/package.json missing"
    validation_errors=$((validation_errors + 1))
fi

# =============================================================================
# 6. Test Script Functionality
# =============================================================================

echo -e "\n${BLUE}📋 6. Script Functionality Tests${NC}"

# Test e2e-runner help
if "$PROJECT_ROOT/scripts/e2e-runner.sh" --help >/dev/null 2>&1; then
    success "e2e-runner.sh --help"
else
    error "e2e-runner.sh --help failed"
    validation_errors=$((validation_errors + 1))
fi

# Test e2e-runner dry run
if "$PROJECT_ROOT/scripts/e2e-runner.sh" --category smoke --dry-run >/dev/null 2>&1; then
    success "e2e-runner.sh --dry-run"
else
    error "e2e-runner.sh --dry-run failed"
    validation_errors=$((validation_errors + 1))
fi

# Test setup script help
if "$PROJECT_ROOT/scripts/setup-test-environment.sh" --help >/dev/null 2>&1; then
    success "setup-test-environment.sh --help"
else
    error "setup-test-environment.sh --help failed"
    validation_errors=$((validation_errors + 1))
fi

# Test monitor script help
if "$PROJECT_ROOT/scripts/test-monitor.sh" --help >/dev/null 2>&1; then
    success "test-monitor.sh --help"
else
    error "test-monitor.sh --help failed" 
    validation_errors=$((validation_errors + 1))
fi

# =============================================================================
# 7. Environment Check
# =============================================================================

echo -e "\n${BLUE}📋 7. Environment Compatibility${NC}"

# Node.js version check
if command -v node &>/dev/null; then
    node_version=$(node --version)
    success "Node.js available ($node_version)"
else
    warning "Node.js not found (required for testing)"
fi

# Check if we're in the right project
if [[ -f "$PROJECT_ROOT/package.json" ]] && grep -q "MapYourHealth\|mapyourhealth" "$PROJECT_ROOT/package.json"; then
    success "MapYourHealth project detected"
else
    warning "MapYourHealth project structure not recognized"
fi

# Check if apps/mobile exists
if [[ -d "$PROJECT_ROOT/apps/mobile" ]]; then
    success "Mobile app directory structure"
else
    error "apps/mobile directory missing"
    validation_errors=$((validation_errors + 1))
fi

# =============================================================================
# 8. Create Test Results Directory Structure
# =============================================================================

echo -e "\n${BLUE}📋 8. Directory Structure Setup${NC}"

# Create test-results directory
if [[ ! -d "$PROJECT_ROOT/test-results" ]]; then
    mkdir -p "$PROJECT_ROOT/test-results"
    success "Created test-results directory"
else
    success "test-results directory exists"
fi

# Create docs directory if needed
if [[ ! -d "$PROJECT_ROOT/docs" ]]; then
    mkdir -p "$PROJECT_ROOT/docs"
    success "Created docs directory"
else
    success "docs directory exists"
fi

# =============================================================================
# Summary and Next Steps
# =============================================================================

echo -e "\n${BLUE}📋 Installation Summary${NC}\n"

if [[ $validation_errors -eq 0 ]]; then
    success "🎉 E2E Test Orchestration System is properly installed!"
    
    echo -e "\n${GREEN}✅ READY FOR USE${NC}\n"
    
    echo -e "${BLUE}🚀 Quick Start Commands:${NC}"
    echo -e "  ${PURPLE}# Setup test environment${NC}"
    echo -e "  ./scripts/setup-test-environment.sh --platform ios"
    echo -e ""
    echo -e "  ${PURPLE}# Run smoke tests${NC}"
    echo -e "  ./scripts/e2e-runner.sh --category smoke --platform ios"
    echo -e ""
    echo -e "  ${PURPLE}# Live monitoring dashboard${NC}"
    echo -e "  ./scripts/test-monitor.sh --action dashboard"
    echo -e ""
    echo -e "  ${PURPLE}# Environment health check${NC}"
    echo -e "  ./scripts/test-monitor.sh --action health-check"
    
    echo -e "\n${BLUE}📚 Documentation:${NC}"
    echo -e "  docs/E2E_ORCHESTRATION.md - Complete system guide"
    
    echo -e "\n${BLUE}🔗 GitHub Actions:${NC}"
    echo -e "  .github/workflows/e2e-orchestration.yml - Automated CI/CD"
    
else
    error "💥 Installation has $validation_errors error(s) that need to be resolved"
    
    echo -e "\n${RED}❌ ISSUES FOUND${NC}"
    echo -e "${YELLOW}Please resolve the errors above before using the system${NC}"
    
    echo -e "\n${BLUE}🔧 Common fixes:${NC}"
    echo -e "  • Missing files: Check if all files were created properly"
    echo -e "  • Permission issues: Scripts should be executable (chmod +x)"
    echo -e "  • Project structure: Ensure you're in the MapYourHealth root directory"
fi

echo -e "\n${BLUE}📊 System Overview:${NC}"
cat << EOF

┌─────────────────────────────────────────────────────────────────┐
│                    E2E Orchestration System                    │
├─────────────────────────────────────────────────────────────────┤
│ Master Test Runner:    scripts/e2e-runner.sh                   │
│ Environment Setup:     scripts/setup-test-environment.sh       │
│ Monitoring System:     scripts/test-monitor.sh                 │
│ GitHub Actions:        .github/workflows/e2e-orchestration.yml │
│ Documentation:         docs/E2E_ORCHESTRATION.md               │
├─────────────────────────────────────────────────────────────────┤
│ Test Categories:       smoke (5-10m), full (15-20m), regression│
│ Platforms:            iOS (iPhone 16 Pro), Android (Moto E13)  │
│ Integration:          AI Queue, Telegram, AWS (rayane profile) │
│ Monitoring:           Live dashboard, HTML reports, trends     │
└─────────────────────────────────────────────────────────────────┘
EOF

echo -e "\n${BLUE}Status: ${NC}$(if [[ $validation_errors -eq 0 ]]; then echo -e "${GREEN}✅ Ready for Production${NC}"; else echo -e "${RED}❌ Needs Attention${NC}"; fi)"

exit $validation_errors