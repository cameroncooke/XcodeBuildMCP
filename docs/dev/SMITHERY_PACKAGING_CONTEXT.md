# Smithery stdio packaging: problem domain and handoff

## Audience
This document is for a new AI agent with no context about the prior investigation.

## Original problem
XcodeBuildMCP is a **local stdio** MCP server deployed via the Smithery CLI. The server depends on bundled non-code assets (e.g., `bundled/` with an `axe` binary and frameworks). When deploying with the Smithery CLI, the resulting `.mcpb` bundle **does not include** these bundled assets, so the installed server lacks required resources at runtime.

## Key facts about the current Smithery CLI (v3.x)
The Smithery CLI now builds and packs local stdio servers by:
1) Building the stdio bundle into an output directory (default `.smithery/stdio`).
2) Packing only that output directory into `server.mcpb` using `@anthropic-ai/mcpb`.
3) Uploading the `server.mcpb` in `smithery deploy --transport stdio`.

Important constraints:
- The CLI **does not read `smithery.config.js`** or run any custom build hooks for asset staging.
- The CLI only reads `smithery.yaml` for metadata (e.g., name/target), not for a prepack step.
- The pack step includes only what is inside `.smithery/stdio`.

## What we did
1) Confirmed the repository uses `@smithery/cli` v3.x and targets a local stdio server.
2) Verified that `smithery build --transport stdio` produces `.smithery/stdio/server.mcpb` **without** `bundled/`.
3) Confirmed that the previous `smithery.config.js` copy approach is obsolete because the CLI no longer loads that config.
4) Opened a Smithery CLI issue to request an official asset-staging hook:
   - https://github.com/smithery-ai/cli/issues/524

## How to reproduce the missing-assets behavior
From the XcodeBuildMCP repo:
1) `npx smithery build --transport stdio -o .smithery/stdio`
2) `unzip -l .smithery/stdio/server.mcpb`
   - The bundle contains the compiled entrypoint and manifests only.
   - `bundled/` is missing.

## Workaround (local validation only)
This is **not** compatible with `smithery deploy`, but it proves the bundle can contain assets:
1) Build the stdio bundle:
   - `npx smithery build --transport stdio -o .smithery/stdio`
2) Copy assets into the stdio output directory:
   - `cp -R bundled .smithery/stdio/bundled`
3) Temporarily replace `manifest.json` with `mcpb-manifest.json` for packing:
   - `cp .smithery/stdio/manifest.json .smithery/stdio/manifest.payload.json`
   - `cp .smithery/stdio/mcpb-manifest.json .smithery/stdio/manifest.json`
4) Re-pack using the official `mcpb` CLI:
   - `npx @anthropic-ai/mcpb pack .smithery/stdio .smithery/stdio/server.mcpb`
5) Restore the original manifest:
   - `mv .smithery/stdio/manifest.payload.json .smithery/stdio/manifest.json`

Result: `server.mcpb` now contains `bundled/` and its frameworks.

## Why the workaround cannot be used for deployment
`smithery deploy --transport stdio` rebuilds and repacks in its own flow, and provides no prepack hook to stage assets. As a result, there is no official way to inject `bundled/` into the `.mcpb` during deploy.

## How we likely want to proceed
### Option A: Upstream fix (recommended)
Add an official asset staging hook or prepack command in the Smithery CLI:
- Example: `smithery.yaml` fields like `build.assets` or `build.prepackCommand`.
- The hook should run before `packExtension()` in `src/lib/bundle/stdio.ts`.
- This would allow asset copying into `.smithery/stdio` during `smithery deploy`.

Issue to track:
- https://github.com/smithery-ai/cli/issues/524

### Option B: Fork the CLI
If the upstream fix is slow, fork `smithery-ai/cli` and add:
- A prepack hook (env var or `smithery.yaml` field).
- A deterministic asset staging step inside `buildStdioBundle` before the pack step.
Then consume the fork in CI:
- Publish the fork under a scoped npm package, or
- Install the fork from GitHub release in the release workflow.

Current implementation (forked CLI):
- Added `build.prepackCommand` support in `smithery.yaml` (plus env var overrides).
- CI/release workflows install the forked CLI before `smithery build`.
- This repo wires `smithery.yaml` to `scripts/smithery-prepack.sh` to bundle/copy assets.

## Current repo state that matters
- `smithery.config.js` exists but is **ignored** by v3.x CLI.
  - Any asset copy logic in this file does not run in deploy.
- Release workflow currently publishes npm and MCP registry, but **does not** run Smithery deploy.
- `npm run build` uses Smithery’s default transport (shttp) unless explicit `--transport stdio` is used.

## Summary
The problem is not an outdated CLI version. The CLI is current, but the integration strategy is obsolete because v3.x no longer honors `smithery.config.js`. The deploy flow packs only `.smithery/stdio`. Until Smithery adds an official prepack/assets hook (or a fork is used), correct bundling for local stdio deployments is not achievable via `smithery deploy`.
