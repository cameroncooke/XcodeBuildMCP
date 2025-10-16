---
status: ready
priority: p1
issue_id: "005"
github_issue: 4
epic: 3
tags: [data-integrity, security, validation, session-management, critical]
dependencies: []
---

# Add File Path Validation to SessionStore

## Problem Statement

The `SessionStore` class accepts and stores file paths without validation. Invalid paths (non-existent files, malformed paths) can be stored in session defaults, causing failures at xcodebuild execution time instead of at storage time with clear, actionable error messages.

## Findings

- **Critical Gap**: No validation before storing projectPath or workspacePath
- **Location**: `src/utils/session-store.ts:18-21`
- **Impact**: Late failures with cryptic errors, poor user experience
- **Category**: Data Integrity / Security (P1 Critical)
- **Discovered By**: Data Integrity Guardian review agent

## Problem Scenario

**Step-by-step failure scenario:**

1. User sets session defaults with invalid path:
   ```typescript
   session-set-defaults({ projectPath: "/this/does/not/exist.xcodeproj" })
   ```

2. **No validation occurs** - path is stored in session without checking existence

3. User later calls a tool that relies on session defaults:
   ```typescript
   test_sim({ simulatorName: "iPhone 16" })
   ```

4. Tool merges session defaults, gets invalid projectPath from session

5. Validation passes (path is a valid string type)

6. **Failure occurs deep in xcodebuild execution** (not at validation layer)

7. User sees cryptic error:
   ```
   ❌ xcodebuild failed: The project at '/this/does/not/exist.xcodeproj' could not be found
   ```

8. **Root cause unclear**: Was the path wrong? Was it deleted? Is session stale?

**What should happen instead:**

1. User sets session defaults with invalid path:
   ```typescript
   session-set-defaults({ projectPath: "/this/does/not/exist.xcodeproj" })
   ```

2. **Validation immediately detects problem:**
   ```
   ❌ Invalid projectPath: /this/does/not/exist.xcodeproj does not exist
   Fix: Provide a valid path to an existing .xcodeproj file
   ```

3. Session defaults not updated with invalid data

4. User fixes path and retries successfully

## Current Implementation (No Validation)

```typescript
// src/utils/session-store.ts:18-21
setDefaults(partial: Partial<SessionDefaults>): void {
  this.defaults = { ...this.defaults, ...partial };
  log('info', `[Session] Defaults updated: ${Object.keys(partial).join(', ')}`);
}
```

## Proposed Solutions

### Option 1: Add File Existence Validation (Recommended)

Add validation checks before storing file paths:

```typescript
import { existsSync } from 'fs';
import { log } from './logging/index.js';

setDefaults(partial: Partial<SessionDefaults>): void {
  // Validate file paths before storing
  if (partial.projectPath && !existsSync(partial.projectPath)) {
    throw new Error(
      `Invalid projectPath: ${partial.projectPath} does not exist. ` +
      `Provide a valid path to an existing .xcodeproj file.`
    );
  }

  if (partial.workspacePath && !existsSync(partial.workspacePath)) {
    throw new Error(
      `Invalid workspacePath: ${partial.workspacePath} does not exist. ` +
      `Provide a valid path to an existing .xcworkspace file.`
    );
  }

  // Validate mutual exclusivity at storage time
  if (partial.projectPath && partial.workspacePath) {
    throw new Error(
      'Cannot set both projectPath and workspacePath in session defaults. ' +
      'They are mutually exclusive. Set only one.'
    );
  }

  // Validate existing session state doesn't conflict with new values
  if (partial.projectPath && this.defaults.workspacePath) {
    throw new Error(
      'Session already has workspacePath set. Clear it first with: ' +
      'session-clear-defaults({ keys: ["workspacePath"] })'
    );
  }

  if (partial.workspacePath && this.defaults.projectPath) {
    throw new Error(
      'Session already has projectPath set. Clear it first with: ' +
      'session-clear-defaults({ keys: ["projectPath"] })'
    );
  }

  this.defaults = { ...this.defaults, ...partial };
  log('info', `[Session] Defaults updated: ${Object.keys(partial).join(', ')}`);
}
```

