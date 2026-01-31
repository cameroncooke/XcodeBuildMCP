# Configuration

XcodeBuildMCP reads configuration from a project config file. The config file is optional but provides deterministic, repo-scoped behavior for every session.

## Contents

- [Config file](#config-file)
- [Session defaults](#session-defaults)
- [Workflow selection](#workflow-selection)
- [Build settings](#build-settings)
- [Debugging and logging](#debugging-and-logging)
- [UI automation](#ui-automation)
- [Templates](#templates)
- [Telemetry](#telemetry)
- [Quick reference](#quick-reference)
- [Environment variables (legacy)](#environment-variables-legacy)

---

## Config file

Create a config file at your workspace root:

```
<workspace-root>/.xcodebuildmcp/config.yaml
```

Minimal example:

```yaml
schemaVersion: 1
```

Full example with all options:

```yaml
schemaVersion: 1

# Workflow selection
enabledWorkflows: ["simulator", "ui-automation", "debugging"]
experimentalWorkflowDiscovery: false

# Session defaults
disableSessionDefaults: false
sessionDefaults:
  projectPath: "./MyApp.xcodeproj"
  scheme: "MyApp"
  configuration: "Debug"
  simulatorName: "iPhone 16"
  platform: "iOS"

# Build settings
incrementalBuildsEnabled: false

# Debugging
debug: false
debuggerBackend: "dap"
dapRequestTimeoutMs: 30000
dapLogEvents: false
launchJsonWaitMs: 8000

# UI automation
uiDebuggerGuardMode: "error"
axePath: "/opt/axe/bin/axe"

# Templates
iosTemplatePath: "/path/to/ios/templates"
iosTemplateVersion: "v1.2.3"
macosTemplatePath: "/path/to/macos/templates"
macosTemplateVersion: "v1.2.3"
```

The `schemaVersion` field is required and currently only supports `1`.

---

## Session defaults

Session defaults allow you to set shared values once (project, scheme, simulator, etc.) that all tools reuse automatically. This reduces token usage and ensures consistent behavior.

### Enabling and disabling

Session defaults are enabled by default. To disable them:

```yaml
disableSessionDefaults: true
```

When disabled, agents must pass explicit parameters on every tool call (legacy behavior).

### Setting defaults from config

Seed defaults at server startup by adding a `sessionDefaults` block:

```yaml
sessionDefaults:
  projectPath: "./MyApp.xcodeproj"
  scheme: "MyApp"
  configuration: "Debug"
  simulatorName: "iPhone 16"
```

### Setting defaults from an agent

Agents can call `session_set_defaults` at runtime. By default these are stored in memory only. To persist them to the config file, the agent sets `persist: true`.

### Session defaults reference

| Option | Type | Description |
|--------|------|-------------|
| `projectPath` | string | Path to `.xcodeproj` file. Mutually exclusive with `workspacePath`. |
| `workspacePath` | string | Path to `.xcworkspace` file. Takes precedence if both are set. |
| `scheme` | string | Build scheme name. |
| `configuration` | string | Build configuration (e.g., `Debug`, `Release`). |
| `simulatorName` | string | Simulator name (e.g., `iPhone 16`). Mutually exclusive with `simulatorId`. |
| `simulatorId` | string | Simulator UUID. Takes precedence if both are set. |
| `deviceId` | string | Physical device UUID. |
| `platform` | string | Target platform (e.g., `iOS`, `macOS`, `watchOS`, `tvOS`, `visionOS`). |
| `useLatestOS` | boolean | Use the latest available OS version for the simulator. |
| `arch` | string | Build architecture (e.g., `arm64`, `x86_64`). |
| `suppressWarnings` | boolean | Suppress compiler warnings in build output. |
| `derivedDataPath` | string | Custom path for derived data. |
| `preferXcodebuild` | boolean | Use `xcodebuild` instead of the experimental incremental build support (xcodemake). Only applies when incremental builds are enabled. Is designed for agent use to self correct after failed xcodemake build attempts. |
| `bundleId` | string | App bundle identifier. |

### Mutual exclusivity rules

- If both `projectPath` and `workspacePath` are set, `workspacePath` wins.
- If both `simulatorId` and `simulatorName` are set, `simulatorId` wins.

---

## Workflow selection

Workflows determine which tools are available. By default only the `simulator` workflow is loaded.

```yaml
enabledWorkflows: ["simulator", "ui-automation", "debugging"]
```

See [TOOLS.md](TOOLS.md) for available workflows and their tools.

### Experimental workflow discovery

Enables a `manage-workflows` tool that agents can use to add/remove workflows at runtime.

```yaml
experimentalWorkflowDiscovery: true
```

> [!IMPORTANT]
> Requires client support for tools changed notifications. At the time of writing, Cursor, Claude Code, and Codex do not support this.

---

## Build settings

### Incremental builds

Enable incremental builds to speed up repeated builds:

```yaml
incrementalBuildsEnabled: true
```

> [!IMPORTANT]
> Incremental builds are experimental and may not work for all projects. Agents can bypass this setting per-call if needed.

---

## Debugging and logging

### Debug logging

Enable debug logging and the doctor diagnostic tool:

```yaml
debug: true
```

### Debugger backend

Select the debugger backend:

```yaml
debuggerBackend: "dap"  # or "lldb-cli"
```

Default is `dap`. Changing this is not generally recommended.

### DAP settings

Tune the DAP backend:

```yaml
dapRequestTimeoutMs: 30000  # default: 30000
dapLogEvents: true          # default: false
```

### Device log capture

Control how long to wait for devicectl JSON output:

```yaml
launchJsonWaitMs: 8000  # default: 8000
```

---

## UI automation

### Debugger guard

Block UI automation tools when the debugger is paused to prevent failures:

```yaml
uiDebuggerGuardMode: "error"  # "error" | "warn" | "off"
```

Default is `error`.

### AXe binary

UI automation and simulator video capture require AXe, which is bundled by default. To use a different version:

```yaml
axePath: "/opt/axe/bin/axe"
```

See the [AXe repository](https://github.com/cameroncooke/axe) for more information.

---

## Templates

The scaffold tools pull templates from GitHub. Override the default locations and versions:

```yaml
iosTemplatePath: "/path/to/ios/templates"
iosTemplateVersion: "v1.2.3"
macosTemplatePath: "/path/to/macos/templates"
macosTemplateVersion: "v1.2.3"
```

Default templates:
- iOS: [XcodeBuildMCP-iOS-Template](https://github.com/cameroncooke/XcodeBuildMCP-iOS-Template)
- macOS: [XcodeBuildMCP-macOS-Template](https://github.com/cameroncooke/XcodeBuildMCP-macOS-Template)

---

## Telemetry

By default, error logs are sent to Sentry. To disable:

```yaml
# Environment variable only (no config.yaml option)
# XCODEBUILDMCP_SENTRY_DISABLED=true
```

See [PRIVACY.md](PRIVACY.md) for more information.

---

## Quick reference

| Option | Type | Default |
|--------|------|---------|
| `schemaVersion` | number | Required (`1`) |
| `enabledWorkflows` | string[] | `["simulator"]` |
| `experimentalWorkflowDiscovery` | boolean | `false` |
| `disableSessionDefaults` | boolean | `false` |
| `sessionDefaults` | object | `{}` |
| `incrementalBuildsEnabled` | boolean | `false` |
| `debug` | boolean | `false` |
| `debuggerBackend` | string | `"dap"` |
| `dapRequestTimeoutMs` | number | `30000` |
| `dapLogEvents` | boolean | `false` |
| `launchJsonWaitMs` | number | `8000` |
| `uiDebuggerGuardMode` | string | `"error"` |
| `axePath` | string | Bundled |
| `iosTemplatePath` | string | GitHub default |
| `iosTemplateVersion` | string | Bundled version |
| `macosTemplatePath` | string | GitHub default |
| `macosTemplateVersion` | string | Bundled version |

---

## Environment variables (legacy)

Environment variables are supported for backwards compatibility but the config file is preferred.

| Config option | Environment variable |
|---------------|---------------------|
| `enabledWorkflows` | `XCODEBUILDMCP_ENABLED_WORKFLOWS` (comma-separated) |
| `experimentalWorkflowDiscovery` | `XCODEBUILDMCP_EXPERIMENTAL_WORKFLOW_DISCOVERY` |
| `disableSessionDefaults` | `XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS` |
| `incrementalBuildsEnabled` | `INCREMENTAL_BUILDS_ENABLED` |
| `debug` | `XCODEBUILDMCP_DEBUG` |
| `debuggerBackend` | `XCODEBUILDMCP_DEBUGGER_BACKEND` |
| `dapRequestTimeoutMs` | `XCODEBUILDMCP_DAP_REQUEST_TIMEOUT_MS` |
| `dapLogEvents` | `XCODEBUILDMCP_DAP_LOG_EVENTS` |
| `launchJsonWaitMs` | `XBMCP_LAUNCH_JSON_WAIT_MS` |
| `uiDebuggerGuardMode` | `XCODEBUILDMCP_UI_DEBUGGER_GUARD_MODE` |
| `axePath` | `XCODEBUILDMCP_AXE_PATH` |
| `iosTemplatePath` | `XCODEBUILDMCP_IOS_TEMPLATE_PATH` |
| `iosTemplateVersion` | `XCODEBUILD_MCP_IOS_TEMPLATE_VERSION` |
| `macosTemplatePath` | `XCODEBUILDMCP_MACOS_TEMPLATE_PATH` |
| `macosTemplateVersion` | `XCODEBUILD_MCP_MACOS_TEMPLATE_VERSION` |
| (no config option) | `XCODEBUILDMCP_SENTRY_DISABLED` |

Config file takes precedence over environment variables when both are set.

---

## Related docs

- Session defaults: [SESSION_DEFAULTS.md](SESSION_DEFAULTS.md)
- Tools reference: [TOOLS.md](TOOLS.md)
- Privacy and telemetry: [PRIVACY.md](PRIVACY.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
