# Investigation: UI automation tools unavailable with Smithery install (issue #163)

## Summary
Smithery installs ship only the compiled entrypoint, while the server hard-requires a bundled `bundled/axe` path derived from `process.argv[1]`. This makes UI automation (and simulator video capture) fail even when system `axe` exists on PATH, and Doctor can report contradictory statuses.

## Symptoms
- UI automation tools (`snapshot_ui`, `tap`, `swipe`, etc.) fail with "Bundled axe tool not found. UI automation features are not available."
- `doctor` reports system axe present, but UI automation unavailable due to missing bundled binary.
- Smithery cache lacks `bundled/axe` directory; only `index.cjs`, `manifest.json`, `.metadata.json` present.

## Investigation Log

### 2026-01-06 - Initial Assessment
**Hypothesis:** Smithery packaging omits bundled binaries and server does not fallback to system axe.
**Findings:** Issue report indicates bundled path is computed relative to `process.argv[1]` and Smithery cache lacks `bundled/`.
**Evidence:** GitHub issue #163 body (Smithery cache contents; bundled path logic).
**Conclusion:** Needs code and packaging investigation.

### 2026-01-06 - AXe path resolution and bundled-only assumption
**Hypothesis:** AXe resolution is bundled-only, so missing `bundled/axe` disables tools regardless of PATH.
**Findings:** `getAxePath()` computes `bundledAxePath` from `process.argv[1]` and returns it only if it exists; otherwise `null`. No PATH or env override.
**Evidence:** `src/utils/axe-helpers.ts:15-36`
**Conclusion:** Confirmed. Smithery layout lacking `bundled/` will always return null.

### 2026-01-06 - UI automation and video capture gating
**Hypothesis:** UI tools and video capture preflight fail when `getAxePath()` returns null.
**Findings:** UI tools call `getAxePath()` and throw `DependencyError` if absent; `record_sim_video` preflights `areAxeToolsAvailable()` and `isAxeAtLeastVersion()`; `startSimulatorVideoCapture` returns error if `getAxePath()` is null.
**Evidence:** `src/mcp/tools/ui-testing/snapshot_ui.ts:150-164`, `src/mcp/tools/simulator/record_sim_video.ts:80-88`, `src/utils/video_capture.ts:92-99`
**Conclusion:** Confirmed. Missing bundled binary blocks all UI automation and simulator video capture.

### 2026-01-06 - Doctor output inconsistency
**Hypothesis:** Doctor uses different checks for dependency presence vs feature availability.
**Findings:** Doctor uses `areAxeToolsAvailable()` (bundled-only) for UI automation feature status, while dependency check can succeed via `which axe` when bundled is missing.
**Evidence:** `src/mcp/tools/doctor/doctor.ts:49-68`, `src/mcp/tools/doctor/lib/doctor.deps.ts:100-132`
**Conclusion:** Confirmed. Doctor can report `axe` dependency present but UI automation unsupported.

### 2026-01-06 - Packaging/Smithery artifact mismatch
**Hypothesis:** NPM releases include `bundled/`, Smithery builds do not.
**Findings:** `bundle:axe` creates `bundled/` and npm packaging includes it, but Smithery config has no asset inclusion hints. Release workflow bundles AXe before publish.
**Evidence:** `package.json:21-44`, `.github/workflows/release.yml:48-55`, `smithery.yaml:1-3`, `smithery.config.js:1-6`
**Conclusion:** Confirmed. Smithery build output likely omits bundled artifacts unless explicitly configured.

### 2026-01-06 - Smithery local server deployment flow
**Hypothesis:** Smithery deploys local servers from GitHub pushes and expects build-time packaging to include assets.
**Findings:** README install flow uses Smithery CLI; `smithery.yaml` targets `local`. `bundled/` is gitignored, so it must be produced during Smithery’s deployment build. Current `npm run build` does not run `bundle:axe`.
**Evidence:** `README.md:11-74`, `smithery.yaml:1-3`, `.github/workflows/release.yml:48-62`, `.gitignore:66-68`
**Conclusion:** Confirmed. Smithery deploy must run `bundle:axe` and explicitly include `bundled/` in the produced bundle.

