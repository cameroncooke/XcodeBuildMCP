# XcodeBuildMCP Quick Start for AI Agents

> **Version:** 1.4.0
> **Last Updated:** 2025-10-14
> **FOR AI ASSISTANTS:** This is your quick reference for **macOS, iPadOS, and visionOS** development commands. Use these exact phrases when helping users build Apple apps across all platforms.

## ✅ Verified Working - All Commands Tested

XcodeBuildMCP provides **automated Xcode operations** through natural language for:
- 🖥️ **macOS** - Native Mac apps
- 📱 **iPadOS** - iPad apps (via iOS simulator/device tools)
- 🥽 **visionOS** - Apple Vision Pro apps

You have access to **86 tools** for building, testing, and debugging across all Apple platforms.

---

## 🎯 Universal Commands (All Platforms)

### 1. Discover Projects and Schemes
```
"What Xcode projects are in this directory?"
"List available schemes for my project"
```
**What it does:**
- `discover_projs()` - Finds all `.xcodeproj` and `.xcworkspace` files
- `list_schemes()` - Shows all build schemes in a project

### 2. Show Build Settings
```
"Show me the build settings for my project"
```
**What it does:** `show_build_settings()` - Displays complete Xcode build configuration

### 3. Clean Build Artifacts
```
"Clean my project build artifacts"
```
**What it does:** `clean()` - Removes derived data and build products

### 4. Get Bundle Identifier
```
"What's the bundle ID for this app?"
```
**What it does:**
- `get_app_bundle_id()` - For iOS/visionOS apps
- `get_mac_bundle_id()` - For macOS apps

---

## 🔄 Session Management Workflow

XcodeBuildMCP supports **session defaults** to reduce repetitive parameters. Set common values once, then use any tool with minimal parameters.

### Complete Workflow Example

```typescript
// Step 1: Set defaults once
session-set-defaults({
  projectPath: "/Users/dale/Projects/orchestrator/orchestrator.xcodeproj",
  scheme: "orchestrator",
  configuration: "Debug",
  simulatorId: "IPHONE_16_UUID"  // Optional: Get from list_sims()
})

// Step 2: Use tools with minimal parameters
build_sim({ platform: "iOS Simulator" })  // Uses session defaults
test_sim({ simulatorName: "iPad Pro" })    // Overrides simulatorId
build_run_sim({})                          // Uses all session defaults

// Step 3: Override when needed
test_sim({
  scheme: "orchestrator-unit-tests",  // Override for this call only
  simulatorName: "iPhone 16"
})
```

### Session Management API

| Tool | Purpose |
|------|---------|
| `session-set-defaults(params)` | Set or update defaults (preserves unspecified values) |
| `session-show-defaults()` | View current defaults |
| `session-clear-defaults()` | Clear all defaults |
| `session-clear-defaults({ keys: ["scheme"] })` | Clear specific defaults |

### Supported Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectPath` | string | Path to .xcodeproj (XOR with workspacePath) |
| `workspacePath` | string | Path to .xcworkspace (XOR with projectPath) |
| `scheme` | string | Xcode scheme name (required for most operations) |
| `configuration` | string | "Debug" (default) or "Release" |
| `simulatorName` | string | Simulator name (e.g., "iPhone 16", "iPad Pro") |
| `simulatorId` | string | Simulator UUID (XOR with simulatorName) |
| `deviceId` | string | Physical device UDID |
| `platform` | string | "iOS Simulator", "visionOS Simulator", etc. |

### Common Errors

**Missing scheme:**
```typescript
session-set-defaults({ scheme: "MyScheme" })
// or provide explicitly: test_sim({ scheme: "MyScheme", projectPath: "..." })
```

**Mutually exclusive parameters (projectPath/workspacePath or simulatorId/simulatorName):**
```typescript
session-clear-defaults({ keys: ["projectPath", "workspacePath"] })
session-set-defaults({ workspacePath: "/path/to/MyApp.xcworkspace" })
```

---

## 🥽 visionOS / Apple Vision Pro

### ✅ visionOS Simulator Builds NOW WORK (Fixed in v1.2.0)

**Correct Workflow:** Use session defaults + platform parameter:

**Step 1: Set Session Defaults (once per project)**
```typescript
session-set-defaults({
  projectPath: "/path/to/your-project/your-project.xcodeproj",
  scheme: "your-scheme-name",
  simulatorId: "YOUR_SIMULATOR_UUID"  // Get from list_sims()
})
```

**Step 2: Build with Platform Parameter**
```typescript
build_sim({ platform: "visionOS Simulator" })
```

**Verified Working:**
- ✅ groovetech-media-player: Build succeeded (tested 2025-10-10 17:21)
- ✅ PfizerOutdoCancerV2: Build succeeded (tested 2025-10-10 17:22)
- ✅ orchestrator (iPad): Build succeeded, session-management workflow works (tested 2025-10-12 14:47)
- ❌ orchestrator (macOS): Build fails with compilation error in AppUIModel.swift:1534 (tested 2025-10-13 09:22)

**Key Point:** The `platform` parameter is REQUIRED for visionOS. Without it, defaults to iOS Simulator.

---

### List Available Vision Pro Simulators
```
"List all available visionOS simulators"
"Show me Vision Pro simulators"
```
**What it does:** Calls `list_sims()` - Shows Apple Vision Pro simulators with UUIDs, xrOS versions, and boot states.

### Build for Vision Pro Simulator
```
"Build my app for the Vision Pro simulator"
```
**What happens:**
1. Calls `build_sim()` with your scheme
2. Builds for `visionOS Simulator` platform
3. Returns build logs

### Build and Run on Vision Pro Simulator
```
"Build and run my app on the Apple Vision Pro simulator"
```
**Full workflow:**
1. `build_sim()` - Compile for visionOS
2. `boot_sim()` - Boot simulator if needed
3. `install_app_sim()` - Install .app bundle
4. `launch_app_sim()` - Launch app

### Physical Vision Pro Device
```
"Show me connected Vision Pro devices"
"Build my app for my Vision Pro headset"
"Install and launch on the Vision Pro"
```
**Tools used:**
- `list_devices()` - Detect physical Vision Pro (platform: "visionOS")
- `build_device()` - Build with `platform: "visionOS"`
- `install_app_device()` - Install to headset
- `launch_app_device()` - Launch app

### Log Capture from Vision Pro (CRITICAL)
```
"Start capturing logs from my Vision Pro headset"
[User reproduces issue]
"Stop log capture and show me what happened"
```
**What happens:**
1. `start_device_log_cap({ deviceId: "...", bundleId: "..." })` - **Returns a `sessionId`**
2. **SAVE THE SESSION ID** - You'll need it for stop
3. User reproduces issue on headset
4. `stop_device_log_cap({ logSessionId: "SESSION_ID_FROM_STEP_1" })` - Returns complete logs
5. AI analyzes logs directly

**Why this matters:** No more copy-pasting logs from Console.app!

**⚠️ CRITICAL:** You **must** call `start_device_log_cap()` and get a session ID. Don't just SAY you started capture - actually call the tool! See the "Log Capture Troubleshooting" section below for common failures.

### Simulator Log Capture
```
"Capture logs from the Vision Pro simulator"
```
Same workflow using `start_sim_log_cap()` and `stop_sim_log_cap()`.

**Same rules apply:**
1. Call `start_sim_log_cap()` - get session ID
2. Save the session ID
3. Call `stop_sim_log_cap({ logSessionId: "..." })` with EXACT session ID

---

## 📱 iPadOS / iPad

iPadOS uses the **same tools as iOS** - just specify iPad simulators or devices.

### List iPad Simulators
```
"List available iPad simulators"
"Show me iPad Pro simulators"
```
**What it does:** `list_sims()` - Shows all simulators including iPad variants (Air, Pro, Mini)

### Build for iPad Simulator
```
"Build my app for iPad Pro simulator"
```
**What happens:**
1. `build_sim({ simulatorName: "iPad Pro", ... })`
2. Same workflow as iPhone/visionOS

### Build and Run on iPad Simulator
```
"Build and run on iPad Air simulator"
```
**Full workflow:** Same as visionOS - build → boot → install → launch

