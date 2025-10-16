---
status: ready
priority: p3
issue_id: "003"
github_issue: 5
epic: 3
tags: [code-quality, maintainability, duplication, typescript, utilities]
dependencies: [001]
---

# Extract Duplicated useLatestOS Warning Logic

## Problem Statement

All three simulator tools have identical warning logic when `useLatestOS` is used with `simulatorId`. This 6-line block is duplicated across `test_sim`, `build_sim`, and `build_run_sim`, creating minor maintenance burden.

## Findings

- **Duplication**: 6 lines of identical warning code in three files
- **Location**:
  - `src/mcp/tools/simulator/test_sim.ts:105-110`
  - `src/mcp/tools/simulator/build_sim.ts:106-111`
  - `src/mcp/tools/simulator/build_run_sim.ts:109-114`
- **Impact**: Minor - warning message updates require changing three files
- **Category**: Code Quality / Technical Debt (Low Priority)

## Problem Scenario

1. Developer wants to improve the warning message for clarity
2. Must update identical code in three separate files
3. While this logic rarely changes, consistency is important for user experience
4. Current duplication is small but follows same anti-pattern as larger duplications

Current Duplication:
```typescript
// Identical in all three files:
if (simulatorId && useLatestOS !== undefined) {
  log(
    'warning',
    `useLatestOS parameter is ignored when using simulatorId (UUID implies exact device/OS)`,
  );
}
```

## Proposed Solutions

### Option 1: Create Validation Utility Function (Recommended)

Create `src/utils/simulator-validation.ts`:
```typescript
import { log } from './logging/index.ts';

/**
 * Logs a warning if useLatestOS is provided with simulatorId.
 * The useLatestOS parameter is ignored when using simulatorId since
 * the UUID already specifies an exact device and OS version.
 */
export function logUseLatestOSWarning(simulatorId?: string, useLatestOS?: boolean): void {
  if (simulatorId && useLatestOS !== undefined) {
    log('warning', 'useLatestOS parameter is ignored when using simulatorId (UUID implies exact device/OS)');
  }
}
```

Update each tool to use the utility:
```typescript
import { logUseLatestOSWarning } from '../../../utils/simulator-validation.ts';

// Replace existing warning logic with:
logUseLatestOSWarning(params.simulatorId, params.useLatestOS);
```

- **Pros**:
  - Single source of truth for this warning
  - Easy to improve message or add additional validation
  - Reduces code duplication by ~18 lines
  - Establishes pattern for future simulator validations
- **Cons**:
  - Adds one import per file (minimal)
  - Minor overhead for small utility
- **Effort**: Small (15 minutes)
- **Risk**: Low

### Option 2: Keep As-Is

Accept the duplication since it's only 6 lines and rarely changes.

- **Pros**: No work required
- **Cons**: Inconsistency with other duplication cleanup efforts
- **Effort**: None
- **Risk**: None

## Recommended Action

Implement Option 1 if doing broader duplication cleanup (combine with Issues #001, #002).
Otherwise, this is low priority and can be deferred.

## Technical Details

- **Affected Files**:
  - `src/utils/simulator-validation.ts` (new file to create)
  - `src/mcp/tools/simulator/test_sim.ts` (modify to use utility)
  - `src/mcp/tools/simulator/build_sim.ts` (modify to use utility)
  - `src/mcp/tools/simulator/build_run_sim.ts` (modify to use utility)
- **Related Components**: All simulator tools that support useLatestOS parameter
- **Database Changes**: No
- **Breaking Changes**: No (internal refactoring only)

## Resources

- Code review finding: Pattern Recognition Specialist analysis
- Related issues: #001 (schema extraction), #002 (platform mapping)

## Acceptance Criteria

- [ ] Create `src/utils/simulator-validation.ts` with `logUseLatestOSWarning` function
- [ ] Add JSDoc documentation explaining why this warning exists
- [ ] Update `test_sim.ts` to use the utility (remove local warning logic)
- [ ] Update `build_sim.ts` to use the utility (remove local warning logic)
- [ ] Update `build_run_sim.ts` to use the utility (remove local warning logic)
- [ ] Verify warning still appears in same scenarios (test with simulatorId + useLatestOS)
- [ ] All existing tests pass without modification
- [ ] Run `npm run typecheck` - zero errors
- [ ] Run `npm run lint` - zero errors

## Work Log

### 2025-10-14 - Initial Discovery
**By:** Claude Code Review System (Pattern Recognition Specialist)
**Actions:**
- Discovered useLatestOS warning duplication during code review
- Identified across 3 simulator tools
- Categorized as P3 (Nice-to-Have) due to small scope
- Estimated effort: Small (15 minutes)

**Learnings:**
- This is the smallest duplication found but follows same pattern
- Good candidate for cleanup if doing broader refactoring
- Low priority as standalone task
- Can be bundled with other simulator tool improvements

## Notes

Source: Comprehensive code review session on 2025-10-14
Review type: Multi-agent analysis (7 specialized reviewers)

**Recommendation**: Combine this with Issues #001 and #002 for a comprehensive "reduce simulator tool duplication" PR. Not worth doing in isolation.
