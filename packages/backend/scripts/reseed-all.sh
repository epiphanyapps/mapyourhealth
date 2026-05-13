#!/bin/bash
# Wipe all data, re-parse Risks.xlsx, and re-seed from scratch.
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
# Cognito credentials are required for the AppSync seed steps (categories,
# observations, warning banners, pollution sources).
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

if [ -z "$COGNITO_EMAIL" ] || [ -z "$COGNITO_PASSWORD" ]; then
  echo "ERROR: COGNITO_EMAIL and COGNITO_PASSWORD must be set for AppSync seeding."
  echo ""
  echo "Usage: COGNITO_EMAIL=<email> COGNITO_PASSWORD=<password> bash scripts/reseed-all.sh"
  echo "See CLAUDE.md for seed admin credentials."
  exit 1
fi

echo "=== Step 1: Wipe all data tables ==="
# `--force` skips the interactive prompt. Without it, a non-TTY shell
# (e.g. CI or a backgrounded run) reads EOF, treats it as "no", and the
# wipe is silently aborted — leaving downstream seed steps to double up
# the data. The reseed-all.sh entrypoint is itself the confirmation gate.
AWS_PROFILE=rayane npx tsx scripts/wipe-all-data.ts --force

echo ""
echo "=== Step 2: Parse Risks.xlsx ==="
npx tsx scripts/parse-risks-excel.ts
npx tsx scripts/parse-risks-excel-om.ts

echo ""
echo "=== Step 3: Seed reference data (direct DynamoDB — no auth) ==="
AWS_PROFILE=rayane npx tsx scripts/seed-dynamodb-direct.ts

echo ""
echo "=== Step 4: Cascade test measurements (direct DynamoDB) ==="
# State- and country-anchored uranium-238 rows so the city → state → country
# cascade is visibly verifiable on a freshly-seeded environment.
AWS_PROFILE=rayane npx tsx scripts/seed-cascade-test-rows.ts

echo ""
echo "=== Step 5: Cascade test observations (direct DynamoDB) ==="
# State- and country-anchored radon rows for the observations cascade.
AWS_PROFILE=rayane npx tsx scripts/seed-cascade-test-observations.ts

echo ""
echo "=== Step 6: Seed categories (AppSync — requires Cognito) ==="
npx tsx scripts/seed-categories.ts

echo ""
echo "=== Step 7: Seed O&M observations (AppSync — requires Cognito) ==="
npx tsx scripts/seed-om-data.ts --json scripts/seed-om-data.json --observations-only

echo ""
echo "=== Step 8: Seed pollution sources (AppSync — requires Cognito) ==="
# 5 sources at varied anchors (Montreal city, Toronto city, QC state,
# ON state, CA country) and varied source types. Idempotent upsert by
# sourceId. Doubles as cascade-demonstration data for the orphan
# PollutionSource feature.
#
# Note: warning banners are intentionally NOT seeded by reseed-all.sh.
# Banners surface prominently on the mobile Dashboard, so auto-seeding
# them risks fake `[SEED]` advisories reaching real users if the admin
# Reseed action ever runs on prod. Real banner content should always be
# created by an admin in response to a real situation. The standalone
# `yarn seed:banners` script still exists for one-off use when a fresh
# staging env genuinely needs sample banners to demo the UI.
npx tsx scripts/seed-pollution-sources.ts

echo ""
echo "=== All done! ==="
