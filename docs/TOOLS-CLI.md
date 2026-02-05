# XcodeBuildMCP CLI Tools Reference

This document lists CLI tool names as exposed by `xcodebuildmcp <workflow> <tool>`.

XcodeBuildMCP provides 71 canonical tools organized into 13 workflow groups.

## Workflow Groups

### Build Utilities (`utilities`)
**Purpose**: Utility tools for cleaning build products and managing build artifacts. (1 tools)

- `clean` - Defined in iOS Device Development workflow.



### iOS Device Development (`device`)
**Purpose**: Complete iOS development workflow for physical devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). (14 tools)

- `build-device` - Build for device.
- `clean` - Clean build products.
- `discover-projs` - Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.
- `get-app-bundle-id` - Extract bundle id from .app.
- `get-device-app-path` - Get device built app path.
- `install-app-device` - Install app on device.
- `launch-app-device` - Launch app on device.
- `list-devices` - List connected devices.
- `list-schemes` - List Xcode schemes.
- `show-build-settings` - Show build settings.
- `start-device-log-cap` - Start device log capture.
- `stop-app-device` - Stop device app.
- `stop-device-log-cap` - Stop device app and return logs.
- `test-device` - Test on device.



### iOS Simulator Development (`simulator`)
**Purpose**: Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting simulators. (21 tools)

- `boot-sim` - Defined in Simulator Management workflow.
- `build-run-sim` - Build and run iOS sim.
- `build-sim` - Build for iOS sim.
- `clean` - Defined in iOS Device Development workflow.
- `discover-projs` - Defined in iOS Device Development workflow.
- `get-app-bundle-id` - Defined in iOS Device Development workflow.
- `get-sim-app-path` - Get sim built app path.
- `install-app-sim` - Install app on sim.
- `launch-app-logs-sim` - Launch sim app with logs.
- `launch-app-sim` - Launch app on simulator.
- `list-schemes` - Defined in iOS Device Development workflow.
- `list-sims` - Defined in Simulator Management workflow.
- `open-sim` - Defined in Simulator Management workflow.
- `record-sim-video` - Record sim video.
- `screenshot` - Capture screenshot.
- `show-build-settings` - Defined in iOS Device Development workflow.
- `snapshot-ui` - Print view hierarchy with precise view coordinates (x, y, width, height) for visible elements.
- `start-sim-log-cap` - Defined in Log Capture workflow.
- `stop-app-sim` - Stop sim app.
- `stop-sim-log-cap` - Defined in Log Capture workflow.
- `test-sim` - Test on iOS sim.



### LLDB Debugging (`debugging`)
**Purpose**: Attach LLDB debugger to simulator apps, set breakpoints, inspect variables and call stacks. (8 tools)

- `debug-attach-sim` - Attach LLDB to sim app.
- `debug-breakpoint-add` - Add breakpoint.
- `debug-breakpoint-remove` - Remove breakpoint.
- `debug-continue` - Continue debug session.
- `debug-detach` - Detach debugger.
- `debug-lldb-command` - Run LLDB command.
- `debug-stack` - Get backtrace.
- `debug-variables` - Get frame variables.



### Log Capture (`logging`)
**Purpose**: Capture and retrieve logs from simulator and device apps. (4 tools)

- `start-device-log-cap` - Defined in iOS Device Development workflow.
- `start-sim-log-cap` - Start sim log capture.
- `stop-device-log-cap` - Defined in iOS Device Development workflow.
- `stop-sim-log-cap` - Stop sim app and return logs.



### macOS Development (`macos`)
**Purpose**: Complete macOS development workflow for both .xcodeproj and .xcworkspace files. Build, test, deploy, and manage macOS applications. (11 tools)

