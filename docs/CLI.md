# CLI Mapping for MCP Tools

This doc maps MCP tools that wrap CLIs (xcodebuild, xcrun simctl/devicectl/xcresulttool/xctrace, AXe) to equivalent terminal commands. It also calls out MCP-only pre/post-processing and stateful behavior.

## Conventions

- Placeholders use angle brackets (e.g., `<WORKSPACE>`, `<SIMULATOR_UDID>`).
- Commands are shown in the shape MCP executes; some tools orchestrate multiple commands.
- Use `-workspace` **or** `-project` depending on your project type.
- Tool names in MCP are kebab-case where defined (e.g., `session-set-defaults`). Older docs may show snake_case aliases.

## Session defaults (stateful but optional)

Many tools are session-aware and omit parameters that can be provided once via session defaults. See `docs/SESSION_DEFAULTS.md` for details and opt-out:

```json
"env": {
  "XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS": "true"
}
```

## Environment variables observed

- `XCODEBUILDMCP_AXE_PATH`: override AXe binary path (preferred over PATH).
- `AXE_PATH`: alternate AXe path override.
- `XBMCP_LAUNCH_JSON_WAIT_MS`: device log launch JSON wait timeout (ms).

## Project discovery

### `discover_projs`

**CLI equivalent (approximate):**

```sh
cd "<WORKSPACE_ROOT>"
find "<SCAN_PATH>" -maxdepth <MAX_DEPTH> \
  \( -name build -o -name DerivedData -o -name Pods -o -name .git -o -name node_modules \) -prune -false \
  -o -name "*.xcodeproj" -print \
  -o -name "*.xcworkspace" -print
```

**MCP notes:** enforces scan within `<WORKSPACE_ROOT>`, skips symlinks, returns absolute paths.

### `list_schemes`

```sh
xcodebuild -list -workspace "<WORKSPACE>"
# or
xcodebuild -list -project "<PROJECT>"
```

**MCP notes:** parses the `Schemes:` block and adds “Next Steps”.

### `show_build_settings`

```sh
xcodebuild -showBuildSettings -workspace "<WORKSPACE>" -scheme "<SCHEME>"
# or
xcodebuild -showBuildSettings -project "<PROJECT>" -scheme "<SCHEME>"
```

**MCP notes:** formats output and adds “Next Steps”.

### `get_app_bundle_id`

```sh
defaults read "<APP_PATH>/Info" CFBundleIdentifier
# fallback
/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "<APP_PATH>/Info.plist"
```

**MCP notes:** validates file existence before reading.

### `get_mac_bundle_id`

```sh
defaults read "<MAC_APP_PATH>/Contents/Info" CFBundleIdentifier
# fallback
/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "<MAC_APP_PATH>/Contents/Info.plist"
```

## Simulator

### `list_sims`

```sh
xcrun simctl list devices --json
# fallback when JSON parsing fails
xcrun simctl list devices
```

**MCP arguments:**

- `enabled`: boolean filter (optional)

**MCP notes:** merges JSON and text output to work around simctl JSON bugs and filters to available devices.

### `boot_sim`

```sh
xcrun simctl boot "<SIMULATOR_UDID>"
```

### `open_sim`

```sh
open -a Simulator
```

### `install_app_sim`

```sh
xcrun simctl install "<SIMULATOR_UDID>" "<APP_PATH>"
```

**MCP notes:** validates file existence before install.

### `launch_app_sim`

```sh
xcrun simctl get_app_container "<SIMULATOR_UDID>" "<BUNDLE_ID>" app
xcrun simctl launch "<SIMULATOR_UDID>" "<BUNDLE_ID>" [<ARGS...>]
```

**MCP notes:** resolves simulator name to UDID when needed.

### `stop_app_sim`

```sh
xcrun simctl terminate "<SIMULATOR_UDID>" "<BUNDLE_ID>"
```

### `get_sim_app_path`

