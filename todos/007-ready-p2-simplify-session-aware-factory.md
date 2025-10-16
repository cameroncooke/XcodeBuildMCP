---
status: ready
priority: p2
issue_id: "007"
github_issue: 7
epic: 3
tags: [architecture, simplification, yagni, technical-debt, refactoring]
dependencies: [001, 002, 003, 004]
---

# Simplify Session-Aware Factory by Removing Requirements DSL

## Problem Statement

The `createSessionAwareTool` factory has a complex requirements DSL (Domain Specific Language) that duplicates functionality already provided by Zod schemas. This adds ~85 lines of unnecessary complexity (48% of the factory code) that could be eliminated by relying on Zod validation with improved error formatting.

## Findings

- **Over-Engineering**: Custom validation system duplicates Zod capabilities
- **Location**: `src/utils/typed-tool-factory.ts:63-174`
- **Complexity**: 4 transformation passes when 2 suffice
- **Impact**: Harder to maintain, unnecessary abstraction layer
- **Category**: Architecture / YAGNI Violation
- **Discovered By**: Code Simplicity Reviewer

## Problem Analysis

### Current Complexity Breakdown

**Lines 63-155: Requirements DSL System**
- Custom `SessionRequirement` type with `allOf` and `oneOf` validators
- `missingFromMerged` helper function to check requirements
- Manual error message construction
- **This duplicates what Zod schemas already do**

**Lines 115-128: Exclusive Pair Pruning**
- Complex nested loops to remove conflicting session defaults
- Solves problem that Zod `.refine()` already handles
- 14 lines of code for edge case that validation catches

**Lines 92-96: Over-complex Sanitization**
- Removes null/undefined values
- Could be simplified or removed

**Overall Structure:**
```
sanitizeArgs() → checkExclusivePairs() → mergeWithSession() →
pruneConflictingSessionKeys() → validateRequirements() →
Zod.parse()
```

**This could be:**
```
mergeWithSession() → Zod.parse() → enhanceErrorMessage()
```

### Example of Duplication

**Custom Requirements (Unnecessary):**
```typescript
requirements: [
  { allOf: ['scheme'], message: 'scheme is required' },
  { oneOf: ['projectPath', 'workspacePath'], message: 'Either/or required' },
]
```

**Zod Already Does This:**
```typescript
z.object({
  scheme: z.string(), // Required by default
  projectPath: z.string().optional(),
  workspacePath: z.string().optional(),
}).refine(v => v.projectPath || v.workspacePath, {
  message: 'Either projectPath or workspacePath required'
})
```

## Proposed Solutions

### Option 1: Radical Simplification (Recommended)

Collapse factory to just merge + validate, let Zod handle all validation:

```typescript
export function createSessionAwareTool<TParams>(
  schema: z.ZodType<TParams>,
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>,
  getExecutor: () => CommandExecutor,
) {
  return async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Simple merge: explicit args override session defaults
      const merged = { ...sessionStore.getAll(), ...args };

      // Let Zod validate everything (including XOR constraints)
      const validated = schema.parse(merged);
      return await logicFunction(validated, getExecutor());
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Enhance error messages with session context
        return createSessionAwareError(error);
      }
      throw error;
    }
  };
}

// New helper to enhance Zod errors with session hints
function createSessionAwareError(zodError: z.ZodError): ToolResponse {
  const messages = zodError.errors.map(err => {
    const field = err.path.join('.');
    let message = `${field}: ${err.message}`;

    // Add session-set-defaults hint for missing required fields
    if (err.code === 'invalid_type' && err.received === 'undefined') {
      message += `\n\nSet with: session-set-defaults({ "${field}": "value" })`;
    }

    return message;
  });

  return createErrorResponse('Validation failed', messages.join('\n\n'));
}
```

**Changes to tools:**
- Remove `requirements` arrays
- Remove `exclusivePairs` arrays (keep in Zod schemas)
- Rely on Zod for all validation

- **Pros**:
  - -85 lines of code (48% reduction in factory)
  - -30 lines per tool (remove requirements config)
  - Single source of truth (Zod schemas)
  - Simpler mental model
  - Easier to maintain and extend
