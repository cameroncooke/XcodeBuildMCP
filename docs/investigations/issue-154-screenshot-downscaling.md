# Investigation: Optional Screenshot Downscaling (Issue #154)

## Summary
Investigation started; initial context gathered from the issue description. Context builder failed (Gemini CLI usage error), so manual exploration is proceeding.

## Symptoms
- Screenshots captured for UI automation are full-resolution by default.
- High-resolution screenshots increase multimodal token usage and cost.

## Investigation Log

### 2025-01-XX - Initial assessment
**Hypothesis:** Screenshot pipeline always emits full-resolution images and lacks an opt-in scaling path.
**Findings:** Issue describes full-res screenshots and requests optional downscaling. No code inspected yet.
**Evidence:** GitHub issue #154 body.
**Conclusion:** Needs codebase investigation.

### 2025-01-XX - Context builder attempt
**Hypothesis:** Use automated context discovery to map screenshot capture flow.
**Findings:** `context_builder` failed due to Gemini CLI usage error in this environment.
**Evidence:** Tool error output in session (Gemini CLI usage/help text).
**Conclusion:** Proceeding with manual code inspection.

### 2025-01-XX - Screenshot capture implementation
**Hypothesis:** Screenshot tool stores and returns full-resolution PNGs.
**Findings:** The `screenshot` tool captures a PNG, then immediately downscales/optimizes via `sips` to max 800px width, JPEG format, quality 75%, and returns the JPEG. Optimization is always attempted; on failure it falls back to original PNG.
**Evidence:** `src/mcp/tools/ui-testing/screenshot.ts` (sips `-Z 800`, `format jpeg`, `formatOptions 75`).
**Conclusion:** The current implementation already downscales by default; the gap is configurability (opt-in/out, size/quality controls) and documentation.

### 2025-01-XX - Git history check
**Hypothesis:** Recent commits might have added/changed screenshot optimization behavior.
**Findings:** Recent history shows tool annotations and session-awareness changes, but no indication of configurable screenshot scaling.
**Evidence:** `git log -n 5 -- src/mcp/tools/ui-testing/screenshot.ts`.
**Conclusion:** No recent change introduces optional scaling controls.

## Root Cause
The issue report assumes full-resolution screenshots, but the current `screenshot` tool already downsamples to 800px max width and JPEG 75% every time. There is no parameter to disable or tune this behavior, and docs do not mention the optimization.

## Recommendations
1. Document existing downscaling behavior and defaults in tool docs (and in the screenshot tool description).
2. Add optional parameters to `screenshot` for max width/quality/format or a boolean to disable optimization, preserving current defaults.

## Preventive Measures
- Add a section in docs/TOOLS.md or tool-specific docs describing image processing defaults and token tradeoffs.