```sh
xcodebuild -showBuildSettings \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination 'platform=<SIMULATOR_PLATFORM>,id=<SIMULATOR_UDID>'
# or use -project "<PROJECT>"
```

**MCP notes:** parses `CODESIGNING_FOLDER_PATH` or `BUILT_PRODUCTS_DIR` + `FULL_PRODUCT_NAME`.

### `build_sim`

```sh
xcodebuild \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination 'platform=<SIMULATOR_PLATFORM>,id=<SIMULATOR_UDID>' \
  -skipMacroValidation \
  build \
  [<EXTRA_ARGS...>]
# or use -project "<PROJECT>"
```

**MCP notes:** uses project directory as `cwd` and may use xcodemake/make for incremental builds (see “xcodemake branch”).

### `test_sim`

```sh
TEST_RUNNER_FOO=bar xcodebuild \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination 'platform=<SIMULATOR_PLATFORM>,id=<SIMULATOR_UDID>' \
  -skipMacroValidation \
  test
# or use -project "<PROJECT>"
```

**MCP notes:** normalizes `testRunnerEnv` values, enforcing `TEST_RUNNER_` prefix.

### `build_run_sim` (multi-step orchestration)

1. Build (same as `build_sim`).
2. Resolve app path via `xcodebuild -showBuildSettings` and parse product paths.
3. Ensure simulator exists/booted (`simctl list`, then `simctl boot`).
4. Open Simulator app (best-effort).
5. Install app:

```sh
xcrun simctl install "<SIMULATOR_UDID>" "<APP_PATH>"
```

1. Extract bundle ID from Info.plist.
2. Launch:

```sh
xcrun simctl launch "<SIMULATOR_UDID>" "<BUNDLE_ID>"
```

**MCP notes:** resolves simulator names to UDIDs and handles missing/booted state. Not a single CLI call.

### `launch_app_logs_sim`

**CLI equivalents (conceptual):**

```sh
xcrun simctl launch --console-pty "<SIMULATOR_UDID>" "<BUNDLE_ID>" [<ARGS...>]
xcrun simctl spawn "<SIMULATOR_UDID>" log stream --level=debug --predicate 'subsystem == "<BUNDLE_ID>"'
```

**MCP notes:** returns a `sessionId` and manages background processes; requires stop tool to collect logs.
**Stateful:** relies on MCP server process to track the active log capture session.

### `screenshot`

```sh
xcrun simctl io "<SIMULATOR_UDID>" screenshot "<TMP_PNG>"
# MCP post-processing
sips -Z 800 -s format jpeg -s formatOptions 75 "<TMP_PNG>" --out "<TMP_JPG>"
```

**MCP notes:** creates temp files, optimizes to JPEG, cleans up, and returns base64.

### `record_sim_video`

```sh
"<AXE_BIN>" record-video --udid "<SIMULATOR_UDID>" --fps <FPS>
```

**MCP notes:** stateful start/stop session, collects stdout to parse MP4 path, moves file on stop, and enforces AXe >= 1.1.0.
**Stateful:** relies on MCP server process to track the active recording session.

## Device

### `list_devices`

```sh
xcrun devicectl list devices --json-output "<TMP_JSON>"
cat "<TMP_JSON>"
# fallback
xcrun xctrace list devices
```

**MCP notes:** reads temp JSON, parses, cleans up; falls back to xctrace when devicectl is unavailable or empty.

### `install_app_device`

```sh
xcrun devicectl device install app --device "<DEVICE_UDID>" "<APP_PATH>"
```

### `launch_app_device`

```sh
xcrun devicectl device process launch \
  --device "<DEVICE_UDID>" \
  --json-output "<TMP_JSON>" \
  --terminate-existing \
  "<BUNDLE_ID>"
```

**MCP notes:** parses JSON output for PID and adds “Next Steps”.

### `stop_app_device`

```sh
xcrun devicectl device process terminate --device "<DEVICE_UDID>" --pid "<PID>"
```

### `build_device`

