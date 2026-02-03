---
name: xcodebuildmcp-cli
description: Official skill for the XcodeBuildMCP CLI. Use for direct terminal workflows (build/test/run/debug/log/UI automation) and for learning tool names and arguments.
---

# XcodeBuildMCP CLI

Use this skill when you need to operate XcodeBuildMCP from the terminal (not via MCP tool calls). Prefer the CLI over raw `xcodebuild`, `xcrun`, or `simctl`.

## How To Explore Commands

Always use `--help` to discover workflows, tools, and arguments.

```bash
xcodebuildmcp --help
xcodebuildmcp tools --help
xcodebuildmcp tools --json
xcodebuildmcp <workflow> --help
xcodebuildmcp <workflow> <tool> --help
```

Notes:
- Use `--json '{...}'` for complex arguments and `--output json` for machine-readable results.

## Root Commands

- `tools` - List CLI tools (supports `--json`, `--flat`, `--verbose`, `--workflow <name>`).
- `daemon` - Manage the per-workspace daemon (`status`, `start`, `stop`, `restart`, `list`).
- `--help`, `--version` - CLI help/version.

## Workflows And Tool Commands

### device
- `build-device`
- `get-device-app-path`
- `install-app-device`
- `launch-app-device`
- `list-devices`
- `stop-app-device`
- `test-device`

### simulator
- `boot-sim`
- `build-run-sim`
- `build-sim`
- `get-sim-app-path`
- `install-app-sim`
- `launch-app-logs-sim`
- `launch-app-sim`
- `list-sims`
- `open-sim`
- `record-sim-video`
- `stop-app-sim`
- `test-sim`

### logging
- `start-device-log-cap`
- `start-sim-log-cap`
- `stop-device-log-cap`
- `stop-sim-log-cap`

### macos
- `build-macos`
- `build-run-macos`
- `get-mac-app-path`
- `launch-mac-app`
- `stop-mac-app`
- `test-macos`

### project-discovery
- `discover-projs`
- `get-app-bundle-id`
- `get-mac-bundle-id`
- `list-schemes`
- `show-build-settings`

### project-scaffolding
- `scaffold-ios-project`
- `scaffold-macos-project`

### utilities
- `clean`

### debugging
- `debug-attach-sim`
- `debug-breakpoint-add`
- `debug-breakpoint-remove`
- `debug-continue`
- `debug-detach`
- `debug-lldb-command`
- `debug-stack`
- `debug-variables`

### simulator-management
- `erase-sims`
- `reset-sim-location`
- `set-sim-appearance`
- `set-sim-location`
- `sim-statusbar`

### swift-package
- `build`
- `clean`
- `list`
- `run`
- `stop`
- `test`

### doctor
- `doctor`

### ui-automation
- `button`
- `gesture`
- `key-press`
- `key-sequence`
- `long-press`
- `screenshot`
- `snapshot-ui`
- `swipe`
- `tap`
- `touch`
- `type-text`

## Example Workflows

```bash
# Build for simulator
xcodebuildmcp simulator build-sim --scheme MyApp --project-path ./MyApp.xcodeproj

# List simulators
xcodebuildmcp simulator list-sims

# Run tests
xcodebuildmcp simulator test-sim --scheme MyAppTests --simulator-name "iPhone 17 Pro"

# Start/stop log capture
xcodebuildmcp logging start-sim-log-cap --simulator-id <UDID> --bundle-id com.example.MyApp
xcodebuildmcp logging stop-sim-log-cap --session-id <SESSION_ID>

# SwiftPM build
xcodebuildmcp swift-package build --package-path ./MyPackage

# UI snapshot
xcodebuildmcp ui-automation snapshot-ui --simulator-id <UDID>
```

## Daemon Notes (Stateful Tools)

Stateful tools (logs, debug, video recording, background run) go through a per-workspace daemon that auto-starts. Use:

```bash
xcodebuildmcp daemon status
xcodebuildmcp daemon restart
```
