# Investigation: Xcode IDE State Sync for Session Defaults

## Problem Statement

When XcodeBuildMCP runs inside Xcode's Coding Agent, users expect our tools to use the same scheme and simulator that are currently selected in Xcode's UI toolbar. Currently, users must manually set these via `session-set-defaults` or config files, which creates friction and potential mismatches.

## Goal

Auto-detect Xcode's currently selected scheme and simulator (run destination) and sync them to XcodeBuildMCP's session defaults, so tools automatically use the same targets as the IDE.

## Why This Matters

1. **Consistency** - When a user builds with Apple's tools in Xcode, then uses our tools to install/launch, they expect the same simulator to be targeted
2. **Reduced friction** - No need to manually configure session defaults when working in Xcode
3. **Avoiding errors** - Prevents "wrong simulator" issues where config says one thing but Xcode shows another

## Technical Investigation

### Where Xcode Stores UI State

Xcode stores the active scheme and run destination in:

```
<workspace>/xcuserdata/<username>.xcuserdatad/UserInterfaceState.xcuserstate
```

For xcodeproj (without separate workspace):
```
<project>.xcodeproj/project.xcworkspace/xcuserdata/<username>.xcuserdatad/UserInterfaceState.xcuserstate
```

### File Format: NSKeyedArchiver

The xcuserstate file is a **binary plist** using Apple's `NSKeyedArchiver` serialization format. This is NOT a simple key-value plist - it's a serialized object graph with:

- `$objects` array containing all archived objects
- `CF$UID` / `CFKeyedArchiverUID` references between objects
- Nested NSDictionary structures with `NS.keys` and `NS.objects` arrays

Example structure (via `plutil -p`):
```
{
  "$archiver" => "NSKeyedArchiver"
  "$objects" => [
    0 => "$null"
    1 => { "$class" => <UID>, "NS.keys" => [...], "NS.objects" => [...] }
    ...
    407 => "ActiveScheme"
    415 => "ActiveRunDestination"
    730 => "IDERunContextRecentsSchemesKey"
    731 => "IDERunContextRecentsLastUsedRunDestinationBySchemeKey"
    ...
  ]
}
```

### Key Fields Identified

| Key | Description | Location |
|-----|-------------|----------|
| `ActiveScheme` | Currently selected scheme | Index reference in $objects |
| `ActiveRunDestination` | Current run destination | Index reference in $objects |
| `IDERunContextRecentsSchemesKey` | Dictionary of recent schemes with timestamps | Index 730 (varies) |
| `IDERunContextRecentsLastUsedRunDestinationBySchemeKey` | Maps schemes to their last used destinations | Index 731 (varies) |

### Run Destination Format

The run destination (simulator/device) is stored in formats like:

```
E395B9FD-5A4A-4BE5-B61B-E48D1F5AE443_iphonesimulator_arm64
dvtdevice-iphonesimulator:E395B9FD-5A4A-4BE5-B61B-E48D1F5AE443
```

The UUID portion is the simulator identifier that can be used with `xcrun simctl`.

### Parsing Challenges

1. **NSKeyedArchiver complexity** - Values aren't stored directly; they're referenced by UID indices that must be followed through the object graph

2. **No direct key lookup** - Can't simply ask "what is ActiveScheme?"; must find the key string, then trace UID references to find the value

3. **Scheme detection is fragile** - The scheme name appears multiple times in different contexts; heuristics like "most frequent string" don't reliably identify the *active* scheme

4. **Simulator detection works better** - The UUID pattern `[A-F0-9-]{36}_iphonesimulator_arm64` is distinctive and reliably identifies simulator destinations

## Current Implementation (Partially Working)

Location: `src/utils/xcode-state-reader.ts`

### What Works
- Finding the xcuserstate file in workspace/project
- Extracting simulator UUID from destination pattern
- Looking up simulator name via `xcrun simctl list devices`

### What's Fragile
- Scheme detection uses heuristic: "find most frequent scheme-like string"
- This fails when other strings appear more frequently
- Doesn't properly decode NSKeyedArchiver references

## Options for Improvement

### Option 1: Proper NSKeyedArchiver Decoding

**Approach**: Write a proper decoder that follows UID references through the object graph.

**Pros**:
- Reliable, correct parsing
- Would work for any NSKeyedArchiver file

**Cons**:
- Complex implementation
- Need to handle various NS* class types
- Maintenance burden

**Implementation**: Could use Python's `plistlib` with custom unarchiver, or implement UID resolution in TypeScript.

### Option 2: Improved Heuristic with Known Schemes

**Approach**:
1. Get list of valid scheme names from `*.xcscheme` files or `xcschememanagement.plist`
2. Search for those specific names near `IDERunContextRecentsSchemesKey` in plutil output
3. Use the one that appears in that context

**Pros**:
- Simpler than full decoder
- More targeted than current "most frequent" approach

**Cons**:
- Still a heuristic, could break with Xcode updates
- Requires reading multiple files

### Option 3: AppleScript/Accessibility API

**Approach**: Query Xcode directly for its current scheme and destination.

```bash
osascript -e 'tell application "Xcode" to get name of active scheme of active workspace document'
```

**Pros**:
- Gets live state directly from Xcode
- Always accurate to what user sees

**Cons**:
- Requires Xcode to grant automation permissions
- May not work in all contexts (sandboxing, permissions)
- AppleScript API for Xcode is limited/undocumented

### Option 4: Partial Sync (Simulator Only)

**Approach**: Only sync the simulator (which works reliably), skip scheme detection.

**Pros**:
- Simple, reliable
- Simulator is often the more important value (scheme can be discovered via `list_schemes`)

**Cons**:
- Incomplete solution
- Agent still needs to determine scheme somehow

### Option 5: Use xcodebuild to Query

**Approach**: Use `xcodebuild -showBuildSettings` or similar to get current build context.

**Cons**:
- These commands don't report the *UI-selected* scheme/destination
- They require you to specify the scheme as a parameter

## Related Files

- `src/utils/xcode-state-reader.ts` - Current implementation
- `src/mcp/tools/xcode-ide/sync_xcode_defaults.ts` - Sync tool
- `src/server/bootstrap.ts` - Auto-sync at startup
- `manifests/tools/sync_xcode_defaults.yaml` - Tool manifest

## Test Project Used

```
/Volumes/Developer/XcodeBuildMCP/example_projects/iOS/MCPTest.xcodeproj
```

Xcuserstate location:
```
MCPTest.xcodeproj/project.xcworkspace/xcuserdata/cameroncooke.xcuserdatad/UserInterfaceState.xcuserstate
```

## Open Questions

1. When Xcode's Coding Agent launches the MCP server, what is the working directory? Is it reliably the project directory?

2. Could we use the `discover_projs` tool output to locate the correct xcuserstate?

3. Is there a simpler file that contains just the active scheme/destination without the full UI state?

4. Would Apple's Coding Agent team expose this information via environment variables or a dedicated API?