```sh
xcodebuild \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination 'generic/platform=iOS' \
  -skipMacroValidation \
  build
# or use -project "<PROJECT>"
```

**MCP notes:** when deviceId is provided, destination becomes `platform=iOS,id=<DEVICE_UDID>`.

### `get_device_app_path`

```sh
xcodebuild -showBuildSettings \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination 'generic/platform=<PLATFORM>'
# or use -project "<PROJECT>"
```

**MCP notes:** parses `BUILT_PRODUCTS_DIR` + `FULL_PRODUCT_NAME`.

### `test_device`

```sh
xcodebuild \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination 'platform=iOS,id=<DEVICE_UDID>' \
  -skipMacroValidation \
  test \
  -resultBundlePath "<TMP_DIR>/TestResults.xcresult"

xcrun xcresulttool get test-results summary --path "<TMP_DIR>/TestResults.xcresult"
```

**MCP notes:** creates temp bundle directory, parses summary JSON, formats output, and cleans up.

## Logging

### `start_sim_log_cap`

```sh
xcrun simctl launch --console-pty --terminate-running-process "<SIMULATOR_UDID>" "<BUNDLE_ID>" [<ARGS...>]
xcrun simctl spawn "<SIMULATOR_UDID>" log stream --level=debug --predicate 'subsystem == "<BUNDLE_ID>"'
```

**MCP arguments:**

- `captureConsole`: boolean to capture console output
- `subsystemFilter`: filter logs by subsystem (app|all|swiftui|[custom subsystem])

**MCP notes:** writes to a temp log file, cleans old logs, manages multiple processes, returns `sessionId`.
**Stateful:** relies on MCP server process to track the active log capture session.

### `stop_sim_log_cap`

```sh
kill -TERM <LOG_PROCESS_PID>
cat "<LOG_FILE>"
```

**MCP notes:** uses sessionId to find processes/log file, stops processes, reads and returns log content.
**Stateful:** relies on MCP server process to track the active log capture session.

### `start_device_log_cap`

```sh
xcrun devicectl device process launch \
  --console \
  --terminate-existing \
  --device "<DEVICE_UDID>" \
  --json-output "<TMP_JSON>" \
  "<BUNDLE_ID>"
```

**MCP notes:** tails process output into a temp log file, polls JSON result for PID/errors, detects early failures, returns `sessionId`.
**Stateful:** relies on MCP server process to track the active log capture session.

### `stop_device_log_cap`

```sh
kill -TERM <DEVICE_CAPTURE_PID>
cat "<LOG_FILE>"
```

**MCP notes:** uses sessionId to find process/log file, waits for close, then reads log content.
**Stateful:** relies on MCP server process to track the active log capture session.

## UI automation (AXe)

All UI automation tools call AXe with `--udid <SIMULATOR_UDID>`. If an AXe binary is bundled or configured, MCP sets up the correct environment and provides friendly errors. When a debugger is attached and stopped, MCP blocks UI automation and returns a warning.

### `snapshot_ui`

```sh
"<AXE_BIN>" describe-ui --udid "<SIMULATOR_UDID>"
```

**MCP notes:** records call timestamp and warns if subsequent coordinate-based tools run without a fresh `snapshot_ui`.

### `tap`

```sh
"<AXE_BIN>" tap -x <X> -y <Y> [--pre-delay <SECONDS>] [--post-delay <SECONDS>] --udid "<SIMULATOR_UDID>"
# or
"<AXE_BIN>" tap --id "<ACCESSIBILITY_ID>" [--pre-delay <SECONDS>] [--post-delay <SECONDS>] --udid "<SIMULATOR_UDID>"
# or
"<AXE_BIN>" tap --label "<ACCESSIBILITY_LABEL>" [--pre-delay <SECONDS>] [--post-delay <SECONDS>] --udid "<SIMULATOR_UDID>"
```

**MCP arguments:**