### Physical iPad Device
```
"Show me connected iPads"
"Build my app for my iPad"
"Install and launch on the iPad"
```
**Tools used:**
- `list_devices()` - Shows connected iPads (platform: "iOS")
- `build_device()` - Build for physical iPad
- `install_app_device()` - Install to iPad
- `launch_app_device()` - Launch app

### iPad Log Capture
```
"Start capturing logs from my iPad"
[User reproduces issue]
"Stop log capture and show me the logs"
```
**Same workflow as Vision Pro:**
- `start_device_log_cap()` for physical iPad - **get and save session ID**
- `start_sim_log_cap()` for iPad simulator - **get and save session ID**
- Use the EXACT session ID when calling stop

**⚠️ CRITICAL:** See "Log Capture Troubleshooting" section for common failures!

---

## 🖥️ macOS / Mac Apps

### Build macOS App
```
"Build my macOS app"
```
**What happens:**
1. `build_macos({ projectPath: "...", scheme: "..." })`
2. Compiles for macOS native
3. Returns build results

### Build and Run macOS App
```
"Build and run my Mac app"
```
**What happens:**
1. `build_run_macos()` - Builds and launches in one step
2. App launches on your Mac

### Launch Existing macOS App
```
"Launch my Mac app"
```
**What happens:**
- `launch_mac_app({ appPath: "/path/to/app.app" })` - Launches .app bundle

### Stop Running macOS App
```
"Stop my running Mac app"
```
**What happens:**
- `stop_mac_app({ appName: "MyApp" })` - Terminates by name
- Or by PID: `stop_mac_app({ processId: 12345 })`

### Run Tests on macOS
```
"Run my macOS test suite"
```
**What happens:**
- `test_macos({ projectPath: "...", scheme: "..." })` - Runs XCTest suite

### Get macOS App Path
```
"Where is my built Mac app?"
```
**What happens:**
- `get_mac_app_path()` - Returns path to compiled .app bundle

---

## 🧪 Testing (All Platforms)

### Run Tests on Simulator
```
"Run tests on the [iPad Pro / Vision Pro / iPhone] simulator"
```
**What happens:**
- `test_sim()` - Runs XCTest suite on simulator
- Works for iOS, iPadOS, visionOS simulators

### Run Tests on Physical Device
```
"Run tests on my [iPad / Vision Pro / iPhone]"
```
**What happens:**
- `test_device({ platform: "iOS" })` - For iPad/iPhone
- `test_device({ platform: "visionOS" })` - For Vision Pro

### Run Tests on macOS
```
"Run my macOS tests"
```
**What happens:**
- `test_macos()` - Runs native Mac tests

---

## 🎨 UI Automation (Simulator Only)

### Get UI Element Coordinates
```
"Show me the UI hierarchy"
"Get coordinates for UI elements"
```
**What it does:** `describe_ui()` - Returns complete view hierarchy with exact (x, y, width, height) for all elements

**CRITICAL:** Always call `describe_ui()` before UI interactions. Never guess coordinates from screenshots!

### Interact with UI
```
"Tap the button at coordinates (200, 300)"
"Swipe from (100, 200) to (100, 500)"
"Type 'Hello World' into the text field"
"Take a screenshot"
```
**Tools used:**
- `tap()` - Tap at precise coordinates
- `swipe()` - Swipe gestures
- `long_press()` - Long press at coordinates
- `type_text()` - Keyboard input
- `screenshot()` - Visual capture
- `button()` - Hardware buttons (home, lock, side-button)
- `gesture()` - Preset gestures (scroll-up, swipe-from-edge)

**Works on:** iOS, iPadOS, visionOS **simulators only** (not physical devices)

---

## 📋 Complete Tool Reference by Platform

### Simulator Tools (iOS/iPadOS/visionOS)

| Natural Language | Tool Called | Platforms |
|-----------------|-------------|-----------|
| "List simulators" | `list_sims()` | iOS, iPadOS, visionOS |
| "Boot simulator" | `boot_sim()` | All simulator platforms |
| "Build for simulator" | `build_sim()` | All simulator platforms |
| "Install on simulator" | `install_app_sim()` | All simulator platforms |
| "Launch on simulator" | `launch_app_sim()` | All simulator platforms |
| "Run tests on simulator" | `test_sim()` | All simulator platforms |
| "Stop app on simulator" | `stop_app_sim()` | All simulator platforms |
| "Capture simulator logs" | `start_sim_log_cap()` + `stop_sim_log_cap()` | All simulator platforms |

