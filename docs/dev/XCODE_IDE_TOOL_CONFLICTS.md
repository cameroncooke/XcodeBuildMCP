# Tool Conflicts: XcodeBuildMCP vs Xcode Tools MCP (running inside Xcode agent)

Date: 2026-02-04

This report is scoped to the “user is running inside Xcode’s integrated coding agent” scenario (Codex/Claude-in-Xcode), where the user expectation is that **build/test operations happen inside the Xcode IDE**, not via external `xcodebuild` invocations.

The goal is to identify which existing XcodeBuildMCP tools become redundant or counterproductive once we also expose Xcode’s own MCP toolset via `xcrun mcpbridge` (proxied as `xcode_tools_*`).

## Inputs / assumptions

- XcodeBuildMCP can detect it is running under Xcode via process-tree detection (`detectXcodeRuntime` / `runningUnderXcode`).
- When `xcode-ide` workflow is enabled and the bridge is healthy, Xcode’s “Xcode Tools” MCP server tools are proxied and exposed as `xcode_tools_<RemoteToolName>` (e.g. `xcode_tools_BuildProject`).
- The Xcode Tools MCP service includes IDE-scoped tools such as:
  - `BuildProject`, `GetBuildLog`
  - `GetTestList`, `RunAllTests`, `RunSomeTests`
  - `XcodeListWindows` (to obtain `tabIdentifier`)
  - IDE diagnostics + previews (`XcodeListNavigatorIssues`, `XcodeRefreshCodeIssuesInFile`, `RenderPreview`)
  - Project navigator operations (`XcodeLS`, `XcodeRead`, `XcodeWrite`, `XcodeUpdate`, `XcodeMV`, `XcodeRM`, `XcodeMakeDir`, `XcodeGlob`, `XcodeGrep`)
- This report intentionally keeps the policy simple: tools marked “Yes” in the table are hidden whenever **(1)** we are running under Xcode and **(2)** Xcode Tools MCP is enabled/available. We do not try to detect project type, and we do not gate on the presence of individual remote tool names.

This report focuses on **behavioral conflicts** (user intent + Xcode expectation), not literal name collisions (we prefix proxied tools so there are no name collisions).

## What “conflict” means in the Xcode agent context

When inside Xcode:

- Running `xcodebuild` externally is surprising: users expect Xcode’s scheme/configuration, IDE build settings, and build system state to be authoritative.
- External builds/tests risk divergence from the IDE state (indexing, derived data location, active scheme/config, workspace selection, build logs, test results).
- The Xcode Tools MCP tools are **IDE-scoped**: they naturally align with “build/test in the IDE”.

Therefore, any XcodeBuildMCP tool that primarily exists to build/test a workspace/project should be considered a “conflict” when Xcode Tools MCP is available.

## Recommended mapping (Xcode Tools MCP → XcodeBuildMCP tools to hide)

This table is the actionable “what to hide” list for the Xcode agent scenario.