- `x`, `y`: tap coordinates (mutually exclusive with id/label)
- `id`: accessibility identifier (mutually exclusive with x/y and label)
- `label`: accessibility label (mutually exclusive with x/y and id)
- `preDelay`: seconds to wait before tap
- `postDelay`: seconds to wait after tap

**MCP notes:** validates mutual exclusivity (id vs label), and warns on stale coordinates.

### `swipe`

```sh
"<AXE_BIN>" swipe --start-x <X1> --start-y <Y1> --end-x <X2> --end-y <Y2> \
  [--duration <SECONDS>] [--delta <PIXELS>] [--pre-delay <SECONDS>] [--post-delay <SECONDS>] \
  --udid "<SIMULATOR_UDID>"
```

**MCP notes:** warns if `describe_ui` was not called recently.

### `gesture`

```sh
"<AXE_BIN>" gesture <PRESET> \
  [--screen-width <PX>] [--screen-height <PX>] [--duration <SECONDS>] [--delta <PX>] \
  [--pre-delay <SECONDS>] [--post-delay <SECONDS>] \
  --udid "<SIMULATOR_UDID>"
```

**MCP notes:** presets include scroll and edge swipes; MCP validates allowed values.

### `touch`

```sh
"<AXE_BIN>" touch -x <X> -y <Y> [--down] [--up] [--delay <SECONDS>] --udid "<SIMULATOR_UDID>"
```

**MCP notes:** requires at least one of `--down` or `--up` and warns on stale coordinates.

### `long_press`

```sh
"<AXE_BIN>" touch -x <X> -y <Y> --down --up --delay <SECONDS> --udid "<SIMULATOR_UDID>"
```

**MCP notes:** converts `duration` (ms) to `--delay` (seconds).

### `button`

```sh
"<AXE_BIN>" button <BUTTON_TYPE> [--duration <SECONDS>] --udid "<SIMULATOR_UDID>"
```

**MCP notes:** valid button types are enforced (apple-pay, home, lock, side-button, siri).

### `key_press`

```sh
"<AXE_BIN>" key <KEY_CODE> [--duration <SECONDS>] --udid "<SIMULATOR_UDID>"
```

### `key_sequence`

```sh
"<AXE_BIN>" key-sequence --keycodes "<CODE_1>,<CODE_2>,<CODE_N>" [--delay <SECONDS>] --udid "<SIMULATOR_UDID>"
```

### `type_text`

```sh
"<AXE_BIN>" type "<TEXT>" --udid "<SIMULATOR_UDID>"
```

## Utilities

### `clean`

```sh
xcodebuild \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination '<DESTINATION>' \
  clean
# or use -project "<PROJECT>"
```

**MCP arguments:**

- `extraArgs`: additional xcodebuild arguments
- `platform`: target platform (macOS, iOS, iOS Simulator, watchOS, watchOS Simulator, tvOS, tvOS Simulator, visionOS, visionOS Simulator)

**MCP notes:** enforces project/workspace exclusivity and validates required scheme.

## Doctor

### `doctor`

```sh
xcodebuild -version
xcode-select -p
xcrun --find xcodebuild
xcrun --version
xcrun --find lldb-dap

which mise
mise --version

"<AXE_BIN>" --version
```

**MCP arguments:**

- `enabled`: boolean filter

**MCP notes:** reports internal workflow registry and server version in addition to CLI probes.

## macOS

### `build_macos`

```sh
xcodebuild \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination 'platform=macOS,arch=<ARCH>' \
  -skipMacroValidation \
  build \
  [<EXTRA_ARGS...>]
# or use -project "<PROJECT>"
```

**MCP notes:** uses project directory as `cwd` and may use xcodemake/make for incremental builds.

### `build_run_macos` (multi-step orchestration)

1. Build (same as `build_macos`).
2. Resolve app path with:

```sh
xcodebuild -showBuildSettings \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>"
# or use -project "<PROJECT>"
```

3. Launch:

```sh
open "<APP_PATH>"
```

