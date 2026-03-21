#!/bin/bash
# Wipe all data, re-parse Risks.xlsx, and re-seed from scratch
#
# Usage: cd packages/backend && bash scripts/reseed-all.sh
#
# Steps 4 & 5 require: COGNITO_EMAIL and COGNITO_PASSWORD env vars
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "=== Step 1: Wipe all data tables ==="
AWS_PROFILE=rayane npx tsx scripts/wipe-all-data.ts

echo ""
echo "=== Step 2: Parse Risks.xlsx ==="
npx tsx scripts/parse-risks-excel.ts
npx tsx scripts/parse-risks-excel-om.ts

echo ""
echo "=== Step 3: Seed reference data (direct DynamoDB — no auth) ==="
AWS_PROFILE=rayane npx tsx scripts/seed-dynamodb-direct.ts

echo ""
echo "=== Step 4: Seed categories (AppSync — requires Cognito) ==="
npx tsx scripts/seed-categories.ts

echo ""
echo "=== Step 5: Seed O&M observations (AppSync — requires Cognito) ==="
npx tsx scripts/seed-om-data.ts --json scripts/seed-om-data.json

echo ""
echo "=== All done! ==="