| User intent inside Xcode | Prefer Xcode Tools MCP | Hide XcodeBuildMCP tools | Notes |
| --- | --- | --- | --- |
| Build (iOS simulator) | `xcode_tools_BuildProject` | `simulator/build_sim`, `simulator/build_run_sim` | Avoid external `xcodebuild` builds competing with the IDE. |
| Build (iOS device) | `xcode_tools_BuildProject` | `device/build_device` | Same reasoning as simulator; keep device install/launch tools. |
| Build (macOS) | `xcode_tools_BuildProject` | `macos/build_macos`, `macos/build_run_macos` | Keep `launch_mac_app`/`stop_mac_app` if they remain useful. |
| Run tests | `xcode_tools_RunAllTests` / `xcode_tools_RunSomeTests` | `simulator/test_sim`, `device/test_device`, `macos/test_macos` | Use `xcode_tools_GetTestList` for discovery. |
| Select active workspace/tab | `xcode_tools_XcodeListWindows` | `*/discover_projs` | When inside Xcode, prefer tab-scoped operations over filesystem scanning. |
| SwiftPM build/test (inside Xcode) | `xcode_tools_BuildProject` / `xcode_tools_RunAllTests` | `swift-package/swift_package_build`, `swift-package/swift_package_test` | We likely cannot reliably detect “SPM-only vs Xcode-opened”; treat “inside Xcode” as sufficient. |
| Clean build artifacts | (TBD: if Xcode exposes clean) | `*/clean` | External cleans are surprising in IDE mode; hide unless we explicitly want them as an escape hatch. |
| Scaffold new projects | (none) | `project-scaffolding/*` | Inside Xcode agent mode the user already has an open workspace; scaffolding is noise by default. |
| Inspect build/test results | `xcode_tools_GetBuildLog` | (none) | We don’t have an equivalent; this is additive. |
| Inspect IDE issues/diagnostics | `xcode_tools_XcodeListNavigatorIssues`, `xcode_tools_XcodeRefreshCodeIssuesInFile` | (none) | Additive; these are uniquely IDE-scoped. |
| Render SwiftUI previews | `xcode_tools_RenderPreview` | (none) | Additive; we don’t have a preview renderer. |

## High-confidence replacements (hide XcodeBuildMCP tool in favor of Xcode Tools MCP)

These are the tools where the user expectation (“do it inside Xcode”) matches an Xcode Tools MCP tool, and using our external implementation is likely worse.

### Builds

Preferred (inside Xcode): `xcode_tools_BuildProject` (+ `xcode_tools_GetBuildLog` to read the result).

Hide these XcodeBuildMCP tools when running under Xcode **and** Xcode Tools MCP is available:

- `simulator/build_sim`
- `simulator/build_run_sim`
- `device/build_device`
- `macos/build_macos`
- `macos/build_run_macos`

Rationale:
- These tools are conceptually “build in Xcode”; inside Xcode, the IDE’s own build orchestration should win.
- Even when they work, external builds can produce confusing logs/results compared to Xcode’s build log UI.

Decision:
- Hide these tools in Xcode agent mode when Xcode Tools MCP is available.

### Tests

Preferred (inside Xcode): `xcode_tools_RunAllTests` / `xcode_tools_RunSomeTests` (+ `xcode_tools_GetTestList` for discovery).

Hide these XcodeBuildMCP tools when running under Xcode **and** Xcode Tools MCP is available:

- `simulator/test_sim`
- `device/test_device`
- `macos/test_macos`

Optional (see “Medium-confidence” below):
- `swift-package/swift_package_test`

Rationale:
- Same expectation mismatch as builds: inside Xcode, “run tests” should be IDE-driven for correct scheme/test plan selection and to keep results in the IDE’s world.

Decision:
- Hide these tools in Xcode agent mode when Xcode Tools MCP is available.

## Medium-confidence replacements (likely hide, but verify ergonomics first)

These are tools where Xcode Tools MCP likely provides a better alternative, but the mapping isn’t 1:1 or may depend on project type.

### Project/workspace discovery

Candidate:
- `*/discover_projs` (appears in `simulator`, `device`, `macos`, `project-discovery`)

Potential replacement (inside Xcode):
- `xcode_tools_XcodeListWindows` (gives you the active workspace + `tabIdentifier`)

Recommendation:
- Hide `discover_projs` inside Xcode agent mode.
- Prefer tab-scoped context (`tabIdentifier`) over filesystem scanning to ensure builds/tests target the active Xcode workspace.

Decision:
- Hide `discover_projs` in Xcode agent mode.
- Do not add a separate “window picker” tool; `XcodeListWindows` already provides the list and the agent can select the relevant `tabIdentifier`.

### Swift Package builds/tests

Potentially hide when inside Xcode and the package is opened in Xcode:

- `swift-package/swift_package_build`
- `swift-package/swift_package_test`

