# XcodeBuildMCP CLI Tools Reference

This document lists CLI tool names as exposed by `xcodebuildmcp <workflow> <tool>`.

XcodeBuildMCP provides 71 canonical tools organized into 13 workflow groups.

## Workflow Groups

### iOS Device Development (`device`)
**Purpose**: Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting physical devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Build, test, deploy, and debug apps on real hardware. (14 tools)

- `build-device` - Build for device.
- `clean` - Defined in Project Utilities workflow.
- `discover-projs` - Defined in Project Discovery workflow.
- `get-app-bundle-id` - Defined in Project Discovery workflow.
- `get-device-app-path` - Get device built app path.
- `install-app-device` - Install app on device.
- `launch-app-device` - Launch app on device.
- `list-devices` - List connected devices.
- `list-schemes` - Defined in Project Discovery workflow.
- `show-build-settings` - Defined in Project Discovery workflow.
- `start-device-log-cap` - Defined in Log Capture & Management workflow.
- `stop-app-device` - Stop device app.
- `stop-device-log-cap` - Defined in Log Capture & Management workflow.
- `test-device` - Test on device.



### iOS Simulator Development (`simulator`)
**Purpose**: Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting simulators. Build, test, deploy, and interact with iOS apps on simulators. (20 tools)

- `boot-sim` - Boot iOS simulator.
- `build-run-sim` - Build and run iOS sim.
- `build-sim` - Build for iOS sim.
- `clean` - Defined in Project Utilities workflow.
- `discover-projs` - Defined in Project Discovery workflow.
- `get-app-bundle-id` - Defined in Project Discovery workflow.
- `get-sim-app-path` - Get sim built app path.
- `install-app-sim` - Install app on sim.
- `launch-app-logs-sim` - Launch sim app with logs.
- `launch-app-sim` - Launch app on simulator.
- `list-schemes` - Defined in Project Discovery workflow.
- `list-sims` - List iOS simulators.
- `open-sim` - Open Simulator app.
- `record-sim-video` - Record sim video.
- `screenshot` - Defined in UI Automation workflow.
- `show-build-settings` - Defined in Project Discovery workflow.
- `snapshot-ui` - Defined in UI Automation workflow.
- `stop-app-sim` - Stop sim app.
- `stop-sim-log-cap` - Defined in Log Capture & Management workflow.
- `test-sim` - Test on iOS sim.



### Log Capture & Management (`logging`)
**Purpose**: Log capture and management tools for iOS simulators and physical devices. Start, stop, and analyze application and system logs during development and testing. (4 tools)

- `start-device-log-cap` - Start device log capture.
- `start-sim-log-cap` - Start sim log capture.
- `stop-device-log-cap` - Stop device app and return logs.
- `stop-sim-log-cap` - Stop sim app and return logs.



### macOS Development (`macos`)
**Purpose**: Complete macOS development workflow for both .xcodeproj and .xcworkspace files. Build, test, deploy, and manage macOS applications. (11 tools)

- `build-macos` - Build macOS app.
- `build-run-macos` - Build and run macOS app.
- `clean` - Defined in Project Utilities workflow.
- `discover-projs` - Defined in Project Discovery workflow.
- `get-mac-app-path` - Get macOS built app path.
- `get-mac-bundle-id` - Defined in Project Discovery workflow.
- `launch-mac-app` - Launch macOS app.
- `list-schemes` - Defined in Project Discovery workflow.
- `show-build-settings` - Defined in Project Discovery workflow.
- `stop-mac-app` - Stop macOS app.
- `test-macos` - Test macOS target.



### Project Discovery (`project-discovery`)
**Purpose**: Discover and examine Xcode projects, workspaces, and Swift packages. Analyze project structure, schemes, build settings, and bundle information. (5 tools)

- `discover-projs` - Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.
- `get-app-bundle-id` - Extract bundle id from .app.
- `get-mac-bundle-id` - Extract bundle id from macOS .app.
- `list-schemes` - List Xcode schemes.
- `show-build-settings` - Show build settings.