**MCP notes:** parses `BUILT_PRODUCTS_DIR` + `FULL_PRODUCT_NAME` to find the app path.

### `get_mac_app_path`

```sh
xcodebuild -showBuildSettings \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination 'platform=macOS,arch=<ARCH>'
# or use -project "<PROJECT>"
```

**MCP arguments:**

- `derivedDataPath`: custom DerivedData path
- `extraArgs`: additional xcodebuild arguments

**MCP notes:** parses `BUILT_PRODUCTS_DIR` + `FULL_PRODUCT_NAME`.

### `launch_mac_app`

```sh
open "<APP_PATH>" --args <ARG_1> <ARG_2>
```

**MCP notes:** validates the .app bundle exists before launching.

### `stop_mac_app`

```sh
kill <PID>
# or
pkill -f "<APP_NAME>" || osascript -e 'tell application "<APP_NAME>" to quit'
```

### `test_macos`

```sh
TEST_RUNNER_FOO=bar xcodebuild \
  -workspace "<WORKSPACE>" \
  -scheme "<SCHEME>" \
  -configuration "<CONFIGURATION>" \
  -destination 'platform=macOS,arch=<ARCH>' \
  -skipMacroValidation \
  test \
  -resultBundlePath "<TMP_DIR>/TestResults.xcresult"

xcrun xcresulttool get test-results summary --path "<TMP_DIR>/TestResults.xcresult"
```

**MCP notes:** normalizes `testRunnerEnv` to `TEST_RUNNER_*`, parses xcresult summary, and cleans temp output.

## Project scaffolding

These tools are not direct CLI wrappers; they orchestrate template download plus file transformations.

### `scaffold_ios_project`

**CLI equivalent (approximate):**

```sh
cp -R "<IOS_TEMPLATE_DIR>" "<OUTPUT_PATH>"
# then replace placeholders in text files (project name, bundle id, versions)
```

**MCP arguments:**

- `projectName`: project name
- `outputPath`: destination path
- `bundleIdentifier`: app bundle identifier
- `displayName`: app display name
- `marketingVersion`: marketing version string
- `currentProjectVersion`: build number
- `customizeNames`: customize names during scaffolding
- `deploymentTarget`: minimum iOS version
- `targetedDeviceFamily`: array of device types (iPhone, iPad)
- `supportedOrientations`: array of supported orientations for iPhone
- `supportedOrientationsIpad`: array of supported orientations for iPad

**MCP notes:** downloads templates via TemplateManager and performs content/filename rewrites; no single CLI command maps 1:1.

### `scaffold_macos_project`

**CLI equivalent (approximate):**

```sh
cp -R "<MACOS_TEMPLATE_DIR>" "<OUTPUT_PATH>"
# then replace placeholders in text files (project name, bundle id, versions)
```

**MCP arguments:**

- `projectName`: project name
- `outputPath`: destination path
- `bundleIdentifier`: app bundle identifier
- `displayName`: app display name
- `marketingVersion`: marketing version string
- `currentProjectVersion`: build number
- `customizeNames`: customize names during scaffolding
- `deploymentTarget`: minimum macOS version

**MCP notes:** downloads templates via TemplateManager and performs content/filename rewrites; no single CLI command maps 1:1.

## Session management (stateful)

These tools manage MCP server state and have no direct CLI equivalent.

### `session-set-defaults`

**CLI equivalent:** none. This is MCP server state.

**MCP arguments:**

- `projectPath`: xcodeproj path (mutually exclusive with workspacePath)
- `workspacePath`: xcworkspace path (mutually exclusive with projectPath)
- `scheme`: Xcode scheme name
- `configuration`: build configuration (e.g., Debug, Release)
- `simulatorName`: simulator name
- `simulatorId`: simulator UUID
- `deviceId`: physical device UUID
- `useLatestOS`: use latest OS version for simulator
- `arch`: architecture (arm64, x86_64)
- `suppressWarnings`: suppress build warnings
- `derivedDataPath`: custom DerivedData path
- `preferXcodebuild`: prefer xcodebuild over incremental builds
- `platform`: device platform (e.g., iOS, watchOS)
- `bundleId`: default bundle identifier
- `persist`: persist defaults to .xcodebuildmcp/config.yaml