- **Cons**:
  - Requires updating all three tools
  - Error messages slightly different (but still clear)
  - More significant refactoring effort
- **Effort**: Medium (2-3 hours)
- **Risk**: Low (comprehensive tests will catch issues)

### Option 2: Keep Requirements, Remove Pruning

Keep requirements DSL but remove exclusive pair pruning logic:

- **Pros**: Less disruptive change
- **Cons**: Still maintains unnecessary DSL
- **Effort**: Small (1 hour)
- **Risk**: Low

### Option 3: Keep As-Is

Accept the complexity as intentional design:

- **Pros**: No work required
- **Cons**: Maintains technical debt, harder to maintain
- **Effort**: None
- **Risk**: None

## Recommended Action

Implement **Option 1** (Radical Simplification) because:
1. Eliminates unnecessary abstraction layer
2. Single source of truth (Zod schemas)
3. Significantly reduces code complexity
4. Makes future maintenance easier
5. The requirements DSL provides no value over Zod

## Technical Details

- **Affected Files**:
  - `src/utils/typed-tool-factory.ts` (simplify factory, -85 lines)
  - `src/mcp/tools/simulator/test_sim.ts` (remove requirements config)
  - `src/mcp/tools/simulator/build_sim.ts` (remove requirements config)
  - `src/mcp/tools/simulator/build_run_sim.ts` (remove requirements config)
  - `src/utils/typed-tool-factory.test.ts` (update factory tests)
  - Tool test files (update to match new error messages)
- **Related Components**: All session-aware tools
- **Database Changes**: No
- **Breaking Changes**: No (internal refactoring, external API unchanged)

## Resources

- Code review finding: Code Simplicity Reviewer + Architecture Strategist
- YAGNI principle: "You Aren't Gonna Need It" - don't build abstractions until necessary
- Zod documentation: https://zod.dev/

## Acceptance Criteria

- [ ] Simplify `createSessionAwareTool` to ~16 lines (from 101)
- [ ] Create `createSessionAwareError` helper for enhanced Zod error messages
- [ ] Remove `requirements` arrays from test_sim.ts
- [ ] Remove `requirements` arrays from build_sim.ts
- [ ] Remove `requirements` arrays from build_run_sim.ts
- [ ] Remove `exclusivePairs` arrays from all three tools (keep in Zod schemas)
- [ ] Update factory tests to match new implementation
- [ ] Update tool tests to match new error message format
- [ ] Verify all XOR constraints still enforced by Zod schemas
- [ ] Verify error messages still actionable and include session hints
- [ ] All 1174+ tests pass
- [ ] Run `npm run typecheck` - zero errors
- [ ] Run `npm run lint` - zero errors
- [ ] Run `npm run build` - succeeds
- [ ] Manual test: Error messages still clear and helpful

## Work Log

### 2025-10-14 - Initial Discovery
**By:** Claude Code Review System (Code Simplicity Reviewer)
**Actions:**
- Identified requirements DSL as unnecessary abstraction
- Calculated complexity reduction: -85 lines in factory, -30 per tool
- Categorized as P2 (Important) - significant simplification opportunity
- Estimated effort: Medium (2-3 hours)

**Learnings:**
- The requirements DSL was built to provide better error messages
- However, Zod can provide the same with custom error formatting
- The DSL creates a second validation layer that duplicates Zod
- Exclusive pair pruning is solving a problem Zod refines already handle
- This is a YAGNI violation - building abstraction that isn't needed

## Notes

Source: Comprehensive code review session on 2025-10-14
Review type: Multi-agent analysis (7 specialized reviewers)

**Impact**: This refactoring will make the session-aware pattern significantly simpler and easier to extend to other tools. The current complexity (101 lines + config per tool) creates a barrier to adoption.

**Trade-off**: Error messages will be slightly different (Zod format vs custom format) but enhanced error formatter will maintain clarity and add session hints.

**Alternative Approach**: If this seems too risky, start with Option 2 (remove pruning only) as a smaller first step, then evaluate if further simplification is warranted.
