#!/bin/bash
set -euo pipefail

# E2E-121: Account Deletion Flow (Integrated with Project)
# Issue: https://github.com/epiphanyapps/mapyourhealth/issues/121
#
# This script orchestrates the complete account deletion E2E test:
# 1. Signup flow (creates account)
# 2. Cognito admin confirmation (bypasses email)  
# 3. Signin + deletion flow (tests Paper Dialog)
# 4. Verification of successful deletion

# Configuration
SIMULATOR_ID="${SIMULATOR_ID:-9618FE77-C2D9-41E7-8A6C-5B2B257F5737}"
MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.epiphanyapps.mapyourhealth}"
COGNITO_POOL="${COGNITO_POOL:-ca-central-1_YJw20H7Xt}"
AWS_PROFILE="${AWS_PROFILE:-rayane}"
AWS_REGION="${AWS_REGION:-ca-central-1}"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLOWS_DIR="$(dirname "$SCRIPT_DIR")/flows"

# Generate unique test account
TIMESTAMP=$(date +%s)
export TEST_EMAIL="e2e-deletion-${TIMESTAMP}@mapyourhealth.test" 
export TEST_PASSWORD="E2eDelete!Test2026"
export MAESTRO_APP_ID

echo "🚀 E2E-121: Account Deletion Flow"
echo "📧 Test Email: $TEST_EMAIL"
echo "📱 App: $MAESTRO_APP_ID"
echo "📲 Simulator: $SIMULATOR_ID"
echo ""

# Cleanup function
cleanup_user() {
    echo "🧹 Cleaning up test user from Cognito..."
    aws cognito-idp admin-delete-user \
        --user-pool-id "$COGNITO_POOL" \
        --username "$TEST_EMAIL" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" 2>/dev/null || true
}

# Error handling
on_exit() {
    local code=$?
    if [ $code -ne 0 ]; then
        echo ""
        echo "❌ E2E test failed (exit code $code)"
        cleanup_user
    fi
    exit $code
}
trap on_exit EXIT

# Verify prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v maestro >/dev/null 2>&1 && [ ! -f "$HOME/.maestro/bin/maestro" ]; then
    echo "❌ Maestro not found. Install with: curl -Ls 'https://get.maestro.mobile.dev' | bash"
    exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
    echo "❌ AWS CLI not found. Please install AWS CLI."
    exit 1
fi

MAESTRO_CMD="maestro"
if [ -f "$HOME/.maestro/bin/maestro" ]; then
    MAESTRO_CMD="$HOME/.maestro/bin/maestro"
fi

echo "✅ Prerequisites verified"
echo ""

# =========================================
# Part 1: Signup Flow
# =========================================

echo "📝 Part 1: Account signup..."
$MAESTRO_CMD test \
    -e TEST_EMAIL="$TEST_EMAIL" \
    -e TEST_PASSWORD="$TEST_PASSWORD" \
    -e MAESTRO_APP_ID="$MAESTRO_APP_ID" \
    "$FLOWS_DIR/E2E-121-signup-only.yaml"

echo "✅ Signup completed - user awaiting verification"

# =========================================
# Part 2: Cognito Admin Confirmation
# =========================================

echo "🔐 Part 2: Confirming user in Cognito..."
aws cognito-idp admin-confirm-sign-up \
    --user-pool-id "$COGNITO_POOL" \
    --username "$TEST_EMAIL" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION"

echo "✅ User confirmed in Cognito"

# =========================================
# Part 3: Signin + Deletion Flow  
# =========================================

echo "🗑️  Part 3: Sign in and delete account..."
$MAESTRO_CMD test \
    -e TEST_EMAIL="$TEST_EMAIL" \
    -e TEST_PASSWORD="$TEST_PASSWORD" \
    -e MAESTRO_APP_ID="$MAESTRO_APP_ID" \
    "$FLOWS_DIR/E2E-121-account-deletion-automated.yaml"

echo "✅ Account deletion completed"

# =========================================
# Part 4: Verification
# =========================================

echo "🔍 Part 4: Verifying user deleted from Cognito..."

# Try to get user - should fail if deletion was successful
if aws cognito-idp admin-get-user \
    --user-pool-id "$COGNITO_POOL" \
    --username "$TEST_EMAIL" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "❌ FAILED: User still exists in Cognito pool!"
    echo "   This indicates the backend deletion Lambda may not be working correctly."
    exit 1
fi

echo "✅ User successfully deleted from Cognito"

# =========================================
# Success!
# =========================================

echo ""
echo "🎉 E2E-121 PASSED: Account Deletion Flow Complete!"
echo ""
echo "📋 Test Summary:"
echo "   📧 Email: $TEST_EMAIL"  
echo "   ✅ Account created via signup form"
echo "   ✅ User confirmed via Cognito admin"
echo "   ✅ User signed in successfully"
echo "   ✅ Paper Dialog deletion flow worked"
echo "   ✅ User returned to guest state in app"
echo "   ✅ User deleted from Cognito backend"
echo ""
echo "✨ Paper Dialog + backend integration: WORKING!"