### Project Scaffolding (`project-scaffolding`)
**Purpose**: Tools for creating new iOS and macOS projects from templates. Bootstrap new applications with best practices, standard configurations, and modern project structures. (2 tools)

- `scaffold-ios-project` - Scaffold iOS project.
- `scaffold-macos-project` - Scaffold macOS project.



### Project Utilities (`utilities`)
**Purpose**: Essential project maintenance utilities for cleaning and managing existing projects. Provides clean operations for both .xcodeproj and .xcworkspace files. (1 tools)

- `clean` - Clean build products.



### Simulator Debugging (`debugging`)
**Purpose**: Interactive iOS Simulator debugging tools: attach LLDB, manage breakpoints, inspect stack/variables, and run LLDB commands. (8 tools)

- `debug-attach-sim` - Attach LLDB to sim app.
- `debug-breakpoint-add` - Add breakpoint.
- `debug-breakpoint-remove` - Remove breakpoint.
- `debug-continue` - Continue debug session.
- `debug-detach` - Detach debugger.
- `debug-lldb-command` - Run LLDB command.
- `debug-stack` - Get backtrace.
- `debug-variables` - Get frame variables.



### Simulator Management (`simulator-management`)
**Purpose**: Tools for managing simulators from booting, opening simulators, listing simulators, stopping simulators, erasing simulator content and settings, and setting simulator environment options like location, network, statusbar and appearance. (8 tools)

- `boot-sim` - Defined in iOS Simulator Development workflow.
- `erase-sims` - Erase simulator.
- `list-sims` - Defined in iOS Simulator Development workflow.
- `open-sim` - Defined in iOS Simulator Development workflow.
- `reset-sim-location` - Reset sim location.
- `set-sim-appearance` - Set sim appearance.
- `set-sim-location` - Set sim location.
- `sim-statusbar` - Set sim status bar network.



### Swift Package Manager (`swift-package`)
**Purpose**: Swift Package Manager operations for building, testing, running, and managing Swift packages and dependencies. Complete SPM workflow support. (6 tools)

- `swift-package-build` - swift package target build.
- `swift-package-clean` - swift package clean.
- `swift-package-list` - List SwiftPM processes.
- `swift-package-run` - swift package target run.
- `swift-package-stop` - Stop SwiftPM run.
- `swift-package-test` - Run swift package target tests.



### System Doctor (`doctor`)
**Purpose**: Debug tools and system doctor for troubleshooting XcodeBuildMCP server, development environment, and tool availability. (1 tools)

- `doctor` - MCP environment info.



### UI Automation (`ui-automation`)
**Purpose**: UI automation and accessibility testing tools for iOS simulators. Perform gestures, interactions, screenshots, and UI analysis for automated testing workflows. (11 tools)

- `button` - Press simulator hardware button.
- `gesture` - Simulator gesture preset.
- `key-press` - Press key by keycode.
- `key-sequence` - Press a sequence of keys by their keycodes.
- `long-press` - Long press at coords.
- `screenshot` - Capture screenshot.
- `snapshot-ui` - Print view hierarchy with precise view coordinates (x, y, width, height) for visible elements.
- `swipe` - Swipe between points.
- `tap` - Tap coordinate or element.
- `touch` - Touch down/up at coords.
- `type-text` - Type text.



### Xcode IDE (mcpbridge) (`xcode-ide`)
**Purpose**: Proxy Xcode's built-in 'Xcode Tools' MCP service via `xcrun mcpbridge`. Registers dynamic `xcode_tools_*` tools when available. Bridge debug tools are only registered when `debug: true`. (3 tools)

- `xcode-tools-bridge-disconnect` - Disconnect bridge and unregister proxied `xcode_tools_*` tools.
- `xcode-tools-bridge-status` - Show xcrun mcpbridge availability and proxy tool sync status.
- `xcode-tools-bridge-sync` - One-shot connect + tools/list sync (manual retry; avoids background prompt spam).



## Summary Statistics

- **Canonical Tools**: 71
- **Total Tools**: 94
- **Workflow Groups**: 13

---

*This documentation is automatically generated by `scripts/update-tools-docs.ts` from the tools manifest. Last updated: 2026-02-04T09:25:59.573Z UTC*
