# Apple Vision Pro Development Workflow with XcodeBuildMCP

## Overview

This guide demonstrates how to use XcodeBuildMCP for Apple Vision Pro (AVP) development, including building, testing, and capturing logs from both visionOS simulators and physical Vision Pro headsets.

## ✅ visionOS Support Verified

XcodeBuildMCP fully supports visionOS across all tool categories:
- ✅ **visionOS Simulator** - Full simulator support (build, run, test, log capture, UI automation)
- ✅ **Physical Vision Pro** - Complete device support (build, install, launch, test, log capture)
- ✅ **Platform Detection** - Automatic visionOS platform recognition in `list_devices`
- ✅ **Build Tools** - Native visionOS build configurations

## Configuration

Your Cursor is now configured with optimized workflows for AVP development:

**~/.cursor/mcp.json:**
```json
{
  "XcodeBuildMCP": {
    "command": "npx",
    "args": ["-y", "xcodebuildmcp@latest"],
    "env": {
      "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing",
      "XCODEBUILDMCP_SENTRY_DISABLED": "true",
      "INCREMENTAL_BUILDS_ENABLED": "false"
    }
  }
}
```

**Environment Variables Explained:**
- `ENABLED_WORKFLOWS`: Loads only relevant tools (63 tools instead of 83)
- `SENTRY_DISABLED`: No telemetry sent (privacy-focused)
- `INCREMENTAL_BUILDS_ENABLED`: Disabled (experimental feature)

## Critical: Physical Vision Pro Log Capture

### How It Works

When you need logs from your **physical Apple Vision Pro headset**:

1. **Start Log Capture** (AI agent does this automatically):
   ```typescript
   start_device_log_cap({
     deviceId: "YOUR_VISION_PRO_UDID",
     bundleId: "com.yourcompany.yourapp"
   })
   ```
   - Returns a `sessionId` for later retrieval
   - Launches app with `xcrun devicectl` capturing console output
   - Logs stream to temp file: `/tmp/xcodemcp_device_log_{sessionId}.log`

2. **Stop and Retrieve Logs** (AI agent does this when ready):
   ```typescript
   stop_device_log_cap({
     logSessionId: "session-uuid-from-start"
   })
   ```
   - Terminates log capture process
   - Returns complete log contents
   - AI can now analyze logs WITHOUT you copy-pasting

### Log Retention
- Device logs are automatically cleaned up after **3 days**
- Stored in system temp directory: `/tmp/`

## Complete AVP Development Workflows

### Workflow 1: Vision Pro Simulator Development

**Discover Available visionOS Simulators:**
```
AI: "List available Vision Pro simulators"
```
This calls `list_sims` which returns all available simulators including:
- `com.apple.CoreSimulator.SimRuntime.xrOS-*` runtimes
- Apple Vision Pro variants (4K, standard resolutions)

**Build and Run:**
```
AI: "Build and run my app on Vision Pro simulator"
```
Calls sequence:
1. `build_sim({ scheme: "YourScheme", simulatorName: "Apple Vision Pro", platform: "visionOS Simulator" })`
2. `boot_sim({ simulatorUuid: "..." })`
3. `install_app_sim({ simulatorUuid: "...", appPath: "..." })`
4. `launch_app_sim({ simulatorUuid: "...", bundleId: "..." })`

**Capture Simulator Logs:**
```
AI: "Show me the logs from the Vision Pro simulator"
```
Calls:
1. `start_sim_log_cap({ simulatorUuid: "...", bundleId: "com.your.app" })`
2. *waits for log data*
3. `stop_sim_log_cap({ logSessionId: "..." })`
4. AI analyzes logs and suggests fixes

### Workflow 2: Physical Vision Pro Device (CRITICAL FOR YOU)

**Discover Your Headset:**
```
AI: "List connected Apple Vision Pro devices"
```
Calls `list_devices` which detects:
- Physical Vision Pro over USB or Wi-Fi
- Platform identified as "visionOS"
- Device state (paired/connected)

**Build for Device:**
```
AI: "Build my app for Vision Pro device"
```
Calls `build_device({ scheme: "YourScheme", platform: "visionOS", deviceId: "..." })`

**Install and Launch:**
```
AI: "Install and launch my app on the Vision Pro"
```
Calls sequence:
1. `install_app_device({ deviceId: "...", appPath: "..." })`
2. `launch_app_device({ deviceId: "...", bundleId: "com.your.app" })`

**Capture Headset Logs (THE KEY FEATURE FOR YOU):**
```
AI: "Start capturing logs from my Vision Pro headset"
```
Calls:
1. `start_device_log_cap({ deviceId: "YOUR_VISION_PRO_UDID", bundleId: "com.your.app" })`
   - Launches app on headset with console output
   - Streams logs in real-time to temp file
2. *You use the app, reproduce issues*
3. `stop_device_log_cap({ logSessionId: "..." })`
   - Returns complete logs
   - AI reads and analyzes automatically

**Example Conversation:**
```
You: "I'm getting a crash when I press the spatial menu button. Can you check the logs?"

AI: [Automatically calls start_device_log_cap]
"Log capture started. Please reproduce the crash..."

You: [Use headset, trigger crash]
"Done, the crash just happened"

AI: [Automatically calls stop_device_log_cap]
[Reads logs directly]
"I see a EXC_BAD_ACCESS at line 245 in SpatialMenuController.swift. 
The issue is a nil optional being force-unwrapped. Here's the fix..."
```

### Workflow 3: Running Tests on Vision Pro

