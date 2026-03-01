#!/bin/bash
# Fix Amplify Backend Deployment
# This script connects the GitHub repository to the existing Amplify app

set -e

APP_ID="d1tdi1qvsarjqp"
REGION="ca-central-1"
REPO_URL="https://github.com/epiphanyapps/mapyourhealth"

echo "🔧 Fixing Amplify Backend Deployment..."
echo "App ID: $APP_ID"
echo "Region: $REGION"
echo "Repository: $REPO_URL"

# Note: The following approaches require manual intervention because
# AWS CLI doesn't support connecting existing apps to repositories directly

echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo "=========================================="
echo ""
echo "1. 🌐 Open Amplify Console:"
echo "   https://ca-central-1.console.aws.amazon.com/amplify/apps/$APP_ID/YourApp/settings"
echo ""
echo "2. 🔗 Connect Repository:"
echo "   - Go to 'Hosting' in left sidebar"
echo "   - Click 'Connect repository'"  
echo "   - Select 'GitHub'"
echo "   - Choose 'epiphanyapps/mapyourhealth'"
echo "   - Select 'main' branch"
echo "   - Click 'Save and deploy'"
echo ""
echo "3. ⚙️ Configure Build Settings:"
echo "   - Build command: 'npx ampx pipeline-deploy --branch main --app-id $APP_ID'"
echo "   - Output directory: 'dist' or leave default"
echo ""
echo "4. 🎯 Alternative: Use Gen2 Pipeline Deploy"
echo "   Run this in the project directory:"
echo "   npx ampx pipeline-deploy --branch main --app-id $APP_ID"
echo ""

# Alternative: Delete and recreate app with repository (requires GitHub token)
echo "🔄 ALTERNATIVE SOLUTION:"
echo "=========================================="
echo ""
echo "If manual steps don't work, delete and recreate:"
echo ""
echo "1. Delete current app:"
echo "aws amplify delete-app --app-id $APP_ID --region $REGION"
echo ""
echo "2. Create new app with repository:"
echo "aws amplify create-app \\"
echo "  --name mapyourhealth-backend \\"
echo "  --repository $REPO_URL \\"
echo "  --access-token \$GITHUB_TOKEN \\"
echo "  --region $REGION"
echo ""
echo "3. Update GitHub secret AMPLIFY_BACKEND_APP_ID with new app ID"
echo ""

# Check current status
echo "📊 CURRENT STATUS:"
echo "=========================================="
echo "✅ Amplify app exists: $APP_ID"
echo "❌ No repository connected"
echo "❌ No branches configured"
echo "⚠️  CI/CD workflow failing on missing main branch"
echo ""

echo "🎯 Once fixed, the seed-backend-data workflow should work!"