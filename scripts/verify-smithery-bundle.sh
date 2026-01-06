#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_DIR="$PROJECT_ROOT/.smithery/bundled"
AXE_BIN="$BUNDLE_DIR/axe"
FRAMEWORK_DIR="$BUNDLE_DIR/Frameworks"

if [ ! -f "$AXE_BIN" ]; then
  echo "❌ Missing AXe binary at $AXE_BIN"
  if [ -d "$PROJECT_ROOT/.smithery" ]; then
    echo "🔍 .smithery contents:"
    ls -la "$PROJECT_ROOT/.smithery"
  fi
  exit 1
fi

if [ ! -d "$FRAMEWORK_DIR" ]; then
  echo "❌ Missing Frameworks directory at $FRAMEWORK_DIR"
  if [ -d "$BUNDLE_DIR" ]; then
    echo "🔍 bundled contents:"
    ls -la "$BUNDLE_DIR"
  fi
  exit 1
fi

FRAMEWORK_COUNT="$(find "$FRAMEWORK_DIR" -maxdepth 2 -type d -name "*.framework" | wc -l | tr -d ' ')"
if [ "$FRAMEWORK_COUNT" -eq 0 ]; then
  echo "❌ No frameworks found in $FRAMEWORK_DIR"
  find "$FRAMEWORK_DIR" -maxdepth 2 -type d | head -n 50
  exit 1
fi

echo "✅ Smithery bundle includes AXe binary and $FRAMEWORK_COUNT frameworks"
