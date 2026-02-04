# Xcode IDE MCP Bridge (`xcrun mcpbridge`)

XcodeBuildMCP can optionally proxy Xcode’s built-in “Xcode Tools” MCP service via Xcode 26’s `xcrun mcpbridge`.

This enables IDE-only tools (e.g. Preview rendering, Issue Navigator queries, documentation search, project navigator operations) that are not available via `xcodebuild`.

## Enable

Add `xcode-ide` to `enabledWorkflows` in `.xcodebuildmcp/config.yaml`:

```yaml
schemaVersion: 1
enabledWorkflows: ["simulator", "debugging", "xcode-ide"]
```

If the workflow is not enabled, XcodeBuildMCP does not start the bridge.

## Tool naming

Proxied tools are registered dynamically, based on whatever Xcode advertises via `tools/list`:

- Remote: `XcodeListWindows`
- Local proxy: `xcode_tools_XcodeListWindows`

## Bridge debug tools

These tools are stable and do not depend on Xcode’s tool catalog, but they are intentionally hidden unless you enable debugging (`debug: true`) because they are primarily for troubleshooting:

- `xcode_tools_bridge_status`: Shows `mcpbridge` availability, connection state, last error, and proxied tool count.
- `xcode_tools_bridge_sync`: One-shot connect + re-sync (use this if Xcode prompts blocked startup sync).
- `xcode_tools_bridge_disconnect`: Disconnect and unregister proxied `xcode_tools_*` tools.

## Trust prompts / troubleshooting

Xcode may show trust/allow prompts when the bridge connects and/or when tools are invoked.

Recommended flow:

1. Launch Xcode.
2. Start XcodeBuildMCP with `xcode-ide` enabled.
3. If you don’t see any `xcode_tools_*` tools, temporarily set `debug: true` and call `xcode_tools_bridge_sync` after approving any prompts.

## Targeting a specific Xcode instance (optional)

If you need to scope the bridge to a specific Xcode instance, XcodeBuildMCP forwards these environment variables to the bridge:

- `XCODEBUILDMCP_XCODE_PID` → `MCP_XCODE_PID`
- `XCODEBUILDMCP_XCODE_SESSION_ID` → `MCP_XCODE_SESSION_ID`

## Dev probe script

For manual verification against a real Xcode install:

```bash
npx tsx scripts/probe-xcode-mcpbridge.ts
```
