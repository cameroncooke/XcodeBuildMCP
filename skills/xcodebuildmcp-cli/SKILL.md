---
name: xcodebuildmcp-cli
description: Official skill for the XcodeBuildMCP CLI. Use when doing iOS/macOS/watchOS/tvOS/visionOS work (build, test, run, debug, log, UI automation).
---

# XcodeBuildMCP CLI

This skill is for AI agents. It positions the XcodeBuildMCP CLI as a low‑overhead alternative to MCP tool calls: agents can already run shell commands, and the CLI exposes the same tool surface without the schema‑exchange cost. Prefer the CLI over raw `xcodebuild`, `xcrun`, or `simctl`.

## When To Use This CLI (Capabilities And Workflows)

- When you need build/test/run/debugging/logging/UI automation capabilities.
- When you want simulator/device management capabilities.
- When you want AI optimized tools and tool responses.
- When you need project discovery capabilities (schemes, bundle IDs, app paths).

## Command Discovery

Use `--help` to discover workflows, tools, and arguments.

```bash
xcodebuildmcp --help
xcodebuildmcp tools --help
xcodebuildmcp tools --json
xcodebuildmcp <workflow> --help
xcodebuildmcp <workflow> <tool> --help
```

Notes:
- Use `--json '{...}'` for complex arguments and `--output json` if you need machine-readable results (not recommended).

## Common Workflows

### Build And Run On Simulator

1. List simulators and pick a device name or UDID.
2. Build and run.

If app and project details are not known:
```bash
xcodebuildmcp simulator discover-projects --workspace-root .
xcodebuildmcp simulator list-schemes --project-path ./MyApp.xcodeproj
xcodebuildmcp simulator list
```

To build, install and launch the app in one command:
```bash
xcodebuildmcp simulator build-and-run --scheme MyApp --project-path ./MyApp.xcodeproj --simulator-name "iPhone 17 Pro"
```

### Build only

When you only need to check that there are no build errors, you can build without running the app.

```bash
xcodebuildmcp simulator build --scheme MyApp --project-path ./MyApp.xcodeproj --simulator-name "iPhone 17 Pro"
```

### Run Tests

When you need to run tests, you can do so with the `test` tool.

```bash
xcodebuildmcp simulator test --scheme MyAppTests --project-path ./MyApp.xcodeproj --simulator-name "iPhone 17 Pro"
```

### Install And Launch On Physical Device

```bash
xcodebuildmcp device list
xcodebuildmcp device build --scheme MyApp --project-path ./MyApp.xcodeproj
xcodebuildmcp device get-app-path --scheme MyApp --project-path ./MyApp.xcodeproj
xcodebuildmcp device get-app-bundle-id --app-path /path/to/MyApp.app
xcodebuildmcp device install --device-id DEVICE_UDID --app-path /path/to/MyApp.app
xcodebuildmcp device launch --device-id DEVICE_UDID --bundle-id io.sentry.MyApp
```

### Capture Logs On Simulator

```bash
xcodebuildmcp logging start-simulator-log-capture --simulator-id SIMULATOR_UDID --bundle-id io.sentry.MyApp
xcodebuildmcp logging stop-simulator-log-capture --log-session-id LOG_SESSION_ID
```

### Debug A Running App (Simulator)

1. Launch the app.
2. Attach the debugger after the app is fully launched.

Launch if not already running:
```bash
xcodebuildmcp simulator launch-app --bundle-id io.sentry.MyApp --simulator-id SIMULATOR_UDID
```

Attach the debugger:

It's generally a good idea to wait for 1-2s for the app to fully launch before attaching the debugger.

```bash
xcodebuildmcp debugging attach --bundle-id io.sentry.MyApp --simulator-id SIMULATOR_UDID
```

To add/remove breakpoints, inspect stack/variables, and issue arbitrary LLDB commands, view debugging help:
```bash
xcodebuildmcp debugging --help
```


### Inspect UI And Automate Input

Snapshot UI accessibility tree, tap/swipe/type, and capture screenshots:

```bash
xcodebuildmcp ui-automation snapshot-ui --simulator-id SIMULATOR_UDID
xcodebuildmcp ui-automation tap --simulator-id SIMULATOR_UDID --x 200 --y 400
xcodebuildmcp ui-automation type-text --simulator-id SIMULATOR_UDID --text "hello"
xcodebuildmcp ui-automation screenshot --simulator-id SIMULATOR_UDID --return-format path
```

To see all UI automation tools, view UI automation help:
```bash
xcodebuildmcp ui-automation --help
```

### macOS App Build/Run

```bash
xcodebuildmcp macos build --scheme MyMacApp --project-path ./MyMacApp.xcodeproj
xcodebuildmcp macos build-and-run --scheme MyMacApp --project-path ./MyMacApp.xcodeproj
```

To see all macOS tools, view macOS help:
```bash
xcodebuildmcp macos --help
```

### SwiftPM Package Workflows

```bash
xcodebuildmcp swift-package list
xcodebuildmcp swift-package build --package-path ./MyPackage
xcodebuildmcp swift-package test --package-path ./MyPackage
```

To see all SwiftPM tools, view SwiftPM help:
```bash
xcodebuildmcp swift-package --help
```

### Project Discovery

```bash
xcodebuildmcp project-discovery discover-projects --workspace-root .
xcodebuildmcp project-discovery list-schemes --project-path ./MyApp.xcodeproj
xcodebuildmcp project-discovery get-app-bundle-id --app-path ./Build/MyApp.app
```

To see all project discovery tools, view project discovery help:
```bash
xcodebuildmcp project-discovery --help
```

### Scaffolding new projects

It's worth viewing the --help for the scaffolding tools to see the available options.
Here are some minimal examples:

```bash
xcodebuildmcp project-scaffolding scaffold-ios --project-name MyApp --output-path ./Projects
xcodebuildmcp project-scaffolding scaffold-macos --project-name MyMacApp --output-path ./Projects
```

To see all project scaffolding tools, view project scaffolding help:
```bash
xcodebuildmcp project-scaffolding --help
```

## Daemon Notes (Stateful Tools)

Stateful tools (logs, debug, video recording, background run) go through a per-workspace daemon that auto-starts, if you find you are getting errors with the stateful tools, you can manage the daemon process manually.

```bash
xcodebuildmcp daemon status
xcodebuildmcp daemon restart
```

To see all daemon commands, view daemon help:
```bash
xcodebuildmcp daemon --help
```