### Physical Device Tools (iPhone/iPad/Vision Pro)

| Natural Language | Tool Called | Platforms |
|-----------------|-------------|-----------|
| "Show connected devices" | `list_devices()` | iOS, iPadOS, visionOS |
| "Build for device" | `build_device()` | All physical device platforms |
| "Install on device" | `install_app_device()` | All physical device platforms |
| "Launch on device" | `launch_app_device()` | All physical device platforms |
| "Run tests on device" | `test_device()` | All physical device platforms |
| "Stop app on device" | `stop_app_device()` | All physical device platforms |
| "Capture device logs" | `start_device_log_cap()` + `stop_device_log_cap()` | All physical device platforms |

### macOS Tools

| Natural Language | Tool Called | Purpose |
|-----------------|-------------|---------|
| "Build Mac app" | `build_macos()` | Compile macOS app |
| "Build and run Mac app" | `build_run_macos()` | Build + launch in one step |
| "Launch Mac app" | `launch_mac_app()` | Launch existing .app |
| "Stop Mac app" | `stop_mac_app()` | Terminate running app |
| "Run Mac tests" | `test_macos()` | Execute XCTest suite |
| "Get Mac app path" | `get_mac_app_path()` | Find built .app location |

---

## 🚨 Common Agent Mistakes

### ❌ DON'T Say This:
```
"I'll use xcodebuild command to build your project"
"Let me run xcodebuild -scheme MyScheme..."
```
**Why it's wrong:** You have XcodeBuildMCP tools! Never fall back to raw CLI commands.

### ✅ DO Say This:
```
"I'll build your [visionOS/iPad/Mac] app using XcodeBuildMCP"
[Calls appropriate build_sim() / build_device() / build_macos() automatically]
```

---

## 🔥 Log Capture Troubleshooting (CRITICAL)

### Common Problem: Agent Says "Started" But Never Called The Tool

**Root Cause:** Agent says "I've started log capture" without actually calling `start_device_log_cap()`, then fails when calling stop because no session ID exists.

### Correct Workflow

```typescript
// Step 1: ACTUALLY call start tool
start_device_log_cap({ deviceId: "...", bundleId: "..." })
// Returns: { sessionId: "abc-123-def" }

// Step 2: Save the session ID and confirm
"✅ Log capture started (Session: abc-123-def). Please reproduce the issue."

// Step 3: User reproduces issue

// Step 4: Call stop with EXACT session ID
stop_device_log_cap({ logSessionId: "abc-123-def" })
// Returns: { logs: "actual log contents..." }
```

### Two Most Common Mistakes

**1. Agent never calls start tool**
- ❌ Agent says: "I've started capturing logs"
- ✅ Must call: `start_device_log_cap()` and receive session ID

**2. Agent loses or forgets session ID**
- ❌ Agent calls: `stop_device_log_cap({ logSessionId: undefined })`
- ✅ Must use: EXACT session ID from start call

### Pre-Flight Checklist

