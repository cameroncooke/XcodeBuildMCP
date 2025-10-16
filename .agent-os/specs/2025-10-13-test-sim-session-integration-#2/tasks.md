# Tasks: test_sim Session Defaults Integration

> Linked to: [SPEC.md](./SPEC.md)
> GitHub Issue: [#2](https://github.com/carmandale/XcodeBuildMCP/issues/2)

## 🎉 CRITICAL BUG FIXED + MIGRATION COMPLETE (2025-10-13)

**Commit 01af6e5**: Fixed schema omit bug in `build_sim` and `build_run_sim`
**Commit 5249d64**: Migrated test_sim to session-aware pattern

### What Was Fixed
- ✅ build_sim.ts: Removed .omit() that blocked explicit parameters
- ✅ build_run_sim.ts: Removed .omit() that blocked explicit parameters
- ✅ test_sim.ts: Migrated to createSessionAwareTool pattern
- ✅ Quality checks pass (typecheck, lint, build)
- ✅ Agents can now provide parameters explicitly without errors!

### What Remains
- ⏳ Add comprehensive session integration tests (Phase 2)
- ⏳ Update AGENT_QUICK_START.md documentation (Phase 3)
- ⏳ Manual validation with real AI agents (Phase 4)

---

## Phase 1: Core Implementation ✅ COMPLETE

### 1.1 Add createSessionAwareTool Import
**File**: `src/mcp/tools/simulator/test_sim.ts`

Added import at line 16:
```typescript
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';
```

**Status**: ✅ Complete (Commit 5249d64)

---

### 1.2 Create Public Schema Object
**File**: `src/mcp/tools/simulator/test_sim.ts`

**Status**: ✅ Not Needed - Schema was already correct (no omit pattern)

**Note**: Unlike build_sim/build_run_sim, test_sim.ts already used `baseSchemaObject.shape` directly, so no schema changes were required. This was the correct pattern all along.

---

### 1.3 Update Tool Description
**File**: `src/mcp/tools/simulator/test_sim.ts`

Updated description at lines 132-147 with comprehensive session workflow guidance including:
- How session defaults work
- Required parameters
- Examples with explicit parameters
- Examples with session defaults

**Status**: ✅ Complete (Commit 5249d64)

---

### 1.4 Update Schema Export
**File**: `src/mcp/tools/simulator/test_sim.ts`

**Status**: ✅ Not Needed - Schema export was already correct

**Note**: The schema at line 148 already used `baseSchemaObject.shape` which is the correct pattern for exposing all fields to MCP SDK.

---

### 1.5 Replace Handler with createSessionAwareTool
**File**: `src/mcp/tools/simulator/test_sim.ts`

Replaced manual handler (lines 135-162) with createSessionAwareTool pattern (lines 149-180):
- Added requirements with helpful error messages
- Added exclusivePairs for XOR validation
- Added session integration support

**Status**: ✅ Complete (Commit 5249d64)

---

### 1.6 Run TypeCheck
**Command**: `npm run typecheck`

Verified zero TypeScript errors after changes.

**Status**: ✅ Complete

---

### 1.7 Run Lint
**Command**: `npm run lint`

Verified zero linting errors.

**Status**: ✅ Complete

---

## Phase 2: Testing (2-3 hours)

### 2.1 Add Session Integration Test Suite
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add import:
```typescript
import { sessionStore } from '../../../../utils/session-store.ts';
```

Add new describe block with beforeEach to clear session:
```typescript
describe('test_sim with session defaults', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  // Tests go here
});
```

**Status**: ⏳ Not Started

---

### 2.2 Test: Session Defaults for All Parameters
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test that sets comprehensive session defaults and calls test_simLogic with empty params.

**Expected**: Should use all session defaults and succeed.

**Status**: ⏳ Not Started

---

### 2.3 Test: Explicit Parameters Override Session
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test that sets session defaults, then provides explicit overrides.

**Expected**: Explicit parameters used, not session values.

**Status**: ⏳ Not Started

---

### 2.4 Test: Merge Session + Explicit Parameters
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test that sets some session defaults, provides other explicit parameters.

**Expected**: Both merged correctly.

**Status**: ⏳ Not Started

---

### 2.5 Test: Validate Requirements After Merge
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test that sets incomplete session defaults (missing scheme).

**Expected**: Error with helpful message about session-set-defaults.

**Status**: ⏳ Not Started

---

### 2.6 Test: Reject Conflicting Session Defaults
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test that sets both projectPath AND workspacePath in session.

**Expected**: Error about mutually exclusive parameters.

**Status**: ⏳ Not Started

---

### 2.7 Test: Explicit Param Conflicts with Session
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test with projectPath in session, workspacePath explicitly provided.

**Expected**: Error about mutually exclusive parameters.

**Status**: ⏳ Not Started

---

### 2.8 Test: Override Replaces (Doesn't Conflict)
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test with projectPath in session, different projectPath explicitly provided.

**Expected**: Explicit projectPath used (replaces, not conflicts).

**Status**: ⏳ Not Started

---

### 2.9 Test: Error Messages Include Recovery Paths
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test with no session and missing required params.

**Expected**: Error message contains "session-set-defaults" with examples.

**Status**: ⏳ Not Started

---

### 2.10 Test: Preserve Existing XOR Validation
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test with both projectPath and workspacePath provided explicitly.

**Expected**: Error about mutually exclusive (existing validation preserved).

**Status**: ⏳ Not Started

---

### 2.11 Test: Preserve macOS Platform Rejection
**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

Add test with platform: 'macOS'.

**Expected**: Error directing to use test_macos tool.

**Status**: ⏳ Not Started

---

### 2.12 Run Full Test Suite
**Command**: `npm run test`

Verify all existing + new tests pass.

**Status**: ⏳ Not Started

---

### 2.13 Verify Test Coverage
**Command**: `npm run test -- --coverage`

Ensure new session integration code has ≥90% coverage.

**Status**: ⏳ Not Started

---

## Phase 3: Documentation (1-2 hours)

### 3.1 Add Session Management Section to AGENT_QUICK_START.md
**File**: `AGENT_QUICK_START.md`

Add new section after line 150 (see SPEC.md for full content).

**Sections to add**:
- How Session Defaults Work
- Step-by-Step Example
- Supported Session Parameters (table)
- Managing Session Defaults
- Best Practices
- Troubleshooting

**Status**: ⏳ Not Started

---

### 3.2 Review and Polish Documentation
Read through new documentation section for:
- Clarity and conciseness
- Accurate code examples
- Consistent formatting
- No typos or grammatical errors

**Status**: ⏳ Not Started

---

## Phase 4: Quality Validation (1 hour)

### 4.1 Build Project
**Command**: `npm run build`

Verify build succeeds without errors.

**Status**: ⏳ Not Started

---

### 4.2 TypeCheck
**Command**: `npm run typecheck`

Verify zero TypeScript errors.

**Status**: ⏳ Not Started

---

### 4.3 Lint Check
**Command**: `npm run lint`

Verify zero linting errors.

**Status**: ⏳ Not Started

---

### 4.4 Full Test Suite
**Command**: `npm run test`

Verify all 1151+ tests pass.

**Status**: ⏳ Not Started

---

### 4.5 Manual Test: Set Session and Call test_sim
**Steps**:
1. Start XcodeBuildMCP server
2. Call `session-set-defaults` with projectPath and scheme
3. Call `test_sim` with only simulatorName
4. Verify test runs successfully

**Status**: ⏳ Not Started

---

### 4.6 Manual Test: Override Session Defaults
**Steps**:
1. With session defaults set from previous test
2. Call `test_sim` with different scheme explicitly
3. Verify explicit scheme is used

**Status**: ⏳ Not Started

---

### 4.7 Manual Test: Error Messages
**Steps**:
1. Clear all session defaults
2. Call `test_sim` with only simulatorName
3. Verify error message includes session-set-defaults examples

**Status**: ⏳ Not Started

---

### 4.8 Manual Test: Real AI Agent
**Steps**:
1. Use actual AI agent (Claude Code, Cursor, etc.)
2. Ask agent to "test the orchestrator app on iPhone 16"
3. Count number of attempts before success
4. Verify ≤2 attempts

**Status**: ⏳ Not Started

---

## Completion Checklist

- [x] All Phase 1 tasks completed (Commit 5249d64)
- [ ] All Phase 2 tasks completed (Testing)
- [ ] All Phase 3 tasks completed (Documentation)
- [ ] All Phase 4 tasks completed (Quality Validation)
- [ ] All acceptance criteria met (see SPEC.md)
- [ ] Success metrics measured and documented
- [ ] GitHub issue #2 updated with results
- [ ] Pull request created and linked to issue

---

**Total Tasks**: 29
**Completed**: 7 (Phase 1)
**Remaining**: 22 (Phases 2-4)
**Estimated Time Remaining**: 4-6 hours
**Status**: 🚧 Phase 1 Complete - Ready for Phase 2 (Testing)
