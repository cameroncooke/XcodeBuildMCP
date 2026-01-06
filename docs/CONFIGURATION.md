# Configuration

XcodeBuildMCP is configured through environment variables provided by your MCP client. Here is a single example showing how to add options to a typical MCP config:

```json
"XcodeBuildMCP": {
  "command": "npx",
  "args": ["-y", "xcodebuildmcp@latest"],
  "env": {
    "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,project-discovery",
    "INCREMENTAL_BUILDS_ENABLED": "false",
    "XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS": "false",
    "XCODEBUILDMCP_SENTRY_DISABLED": "false"
  }
}
```

## Workflow selection

By default, XcodeBuildMCP loads all tools at startup. If you want a smaller tool surface for a specific workflow, set `XCODEBUILDMCP_ENABLED_WORKFLOWS` to a comma-separated list of workflow directory names. The `session-management` workflow is always auto-included since other tools depend on it.

**Available workflows:**
- `device` (7 tools) - iOS Device Development
- `simulator` (12 tools) - iOS Simulator Development
- `simulator-management` (5 tools) - Simulator Management
- `swift-package` (6 tools) - Swift Package Manager
- `project-discovery` (5 tools) - Project Discovery
- `macos` (6 tools) - macOS Development
- `ui-testing` (11 tools) - UI Testing & Automation
- `logging` (4 tools) - Log Capture & Management
- `project-scaffolding` (2 tools) - Project Scaffolding
- `utilities` (1 tool) - Project Utilities
- `doctor` (1 tool) - System Doctor

## Incremental build support

XcodeBuildMCP includes experimental support for incremental builds. This feature is disabled by default and can be enabled by setting the `INCREMENTAL_BUILDS_ENABLED` environment variable to `true`.

> [!IMPORTANT]
> Incremental builds are highly experimental and your mileage may vary. Please report issues to the [issue tracker](https://github.com/cameroncooke/XcodeBuildMCP/issues).

## Session-aware opt-out

By default, XcodeBuildMCP uses a session-aware mode: the LLM (or client) sets shared defaults once (simulator, device, project/workspace, scheme, etc.), and all tools reuse them. This cuts context bloat not just in each call payload, but also in the tool schemas themselves.

If you prefer the older, explicit style where each tool requires its own parameters, set `XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS=true`. This restores the legacy schemas with per-call parameters while still honoring any session defaults you choose to set.

Leave this unset for the streamlined session-aware experience; enable it to force explicit parameters on each tool call.

## Sentry telemetry opt-out

If you do not wish to send error logs to Sentry, set `XCODEBUILDMCP_SENTRY_DISABLED=true`.

## AXe binary override

UI automation and simulator video capture require the AXe binary. By default, XcodeBuildMCP uses the bundled AXe when available, then falls back to `PATH`. To force a specific binary location, set `XCODEBUILDMCP_AXE_PATH` (preferred). `AXE_PATH` is also recognized for compatibility.

Example:

```
XCODEBUILDMCP_AXE_PATH=/opt/axe/bin/axe
```

## Related docs
- Session defaults: [SESSION_DEFAULTS.md](SESSION_DEFAULTS.md)
- Tools reference: [TOOLS.md](TOOLS.md)
- Privacy and telemetry: [PRIVACY.md](PRIVACY.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
