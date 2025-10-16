#!/bin/bash

# iPad Testing Diagnostic Script
# Helps diagnose and fix "target does not support iPad's platform" issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Prompt user for project path
PROJECT_PATH=${1:-$(pwd)}
PROJECT_PATH=$(echo "$PROJECT_PATH" | sed 's:/*$::') # Remove trailing slash

echo -e "${BLUE}=== iPad Testing Diagnostic Script ===${NC}"
echo -e "Project path: ${YELLOW}$PROJECT_PATH${NC}"
echo ""

# Find .xcodeproj files
if [ ! -f "$PROJECT_PATH/project.pbxproj" ] && [ ! -d "$PROJECT_PATH.xcodeproj" ]; then
    echo -e "${RED}Error: Must be run from within an Xcode project directory or provide path to .xcodeproj${NC}"
    exit 1
fi

# Find the project.pbxproj file
if [ -d "$PROJECT_PATH.xcodeproj" ]; then
    PBXPROJ="$PROJECT_PATH.xcodeproj/project.pbxproj"
else
    PBXPROJ="$PROJECT_PATH/project.pbxproj"
fi

echo -e "${BLUE}Checking project configuration...${NC}"

# Check for test targets
echo ""
echo -e "${YELLOW}=== Test Targets Found ===${NC}"
grep -B5 -A20 "isa = PBXNativeTarget" "$PBXPROJ" | grep -A5 "productType = \"com.apple.product-type.bundle.unit-test\"" | grep -B5 "name =" || echo "No test targets found"

# Check TARGETED_DEVICE_FAMILY for test targets
echo ""
echo -e "${YELLOW}=== TARGETED_DEVICE_FAMILY Settings ===${NC}"
echo -e "${BLUE}Main app targets:${NC}"
grep -A30 "isa = PBXNativeTarget" "$PBXPROJ" | grep -A30 -B5 "productType = \"com.apple.product-type.application\"" | grep "TARGETED_DEVICE_FAMILY" || echo "No TARGETED_DEVICE_FAMILY found for main targets"

echo ""
echo -e "${BLUE}Test targets:${NC}"
grep -A30 "isa = PBXNativeTarget" "$PBXPROJ" | grep -A30 -B5 "productType = \"com.apple.product-type.bundle.unit-test\"" | grep "TARGETED_DEVICE_FAMILY" || echo -e "${RED}No TARGETED_DEVICE_FAMILY found for test targets!${NC}"

# Check SUPPORTED_PLATFORMS
echo ""
echo -e "${YELLOW}=== SUPPORTED_PLATFORMS Settings ===${NC}"
echo -e "${BLUE}Test targets:${NC}"
grep -A30 "isa = PBXNativeTarget" "$PBXPROJ" | grep -A30 -B5 "productType = \"com.apple.product-type.bundle.unit-test\"" | grep "SUPPORTED_PLATFORMS" || echo "No SUPPORTED_PLATFORMS found for test targets"

# List available schemes
echo ""
echo -e "${YELLOW}=== Available Schemes ===${NC}"
cd "$PROJECT_PATH"
if command -v xcodebuild &> /dev/null; then
    xcodebuild -list | grep -A10 "Schemes:" || echo "No schemes found"
else
    echo -e "${RED}xcodebuild not found in PATH${NC}"
fi

# Recommendation
echo ""
echo -e "${YELLOW}=== Diagnosis Summary ===${NC}"

if grep -A30 "isa = PBXNativeTarget" "$PBXPROJ" | grep -A30 -B5 "productType = \"com.apple.product-type.bundle.unit-test\"" | grep -q "TARGETED_DEVICE_FAMILY = 2"; then
    echo -e "${GREEN}✅ Test target supports iPad (TARGETED_DEVICE_FAMILY = 2)${NC}"
elif grep -A30 "isa = PBXNativeTarget" "$PBXPROJ" | grep -A30 -B5 "productType = \"com.apple.product-type.bundle.unit-test\"" | grep -q "TARGETED_DEVICE_FAMILY = \"1,2\""; then
    echo -e "${GREEN}✅ Test target supports both iPhone and iPad (TARGETED_DEVICE_FAMILY = \"1,2\")${NC}"
else
    echo -e "${RED}❌ Test target missing iPad support!${NC}"
    echo ""
    echo -e "${BLUE}To fix this issue:${NC}"
    echo "1. Open the project in Xcode"
    echo "2. Select the TEST target (not the main target)"
    echo "3. Go to Build Settings"
    echo "4. Search for 'TARGETED_DEVICE_FAMILY'"
    echo "5. Set it to '2' for iPad-only or '1,2' for universal"
    echo ""
    echo -e "${BLUE}Alternatively, manually edit project.pbxproj:${NC}"
    echo "Find the test target's build configuration and add:"
    echo 'TARGETED_DEVICE_FAMILY = "1,2";  // For both iPhone and iPad'
    echo 'or'
    echo 'TARGETED_DEVICE_FAMILY = 2;      // For iPad only'
fi

echo ""
echo -e "${YELLOW}=== Quick Test Commands ===${NC}"
echo "Boot iPad simulator:"
echo "  boot_sim({ simulatorUuid: 'UUID_FROM_LIST_SIMS' })"
echo ""
echo "Run tests on iPad:"
echo "  test_sim({"
echo "    projectPath: '$PROJECT_PATH',"
echo "    scheme: 'YOUR_SCHEME',"
echo "    simulatorName: 'iPad Pro 11-inch (M4)',"
echo "    platform: 'iOS Simulator'"
echo "  })"

echo ""
echo -e "${GREEN}=== Diagnostic Complete ===${NC}"
