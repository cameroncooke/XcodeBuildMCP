#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUT_DIR="${SMITHERY_STDIO_OUT_DIR:-$PROJECT_ROOT/.smithery/stdio}"
BUNDLED_DIR="$PROJECT_ROOT/bundled"
DEST_DIR="$OUT_DIR/bundled"

if [ ! -d "$OUT_DIR" ]; then
  mkdir -p "$OUT_DIR"
fi

if [ ! -f "$BUNDLED_DIR/axe" ]; then
  echo "Bundled AXe artifacts missing; running bundle:axe..."
  npm run bundle:axe
else
  echo "Bundled AXe artifacts already present."
fi

if [ ! -f "$BUNDLED_DIR/axe" ]; then
  echo "Bundled AXe artifacts are still missing after bundle:axe"
  exit 1
fi

if [ -d "$DEST_DIR" ]; then
  rm -r "$DEST_DIR"
fi

cp -R "$BUNDLED_DIR" "$OUT_DIR/"

echo "Copied bundled artifacts to $DEST_DIR"
