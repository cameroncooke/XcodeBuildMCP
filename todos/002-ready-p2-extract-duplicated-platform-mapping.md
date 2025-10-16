---
status: ready
priority: p2
issue_id: "002"
github_issue: 5
epic: 3
tags: [code-quality, maintainability, duplication, typescript, utilities]
dependencies: [001]
---

# Extract Duplicated Platform Mapping Logic

## Problem Statement

Platform mapping logic is duplicated identically across all three simulator tools (`test_sim`, `build_sim`, `build_run_sim`). The same 6-line `platformMap` object appears in each file, creating maintenance burden when platform support needs to be updated.

## Findings

- **Duplication**: 6 lines of identical platform mapping code in three files
- **Location**:
  - `src/mcp/tools/simulator/test_sim.ts:95-100`
  - `src/mcp/tools/simulator/build_sim.ts:95-100`
  - `src/mcp/tools/simulator/build_run_sim.ts:98-103`
- **Impact**: Platform updates require changing three files
- **Category**: Code Quality / Technical Debt

## Problem Scenario

1. Apple releases new simulator platform (e.g., "visionOS 2 Simulator" with different requirements)
2. Developer must update the mapping in three separate files
3. Easy to miss one file, causing inconsistent platform support across tools
4. Testing requires verifying all three tools handle the new platform correctly
5. Code review must verify consistency across all three implementations

Current Duplication:
```typescript
// Identical in all three files:
const platformMap: Record<string, XcodePlatform> = {
  'iOS Simulator': XcodePlatform.iOSSimulator,
  'watchOS Simulator': XcodePlatform.watchOSSimulator,
  'tvOS Simulator': XcodePlatform.tvOSSimulator,
  'visionOS Simulator': XcodePlatform.visionOSSimulator,
};
const platform = platformMap[params.platform ?? 'iOS Simulator'] ?? XcodePlatform.iOSSimulator;
```

## Proposed Solutions

### Option 1: Create Platform Utility Function (Recommended)

Create `src/utils/platform-utils.ts`:
```typescript
import { XcodePlatform } from './build-utils.ts';

/**
 * Maps platform string to XcodePlatform enum.
 * Defaults to iOS Simulator if platform is undefined or unknown.
 */
export function mapPlatformStringToEnum(platformStr?: string): XcodePlatform {
  const platformMap: Record<string, XcodePlatform> = {
    'iOS Simulator': XcodePlatform.iOSSimulator,
    'watchOS Simulator': XcodePlatform.watchOSSimulator,
    'tvOS Simulator': XcodePlatform.tvOSSimulator,
    'visionOS Simulator': XcodePlatform.visionOSSimulator,
  };
  return platformMap[platformStr ?? 'iOS Simulator'] ?? XcodePlatform.iOSSimulator;
}
```

Update each tool to use the utility:
```typescript
import { mapPlatformStringToEnum } from '../../../utils/platform-utils.ts';

// Replace existing platformMap logic with:
const platform = mapPlatformStringToEnum(params.platform);
```

- **Pros**:
  - Single source of truth for platform mapping
  - Easy to extend with new platforms
  - Reduces code duplication by ~18 lines
  - Clear, reusable utility function
- **Cons**:
  - Adds one import per file (minimal)
- **Effort**: Small (30 minutes)
- **Risk**: Low

## Recommended Action

Implement Option 1 - create platform utility function

## Technical Details

- **Affected Files**:
  - `src/utils/platform-utils.ts` (new file to create)
  - `src/mcp/tools/simulator/test_sim.ts` (modify to use utility)
  - `src/mcp/tools/simulator/build_sim.ts` (modify to use utility)
  - `src/mcp/tools/simulator/build_run_sim.ts` (modify to use utility)
- **Related Components**: All simulator tools that handle platform parameters
- **Database Changes**: No
- **Breaking Changes**: No (internal refactoring only)

## Resources

- Code review finding: Pattern Recognition Specialist analysis
- Related: XcodePlatform enum defined in `src/utils/build-utils.ts`

## Acceptance Criteria

- [ ] Create `src/utils/platform-utils.ts` with `mapPlatformStringToEnum` function
- [ ] Add JSDoc documentation to the utility function
- [ ] Update `test_sim.ts` to import and use the utility (remove local platformMap)
- [ ] Update `build_sim.ts` to import and use the utility (remove local platformMap)
- [ ] Update `build_run_sim.ts` to import and use the utility (remove local platformMap)
- [ ] Verify no platform mapping logic is duplicated
- [ ] All existing tests pass without modification
- [ ] Run `npm run typecheck` - zero errors
- [ ] Run `npm run lint` - zero errors
- [ ] Run `npm run build` - succeeds

## Work Log

### 2025-10-14 - Initial Discovery
**By:** Claude Code Review System (Pattern Recognition Specialist)
**Actions:**
- Discovered platform mapping duplication during code review
- Identified across 3 simulator tools
- Categorized as P2 (Important)
- Estimated effort: Small (30 minutes)

**Learnings:**
- This duplication is lower priority than schema duplication but still valuable
- Platform mapping is unlikely to change frequently but when it does, consistency is critical
- Utility function pattern is cleaner than constants since it includes default logic

## Notes

Source: Comprehensive code review session on 2025-10-14
Review type: Multi-agent analysis (7 specialized reviewers)

This can be done independently or combined with Issue #001 (schema extraction) as part of a broader "reduce simulator tool duplication" effort.