Preferred (inside Xcode): `xcode_tools_BuildProject` / `xcode_tools_RunAllTests`.

Why it’s medium confidence:
- Our SwiftPM tools are valuable when working outside Xcode or for pure SwiftPM workflows.
- In Xcode agent mode, users may still want a “swift package” workflow if the package is not opened as an Xcode project/tab.

Decision:
- Hide `swift_package_build` and `swift_package_test` in Xcode agent mode (regardless of project type detection), but keep them outside Xcode agent mode.

### Build settings / scheme listing

Candidates:
- `*/list_schemes`
- `*/show_build_settings`

Xcode Tools MCP does not obviously provide a direct “list schemes” or “show build settings” equivalent; but the IDE *knows* these things and may surface them indirectly via build/test APIs (or via project navigator + metadata).

Recommendation:
- Treat these as supporting tools for external `xcodebuild`-driven workflows. If we hide the external build/test workflows in Xcode agent mode, these are usually noise.

Decision:
- Hide `*/list_schemes` and `*/show_build_settings` in Xcode agent mode if (after audit) no remaining exposed tool depends on them.
- If we still have any XcodeBuildMCP tool that requires scheme/config/build settings inside Xcode agent mode, keep these until that dependency is removed or replaced.

## Low-confidence replacements (do not hide; keep XcodeBuildMCP)

These remain useful inside Xcode because Xcode Tools MCP does not replace them, or because they operate on domains outside the IDE tool service.

- Simulator/device control + UI automation:
  - `simulator-management/*`, `simulator/boot_sim`, `simulator/open_sim`, `ui-automation/*`
- App install/launch/stop/log capture:
  - `simulator/install_app_sim`, `simulator/launch_app_sim`, `simulator/stop_app_sim`
  - `device/install_app_device`, `device/launch_app_device`, `device/stop_app_device`
  - `logging/*` (device/sim log capture)
- Debugger workflows:
  - `debugging/*` (LLDB/DAP/stack/breakpoints)

Reasoning:
- Xcode Tools MCP is IDE-scoped and does not appear to cover simulator/device lifecycle automation at the level XcodeBuildMCP provides.
- Even if Xcode can run/debug, the agent often needs precise control (boot, tap, capture logs, etc.) that is outside the IDE tool service.

Decision:
- Keep the simulator/device/debugging/logging automation tools.
- Hide `project-scaffolding/*` in Xcode agent mode by default (keep outside Xcode agent mode).

## Concrete “hide” policy proposal (for implementation)

When **all** conditions are true:

1) `runningUnderXcode === true` (process-tree detection), and
2) Xcode Tools bridge is enabled/available (i.e. Xcode Tools MCP is in play),

…then hide (do not register / do not list) the following XcodeBuildMCP tools:

- Builds: `simulator/build_sim`, `simulator/build_run_sim`, `device/build_device`, `macos/build_macos`, `macos/build_run_macos`
- Tests: `simulator/test_sim`, `device/test_device`, `macos/test_macos`
- Discovery: `*/discover_projs`
- SwiftPM: `swift-package/swift_package_build`, `swift-package/swift_package_test`
- Scaffolding: `project-scaffolding/scaffold_ios_project`, `project-scaffolding/scaffold_macos_project`
- Clean: `*/clean` (unless we explicitly keep it as an escape hatch)

Implementation note:
- “`*/clean`” maps to multiple workflows (`device/clean`, `macos/clean`, `simulator/clean`, `utilities/clean`).
- “`*/discover_projs`” maps to multiple workflows (`device/discover_projs`, `macos/discover_projs`, `simulator/discover_projs`, `project-discovery/discover_projs`).

Notes:
- This should be “hide”, not “delete”: keep the tools as fallback when not running under Xcode, or when the bridge is unavailable/untrusted.
- Keep a config escape hatch (e.g. `preferXcodeToolsInXcodeAgent: true/false`) if you want to allow power users to force external builds/tests.

