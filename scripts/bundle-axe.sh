#!/bin/bash

# Build script for AXe artifacts
# This script downloads pre-built AXe artifacts from GitHub releases and bundles them

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUNDLED_DIR="$PROJECT_ROOT/bundled"
AXE_LOCAL_DIR="/Volumes/Developer/AXe"
AXE_TEMP_DIR="/tmp/axe-download-$$"

echo "🔨 Preparing AXe artifacts for bundling..."

# Clean up any existing bundled directory
if [ -d "$BUNDLED_DIR" ]; then
    echo "🧹 Cleaning existing bundled directory..."
    rm -rf "$BUNDLED_DIR"
fi

# Create bundled directory
mkdir -p "$BUNDLED_DIR"

# Use local AXe build if available, otherwise download from GitHub releases
if [ -d "$AXE_LOCAL_DIR" ] && [ -f "$AXE_LOCAL_DIR/Package.swift" ]; then
    echo "🏠 Using local AXe source at $AXE_LOCAL_DIR"
    cd "$AXE_LOCAL_DIR"
    
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
    
    # Fix rpath to find frameworks in Frameworks/ subdirectory
    echo "🔧 Configuring AXe binary rpath for bundled frameworks..."
    install_name_tool -add_rpath "@executable_path/Frameworks" "$BUNDLED_DIR/axe"
    
    # Create Frameworks directory and copy frameworks
    echo "📦 Copying frameworks..."
    mkdir -p "$BUNDLED_DIR/Frameworks"
    
    # Copy frameworks with better error handling
    for framework in .build/release/*.framework; do
        if [ -d "$framework" ]; then
            echo "📦 Copying framework: $(basename "$framework")"
            cp -r "$framework" "$BUNDLED_DIR/Frameworks/"
            
            # Only copy nested frameworks if they exist
            if [ -d "$framework/Frameworks" ]; then
                echo "📦 Found nested frameworks in $(basename "$framework")"
                cp -r "$framework/Frameworks"/* "$BUNDLED_DIR/Frameworks/" 2>/dev/null || true
            fi
        fi
    done
else
    echo "📥 Downloading latest AXe release from GitHub..."
    
    # Get latest release download URL
    LATEST_RELEASE_URL="https://github.com/cameroncooke/AXe/releases/download/v1.0.0/AXe-macOS-v1.0.0.tar.gz"
    
    # Create temp directory
    mkdir -p "$AXE_TEMP_DIR"
    cd "$AXE_TEMP_DIR"
    
    # Download and extract the release
    echo "📥 Downloading AXe release archive..."
    curl -L -o "axe-release.tar.gz" "$LATEST_RELEASE_URL"
    
    echo "📦 Extracting AXe release archive..."
    tar -xzf "axe-release.tar.gz"
    
    # Find the extracted directory (might be named differently)
    EXTRACTED_DIR=$(find . -type d -name "*AXe*" -o -name "*axe*" | head -1)
    if [ -z "$EXTRACTED_DIR" ]; then
        # If no AXe directory found, assume files are in current directory
        EXTRACTED_DIR="."
    fi
    
    cd "$EXTRACTED_DIR"
    
    # Copy binary
    if [ -f "axe" ]; then
        echo "📦 Copying AXe binary..."
        cp "axe" "$BUNDLED_DIR/"
        chmod +x "$BUNDLED_DIR/axe"
    elif [ -f "bin/axe" ]; then
        echo "📦 Copying AXe binary from bin/..."
        cp "bin/axe" "$BUNDLED_DIR/"
        chmod +x "$BUNDLED_DIR/axe"
    else
        echo "❌ AXe binary not found in release archive"
        ls -la
        exit 1
    fi
    
    # Copy frameworks if they exist
    echo "📦 Copying frameworks..."
    mkdir -p "$BUNDLED_DIR/Frameworks"
    
    if [ -d "Frameworks" ]; then
        cp -r Frameworks/* "$BUNDLED_DIR/Frameworks/"
    elif [ -d "lib" ]; then
        # Look for frameworks in lib directory
        find lib -name "*.framework" -exec cp -r {} "$BUNDLED_DIR/Frameworks/" \;
    else
        echo "⚠️  No frameworks directory found in release archive"
        echo "📂 Contents of release archive:"
        find . -type f -name "*.framework" -o -name "*.dylib" | head -10
    fi
fi

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

# Clean up temp directory if it was used
if [ -d "$AXE_TEMP_DIR" ]; then
    echo "🧹 Cleaning up temporary files..."
    rm -rf "$AXE_TEMP_DIR"
fi

# Show final bundle size
BUNDLE_SIZE=$(du -sh "$BUNDLED_DIR" | cut -f1)
echo "📊 Final bundle size: $BUNDLE_SIZE"

echo "🎉 AXe bundling completed successfully!"
echo "📁 Bundled artifacts location: $BUNDLED_DIR"