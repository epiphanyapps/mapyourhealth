#!/bin/bash
# Wipe all data, re-parse Risks.xlsx, and re-seed from scratch
#
# Usage: TABLE_SUFFIX=<env-suffix>-NONE \
#        COGNITO_EMAIL=<email> COGNITO_PASSWORD=<password> \
#        bash scripts/reseed-all.sh
#
# TABLE_SUFFIX picks which environment to wipe + reseed. There is no
# default; the underlying scripts will refuse to run without it. Look it
# up via `aws dynamodb list-tables` for the chosen Amplify branch.
#   staging: dwz5zs2ghrc5xplczomoh4fzke-NONE
#   main:    uusoeozunzdy5biliji7vxbjcy-NONE  (PRODUCTION — confirm twice)
#
# Steps 4 & 5 require: COGNITO_EMAIL and COGNITO_PASSWORD env vars.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# Validate TABLE_SUFFIX up-front so we fail before doing anything (rather
# than wiping nothing because step 1 errors out, which would leave the
# operator unsure where the failure originated).
if [ -z "$TABLE_SUFFIX" ]; then
  echo "ERROR: TABLE_SUFFIX must be set so we know which environment to wipe + reseed."
  echo ""
  echo "  staging: TABLE_SUFFIX=dwz5zs2ghrc5xplczomoh4fzke-NONE"
  echo "  main:    TABLE_SUFFIX=uusoeozunzdy5biliji7vxbjcy-NONE  (PRODUCTION — confirm twice)"
  exit 1
fi
export TABLE_SUFFIX

# Validate Cognito credentials for steps 4 & 5
if [ -z "$COGNITO_EMAIL" ] || [ -z "$COGNITO_PASSWORD" ]; then
  echo "ERROR: COGNITO_EMAIL and COGNITO_PASSWORD must be set for AppSync seeding (steps 4 & 5)."
  echo ""
  echo "Usage: COGNITO_EMAIL=<email> COGNITO_PASSWORD=<password> bash scripts/reseed-all.sh"
  echo "See CLAUDE.md for seed admin credentials."
  exit 1
fi

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
npx tsx scripts/seed-om-data.ts --json scripts/seed-om-data.json --observations-only

echo ""
echo "=== All done! ==="
