# Configuration

XcodeBuildMCP reads configuration from a project config file and environment variables. The config file is optional but provides deterministic, repo-scoped behavior for every session.

## Precedence
For runtime config (non-session defaults), precedence is:
1. `.xcodebuildmcp/config.yaml`
2. Environment variables

## Config file (config.yaml)

Create a config file at your workspace root.

```
<workspace-root>/.xcodebuildmcp/config.yaml
```

Example:

```yaml
schemaVersion: 1
enabledWorkflows: ["simulator", "ui-automation", "debugging"]
experimentalWorkflowDiscovery: false
disableSessionDefaults: false
incrementalBuildsEnabled: false
sessionDefaults:
  projectPath: "./MyApp.xcodeproj"      # xor workspacePath
  workspacePath: "./MyApp.xcworkspace"  # xor projectPath
  scheme: "MyApp"
  configuration: "Debug"
  simulatorName: "iPhone 16"            # xor simulatorId
  simulatorId: "<UUID>"                 # xor simulatorName
  deviceId: "<UUID>"
  useLatestOS: true
  arch: "arm64"
  suppressWarnings: false
  derivedDataPath: "./.derivedData"
  preferXcodebuild: false
  platform: "iOS"
  bundleId: "com.example.myapp"
```

Notes:
- `schemaVersion` is required and currently only supports `1`.
- If both `projectPath` and `workspacePath` are set, **workspacePath wins**.
- If both `simulatorId` and `simulatorName` are set, **simulatorId wins**.

### Persisting defaults from an agent

By default, when the agent calls `session_set_defaults`, defaults are only stored in memory for that session. To persist them to the config file, ask the agent to set the `persist` flag to `true`.

## Workflow selection

You can configure workflows in either:
- `enabledWorkflows` in `config.yaml` (preferred), or
- via environment variable `XCODEBUILDMCP_ENABLED_WORKFLOWS` (comma-separated)

Notes:
- If `enabledWorkflows` is omitted, empty or not set, only the default `simulator` workflow is loaded.

See [TOOLS.md](TOOLS.md) for a list of available workflows and tools.

## Debug logging

Enable debug logging with:
- `debug: true` in `config.yaml` (preferred), or
- via environment variable `XCODEBUILDMCP_DEBUG=true`

This enables an extra doctor tool that agents can run to get MCP and system environment information useful for debugging issues with XcodeBuildMCP.

## Incremental build support

Enable incremental builds with either:
- `incrementalBuildsEnabled: true` in `config.yaml` (preferred), or
- via environment variable `INCREMENTAL_BUILDS_ENABLED=true`

> [!IMPORTANT]
> Incremental builds are experimental and won't work for all projects. If you encounter issues, you can disable the option. The agent can also bypass incremental builds by passing a flag when calling build tools.

## Experimental workflow discovery

Enable via:
- `experimentalWorkflowDiscovery: true` in `config.yaml` (preferred), or
- via environment variable `XCODEBUILDMCP_EXPERIMENTAL_WORKFLOW_DISCOVERY=true`

Enables experimental workflow discovery, this feature adds a `manage-workflows` tool that the agent can use to add/remove workflows at runtime. This requires clients to support tools changed notifications and therefore is an opt-in and experimental feature.

> [!IMPORTANT]
> At the time of writing, neither Cursor, Claude Code, nor Codex support tools changed notifications.

## Session-aware opt-out

Disable session-aware schemas with:
- `disableSessionDefaults: true` in `config.yaml` (preferred), or
- via environment variable `XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS=true`

Disables the session-aware defaults feature. This means that the agent will need to set the defaults for each tool call explicitly. This is not recommended and will use more tokens per call. It's recommended to only enable this if your specific requirements need the build, device and simulator settings change frequently in a single coding session, i.e. monorepos with multiple projects.

## UI automation guard

Control UI automation when a debugger is paused with:
- `uiDebuggerGuardMode: "error" | "warn" | "off"` in `config.yaml` (preferred), or
- via environment variable `XCODEBUILDMCP_UI_DEBUGGER_GUARD_MODE=error|warn|off`

This feature is used to block UI tools when the debugger is paused, this is to prevent the agent from executing UI tools that will fail or return incorrect results when the debugger is paused.

Default is `error` when unset.

## Sentry telemetry opt-out

Disable Sentry with:
- `XCODEBUILDMCP_SENTRY_DISABLED=true`

By default we send error logs to Sentry, this can be disabled to prevent any error logs from being sent.

See [PRIVACY.md](PRIVACY.md) for more information.

## AXe binary override

UI automation and simulator video capture require AXe. By default AXe is bundled with XcodeBuildMCP, but you can override the path to use a different version of AXe by setting these options.

Configure the binary path with:
- `axePath: "/opt/axe/bin/axe"` in `config.yaml` (preferred), or
- via environment variable `XCODEBUILDMCP_AXE_PATH=/opt/axe/bin/axe`

For more information about AXe see the [AXe repository](https://github.com/cameroncooke/axe).

## Template overrides

The macOS and iOS scaffold tools pull templates from https://github.com/cameroncooke/XcodeBuildMCP-macOS-Template and https://github.com/cameroncooke/XcodeBuildMCP-iOS-Template respectively.

If you want to use your own source/fork for templates you can override the default locations and versions by setting these options.

Set custom template locations and versions with:
- `iosTemplatePath` / `macosTemplatePath` in `config.yaml` (preferred), or
- via environment variable `XCODEBUILDMCP_IOS_TEMPLATE_PATH=/path/to/ios/templates`
- via environment variable `XCODEBUILDMCP_MACOS_TEMPLATE_PATH=/path/to/macos/templates`
- `iosTemplateVersion` / `macosTemplateVersion` in `config.yaml`, or
- `XCODEBUILD_MCP_IOS_TEMPLATE_VERSION=v1.2.3`
- `XCODEBUILD_MCP_MACOS_TEMPLATE_VERSION=v1.2.3`

These override the default template versions bundled in the package.

## Debugger backend

Select the debugger backend with:
- `debuggerBackend: "dap" | "lldb-cli"` in `config.yaml`, or
- `XCODEBUILDMCP_DEBUGGER_BACKEND=dap|lldb-cli`

This overrides the debugger backend and defaults to `dap`. It's not generally recommended to change this.

## DAP backend settings

Tune the DAP backend with:
- `dapRequestTimeoutMs: 30000` in `config.yaml`, or
- `XCODEBUILDMCP_DAP_REQUEST_TIMEOUT_MS=30000`

This overrides the default request timeout of 30 seconds.

Enable DAP event logging with:
- `dapLogEvents: true` in `config.yaml`, or
- `XCODEBUILDMCP_DAP_LOG_EVENTS=true`

This enables logging of DAP events to the console.

## Device log capture JSON wait

Control how long we wait for devicectl JSON output with:
- `launchJsonWaitMs: 8000` in `config.yaml`, or
- `XBMCP_LAUNCH_JSON_WAIT_MS=8000`

This overrides the default wait time of 8 seconds for devicectl JSON output.

## Related docs
- Session defaults: [SESSION_DEFAULTS.md](SESSION_DEFAULTS.md)
- Tools reference: [TOOLS.md](TOOLS.md)
- Privacy and telemetry: [PRIVACY.md](PRIVACY.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
