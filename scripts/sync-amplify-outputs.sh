#!/bin/bash
# Syncs Amplify outputs from backend to mobile app

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_OUTPUTS="$ROOT_DIR/packages/backend/amplify_outputs.json"
ROOT_OUTPUTS="$ROOT_DIR/amplify_outputs.json"
MOBILE_OUTPUTS="$ROOT_DIR/apps/mobile/amplify_outputs.json"
WEB_OUTPUTS="$ROOT_DIR/apps/web/amplify_outputs.json"

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
