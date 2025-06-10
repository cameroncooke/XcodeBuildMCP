#!/bin/bash

# Build script for AXe artifacts
# This script clones the AXe repository, builds it, and prepares the bundled artifacts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUNDLED_DIR="$PROJECT_ROOT/bundled"
AXE_REPO_URL="https://github.com/cameroncooke/axe.git"
AXE_TEMP_DIR="/tmp/axe-build-$$"

echo "🔨 Building AXe artifacts for bundling..."

# Clean up any existing bundled directory
if [ -d "$BUNDLED_DIR" ]; then
    echo "🧹 Cleaning existing bundled directory..."
    rm -rf "$BUNDLED_DIR"
fi

# Create bundled directory
mkdir -p "$BUNDLED_DIR"

# Clean up temp directory if it exists
if [ -d "$AXE_TEMP_DIR" ]; then
    rm -rf "$AXE_TEMP_DIR"
fi

# Clone AXe repository to temp directory
echo "📥 Cloning AXe repository..."
git clone --depth 1 "$AXE_REPO_URL" "$AXE_TEMP_DIR"

# Change to AXe directory
cd "$AXE_TEMP_DIR"

# Build AXe in release configuration
echo "🔨 Building AXe in release configuration..."
swift build --configuration release

# Check if build succeeded
if [ ! -f ".build/release/axe" ]; then
    echo "❌ AXe build failed - binary not found"
    exit 1
fi

echo "✅ AXe build completed successfully"

# Copy binary to bundled directory
echo "📦 Copying AXe binary..."
cp ".build/release/axe" "$BUNDLED_DIR/"

# Create Frameworks directory and copy frameworks
echo "📦 Copying frameworks..."
mkdir -p "$BUNDLED_DIR/Frameworks"
cp -r .build/release/*.framework "$BUNDLED_DIR/Frameworks/"

# Verify frameworks were copied
FRAMEWORK_COUNT=$(find "$BUNDLED_DIR/Frameworks" -name "*.framework" | wc -l)
echo "📦 Copied $FRAMEWORK_COUNT frameworks"

# List the frameworks for verification
echo "🔍 Bundled frameworks:"
ls -la "$BUNDLED_DIR/Frameworks/"

# Verify binary can run with bundled frameworks
echo "🧪 Testing bundled AXe binary..."
if DYLD_FRAMEWORK_PATH="$BUNDLED_DIR/Frameworks" "$BUNDLED_DIR/axe" --version > /dev/null 2>&1; then
    echo "✅ Bundled AXe binary test passed"
else
    echo "❌ Bundled AXe binary test failed"
    exit 1
fi

# Get AXe version for logging
AXE_VERSION=$(DYLD_FRAMEWORK_PATH="$BUNDLED_DIR/Frameworks" "$BUNDLED_DIR/axe" --version 2>/dev/null || echo "unknown")
echo "📋 AXe version: $AXE_VERSION"

# Clean up temp directory
echo "🧹 Cleaning up temporary files..."
rm -rf "$AXE_TEMP_DIR"

# Show final bundle size
BUNDLE_SIZE=$(du -sh "$BUNDLED_DIR" | cut -f1)
echo "📊 Final bundle size: $BUNDLE_SIZE"

echo "🎉 AXe bundling completed successfully!"
echo "📁 Bundled artifacts location: $BUNDLED_DIR"