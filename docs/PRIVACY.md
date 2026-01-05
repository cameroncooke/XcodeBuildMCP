# Privacy

XcodeBuildMCP uses Sentry for error monitoring and diagnostics. This helps track crashes and unexpected errors to improve reliability.

## What is sent to Sentry
- Error-level logs and diagnostic information only.
- Error logs may include error messages, stack traces, and in some cases file paths or project names.

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
