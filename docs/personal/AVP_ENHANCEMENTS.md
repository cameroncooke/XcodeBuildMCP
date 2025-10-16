# Apple Vision Pro Enhancement Tracking

This document tracks planned enhancements, feature requests, and implementation notes for AVP-specific XcodeBuildMCP improvements.

---

## Priority 1: Testing & Validation

### 1.1 Complete AVP Workflow Testing
**Status:** 🔄 In Progress  
**Assignee:** Dale  
**Target Date:** 2025-10-10

**Objectives:**
- [ ] Test visionOS simulator discovery and management
- [ ] Test build and deployment to visionOS simulator  
- [ ] Test physical Vision Pro device detection
- [ ] Test physical Vision Pro log capture (CRITICAL)
- [ ] Test UI automation on visionOS simulator
- [ ] Document any limitations or issues

**Test Plan:**
1. Create simple visionOS test project in Xcode
2. Use Cursor AI to run complete workflow
3. Verify log capture eliminates copy-paste workflow
4. Document results in DALE_CHANGES.md

**Success Criteria:**
- All tools work with visionOS
- Log capture works on physical AVP
- No manual intervention required
- AI agent can autonomously debug AVP apps

---

## Priority 2: visionOS Project Scaffolding

### 2.1 Create scaffold_visionos_project Tool
**Status:** 📋 Planned  
**Assignee:** Dale  
**Target Date:** 2025-10-15  
**Upstream Contribution:** ✅ Strong Candidate

**Requirements:**

**New Files to Create:**
```
src/mcp/tools/project-scaffolding/
├── scaffold_visionos_project.ts       # Main tool implementation
└── __tests__/
    └── scaffold_visionos_project.test.ts  # DI-based tests
```

**Schema Definition:**
```typescript
const ScaffoldVisionOSProjectSchema = BaseScaffoldSchema.extend({
  deploymentTarget: z.string().optional()
    .describe('visionOS deployment target (e.g., 2.0, 2.1). Default: 2.0'),
  supportedPlatforms: z.array(z.enum(['visionos']))
    .default(['visionos']),
  immersiveSpaces: z.boolean().optional()
    .describe('Include immersive space configuration'),
  handTracking: z.boolean().optional()
    .describe('Enable hand tracking entitlement'),
});
```

**Template Repository:**
- Repository: `carmandale/XcodeBuildMCP-visionOS-Template`
- Based on: iOS template structure
- Includes:
  - Modern Xcode project structure
  - SPM package for features
  - visionOS-specific entitlements
  - Sample immersive space
  - Hand tracking setup
  - Spatial audio configuration

**Testing Requirements:**
- No Vitest mocking (use DI pattern)
- Test with createMockExecutor
- Verify file creation
- Test parameter validation
- Test with/without optional parameters

**Implementation Notes:**
- Follow patterns from `scaffold_ios_project.ts`
- Use TemplateManager for template download
- Support local template override via env var:
  `XCODEBUILDMCP_VISIONOS_TEMPLATE_PATH`

**Upstream Contribution Plan:**
1. Implement and test locally
2. Create template repository
3. Submit PR with comprehensive documentation
4. Include usage examples and tests

---

## Priority 3: Enhanced Log Capture

### 3.1 Subsystem-Filtered Log Capture
**Status:** 💭 Research  
**Assignee:** Dale  
**Target Date:** TBD  
**Upstream Contribution:** ❌ Internal Only (too specific)

**Goal:**
Add log filtering by subsystem for targeted debugging of AVP apps.

**Use Cases:**
- Debug spatial audio: `--predicate 'subsystem == "com.apple.coreaudio"'`
- Debug hand tracking: `--predicate 'subsystem == "com.apple.arkit"'`
- Debug SharePlay: `--predicate 'subsystem == "com.apple.GroupActivities"'`

**Implementation Ideas:**
```typescript
// Add optional filters to start_device_log_cap
{
  deviceId: string;
  bundleId: string;
  subsystem?: string;
  category?: string;
  logLevel?: 'debug' | 'info' | 'default' | 'error' | 'fault';
}
```

**Research Needed:**
- Verify xcrun devicectl supports predicate filtering
- Test performance impact with long sessions
- Determine if useful for broader community

**Decision:** Internal use first, contribute if broadly useful

---

## Priority 4: visionOS Testing Enhancements

### 4.1 Immersive Space Testing Tools
**Status:** 💭 Idea  
**Target Date:** TBD

**Concept:**
Tools to automate immersive space transitions and testing.

**Potential Features:**
- Detect current immersive space state
- Trigger immersive space open/close
- Validate spatial layout
- Test spatial audio positioning

**Challenges:**
- May require AXe enhancements for visionOS
- Need to research accessibility APIs on visionOS
- Simulator vs device capabilities differ

---

### 4.2 Hand Tracking Gesture Automation
**Status:** 💭 Idea  
**Target Date:** TBD

**Concept:**
Simulate hand tracking gestures for automated testing.

**Potential Features:**
- Trigger pinch gestures
- Simulate hand positions
- Test gesture recognizers
- Validate hand tracking UI

**Challenges:**
- Simulator limitations for hand tracking
- Physical device automation is complex
- May require new AXe capabilities

---

## Future Enhancements (Backlog)

### Spatial Audio Debugging
- Visual audio source positioning
- 3D audio field visualization
- Distance-based audio validation

### Reality Composer Pro Integration
- Import USDZ assets
- Test scene hierarchies
- Validate entity components

### SharePlay Testing
- Multi-user session simulation
- Spatial persona testing
- Synchronized state validation

### Performance Profiling
- FPS monitoring on device
- Memory usage tracking
- Thermal state monitoring
- Battery impact analysis

---

## Enhancement Process

### Adding New Enhancements

1. **Document in this file** with status 💭 Idea
2. **Research feasibility** - technical, time, upstream fit
3. **Update status** to 📋 Planned with target date
4. **Create implementation branch** from personal/avp-enhancements
5. **Implement with tests** following DI patterns
6. **Update status** to 🔄 In Progress
7. **Test thoroughly** with real AVP workflows
8. **Update status** to ✅ Complete
9. **Document in DALE_CHANGES.md**
10. **Decide on upstream contribution**

### Status Indicators

- 💭 **Idea** - Concept stage, needs research
- 📋 **Planned** - Approved for implementation, target date set
- 🔄 **In Progress** - Actively being developed
- ⏸️ **Paused** - On hold, reason documented
- ✅ **Complete** - Implemented, tested, documented
- ❌ **Cancelled** - Not proceeding, reason documented

---

## Metrics & Goals

### Success Metrics

**Developer Experience:**
- Reduced debugging time by 50% (eliminate copy-paste)
- Project scaffolding time < 1 minute
- Zero manual build command execution

**Automation:**
- 100% AI agent workflow automation
- Complete log capture without intervention
- Autonomous error diagnosis and fixing

**Quality:**
- Zero TypeScript errors in all commits
- 100% test coverage for new features
- All linting and formatting passing

---

## Team Collaboration

### Contributing to This Document

- Keep enhancements prioritized and dated
- Update status regularly (weekly)
- Document blockers and challenges
- Note upstream contribution decisions
- Share learnings and discoveries

### Review Cadence

- **Weekly:** Update status on active enhancements
- **Monthly:** Review and re-prioritize backlog
- **Quarterly:** Assess metrics and adjust goals

