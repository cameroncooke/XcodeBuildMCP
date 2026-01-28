# Session Defaults

By default, XcodeBuildMCP uses a session-aware mode. The client sets shared defaults once (simulator, device, project/workspace, scheme, etc.) and all tools reuse them. This reduces schema size and repeated payloads and ensures a more deterministic experience.

## How it works
- Agent calls `session_set_defaults` once at the start of a workflow.
- Tools reuse those defaults automatically.
- Agent can call `session_show_defaults` to inspect current values.
- Agent can call `session_clear_defaults` to clear values when switching contexts.
- Defaults can also be seeded from `.xcodebuildmcp/config.yaml` at server startup.

See the session-management tools in [TOOLS.md](TOOLS.md).

## Opting out
If you prefer explicit parameters on every tool call, set:

```json
"env": {
  "XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS": "true"
}
```

This restores the legacy schemas with per-call parameters while still honoring any defaults you choose to set. Though this is not recommended, it can be useful in certain scenarios where you are working on monorepos or multiple projects at once.

## Persisting defaults
Session defaults can be persisted between sessions by asking your agent to set the defaults with the `persist` flag set to `true`. This will save the defaults into `.xcodebuildmcp/config.yaml` at the root of your project's workspace.

The persisted config is patch-only (only provided keys are written).

You can also manually create the config file to essentually seed the defaults at startup see [CONFIGURATION.md](CONFIGURATION.md) for more information.

## Related docs
- Configuration options: [CONFIGURATION.md](CONFIGURATION.md)
- Tools reference: [TOOLS.md](TOOLS.md)
