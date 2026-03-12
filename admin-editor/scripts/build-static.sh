#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/../public"
DIST="$SCRIPT_DIR/../dist"

rm -rf "$DIST"
mkdir -p "$DIST"
cp -r "$SRC"/* "$DIST"/

echo "ACE static build complete -> $DIST"
echo ""
echo "Next steps:"
echo "  1. Edit dist/config.js with your API base URL and auth mode"
echo "  2. Upload dist/ contents to your web server"
echo ""
echo "Files:"
find "$DIST" -type f | wc -l | xargs -I{} echo "  {} files copied"
