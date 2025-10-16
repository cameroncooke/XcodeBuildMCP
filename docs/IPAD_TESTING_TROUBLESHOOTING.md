# iPad Testing Troubleshooting Guide

## Issue: "Cannot test target on iPad Pro: target does not support iPad's platform"

### Problem Description

When attempting to run tests on iPad simulators, you encounter the error:
```
Cannot test target "orchestratorTests" on "iPad Pro 11-inch (M4)": orchestratorTests does not support iPad Pro 11-inch (M4)'s platform: com.apple.platform.iphonesimulator
```

### Root Cause

This error occurs when the **test target** (not the main app target) lacks proper platform support for iPad simulators. The most common causes are:

1. **Missing `TARGETED_DEVICE_FAMILY` in Test Target**: The test target doesn't specify iPad support
2. **Incorrect SDK Setting**: Test target is configured for iPhone-only SDK
3. **Missing Supported Platforms**: Test target doesn't list iPad simulator as a supported platform

### Solutions

#### Solution 1: Fix TARGETED_DEVICE_FAMILY (Most Common)

In your `.pbxproj` file, ensure the test target has:

```bash
# For iPad-only test target
TARGETED_DEVICE_FAMILY = 2

# For universal test target (both iPhone and iPad)  
TARGETED_DEVICE_FAMILY = "1,2"
```

**Example fix in project.pbxproj:**
```xml
<!-- Find your test target's build configuration -->
buildSettings = {
    TARGETED_DEVICE_FAMILY = 2;  <-- Add this for iPad-only
    // OR "1,2" for both iPhone and iPad
}
```

#### Solution 2: Update Test Target in Xcode

1. Open the project in Xcode
2. Select the **test target** (not the main target)
3. Go to **Build Settings**
4. Search for `TARGETED_DEVICE_FAMILY`
5. Set it to `2` for iPad-only or `1,2` for universal

#### Solution 3: Verify Supported Platforms

Ensure the test target's Info.plist includes:
```xml
<key>UISupportedDevices</key>
<array>
    <string>ipad</string>
</array>
```

### Correct Test Command Usage

For iPad app testing, use:
```bash
# Using XcodeBuildMCP tools
test_sim({
    projectPath: "/path/to/orchestrator.xcodeproj",
    scheme: "orchestrator", 
    simulatorName: "iPad Pro 11-inch (M4)",
    platform: "iOS Simulator"
})
```

### Verification Steps

1. **Check scheme configuration:**
   ```bash
   list_schemes({projectPath: "/path/to/orchestrator.xcodeproj"})
   ```

2. **Verify test target exists:**
   ```bash
   show_build_settings({
       projectPath: "/path/to/orchestrator.xcodeproj",
       scheme: "orchestrator"
   })
   ```

3. **Test different iPad simulators if one fails:**
   - iPad Pro 11-inch (M4) - iOS 18.4
   - iPad Pro 11-inch (M4) - iOS 26.0
   - iPad Air 11-inch (M2/M3)

### Common Pitfalls

1. **Only checking main app target** - The test target can have different settings
2. **Using wrong scheme** - Ensure you're using the main app scheme, not test-only scheme
3. **Outdated simulators** - Ensure iPad simulators are installed and booted

### Example Working Configuration

```xml
<!-- In project.pbxproj for test target -->
8D1234567890ABCD /* Debug */ = {
    isa = XCBuildConfiguration;
    buildSettings = {
        PRODUCT_NAME = "$(TARGET_NAME)";
        TARGETED_DEVICE_FAMILY = "1,2";  <!-- Supports both iPhone and iPad -->
        SDKROOT = iphoneos;
        SUPPORTED_PLATFORMS = "iphonesimulator iphoneos";
    };
    name = Debug;
};
```

### Related Tools

- `list_sims` - List available iPad simulators
- `boot_sim` - Boot specific iPad simulator  
- `test_sim` - Run tests on simulator
- `show_build_settings` - Verify target configuration
