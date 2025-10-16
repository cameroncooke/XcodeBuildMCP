---
status: ready
priority: p2
issue_id: "004"
github_issue: 8
epic: 3
tags: [code-quality, consistency, user-experience, error-messages]
dependencies: []
---

# Standardize Error Message Style Across Simulator Tools

## Problem Statement

The three simulator tools have inconsistent error message styles. `test_sim` uses verbose, multi-line error messages with recovery examples, while `build_sim` and `build_run_sim` use terse, single-line messages. This creates inconsistent user experience for AI agents and developers.

## Findings

- **Inconsistency**: Two different error message styles across similar tools
- **Location**:
  - `src/mcp/tools/simulator/test_sim.ts:156-174` (verbose style)
  - `src/mcp/tools/simulator/build_sim.ts:168-170` (terse style)
  - `src/mcp/tools/simulator/build_run_sim.ts:525-527` (terse style)
- **Impact**: Inconsistent UX, harder for agents to learn error patterns
- **Category**: Code Quality / User Experience

## Problem Scenario

1. AI agent encounters validation error from `test_sim`: Gets detailed multi-line message with session-set-defaults examples
2. Same agent encounters similar error from `build_sim`: Gets minimal single-line message
3. Inconsistent experience makes it harder for agents to learn error recovery patterns
4. Users may prefer one style over the other but get mixed results
5. Documentation becomes harder (which style to document?)

Current Inconsistency:

**test_sim (verbose style):**
```typescript
requirements: [
  {
    allOf: ['scheme'],
    message: `scheme is required.

Set with: session-set-defaults({ "scheme": "MyScheme" })
OR provide explicitly in test_sim call.`,
  },
  {
    oneOf: ['projectPath', 'workspacePath'],
    message: `Either projectPath or workspacePath required.

Set with: session-set-defaults({ "projectPath": "/path/to/MyApp.xcodeproj" })
OR provide explicitly in test_sim call.`,
  },
]
```

**build_sim (terse style):**
```typescript
requirements: [
  { allOf: ['scheme'], message: 'scheme is required' },
  { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
]
```

**build_run_sim (terse style):**
```typescript
requirements: [
  { allOf: ['scheme'], message: 'scheme is required' },
  { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
]
```

## Proposed Solutions

### Option 1: Standardize on Terse Style (Recommended)

Remove verbose examples from `test_sim` requirements, keeping messages concise. The `createSessionAwareTool` factory already adds session-related context in error responses.

**Changes needed:**
```typescript
// test_sim.ts - simplify to match build_sim/build_run_sim
requirements: [
  { allOf: ['scheme'], message: 'scheme is required' },
  { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
  { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
]
```

- **Pros**:
  - Consistent with existing build_sim and build_run_sim
  - Avoids duplication (factory adds session context)
  - Cleaner, more maintainable code
  - Tool descriptions already provide usage examples
- **Cons**:
  - Slightly less helpful error messages in isolation
  - Requires factory to provide context (it already does)
- **Effort**: Small (30 minutes)
- **Risk**: Low

### Option 2: Standardize on Verbose Style

Add detailed session examples to `build_sim` and `build_run_sim` requirements to match `test_sim`.

- **Pros**:
  - More helpful error messages
  - Clear recovery paths in every error
- **Cons**:
  - Duplicates information (tool descriptions already have examples)
  - More code to maintain
  - Factory also adds session context (duplication)
  - Increases message size for AI context windows
- **Effort**: Small (45 minutes)
- **Risk**: Low

### Option 3: Extract Error Messages to Shared Constants

Create shared error message constants that all tools use.

- **Pros**:
  - Single source of truth for error messages
  - Easy to change message style globally
- **Cons**:
  - Adds indirection
  - May be overkill for this issue
- **Effort**: Medium (1 hour)
- **Risk**: Low

## Recommended Action

Implement **Option 1** (Standardize on Terse Style) because:
1. The `createSessionAwareTool` factory already enhances error messages with session context
2. Tool descriptions provide comprehensive usage examples
3. Terse style is cleaner and more maintainable
4. Matches existing build_sim and build_run_sim patterns

## Technical Details

- **Affected Files**:
  - `src/mcp/tools/simulator/test_sim.ts` (simplify error messages)
- **Related Components**: Error handling in session-aware tools
- **Database Changes**: No
- **Breaking Changes**: No (error messages change but same information available via factory)

## Resources

- Code review finding: Pattern Recognition Specialist analysis
- Related: `createSessionAwareTool` factory already adds context to errors
- Tool descriptions: Lines 133-147 in test_sim.ts already have usage examples

## Acceptance Criteria

- [ ] Update `test_sim.ts` requirements to use terse error messages
- [ ] Verify error messages match style of `build_sim` and `build_run_sim`
- [ ] Confirm `createSessionAwareTool` factory still adds session context to errors
- [ ] Test error scenarios to ensure information is still clear and actionable
- [ ] All existing tests pass (may need to update error message assertions)
- [ ] Run `npm run typecheck` - zero errors
- [ ] Run `npm run lint` - zero errors
- [ ] Update test assertions if they check exact error message text

## Work Log

### 2025-10-14 - Initial Discovery
**By:** Claude Code Review System (Pattern Recognition Specialist)
**Actions:**
- Discovered error message style inconsistency during code review
- Compared messages across all three simulator tools
- Categorized as P2 (Important) for UX consistency
- Estimated effort: Small (30 minutes)

**Learnings:**
- test_sim was implemented with verbose messages as an experiment
- build_sim and build_run_sim use simpler messages that work well
- The factory already adds session context, making verbose messages redundant
- Tool descriptions provide comprehensive examples (lines 133-147 in test_sim)

## Notes

Source: Comprehensive code review session on 2025-10-14
Review type: Multi-agent analysis (7 specialized reviewers)

**Important**: When updating test_sim.ts error messages, also check if test assertions need updating. Tests may assert exact error message text and will need adjustment to match new terse style.