- `build-macos` - Build macOS app.
- `build-run-macos` - Build and run macOS app.
- `clean` - Defined in iOS Device Development workflow.
- `discover-projs` - Defined in iOS Device Development workflow.
- `get-mac-app-path` - Get macOS built app path.
- `get-mac-bundle-id` - Extract bundle id from macOS .app.
- `launch-mac-app` - Launch macOS app.
- `list-schemes` - Defined in iOS Device Development workflow.
- `show-build-settings` - Defined in iOS Device Development workflow.
- `stop-mac-app` - Stop macOS app.
- `test-macos` - Test macOS target.



### MCP Doctor (`doctor`)
**Purpose**: Diagnostic tool providing comprehensive information about the MCP server environment, dependencies, and configuration. (1 tools)

- `doctor` - MCP environment info.



### Project Discovery (`project-discovery`)
**Purpose**: Discover and examine Xcode projects, workspaces, and Swift packages. Analyze project structure, schemes, build settings, and bundle information. (5 tools)

- `discover-projs` - Defined in iOS Device Development workflow.
- `get-app-bundle-id` - Defined in iOS Device Development workflow.
- `get-mac-bundle-id` - Defined in macOS Development workflow.
- `list-schemes` - Defined in iOS Device Development workflow.
- `show-build-settings` - Defined in iOS Device Development workflow.



### Project Scaffolding (`project-scaffolding`)
**Purpose**: Scaffold new iOS and macOS projects from templates. (2 tools)

- `scaffold-ios-project` - Scaffold iOS project.
- `scaffold-macos-project` - Scaffold macOS project.



### Simulator Management (`simulator-management`)
**Purpose**: Tools for managing simulators from booting, opening simulators, listing simulators, stopping simulators, erasing simulator content and settings, and setting simulator environment options like location, network, statusbar and appearance. (8 tools)

- `boot-sim` - Boot iOS simulator.
- `erase-sims` - Erase simulator.
- `list-sims` - List iOS simulators.
- `open-sim` - Open Simulator app.
- `reset-sim-location` - Reset sim location.
- `set-sim-appearance` - Set sim appearance.
- `set-sim-location` - Set sim location.
- `sim-statusbar` - Set sim status bar network.



### Swift Package Development (`swift-package`)
**Purpose**: Build, test, run and manage Swift Package Manager projects. (6 tools)

- `swift-package-build` - swift package target build.
- `swift-package-clean` - swift package clean.
- `swift-package-list` - List SwiftPM processes.
- `swift-package-run` - swift package target run.
- `swift-package-stop` - Stop SwiftPM run.
- `swift-package-test` - Run swift package target tests.



### UI Automation (`ui-automation`)
**Purpose**: UI automation and accessibility testing tools for iOS simulators. Perform gestures, interactions, screenshots, and UI analysis for automated testing workflows. (11 tools)

- `button` - Press simulator hardware button.
- `gesture` - Simulator gesture preset.
- `key-press` - Press key by keycode.
- `key-sequence` - Press a sequence of keys by their keycodes.
- `long-press` - Long press at coords.
- `screenshot` - Defined in iOS Simulator Development workflow.
- `snapshot-ui` - Defined in iOS Simulator Development workflow.
- `swipe` - Swipe between points.
- `tap` - Tap coordinate or element.
- `touch` - Touch down/up at coords.
- `type-text` - Type text.



### Xcode IDE Integration (`xcode-ide`)
**Purpose**: Bridge tools for connecting to Xcode's built-in MCP server (mcpbridge) to access IDE-specific functionality. (3 tools)

- `xcode-tools-bridge-disconnect` - Disconnect bridge and unregister proxied `xcode_tools_*` tools.
- `xcode-tools-bridge-status` - Show xcrun mcpbridge availability and proxy tool sync status.
- `xcode-tools-bridge-sync` - One-shot connect + tools/list sync (manual retry; avoids background prompt spam).



## Summary Statistics

- **Canonical Tools**: 71
- **Total Tools**: 95
- **Workflow Groups**: 13

---

*This documentation is automatically generated by `scripts/update-tools-docs.ts` from the tools manifest. Last updated: 2026-02-05T21:23:22.870Z UTC*
