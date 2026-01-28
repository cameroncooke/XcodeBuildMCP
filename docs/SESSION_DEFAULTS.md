# Session Defaults

By default, XcodeBuildMCP uses a session-aware mode. The client sets shared defaults once (simulator, device, project/workspace, scheme, etc.) and all tools reuse them. This reduces schema size and repeated payloads and ensures a more deterministic experience.

## How it works
- Agent calls `session_set_defaults` once at the start of a workflow.
- Tools reuse those defaults automatically.
- Agent can call `session_show_defaults` to inspect current values.
- Agent can call `session_clear_defaults` to clear values when switching contexts.
- Defaults can be seeded from `.xcodebuildmcp/config.yaml` at server startup.

See the session-management tools in [TOOLS.md](TOOLS.md).

## Opting out
If you prefer explicit parameters on every tool call, set `disableSessionDefaults: true` in your `.xcodebuildmcp/config.yaml` file.

This restores the legacy schemas with per-call parameters while still honoring any defaults you choose to set.

See [CONFIGURATION.md](CONFIGURATION.md) for more information.

## Persisting defaults
Session defaults can be persisted between sessions by setting the `persist` flag to `true` on `session_set_defaults`. This writes to `.xcodebuildmcp/config.yaml` at the root of your workspace.

The persistence is patch-only: only keys provided in that call are written (plus any removals needed for mutual exclusivity).

You can also manually create the config file to essentially seed the defaults at startup; see [CONFIGURATION.md](CONFIGURATION.md) for more information.

## Related docs
- Configuration options: [CONFIGURATION.md](CONFIGURATION.md)
- Tools reference: [TOOLS.md](TOOLS.md)