**Stateful:** relies on MCP server process to store defaults.

### `session-show-defaults`

**CLI equivalent:** none. This is MCP server state.

**Stateful:** relies on MCP server process to store defaults.

### `session-clear-defaults`

**CLI equivalent:** none. This is MCP server state.

**MCP arguments:**

- `keys`: array of specific keys to clear
- `all`: boolean to clear all defaults

**Stateful:** relies on MCP server process to store defaults.

## Workflow management (stateful)

### `manage-workflows`

**CLI equivalent:** none. This is MCP server state.

**MCP arguments:**

- `workflowNames`: array of workflow directory names to enable/disable
- `enable`: boolean to enable (true) or disable (false) the specified workflows

**MCP notes:** dynamically enables or disables workflow groups at runtime. Available workflows: debugging, device, doctor, logging, macos, project-discovery, project-scaffolding, session-management, simulator, simulator-management, swift-package, ui-automation, utilities, workflow-discovery. Some workflows (session-management) are mandatory and cannot be disabled.

**Stateful:** relies on MCP server process to track enabled workflows.

## Simulator management

### `erase_sims`

```sh
xcrun simctl erase "<SIMULATOR_UDID>"
# optional pre-step
xcrun simctl shutdown "<SIMULATOR_UDID>"
```

**MCP notes:** can auto-shutdown before erase when `shutdownFirst` is true.

### `reset_sim_location`

```sh
xcrun simctl location "<SIMULATOR_UDID>" clear
```

### `set_sim_location`

```sh
xcrun simctl location "<SIMULATOR_UDID>" set "<LAT>,<LON>"
```

### `set_sim_appearance`

```sh
xcrun simctl ui "<SIMULATOR_UDID>" appearance <dark|light>
```

### `sim_statusbar`

```sh
xcrun simctl status_bar "<SIMULATOR_UDID>" clear
# or
xcrun simctl status_bar "<SIMULATOR_UDID>" override --dataNetwork <NETWORK_TYPE>
```

## Debugging (LLDB / DAP)

These tools are stateful: MCP maintains interactive debug sessions in server memory.

### `debug_attach_sim`

```sh
xcrun simctl spawn "<SIMULATOR_UDID>" launchctl list | rg "<BUNDLE_ID>"
xcrun lldb -p <PID>
```

**MCP arguments:**

- `bundleId`: bundle identifier to attach to
- `pid`: process ID to attach to (alternative to bundleId)
- `waitFor`: wait for process to appear when attaching
- `continueOnAttach`: continue execution after attaching (default: true)
- `makeCurrent`: set debug session as current (default: true)

**Stateful:** relies on MCP server process to track the active debug session.

### `debug_breakpoint_add`

```sh
breakpoint set --file "<FILE>" --line <LINE>
# or
breakpoint set --name "<FUNCTION_NAME>"
```

**MCP arguments:**

- `debugSessionId`: session ID (default: current session)
- `file`: source file path
- `line`: line number in file
- `function`: function name (alternative to file/line)
- `condition`: expression for conditional breakpoint

**Stateful:** relies on MCP server process to track the active debug session.

### `debug_breakpoint_remove`

```sh
breakpoint delete <BREAKPOINT_ID>
```

**Stateful:** relies on MCP server process to track the active debug session.

### `debug_continue`

```sh
process continue
```

**Stateful:** relies on MCP server process to track the active debug session.

### `debug_detach`

```sh
process detach
```

**Stateful:** relies on MCP server process to track the active debug session.

### `debug_lldb_command`

```sh
<LLDB_COMMAND>
```

**MCP arguments:**

