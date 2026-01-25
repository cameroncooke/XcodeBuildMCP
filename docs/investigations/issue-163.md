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

## Root Cause
Two coupled assumptions break Smithery installs:
1) `getAxePath()` is bundled-only and derives the path from `process.argv[1]`, which points into Smithery’s cache (missing `bundled/axe`), so it always returns null.  
2) Smithery packaging does not include the `bundled/` directory, so the bundled-only resolver can never succeed under Smithery even if AXe is installed system-wide.

## Recommendations
1. Add a robust AXe resolver: allow explicit env override and PATH fallback; keep bundled as preferred but not exclusive.
2. Distinguish bundled vs system AXe in UI tools and video capture; only apply bundled-specific env when the bundled binary is used.
3. Align Doctor output: show both bundled availability and PATH availability, and use that in the UI automation supported status.
4. Update Smithery build to run `bundle:axe` and copy `bundled/` into the Smithery bundle output; skip binary verification on non-mac builders to avoid build failures.

## Preventive Measures
- Add tests for AXe resolution precedence (bundled, env override, PATH) and for Doctor output consistency.
- Document Smithery-specific install requirements and verify `bundled/` presence in Smithery artifacts during CI.
