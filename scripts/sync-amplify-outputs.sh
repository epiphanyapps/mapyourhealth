#!/bin/bash
# Syncs Amplify outputs from backend to mobile app

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_OUTPUTS="$ROOT_DIR/packages/backend/amplify_outputs.json"
ROOT_OUTPUTS="$ROOT_DIR/amplify_outputs.json"
MOBILE_OUTPUTS="$ROOT_DIR/apps/mobile/amplify_outputs.json"
WEB_OUTPUTS="$ROOT_DIR/apps/web/amplify_outputs.json"

BACKEND_STAGING_OUTPUTS="$ROOT_DIR/packages/backend/amplify_outputs.staging.json"
MOBILE_STAGING_OUTPUTS="$ROOT_DIR/apps/mobile/amplify_outputs.staging.json"

if [ -f "$BACKEND_OUTPUTS" ]; then
  cp "$BACKEND_OUTPUTS" "$ROOT_OUTPUTS"
  cp "$BACKEND_OUTPUTS" "$MOBILE_OUTPUTS"
  cp "$BACKEND_OUTPUTS" "$WEB_OUTPUTS"
  echo "✓ Synced amplify_outputs.json from backend to root, mobile, and web"
elif [ -f "$ROOT_OUTPUTS" ]; then
  cp "$ROOT_OUTPUTS" "$MOBILE_OUTPUTS"
  cp "$ROOT_OUTPUTS" "$WEB_OUTPUTS"
  echo "✓ Synced amplify_outputs.json from root to mobile and web"
else
  echo "⚠ No amplify_outputs.json found. Run 'yarn backend:sandbox' to generate one."
  exit 0
fi

# Staging outputs power the hidden in-app env switcher (envOverride === "staging").
# The mobile app imports this file at build time, so it MUST exist or the bundle
# fails to compile. If we can't find a real staging file, fall back to the prod
# file as a placeholder so the build still works — the toggle will simply route
# back to prod until the dev runs `yarn fetch:outputs:staging`.
if [ -f "$BACKEND_STAGING_OUTPUTS" ]; then
  cp "$BACKEND_STAGING_OUTPUTS" "$MOBILE_STAGING_OUTPUTS"
  echo "✓ Synced amplify_outputs.staging.json from backend to mobile"
elif [ ! -f "$MOBILE_STAGING_OUTPUTS" ]; then
  cp "$MOBILE_OUTPUTS" "$MOBILE_STAGING_OUTPUTS"
  echo "⚠ No staging amplify_outputs found — copied prod as placeholder."
  echo "  Run 'yarn fetch:outputs:staging' to populate the real staging config."
fi