### 2026-01-06 - Smithery config constraints and bundling workaround
**Hypothesis:** Adding esbuild plugins in `smithery.config.js` overrides Smithery’s bootstrap plugin.
**Findings:** Smithery CLI merges config via spread and replaces `plugins`, causing `virtual:bootstrap` resolution to fail when custom plugins are supplied. Side-effect bundling in `smithery.config.js` avoids plugin override and can copy `bundled/` into `.smithery/`.
**Evidence:** `node_modules/@smithery/cli/dist/index.js:~2716600-2717500`, `smithery.config.js:1-47`
**Conclusion:** Confirmed. Bundling must run outside esbuild plugins; Linux builders must skip binary verification.

### 2026-01-27 - Upstream fix landed (Smithery CLI PR #532)
**Hypothesis:** Smithery CLI now supports bundling non-code assets in stdio deploys, removing the need for the local workaround.
**Findings:** PR #532 adds a `build.assets` array in `smithery.yaml` for stdio bundles, copies matched assets into `.smithery/stdio/` before packing `server.mcpb`, and preserves directory structure. It uses `fast-glob` patterns, excludes `**/node_modules/**` and `**/.git/**` by default, warns when assets are configured for non-stdio transports or when patterns match zero files, and fails the build if patterns escape the project root, hit permission errors, or match reserved root filenames (`index.cjs`, `mcpb-manifest.json`, `manifest.json`, `server.mcpb`). The PR also documents runtime access via `__dirname` with assets available at the same relative paths inside the bundle.
**Evidence:** Smithery issue `smithery-ai/cli#524` (opened Jan 22, 2026) and PR `smithery-ai/cli#532` (merged Jan 27, 2026) summary/usage/behavior sections.
**Conclusion:** We can migrate from the `smithery.config.js` side-effect bundling workaround once we upgrade to a CLI version that includes PR #532 and configure `smithery.yaml` `build.assets` for `bundled/**`.

## Root Cause
Two coupled assumptions break Smithery installs:
1) `getAxePath()` is bundled-only and derives the path from `process.argv[1]`, which points into Smithery’s cache (missing `bundled/axe`), so it always returns null.  
2) Smithery packaging does not include the `bundled/` directory, so the bundled-only resolver can never succeed under Smithery even if AXe is installed system-wide.

## Recommendations
1. Add a robust AXe resolver: allow explicit env override and PATH fallback; keep bundled as preferred but not exclusive.
2. Distinguish bundled vs system AXe in UI tools and video capture; only apply bundled-specific env when the bundled binary is used.
3. Align Doctor output: show both bundled availability and PATH availability, and use that in the UI automation supported status.
4. Update Smithery build to run `bundle:axe` and copy `bundled/` into the Smithery bundle output; skip binary verification on non-mac builders to avoid build failures.

## Migration Plan (official Smithery resource bundling)
1. Upgrade Smithery CLI to `>=3.4.0` on all developer machines and CI that build/deploy via Smithery.
2. Replace the `smithery.config.js` side-effect copy workaround with official bundling config in `smithery.yaml`:
   - `build.assets: [ "bundled/**" ]`
3. Remove the Smithery prepack copy step once 3.4.0 is in use.
4. Ensure `bundle:axe` still runs during build so `bundled/` exists before Smithery packages resources.
5. Validate a Smithery install contains `bundled/axe` in its cache and that UI automation + `record_sim_video` work without PATH fallbacks.
6. Remove any Linux-specific skips that were only needed to avoid bundled verification for the workaround, once the official bundling flow proves stable.

## Preventive Measures
- Add tests for AXe resolution precedence (bundled, env override, PATH) and for Doctor output consistency.
- Document Smithery-specific install requirements and verify `bundled/` presence in Smithery artifacts during CI.
