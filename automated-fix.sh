#!/bin/bash
# Automated Amplify Fix - Requires GITHUB_TOKEN environment variable
set -e

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN environment variable required"
    echo "💡 Get token from: https://github.com/settings/tokens"
    echo "   Needs 'repo' permissions"
    exit 1
fi

APP_ID="d1tdi1qvsarjqp"
REGION="ca-central-1"

echo "🔄 Recreating Amplify app with repository connection..."

# Delete existing app
echo "1. Deleting existing app..."
aws amplify delete-app --app-id $APP_ID --region $REGION

# Create new app with repository
echo "2. Creating new app with repository..."
NEW_APP=$(aws amplify create-app \
  --name "mapyourhealth-backend" \
  --repository "https://github.com/epiphanyapps/mapyourhealth" \
  --access-token "$GITHUB_TOKEN" \
  --region $REGION \
  --query 'app.appId' \
  --output text)

echo "3. New app ID: $NEW_APP"

# Create main branch
echo "4. Creating main branch..."
aws amplify create-branch \
  --app-id $NEW_APP \
  --branch-name main \
  --region $REGION

echo "✅ Automated fix complete!"
echo "🔧 Update GitHub secret AMPLIFY_BACKEND_APP_ID to: $NEW_APP"