## Interplay with workflow selection (`enabledWorkflows`) and workflow management

There are two separate “filters” that decide what tools an agent sees:

1) **Workflow selection** (coarse inclusion)
   - The server registers tools from the workflows listed in config `enabledWorkflows` (plus mandatory workflows).
   - If `enabledWorkflows` is empty, workflow selection defaults to the `simulator` workflow.
   - The `manage-workflows` tool adjusts the *enabled workflow list* at runtime by adding/removing workflow names, then re-applying selection.
   - Some workflows are effectively mandatory (e.g. `session-management`; `doctor` and `workflow-discovery` are auto-added based on config flags).

2) **Xcode-agent-mode visibility filtering** (fine-grained hiding)
   - This report proposes an additional post-selection rule that hides specific tools when running inside Xcode and Xcode Tools MCP is enabled/available.
   - This is intentionally layered **after** workflow selection: a tool must be included by workflow selection *first* before it can be hidden by visibility filtering.
   - Effect: enabling a workflow does not guarantee every tool in that workflow is visible in Xcode agent mode (by design).

Important nuance: some tools are **re-exported** across workflows (same MCP tool name appears in multiple workflows). Disabling one workflow might not remove the tool if another enabled workflow still provides it; the visibility filter applies to the tool name regardless of where it came from.

## Why this improves the Xcode agent UX

- Matches the user’s mental model: “I’m in Xcode; builds/tests happen in Xcode”.
- Makes tool choice less noisy: the agent isn’t offered two competing ways to “build” or “run tests”.
- Reduces risk of confusing state divergence (derived data, schemes, logs, test results).

## Follow-up validation tasks (before hard-hiding)

These are quick checks to run once the Xcode Tools bridge is stable in the Xcode agent environment:

- Confirm `BuildProject` supports the projects you care about (workspace vs project, SPM package, build configurations).
- Confirm test tools (`RunAllTests` / `RunSomeTests`) map cleanly to scheme/test plan selection and produce useful results.
- Confirm `GetBuildLog` provides enough structure for agents (errors/warnings + file locations).
- Confirm whether Xcode exposes “clean” semantics via `BuildProject` (or some other tool). If it does, `*/clean` may become a hide candidate too.
- Audit remaining exposed XcodeBuildMCP tools in Xcode agent mode to ensure none require schemes/build settings (otherwise keep `*/list_schemes` and `*/show_build_settings`).

## Full tool catalog decisions (Xcode agent mode)

The table below is the complete XcodeBuildMCP tool catalog (from `build/tools-manifest.json`) with the yes/no decision for whether to hide the tool when:

- Running under Xcode is `true`, AND
- Xcode Tools MCP is enabled/available

