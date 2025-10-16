# Spec: Rewrite AGENT_QUICK_START.md with Tested Instructions

> **Status**: Planning
> **Issue**: #1
> **Created**: 2025-10-13
> **Type**: Documentation / Enhancement

## Overview

Rewrite `AGENT_QUICK_START.md` to replace untested claims, incorrect tool names, placeholder examples, and missing documentation with **real, tested, proven instructions** for all five test projects (orchestrator, groovetech-media-player, groovetech-media-server, PfizerOutdoCancerV2, AVPStreamKit).

## Problem Statement

### Current State

The existing `AGENT_QUICK_START.md` has critical issues that prevent AI agents from successfully using XcodeBuildMCP:

1. **Incorrect Tool Names**: Uses `session_set_defaults()` (underscore) when actual tool is `session-set-defaults` (hyphen)
2. **Missing Documentation**: Session management tools never appear in tool reference
3. **Placeholder Examples**: Fake paths like `/path/to/groovetech-media-player.xcodeproj`
4. **Tool Count Mismatches**: Claims 63+ tools, actually 86 tools
5. **Unverified Claims**: "Build succeeded (tested 2025-10-10)" with no evidence
6. **Contradictory Status**: Marked as "✅ WORKS" and "⚠️ Assumed working" simultaneously

### Root Cause Analysis

**Evidence of Issues:**
- Tool naming: `src/mcp/tools/session-management/session_set_defaults.ts:52` shows hyphenated name
- Tool count: `npm run tools` returns 86 tools, not 63+
- No test logs or screenshots exist to support "tested" claims
- Session management tools exist but aren't documented

### User Impact

