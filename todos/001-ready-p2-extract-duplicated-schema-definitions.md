---
status: ready
priority: p2
issue_id: "001"
github_issue: 5
epic: 3
tags: [code-quality, maintainability, duplication, typescript, schemas]
dependencies: []
blocks: [002, 003, 004, 007]
---

# Extract Duplicated Schema Definitions to Shared Module

## Problem Statement

The `baseOptions` object is duplicated identically across `build_sim.ts` and `build_run_sim.ts` with 54 lines of identical code each. This creates maintenance burden and risk of drift when updating schema definitions.

## Findings

- **Duplication**: 54 lines of identical schema definitions in two files
- **Location**:
  - `src/mcp/tools/simulator/build_sim.ts:19-54`
  - `src/mcp/tools/simulator/build_run_sim.ts:21-56`
- **Impact**: Changes require updating multiple files, risk of inconsistency
- **Category**: Code Quality / Technical Debt

## Problem Scenario

1. Developer needs to add a new optional parameter (e.g., `testPlan`)
2. Must update the same schema definition in two separate files
3. Risk of forgetting to update one file, causing inconsistent behavior
4. When reviewing, hard to verify both definitions match exactly

Current Duplication:
```typescript
// Identical in both files:
const baseOptions = {
  scheme: z.string().describe('The scheme to use (Required)'),
  platform: z.enum(['iOS Simulator', ...]).optional().default('iOS Simulator'),
  simulatorId: z.string().optional().describe('UUID of simulator...'),
  // ... 45 more identical lines
};
```

## Proposed Solutions

### Option 1: Create Shared Schema Module (Recommended)

Create `src/mcp/tools/simulator/shared-schemas.ts` with:

```typescript
import { z } from 'zod';

export const simulatorCommonOptions = {
  scheme: z.string().describe('The scheme to use (Required)'),
  platform: z
    .enum(['iOS Simulator', 'watchOS Simulator', 'tvOS Simulator', 'visionOS Simulator'])
    .optional()
    .default('iOS Simulator')
    .describe('Target simulator platform (defaults to iOS Simulator)'),
  simulatorId: z
    .string()
    .optional()
    .describe('UUID of the simulator (from list_sims). Provide EITHER this OR simulatorName, not both'),
  simulatorName: z
    .string()
    .optional()
    .describe("Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorId, not both"),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Path where build products and other derived data will go'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  useLatestOS: z
    .boolean()
    .optional()
    .describe('Whether to use the latest OS version for the named simulator'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe('If true, prefers xcodebuild over the experimental incremental build system'),
};

export const projectWorkspaceOptions = {
  projectPath: z
    .string()
    .optional()
    .describe('Path to .xcodeproj file. Provide EITHER this OR workspacePath, not both'),
  workspacePath: z
    .string()
    .optional()
    .describe('Path to .xcworkspace file. Provide EITHER this OR projectPath, not both'),
};
```

Then import in each tool:
```typescript
import { simulatorCommonOptions, projectWorkspaceOptions } from './shared-schemas.ts';

const baseSchemaObject = z.object({
  ...projectWorkspaceOptions,
  ...simulatorCommonOptions,
  // ... tool-specific fields
});
```

- **Pros**:
  - Single source of truth for common schemas
  - Easy to maintain and extend
  - Reduces risk of inconsistency
  - More discoverable for new developers
- **Cons**:
  - Adds one more import
  - Slight indirection (minor)
- **Effort**: Small (1 hour)
- **Risk**: Low

## Recommended Action

Implement Option 1 - create shared schema module

## Technical Details

- **Affected Files**:
  - `src/mcp/tools/simulator/build_sim.ts` (modify to use imports)
  - `src/mcp/tools/simulator/build_run_sim.ts` (modify to use imports)
  - `src/mcp/tools/simulator/test_sim.ts` (optional - could benefit from shared schemas)
  - `src/mcp/tools/simulator/shared-schemas.ts` (new file to create)
- **Related Components**: All simulator tools that use common schema patterns
- **Database Changes**: No
- **Breaking Changes**: No (internal refactoring only)

## Resources

- Code review finding: Pattern Recognition Specialist analysis
- Related pattern: test_sim.ts has similar but not identical schema structure

## Acceptance Criteria

- [ ] Create `src/mcp/tools/simulator/shared-schemas.ts` with `simulatorCommonOptions` and `projectWorkspaceOptions`
- [ ] Update `build_sim.ts` to import and use shared schemas
- [ ] Update `build_run_sim.ts` to import and use shared schemas
- [ ] Verify no schema duplication between the two files
- [ ] All existing tests pass without modification
- [ ] Run `npm run typecheck` - zero errors
- [ ] Run `npm run lint` - zero errors
- [ ] Run `npm run build` - succeeds
- [ ] Consider updating `test_sim.ts` to use shared schemas (optional enhancement)

## Work Log

### 2025-10-14 - Initial Discovery
**By:** Claude Code Review System (Pattern Recognition Specialist)
**Actions:**
- Discovered 54 lines of identical code duplication during code review
- Identified as high-impact maintainability issue
- Categorized as P2 (Important)
- Estimated effort: Small (1 hour)

**Learnings:**
- Duplication occurred during session-aware pattern implementation
- Both files evolved from same template but weren't extracted
- This is common pattern across 3 simulator tools (build_sim, build_run_sim, test_sim)

## Notes

Source: Comprehensive code review session on 2025-10-14
Review type: Multi-agent analysis (7 specialized reviewers)

This is the highest-impact duplication found in the codebase. Addressing this will make future schema changes significantly easier and reduce risk of drift between tools.