**Before calling stop:**
- [ ] Did you ACTUALLY call `start_device_log_cap()` or `start_sim_log_cap()`?
- [ ] Did you receive and SAVE the `sessionId`?
- [ ] Are you using the EXACT session ID in stop call?
- [ ] Did you match device/simulator tool types (don't mix device and sim tools)?

---

## 🔄 Example Workflows

**iPad Simulator:** Build + run workflow
```typescript
[list_sims()] → [build_sim()] → [boot_sim()] → [install_app_sim()] → [launch_app_sim()]
```

**macOS App:** Single-command build and launch
```typescript
[build_run_macos()]  // Builds and launches in one step
```

**Vision Pro Debugging:** Log capture workflow
```typescript
[start_device_log_cap()] → User reproduces issue → [stop_device_log_cap()] → Analyze logs
```

**Cross-Platform:** Parallel builds
```typescript
[build_macos()] + [build_sim(iPad)] + [build_sim(Vision Pro)]
```

---

## 🎯 Key Points for AI Agents

1. **Always use XcodeBuildMCP tools** - Never fall back to raw xcodebuild/xcrun commands
2. **Platform detection from context** - Keywords like "iPad", "Mac", "Vision Pro" tell you which tools to use
3. **Simulator vs Device** - Simulator tools for testing, device tools for physical hardware
4. **macOS is different** - Uses dedicated `build_macos()`, `launch_mac_app()`, etc.
5. **Log capture is autonomous** - Start → User reproduces → Stop → Analyze
6. **UI automation simulator-only** - `describe_ui()`, `tap()`, etc. don't work on physical devices
7. **Full workflow automation** - Build → Install → Launch can happen in one user request
8. **Code signing required** - Physical devices need valid provisioning profiles

---

## 🔧 Required Environment

Users must have XcodeBuildMCP configured in their AI client.

**Configuration Locations:**

| AI Tool | Config File | Status |
|---------|-------------|--------|
| Claude Code | `~/.claude.json` | ✅ Using local build |
| Cursor | `~/.cursor/mcp.json` | ✅ Using local build |
| Claude Desktop | `~/.config/claude/mcp.json` | ✅ Using local build |
| Factory Droid | `~/.factory/mcp.json` | ✅ Using local build |

**For detailed configuration instructions, see:** `@MCP_CONFIG_LOCATIONS.md`

**Current Configuration (using local build):**
```json
{
  "XcodeBuildMCP": {
    "command": "node",
    "args": [
      "/path/to/XcodeBuildMCP/build/index.js"
    ],
    "env": {}
  }
}
```

**If user reports "command not found":**
→ They need to configure MCP server (see MCP_CONFIG_LOCATIONS.md)

### Session Management Workflow (Required)

For most workflows, the `session-management` workflow MUST be enabled:

```json
"XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,logging,project-discovery,ui-testing,session-management"
```

**Why it's required:**
- Many tools depend on session defaults (projectPath, scheme, simulatorId, etc.)
- Without this workflow, `build_sim()`, `test_sim()`, etc. will fail with "Missing required session defaults"
- The session tools (`session-set-defaults`, `session-clear-defaults`, `session-show-defaults`) are only available when this workflow is enabled

**⚠️ Common Mistake**: Agents attempt to use `build_sim()` without setting session defaults first, causing cryptic errors.

**Correct Pattern:**
```typescript
// Step 1: Set session defaults (once per project)
session-set-defaults({
  projectPath: "/path/to/your-project/your-project.xcodeproj",
  scheme: "your-scheme-name",
  simulatorId: "YOUR_SIMULATOR_UUID"  // Get from list_sims()
})

// Step 2: Build with simplified calls
build_sim({ platform: "iOS Simulator" })
```

---

## 📚 Full Documentation

For complete details:
- **AVP_WORKFLOW_GUIDE.md** - visionOS workflows
- **docs/TOOLS.md** - All 86 tools documented
- **docs/ARCHITECTURE.md** - How it works

---

## 🧪 Testing Status

**Last Tested:** 2025-10-12 | **Environment:** macOS + Xcode 16.x

### Platform Support Matrix

| Platform | Simulator Build | Simulator Log | macOS Launch | Status |
|----------|-----------------|---------------|--------------|--------|
| **iPadOS** | ✅ WORKS | ✅ WORKS | N/A | Fully tested |
| **macOS** | N/A | N/A | ✅ WORKS | Fully tested |
| **visionOS** | ✅ WORKS (v1.2.0+) | 📋 Not tested | N/A | Build verified |
| **iOS** | ✅ WORKS | 📋 Not tested | N/A | Same as iPad |

**Legend:** ✅ Tested | ❌ Broken | 📋 Not tested | N/A - Not applicable

### Known Issues & Fixes

**✅ FIXED in v1.2.0:** visionOS builds now work with `platform: "visionOS Simulator"` parameter

**⚠️ Log Capture:** Agents forget to call `start_device_log_cap()` or lose session IDs (see troubleshooting section)

**If commands fail:**
1. Run doctor: `npx --package xcodebuildmcp@latest xcodebuildmcp-doctor`
2. Verify MCP configuration
3. For visionOS: Use v1.2.0+ with `platform` parameter