- **Pros**:
  - Catches invalid paths immediately at storage time
  - Clear, actionable error messages
  - Prevents accumulation of stale/invalid session state
  - Also validates mutual exclusivity at storage time (defense in depth)
- **Cons**:
  - Adds file system checks (minimal performance impact)
  - Paths could become invalid later (files deleted) - mitigated by validation on use
- **Effort**: Small (1 hour including tests)
- **Risk**: Low

### Option 2: Add Validation Only in session-set-defaults Tool

Validate in the tool layer instead of SessionStore:

- **Pros**: Keeps SessionStore simple
- **Cons**:
  - Doesn't protect against direct SessionStore manipulation
  - Validation bypassed if SessionStore used directly from other code
  - Less defense in depth
- **Effort**: Small (45 minutes)
- **Risk**: Medium (incomplete protection)

## Recommended Action

Implement **Option 1** (Add validation to SessionStore.setDefaults) for defense in depth.

## Technical Details

- **Affected Files**:
  - `src/utils/session-store.ts` (add validation logic)
  - `src/utils/session-store.test.ts` (add validation tests)
  - `src/mcp/tools/session-management/session_set_defaults.ts` (may need error handling updates)
- **Related Components**: All session-aware tools (test_sim, build_sim, build_run_sim)
- **Database Changes**: No
- **Breaking Changes**: Yes (will reject previously accepted invalid paths) - but this is a bug fix

## Resources

- Code review finding: Data Integrity Guardian analysis
- Related: Security Sentinel also flagged lack of path validation
- Session store: `src/utils/session-store.ts:1-48`

## Acceptance Criteria

- [ ] Add file existence validation for projectPath in SessionStore.setDefaults
- [ ] Add file existence validation for workspacePath in SessionStore.setDefaults
- [ ] Add mutual exclusivity validation at storage time (both in same call)
- [ ] Add conflict detection (new projectPath conflicts with existing workspacePath in session)
- [ ] Provide clear, actionable error messages
- [ ] Add test: Setting non-existent projectPath throws error
- [ ] Add test: Setting non-existent workspacePath throws error
- [ ] Add test: Setting both projectPath and workspacePath throws error
- [ ] Add test: Setting projectPath when workspacePath exists throws error
- [ ] Add test: Setting valid paths succeeds
- [ ] Add test: Clearing conflicting path then setting new one succeeds
- [ ] Update error handling in session_set_defaults tool if needed
- [ ] Run `npm run typecheck` - zero errors
- [ ] Run `npm run lint` - zero errors
- [ ] Run `npm run test` - all tests pass

## Work Log

### 2025-10-14 - Initial Discovery
**By:** Claude Code Review System (Data Integrity Guardian + Security Sentinel)
**Actions:**
- Discovered critical validation gap during security and data integrity review
- Identified as P1 (Critical) due to poor user experience and potential for data corruption
- Estimated effort: Small (1 hour including comprehensive tests)

**Learnings:**
- This validation gap was introduced with session defaults feature
- No tests currently exist for invalid file path scenarios
- The gap causes late failures that are hard to debug
- Session store currently trusts all input without validation
- Adding validation now prevents future issues as more tools adopt session defaults

## Notes

Source: Comprehensive code review session on 2025-10-14
Review type: Multi-agent analysis (7 specialized reviewers)

**Priority Justification**: This is marked P1 (Critical) because:
1. Causes poor user experience (late, cryptic failures)
2. Wastes developer time debugging issues that should be caught immediately
3. Accumulates invalid state that persists across tool calls
4. Easy to fix with high impact on quality

**Test Coverage Gap**: The comprehensive test suite (1174 tests) does NOT include tests for invalid file paths in session storage. This issue includes adding those critical missing tests.