**Run Test Suite:**
```
AI: "Run tests on my Vision Pro device"
```
Calls `test_device({ scheme: "YourScheme", deviceId: "...", platform: "visionOS" })`
- Executes all tests
- Returns detailed results with pass/fail counts
- AI can analyze test failures automatically

## Tool Quick Reference

### Device Discovery
| Tool | Purpose | Example Usage |
|------|---------|---------------|
| `list_devices` | Find connected Vision Pro | `list_devices({})` |
| `list_sims` | Find visionOS simulators | `list_sims({})` |

### Build & Deploy
| Tool | Purpose | visionOS Support |
|------|---------|------------------|
| `build_device` | Build for physical AVP | ✅ `platform: "visionOS"` |
| `build_sim` | Build for visionOS simulator | ✅ `platform: "visionOS Simulator"` |
| `install_app_device` | Install on physical AVP | ✅ Works with AVP UDID |
| `install_app_sim` | Install on visionOS simulator | ✅ Works with visionOS sim UUID |
| `launch_app_device` | Launch on physical AVP | ✅ Works with AVP bundle ID |
| `launch_app_sim` | Launch on visionOS simulator | ✅ Works with visionOS sim UUID |

### Log Capture (MOST CRITICAL FOR YOU)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `start_device_log_cap` | **Start capturing logs from physical Vision Pro** | When debugging on actual headset |
| `stop_device_log_cap` | Stop and retrieve headset logs | After reproducing issue on headset |
| `start_sim_log_cap` | Start capturing visionOS simulator logs | When testing in simulator |
| `stop_sim_log_cap` | Stop and retrieve simulator logs | After reproducing issue in sim |

### Testing
| Tool | Purpose | visionOS Support |
|------|---------|------------------|
| `test_device` | Run tests on physical AVP | ✅ `platform: "visionOS"` |
| `test_sim` | Run tests on visionOS simulator | ✅ Detects visionOS runtime |

### UI Automation (Simulator Only)
| Tool | Purpose | visionOS Support |
|------|---------|------------------|
| `describe_ui` | Get UI hierarchy with coordinates | ✅ Works on visionOS sim |
| `tap` | Tap at coordinates | ✅ Works on visionOS sim |
| `swipe` | Swipe gestures | ✅ Works on visionOS sim |
| `screenshot` | Capture screenshot | ✅ Works on visionOS sim |
| `type_text` | Type text input | ✅ Works on visionOS sim |

## Natural Language Examples

You can ask the AI agent in natural language, and it will automatically use the appropriate tools:

### Physical Vision Pro Development
```
You: "I need to test my spatial UI changes on my actual Vision Pro headset"
AI: [Automatically: list_devices → build_device → install → launch]

You: "The hand tracking is not working correctly. Can you capture the logs?"
AI: [Automatically: start_device_log_cap → waits → stop_device_log_cap → analyzes]

You: "There's a memory leak when switching between immersive spaces"
AI: [Starts log capture, you reproduce, AI analyzes logs and suggests fixes]
```

### Simulator Development
```
You: "Build and run on Vision Pro 4K simulator"
AI: [Automatically: build_sim → boot_sim → install → launch]

You: "The gesture recognition isn't working in the simulator"
AI: [Captures simulator logs, analyzes, suggests fixes]
```

## Benefits vs Manual Workflow

### Before XcodeBuildMCP:
1. Put on Vision Pro headset
2. Reproduce issue
3. Take off headset
4. Open Console.app
5. Find device logs manually
6. Copy relevant logs
7. Paste into AI chat
8. AI analyzes
9. Repeat...

### With XcodeBuildMCP:
1. Ask AI: "Capture logs from my Vision Pro"
2. Put on headset, reproduce issue
3. AI automatically retrieves and analyzes logs
4. Get fix suggestions immediately
5. Done! 🎉

**Time Savings:** 5-10 minutes per debugging iteration → ~30 seconds

## Code Signing Requirements

For physical Vision Pro deployment, ensure code signing is configured in Xcode:
1. Open project in Xcode
2. Select target → Signing & Capabilities
3. Enable "Automatically manage signing"
4. Select your development team
5. Verify provisioning profile is valid

XcodeBuildMCP cannot configure code signing automatically - this must be done once in Xcode.

## Restart Required

After updating `~/.cursor/mcp.json`:
1. **Quit Cursor completely** (Cmd+Q)
2. **Relaunch Cursor**
3. XcodeBuildMCP will auto-load with new configuration

## Verification

To verify XcodeBuildMCP is working correctly with visionOS:

```
You: "List available visionOS simulators"
```
Should show Apple Vision Pro simulators with xrOS runtimes.

```
You: "Do you see my Vision Pro headset?"
```
If connected, AI will call `list_devices` and confirm Vision Pro detection.

## Troubleshooting

**Vision Pro not detected:**
- Ensure device is connected via USB or paired over Wi-Fi
- Check device is unlocked and trusted
- Run: `xcrun devicectl list devices`

**Log capture fails:**
- Verify app is built with development provisioning
- Check bundle ID matches installed app
- Ensure device is not in sleep mode

**"Sentry" concerns:**
- With your config, Sentry is **disabled** - no data sent to developers
- All operations are 100% local on your Mac

## Support

For XcodeBuildMCP issues:
- Run doctor tool: `npx --package xcodebuildmcp@latest xcodebuildmcp-doctor`
- Check GitHub issues: https://github.com/cameroncooke/XcodeBuildMCP
- Review logs in Cursor's MCP output panel

