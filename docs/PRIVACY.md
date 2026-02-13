# Privacy

XcodeBuildMCP uses Sentry for error monitoring and diagnostics. This helps track crashes and unexpected errors to improve reliability.

## What is sent to Sentry
- Internal XcodeBuildMCP failures only (for example: daemon/MCP runtime faults and unexpected exceptions in server code).
- User-domain errors are not sent (for example: project build/test failures, invalid user config, missing scheme/destination, simulator/app-state errors).
- Tool inputs/outputs are not captured by default, and environment/system variables are not attached as telemetry tags.
- Internal operational logs are sent only when explicitly marked for Sentry (`{ sentry: true }` in server code). Console logging is not automatically forwarded.
- Event payloads are scrubbed before send to remove request/user context and redact user home paths (for example `/Users/<redacted>/...`).

## Opting out
To disable error telemetry, set:

```json
"env": {
  "XCODEBUILDMCP_SENTRY_DISABLED": "true"
}
```

## Related docs
- Configuration options: [CONFIGURATION.md](CONFIGURATION.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
