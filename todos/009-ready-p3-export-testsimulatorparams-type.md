---
status: ready
priority: p3
issue_id: "009"
github_issue: 8
epic: 3
tags: [code-quality, consistency, typescript, exports]
dependencies: []
---

# Export TestSimulatorParams Type for Consistency

## Problem Statement

`TestSimulatorParams` type is not exported in `test_sim.ts`, while the equivalent types in `build_sim.ts` and `build_run_sim.ts` ARE exported. This creates inconsistency across similar tools and prevents external code from importing the type if needed.

## Findings

- **Inconsistency**: Type exported in 2 files but not the third
- **Location**:
  - `src/mcp/tools/simulator/test_sim.ts:88` (NOT exported)
  - `src/mcp/tools/simulator/build_sim.ts:84` (IS exported)
  - `src/mcp/tools/simulator/build_run_sim.ts:86` (IS exported)
- **Impact**: Minor - inconsistency and potential import issues
- **Category**: Code Quality / Consistency
- **Discovered By**: Pattern Recognition Specialist

## Problem Scenario

1. Developer wants to import `TestSimulatorParams` type for type safety
2. Tries: `import type { TestSimulatorParams } from './test_sim.ts'`
3. TypeScript error: Type is not exported
4. Must work around by using `z.infer<typeof testSimulatorSchema>` directly
5. Inconsistent with build_sim and build_run_sim which export their types

Current Inconsistency:
```typescript
// test_sim.ts:88 - NOT exported
type TestSimulatorParams = z.infer<typeof testSimulatorSchema>;

// build_sim.ts:84 - IS exported ✓
export type BuildSimulatorParams = z.infer<typeof buildSimulatorSchema>;

// build_run_sim.ts:86 - IS exported ✓
export type BuildRunSimulatorParams = z.infer<typeof buildRunSimulatorSchema>;
```

## Proposed Solutions

### Option 1: Export the Type (Recommended)

Add `export` keyword to the type declaration:

```typescript
// test_sim.ts:88 - change from:
type TestSimulatorParams = z.infer<typeof testSimulatorSchema>;

// to:
export type TestSimulatorParams = z.infer<typeof testSimulatorSchema>;
```

- **Pros**:
  - Consistent with other simulator tools
  - Allows external imports if needed
  - Follows TypeScript best practices (export public types)
  - Takes 2 minutes
- **Cons**:
  - None
- **Effort**: Small (2 minutes)
- **Risk**: None

### Option 2: Remove Exports from Other Files

Make all three consistent by NOT exporting:

- **Pros**: Also achieves consistency
- **Cons**: Less flexible, goes against TypeScript conventions
- **Effort**: Small (2 minutes)
- **Risk**: Low (may break external code that imports these types)

## Recommended Action

Implement **Option 1** (Export the type) for consistency and flexibility.

## Technical Details

- **Affected Files**:
  - `src/mcp/tools/simulator/test_sim.ts:88` (add export keyword)
- **Related Components**: None
- **Database Changes**: No
- **Breaking Changes**: No (adding export is additive change)

## Resources

- Code review finding: Pattern Recognition Specialist analysis
- TypeScript best practice: Export all public types

## Acceptance Criteria

- [ ] Add `export` keyword to `TestSimulatorParams` type in test_sim.ts
- [ ] Verify type can be imported: `import type { TestSimulatorParams } from './test_sim.ts'`
- [ ] Confirm consistency with build_sim.ts and build_run_sim.ts export patterns
- [ ] Run `npm run typecheck` - zero errors
- [ ] Run `npm run lint` - zero errors
- [ ] No functional changes (only adds export)

## Work Log

### 2025-10-14 - Initial Discovery
**By:** Claude Code Review System (Pattern Recognition Specialist)
**Actions:**
- Noticed type export inconsistency during pattern analysis
- Compared across all three simulator tools
- Categorized as P3 (Nice-to-Have) - minor consistency issue
- Estimated effort: Small (2 minutes)

**Learnings:**
- test_sim likely forgot to export the type
- build_sim and build_run_sim correctly export their types
- No functional impact but creates inconsistency
- Simple fix with zero risk

## Notes

Source: Comprehensive code review session on 2025-10-14
Review type: Multi-agent analysis (7 specialized reviewers)

**Quick Fix**: This is a 2-minute change that can be bundled with any other changes to test_sim.ts. Not urgent but good for consistency.
