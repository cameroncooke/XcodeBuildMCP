# Session Defaults

By default, XcodeBuildMCP uses a session-aware mode. The client sets shared defaults once (simulator, device, project/workspace, scheme, etc.) and all tools reuse them. This reduces schema size and repeated payloads.

## How it works
- Call `session_set_defaults` once at the start of a workflow.
- Tools reuse those defaults automatically.
- Use `session_show_defaults` to inspect current values.
- Use `session_clear_defaults` to clear values when switching contexts.

See the session-management tools in [TOOLS.md](TOOLS.md).

## Opting out
If you prefer explicit parameters on every tool call, set:

```json
"env": {
  "XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS": "true"
}
```

This restores the legacy schemas with per-call parameters while still honoring any defaults you choose to set.

## Related docs
- Configuration options: [CONFIGURATION.md](CONFIGURATION.md)
- Tools reference: [TOOLS.md](TOOLS.md)