| Workflow | Tool | Hide In Xcode Agent Mode? | Notes |
| --- | --- | --- | --- |
| debugging | debug_attach_sim | No | No Xcode Tools equivalent; simulator debugging via LLDB/DAP. |
| debugging | debug_breakpoint_add | No | No Xcode Tools equivalent; simulator debugging via LLDB/DAP. |
| debugging | debug_breakpoint_remove | No | No Xcode Tools equivalent; simulator debugging via LLDB/DAP. |
| debugging | debug_continue | No | No Xcode Tools equivalent; simulator debugging via LLDB/DAP. |
| debugging | debug_detach | No | No Xcode Tools equivalent; simulator debugging via LLDB/DAP. |
| debugging | debug_lldb_command | No | No Xcode Tools equivalent; simulator debugging via LLDB/DAP. |
| debugging | debug_stack | No | No Xcode Tools equivalent; simulator debugging via LLDB/DAP. |
| debugging | debug_variables | No | No Xcode Tools equivalent; simulator debugging via LLDB/DAP. |
| device | build_device | Yes | Prefer `xcode_tools_BuildProject` (IDE build). |
| device | clean | Yes | External clean is surprising in IDE mode; keep as non-Xcode fallback only. Re-export of utilities. |
| device | discover_projs | Yes | Prefer `xcode_tools_XcodeListWindows` + `tabIdentifier` over filesystem scanning. Re-export of project-discovery. |
| device | get_app_bundle_id | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. Re-export of project-discovery. |
| device | get_device_app_path | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. |
| device | install_app_device | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. |
| device | launch_app_device | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. |
| device | list_devices | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. |
| device | list_schemes | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. Re-export of project-discovery. |
| device | show_build_settings | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. Re-export of project-discovery. |
| device | start_device_log_cap | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. Re-export of logging. |
| device | stop_app_device | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. |
| device | stop_device_log_cap | No | Runtime device workflow (install/launch/logs/etc) not covered by Xcode Tools MCP. Re-export of logging. |
| device | test_device | Yes | Prefer `xcode_tools_RunAllTests`/`xcode_tools_RunSomeTests` (IDE tests). |
| doctor | doctor | No | Diagnostics; still needed. |
| logging | start_device_log_cap | No | No Xcode Tools equivalent; log capture (sim/device). |
| logging | start_sim_log_cap | No | No Xcode Tools equivalent; log capture (sim/device). |
| logging | stop_device_log_cap | No | No Xcode Tools equivalent; log capture (sim/device). |
| logging | stop_sim_log_cap | No | No Xcode Tools equivalent; log capture (sim/device). |
| macos | build_macos | Yes | Prefer `xcode_tools_BuildProject` (IDE build). |
| macos | build_run_macos | Yes | Prefer `xcode_tools_BuildProject` (IDE build). |
| macos | clean | Yes | External clean is surprising in IDE mode; keep as non-Xcode fallback only. Re-export of utilities. |
| macos | discover_projs | Yes | Prefer `xcode_tools_XcodeListWindows` + `tabIdentifier` over filesystem scanning. Re-export of project-discovery. |
| macos | get_mac_app_path | No | Runtime macOS app lifecycle not covered by Xcode Tools MCP. |
| macos | get_mac_bundle_id | No | Runtime macOS app lifecycle not covered by Xcode Tools MCP. Re-export of project-discovery. |
| macos | launch_mac_app | No | Runtime macOS app lifecycle not covered by Xcode Tools MCP. |
| macos | list_schemes | No | Runtime macOS app lifecycle not covered by Xcode Tools MCP. Re-export of project-discovery. |
| macos | show_build_settings | No | Runtime macOS app lifecycle not covered by Xcode Tools MCP. Re-export of project-discovery. |
| macos | stop_mac_app | No | Runtime macOS app lifecycle not covered by Xcode Tools MCP. |
| macos | test_macos | Yes | Prefer `xcode_tools_RunAllTests`/`xcode_tools_RunSomeTests` (IDE tests). |
| project-discovery | discover_projs | Yes | Prefer `xcode_tools_XcodeListWindows` + `tabIdentifier` over filesystem scanning. |
| project-discovery | get_app_bundle_id | No | Useful for non-IDE flows and for remaining runtime tools. |
| project-discovery | get_mac_bundle_id | No | Useful for non-IDE flows and for remaining runtime tools. |
| project-discovery | list_schemes | No | Useful for non-IDE flows and for remaining runtime tools. |
| project-discovery | show_build_settings | No | Useful for non-IDE flows and for remaining runtime tools. |
| project-scaffolding | scaffold_ios_project | Yes | Not expected inside Xcode agent mode (project already open). |
| project-scaffolding | scaffold_macos_project | Yes | Not expected inside Xcode agent mode (project already open). |
| session-management | session_clear_defaults | No | Session defaults plumbing; still needed. |
| session-management | session_set_defaults | No | Session defaults plumbing; still needed. |
| session-management | session_show_defaults | No | Session defaults plumbing; still needed. |
| simulator | boot_sim | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. |
| simulator | build_run_sim | Yes | Prefer `xcode_tools_BuildProject` (IDE build). |
| simulator | build_sim | Yes | Prefer `xcode_tools_BuildProject` (IDE build). |
| simulator | clean | Yes | External clean is surprising in IDE mode; keep as non-Xcode fallback only. Re-export of utilities. |
| simulator | discover_projs | Yes | Prefer `xcode_tools_XcodeListWindows` + `tabIdentifier` over filesystem scanning. Re-export of project-discovery. |
| simulator | get_app_bundle_id | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. Re-export of project-discovery. |
| simulator | get_sim_app_path | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. |
| simulator | install_app_sim | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. |
| simulator | launch_app_logs_sim | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. |
| simulator | launch_app_sim | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. |
| simulator | list_schemes | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. Re-export of project-discovery. |
| simulator | list_sims | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. |
| simulator | open_sim | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. |
| simulator | record_sim_video | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. |
| simulator | screenshot | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. Re-export of ui-automation. |
| simulator | show_build_settings | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. Re-export of project-discovery. |
| simulator | snapshot_ui | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. Re-export of ui-automation. |
| simulator | stop_app_sim | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. |
| simulator | stop_sim_log_cap | No | Runtime simulator workflow (install/launch/UI/etc) not covered by Xcode Tools MCP. Re-export of logging. |
| simulator | test_sim | Yes | Prefer `xcode_tools_RunAllTests`/`xcode_tools_RunSomeTests` (IDE tests). |
| simulator-management | boot_sim | No | Simulator fleet management not covered by Xcode Tools MCP. Re-export of simulator. |
| simulator-management | erase_sims | No | Simulator fleet management not covered by Xcode Tools MCP. |
| simulator-management | list_sims | No | Simulator fleet management not covered by Xcode Tools MCP. Re-export of simulator. |
| simulator-management | open_sim | No | Simulator fleet management not covered by Xcode Tools MCP. Re-export of simulator. |
| simulator-management | reset_sim_location | No | Simulator fleet management not covered by Xcode Tools MCP. |
| simulator-management | set_sim_appearance | No | Simulator fleet management not covered by Xcode Tools MCP. |
| simulator-management | set_sim_location | No | Simulator fleet management not covered by Xcode Tools MCP. |
| simulator-management | sim_statusbar | No | Simulator fleet management not covered by Xcode Tools MCP. |
| swift-package | swift_package_build | Yes | Build/test should run via Xcode IDE in agent mode. |
| swift-package | swift_package_clean | No | Keep (no clear IDE-scoped replacement). |
| swift-package | swift_package_list | No | Keep (no clear IDE-scoped replacement). |
| swift-package | swift_package_run | No | Keep (no clear IDE-scoped replacement). |
| swift-package | swift_package_stop | No | Keep (no clear IDE-scoped replacement). |
| swift-package | swift_package_test | Yes | Build/test should run via Xcode IDE in agent mode. |
| ui-automation | button | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | gesture | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | key_press | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | key_sequence | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | long_press | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | screenshot | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | snapshot_ui | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | swipe | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | tap | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | touch | No | No Xcode Tools equivalent; simulator UI automation. |
| ui-automation | type_text | No | No Xcode Tools equivalent; simulator UI automation. |
| utilities | clean | Yes | External clean is surprising in IDE mode; keep as non-Xcode fallback only. |
| workflow-discovery | manage_workflows | No | Workflow toggling; still needed. |
| xcode-ide | xcode_tools_bridge_disconnect | No | Bridge debug-only tools (also gated by `debug: true`). |
| xcode-ide | xcode_tools_bridge_status | No | Bridge debug-only tools (also gated by `debug: true`). |
| xcode-ide | xcode_tools_bridge_sync | No | Bridge debug-only tools (also gated by `debug: true`). |