- `debugSessionId`: session ID (default: current session)
- `command`: LLDB command to execute
- `timeoutMs`: command timeout in milliseconds

**Stateful:** relies on MCP server process to track the active debug session.

### `debug_stack`

```sh
thread backtrace
```

**MCP arguments:**

- `debugSessionId`: session ID (default: current session)
- `threadIndex`: thread index to inspect
- `maxFrames`: maximum number of frames to return

**Stateful:** relies on MCP server process to track the active debug session.

### `debug_variables`

```sh
frame variable
```

**MCP arguments:**

- `debugSessionId`: session ID (default: current session)
- `frameIndex`: frame index to inspect

**Stateful:** relies on MCP server process to track the active debug session.

## Swift Package Manager

### `swift_package_build`

```sh
swift build --package-path "<PACKAGE_PATH>" [-c release] [--target "<TARGET>"] [--arch "<ARCH>"] [-Xswiftc -parse-as-library]
```

### `swift_package_clean`

```sh
swift package --package-path "<PACKAGE_PATH>" clean
```

### `swift_package_run`

```sh
swift run --package-path "<PACKAGE_PATH>" [<EXECUTABLE_NAME>] [-- <ARG_1> <ARG_2>]
# background (example)
swift run --package-path "<PACKAGE_PATH>" [<EXECUTABLE_NAME>] -- <ARGS...> &
```

**MCP arguments:**

- `packagePath`: path to Swift package
- `executableName`: name of executable to run
- `arguments`: arguments to pass to executable
- `timeout`: execution timeout in milliseconds
- `background`: run in background
- `parseAsLibrary`: add -Xswiftc -parse-as-library flag

**Stateful:** relies on MCP server process to track background processes for list/stop.

### `swift_package_test`

```sh
swift test --package-path "<PACKAGE_PATH>" [-c release] [--test-product "<PRODUCT>"] [--filter "<REGEX>"] [--no-parallel] [--show-code-coverage] [-Xswiftc -parse-as-library]
```

### `swift_package_list`

```sh
ps -axo pid,command | rg "<EXECUTABLE_NAME>"
```

**Stateful:** relies on MCP server process to track active processes started via `swift_package_run`.

### `swift_package_stop`

```sh
kill -TERM <PID>
```

**Stateful:** relies on MCP server process to track active processes started via `swift_package_run`.

## Additional workflows

These workflow-specific mappings are merged into this file.
## xcodemake branch (build tools)
When incremental builds are enabled and available, MCP may replace the xcodebuild call with:
```sh
xcodemake <xcodebuild-args-without-leading-xcodebuild>
make
```
This branch is only used for `build` actions when xcodemake is enabled and `preferXcodebuild` is not set.
## Not reproducible statelessly (summary)
| Tool                                                       | Why a single CLI call is not enough                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `build_run_sim`                                            | Orchestrates multiple commands (build, resolve app path, boot, install, launch).     |
| `launch_app_logs_sim`                                      | Starts background log processes and returns a sessionId.                             |
| `start_sim_log_cap` / `stop_sim_log_cap`                   | Uses in-memory session tracking, multiple processes, log files.                      |
| `start_device_log_cap` / `stop_device_log_cap`             | Uses in-memory session tracking, JSON polling, log files.                            |
| `record_sim_video`                                         | Long-running AXe process with buffered output, parsed file path, and explicit stop.  |
| UI automation tools (`snapshot_ui`, `tap`, `swipe`, etc.) | MCP guards against paused debuggers and warns on stale coordinate usage; CLI won't. |
| `session-*` tools                                          | Store defaults in MCP server memory; no CLI equivalent.                              |
| `manage-workflows`                                         | Dynamically enables/disables workflow groups in MCP server memory; no CLI equivalent.|
| `debug_*` tools                                            | Maintain interactive LLDB/DAP sessions in MCP server memory.                         |
| `swift_package_run` / `swift_package_list` / `swift_package_stop` | Track processes started by MCP for list/stop.                                   |