- **AI agents cannot follow the instructions** (incorrect tool names cause failures)
- **Developers waste time with placeholders** (must manually find real paths)
- **Lost trust in documentation** (claims don't match reality)
- **Discovery issues** (session management tools are invisible)

## Proposed Solution

Replace `AGENT_QUICK_START.md` with a completely rewritten version that:

1. Uses **only correct tool names** (verified against codebase)
2. Includes **only real, absolute paths** from actual test projects
3. Documents **only tested workflows** with captured logs
4. Includes **session management tools** in main tool reference
5. Matches **actual tool count** (86 tools)
6. Marks workflows as either **✅ Tested** or **⚠️ Not Tested** (no "assumed")

## Real Project Information

### Project 1: orchestrator (iPad)

```typescript
projectPath: "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/orchestrator/orchestrator.xcodeproj"
scheme: "orchestrator"
alternateSchemes: ["orchestratorUI"]
bundleId: "com.groovejones.orchestrator"
platform: "iOS Simulator"
targetedDeviceFamily: 2  // iPad
deploymentTarget: {
  macOS: "15.4",
  iOS: "26.0"
}
supportedPlatforms: ["iphoneos", "iphonesimulator", "macosx"]
```

### Project 2: groovetech-media-player (visionOS)

```typescript
projectPath: "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/groovetech-media-player/groovetech-media-player.xcodeproj"
scheme: "groovetech-media-player"
alternateSchemes: ["CameraStreamExtension", "groovetech-media-playerTests", "ReadingSpatialPhotos", "StereoscopicImageContent"]
platform: "visionOS Simulator"
```

### Project 3: groovetech-media-server (macOS)

```typescript
workspacePath: "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/groovetech-media-server/GrooveTechMediaServer.xcworkspace"
scheme: "GrooveTech Media Server"
alternateSchemes: ["GrooveTechMediaCore", "GrooveTechMediaServerApp"]
bundleId: "groovejones.GrooveTech-Media-Server"
platform: "macOS"
deploymentTarget: "26.0"
supportedPlatforms: ["macosx"]
```

### Project 4: PfizerOutdoCancerV2 (visionOS)

```typescript
projectPath: "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/PfizerOutdoCancerV2/PfizerOutdoCancer.xcodeproj"
scheme: "PfizerOutdoCancer"
alternateSchemes: ["CameraStreamExtension"]
bundleId: "com.groovejones.PfizerOutdoCancer"
platform: "visionOS"  // XROS
deploymentTarget: "26.0"
supportedPlatforms: ["xros", "xrsimulator"]
targetedDeviceFamily: 7  // visionOS
```

### Project 5: AVPStreamKit (Swift Package)

```typescript
packagePath: "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/AVPStreamKit"
packageName: "AVPStreamKit"
products: ["AVPStreamKit", "AVPLogging", "AVPStreamCore", "AVPStreamVT", "AVPStreamUI"]
testTargets: ["AVPLoggingTests", "AVPStreamCoreTests", "AVPStreamVTTests", "AVPStreamUITests"]
platforms: {
  macOS: ".v11",
  visionOS: ".v1",
  iOS: ".v17"
}
```

## Technical Approach

### Phase 1: Fix Critical Errors (2-3 hours)

#### Task 1.1: Correct Tool Names

**File**: `AGENT_QUICK_START.md`

**Find and replace:**
```diff
- session_set_defaults()
+ session-set-defaults
```

**Verify against source:**
- Check `src/mcp/tools/session-management/` directory
- Confirm all tool files use hyphenated names
- Update all examples throughout document

#### Task 1.2: Update Tool Count

**File**: `AGENT_QUICK_START.md:14`

```diff
- 63+ tools
+ 86 tools
```

**Verification command:**
```bash
npm run tools | grep -c "│"  # Count tool rows
```

#### Task 1.3: Add Session Management Tools

**File**: `AGENT_QUICK_START.md` (Tool Reference section)

Add missing tools:
- `session-set-defaults` - Set default values for build parameters
- `session-show-defaults` - Display current session defaults
- `session-clear-defaults` - Clear all session defaults

#### Task 1.4: Replace Placeholder Paths

**Find all instances of:**
- `/path/to/` → Replace with real absolute paths
- `SIMULATOR_UUID` → Replace with real UUIDs from `list_sims()`
- `DEVICE_UDID` → Replace with real UDIDs from `list_devices()`

### Phase 2: Test orchestrator (iPad) (4-6 hours)

#### Task 2.1: Build for iPad Simulator

**Test workflow:**
```bash
# 1. List available iPad simulators
list_sims()

# 2. Set session defaults
session-set-defaults({
  projectPath: "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/orchestrator/orchestrator.xcodeproj",
  scheme: "orchestrator",
  simulatorId: "[REAL_IPAD_UUID_FROM_STEP_1]"
})

# 3. Build
build_sim_id_proj()

# 4. Capture expected output
# ✅ BUILD SUCCEEDED
# [timestamp] Build time: X.XXs
```

**Deliverables:**
- [ ] Capture complete build output
- [ ] Screenshot of successful build
- [ ] Record timestamp of test
- [ ] Update status: ✅ Tested (2025-10-13)

#### Task 2.2: Test Application

```bash
# 1. Install app
install_app_sim({ simulatorId: "[UUID]" })

# 2. Launch app
launch_app_sim({
  simulatorId: "[UUID]",
  bundleId: "com.groovejones.orchestrator"
})

# 3. Verify running
# Capture: App launched successfully
```

#### Task 2.3: Log Capture

```bash
# 1. Start log capture
start_sim_log_cap({
  simulatorId: "[UUID]",
  filter: "orchestrator"
})

# 2. Interact with app (manual)

# 3. Stop log capture
stop_sim_log_cap({ simulatorId: "[UUID]" })

# 4. Document captured logs
```

### Phase 3: Test visionOS Projects (6-8 hours)

#### Task 3.1: Test groovetech-media-player

**Workflow:**
1. Boot Vision Pro simulator
2. Build with real paths
3. Install and launch
4. Capture screenshots
5. Document any visionOS-specific issues

**Expected Issues:**
- Platform parameter behavior
- Build configuration differences
- Simulator availability

#### Task 3.2: Test PfizerOutdoCancerV2

**Complete workflow:**
```bash
# 1. List available Vision Pro simulators
list_sims()

# 2. Boot Vision Pro simulator (if not already booted)
boot_sim({ simulatorId: "[VISION_PRO_UUID_FROM_STEP_1]" })

# 3. Set session defaults
session-set-defaults({
  projectPath: "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/PfizerOutdoCancerV2/PfizerOutdoCancer.xcodeproj",
  scheme: "PfizerOutdoCancer",
  simulatorId: "[VISION_PRO_UUID_FROM_STEP_1]"
})

# 4. Build for visionOS simulator
build_sim_id_proj()

# 5. Install app
install_app_sim({ simulatorId: "[VISION_PRO_UUID_FROM_STEP_1]" })

# 6. Launch app
launch_app_sim({
  simulatorId: "[VISION_PRO_UUID_FROM_STEP_1]",
  bundleId: "com.groovejones.PfizerOutdoCancer"
})

# 7. Capture expected output
# ✅ BUILD SUCCEEDED
# ✅ App installed successfully
# ✅ App launched successfully
```

**Deliverables:**
- [ ] Capture complete build output with visionOS platform details
- [ ] Screenshot of app running in Vision Pro simulator
- [ ] Document targetedDeviceFamily: 7 behavior
- [ ] Document deployment target: 26.0 requirements
- [ ] Verify xros/xrsimulator platform handling
- [ ] Update status: ✅ Tested (2025-10-13)

#### Task 3.3: Document visionOS Differences

Create section: "visionOS-Specific Considerations"
- Platform parameters (`xros` vs `iOS`)
- Simulator naming conventions
- Build configuration requirements

### Phase 4: Test macOS + Swift Package (4-6 hours)

#### Task 4.1: Test groovetech-media-server

**Workspace workflow:**
```bash
# 1. Build workspace
build_mac_ws({
  workspacePath: "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/groovetech-media-server/GrooveTechMediaServer.xcworkspace",
  scheme: "GrooveTech Media Server"
})

# 2. Get app path
get_mac_app_path_ws({
  workspacePath: "[SAME]",
  scheme: "[SAME]"
})

# 3. Launch macOS app
launch_mac_app_ws({ workspacePath: "[SAME]", scheme: "[SAME]" })
```

**Capture:**
- Build output
- App path result
- Launch confirmation

#### Task 4.2: Test AVPStreamKit

**Swift Package workflow:**
```bash
# 1. Build package
swift_package_build({
  packagePath: "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/AVPStreamKit"
})

# 2. Run tests
swift_package_test({
  packagePath: "[SAME]"
})
```

**Document:**
- Which test targets pass/fail
- Platform-specific test results
- Any build warnings

### Phase 5: Validation & Cleanup (3-4 hours)

#### Task 5.1: Verify All Tool Names

**Script to verify:**
```bash
# Extract all tool names from documentation
grep -o "[a-z_-]*(" AGENT_QUICK_START.md | sort -u > doc_tools.txt

# List actual tool names from codebase
find src/mcp/tools -name "*.ts" -not -path "*/__tests__/*" -exec basename {} .ts \; | sort -u > actual_tools.txt

# Compare
diff doc_tools.txt actual_tools.txt
```

#### Task 5.2: Remove Placeholders

**Search patterns:**
- `[TODO]`
- `/path/to/`
- `YOUR_`
- `EXAMPLE_`
- `UUID_FROM_`
- `Assumed working`

#### Task 5.3: Update Testing Status Matrix

**Required format:**
```markdown
| Project | Platform | Status | Tested Date | Notes |
|---------|----------|--------|-------------|-------|
| orchestrator | iPad | ✅ TESTED | 2025-10-13 | Build + Install + Launch + Logs verified |
| groovetech-media-player | visionOS | ✅ TESTED | 2025-10-13 | Build + Install + Launch verified |
| groovetech-media-server | macOS | ✅ TESTED | 2025-10-13 | Build + Launch verified |
| PfizerOutdoCancerV2 | visionOS | ✅ TESTED | 2025-10-13 | Build + Install + Launch verified |
| AVPStreamKit | Swift Package | ✅ TESTED | 2025-10-13 | Build + Test verified |
```

#### Task 5.4: Add Test Evidence Links

For each tested workflow, add:
```markdown
**Test Evidence:**
- Build log: `docs/test-logs/orchestrator-build-2025-10-13.txt`
- Screenshot: `docs/test-screenshots/orchestrator-success.png`
```

## Acceptance Criteria

### Functional Requirements

- [ ] All tool names use correct hyphenated syntax (no underscores)
- [ ] All project paths are real and absolute (no `/path/to/` placeholders)
- [ ] All schemes are real and verified available
- [ ] All bundle IDs are real and correct
- [ ] Session management tools documented with examples
- [ ] Tool count matches actual count (86 tools)
- [ ] Every workflow has date-stamped test status

### Testing Requirements

- [ ] orchestrator (iPad): Build + Install + Launch + Logs tested
- [ ] groovetech-media-player (visionOS): Build + Install + Launch tested
- [ ] groovetech-media-server (macOS): Build + Launch tested
- [ ] PfizerOutdoCancerV2 (visionOS): Build + Install + Launch tested
- [ ] AVPStreamKit (Swift Package): Build + Test tested
- [ ] Test logs captured for all workflows
- [ ] Screenshots captured for successful builds

### Quality Gates

- [ ] Zero placeholder examples (`/path/to/`, `UUID_FROM_`, etc.)
- [ ] Zero incorrect tool names (all hyphenated)
- [ ] Zero "Assumed working" statuses (only ✅ Tested or ⚠️ Not Tested)
- [ ] Tool count verified: 86 tools
- [ ] All test dates accurate and recent
- [ ] No contradictory status markers

### Documentation Completeness

- [ ] Session management tools in main tool reference
- [ ] visionOS-specific considerations documented
- [ ] macOS workflow differences documented
- [ ] Swift Package workflow documented
- [ ] All example commands include expected output
- [ ] Test evidence files linked from documentation

## Success Metrics

1. **Zero placeholder examples** remaining in documentation
2. **Zero incorrect tool names** in documentation
3. **100% of test projects** have real paths, schemes, bundle IDs
4. **All workflows marked** as either ✅ Tested with date or ⚠️ Not Tested
5. **Tool count matches reality** (86 tools, not 63+)
6. **Session management tools** fully documented with examples
7. **Test evidence files** exist for all tested workflows

## Dependencies & Prerequisites

**Required:**
- All five test projects accessible at documented paths
- Xcode installed and configured
- Simulators available for iPad, visionOS
- Physical devices optional (for device workflows)
- Screenshot capture tool (macOS built-in)

**Blockers:**
- Test projects must build successfully
- Simulators must be available
- Sufficient disk space for build artifacts

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Project paths change | Medium | Low | Use absolute paths; document in README |
| Simulators unavailable | Medium | Medium | Document required simulator setup |
| Build failures during testing | High | Medium | Debug and document workarounds |
| Tool names change in future | Low | Low | Keep documentation in sync with releases |
| Test becomes outdated | Medium | High | Add "Last tested" dates; periodic re-testing |

**Mitigation Strategies:**
- Version documentation with "Last verified" dates
- Create test automation scripts for future re-testing
- Document environment requirements clearly
- Include troubleshooting section for common issues

## Resource Requirements

**Time Estimate:**
- Phase 1 (Critical Fixes): 2-3 hours
- Phase 2 (orchestrator Testing): 4-6 hours
- Phase 3 (visionOS Testing): 6-8 hours
- Phase 4 (macOS + Swift Package): 4-6 hours
- Phase 5 (Validation): 3-4 hours
- **Total**: 19-27 hours

**Tools Needed:**
- Xcode
- iOS/visionOS simulators
- Screenshot capture
- Log viewing tools

## Future Considerations

### Automated Testing

Create automated test suite to verify documentation:
```bash
#!/bin/bash
# test-documentation.sh

# Test each workflow from documentation
# Parse commands from markdown
# Execute and compare output
# Report pass/fail for each workflow
```

### Continuous Integration

Add CI job to validate documentation:
```yaml
name: Validate Documentation

on: [push, pull_request]

jobs:
  test-docs:
    runs-on: macos-latest
    steps:
      - name: Extract and test workflows
        run: ./scripts/test-documentation.sh
```

### Documentation Version Tracking

Add metadata to documentation:
```markdown
---
last_verified: 2025-10-13
xcodebuildmcp_version: 1.2.3
xcode_version: 15.4
macos_version: 15.1
---
```

## Documentation Plan

### Files to Update

- [ ] `AGENT_QUICK_START.md` - Complete rewrite with real examples
- [ ] `docs/TOOLS.md` - Update tool count, add session management tools
- [ ] `README.md` - Update any references to tool count
- [ ] `CHANGELOG.md` - Document documentation improvements

### Files to Create

- [ ] `docs/test-logs/` - Directory for test evidence
- [ ] `docs/test-screenshots/` - Directory for screenshots
- [ ] `scripts/test-documentation.sh` - Automated testing script (future)

## References & Research

### Internal References

- Tool naming: `src/mcp/tools/session-management/session_set_defaults.ts:52`
- Auto-discovery: `src/core/plugin-registry.ts`
- Session management: `src/utils/session-store.ts:3-48`
- orchestrator project: `/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/orchestrator/`

### Related Work

- GitHub Issue: #1 (carmandale/XcodeBuildMCP fork)
- Created: 2025-10-12
- Labels: documentation, enhancement

### Tool Count Verification

```bash
# Verify actual tool count
npm run tools | grep -c "│"
# Expected: 86
```

---

**Spec Metadata:**
- **Type**: Documentation / Enhancement
- **Priority**: Critical (documentation is broken)
- **Complexity**: Medium (testing required but straightforward)
- **Estimated Effort**: 19-27 hours
- **Labels**: `documentation`, `enhancement`, `testing`
