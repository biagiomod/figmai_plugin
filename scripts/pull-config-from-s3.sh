#!/usr/bin/env bash
set -euo pipefail

echo "[pull-config] Starting manual config pull from S3..."

if [[ ! -f "package.json" ]]; then
  echo "[pull-config] Error: package.json not found. Run this script from the repo root." >&2
  exit 1
fi

echo "[pull-config] Syncing custom config files..."
aws s3 sync "s3://modstar-figmai-config/custom" "./custom" \
  --delete \
  --exclude ".DS_Store"

echo "[pull-config] Syncing docs config files..."
aws s3 sync "s3://modstar-figmai-config/docs" "./docs" \
  --delete \
  --exclude ".DS_Store"

echo "[pull-config] Completed successfully."
