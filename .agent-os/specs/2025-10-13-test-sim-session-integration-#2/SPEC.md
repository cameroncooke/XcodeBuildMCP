# Spec: test_sim Session Defaults Integration

> **GitHub Issue**: [#2](https://github.com/carmandale/XcodeBuildMCP/issues/2)
> **Created**: 2025-10-13
> **Status**: 🔧 In Progress - Critical Bug Fixed!
> **Estimated Effort**: 2-3 hours remaining (6-9 hours total)

## ⚠️ CRITICAL BUG DISCOVERY (2025-10-13)

**A different bug was blocking agents** - opposite of what we initially thought!

### What We Discovered

**Original Problem Statement (INCORRECT)**:
- "Agents can't see required parameters in schema"
- "Agents make 3-4 attempts because they don't know what's required"

**Actual Problem (CORRECT)**:
- **Agents WERE providing all parameters explicitly**
- **MCP SDK was filtering them out before handler**
- **Handler received empty parameters despite agent sending them**

### Root Cause

```typescript
// BROKEN CODE (in build_sim and build_run_sim):
const publicSchemaObject = baseSchemaObject.omit({
  projectPath: true,
  scheme: true,  // ❌ Hidden from MCP SDK!
  // ...
});
```

**What was happening**:
1. Agent: `build_sim({ projectPath: "...", scheme: "MyScheme", simulatorId: "..." })`
2. MCP SDK sees `publicSchemaObject` (missing those fields)
3. **MCP SDK filters out params not in schema**
4. Handler receives: `{ platform: "visionOS Simulator" }` only
5. Requirements check: ❌ "scheme is required"

### The Fix (Commit 01af6e5)

```typescript
// FIXED CODE:
// Public schema = all fields optional (session defaults can provide values)
// This allows agents to provide parameters explicitly OR rely on session defaults
const publicSchemaObject = baseSchemaObject;
```

✅ **Fixed in**: `build_sim.ts`, `build_run_sim.ts`
⏳ **Still needs fix**: `test_sim.ts` (this spec)

## Updated Problem Statement

The `test_sim` tool needs session defaults integration, but the critical blocking bug has been fixed:

✅ **FIXED**: Schema omit was blocking explicit parameters
⏳ **TODO**: Migrate test_sim to use `createSessionAwareTool` pattern

### Evidence

```
❌ Attempt 1: MCP error -32602: { "path": ["scheme"], "message": "Required" }
❌ Attempt 2: "Either projectPath or workspacePath is required."
❌ Attempt 3: Still missing simulatorId/simulatorName...
```

Agents make 3-4 failed attempts before successfully calling `test_sim`.

## Solution Overview

**Migrate `test_sim` to use `createSessionAwareTool` pattern** already proven in `build_sim` and `build_run_sim`.

### Key Changes

1. **Import session-aware factory**: `createSessionAwareTool` from typed-tool-factory
2. **Create public schema**: Omit session-manageable parameters
3. **Replace handler**: Use `createSessionAwareTool` with requirements and exclusivePairs
4. **Enhance error messages**: Include recovery paths with session-set-defaults examples

### What Stays Unchanged

✅ `test_simLogic` function signature
✅ Internal schema with XOR `.refine()` constraints
✅ All existing logic function tests

**Only the handler layer changes** (session integration + error messages).

## Technical Implementation

### Phase 1: Core Implementation

#### File: `src/mcp/tools/simulator/test_sim.ts`

**Step 1.1: Add Import**
```typescript
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';
```

**Step 1.2: Create Public Schema**
```typescript
// After baseSchemaObject definition (line ~68)
// Public schema = all fields optional (session defaults can provide values)
// This allows agents to provide parameters explicitly OR rely on session defaults
const publicSchemaObject = baseSchemaObject;
```

**⚠️ IMPORTANT**: Do NOT use `.omit()` - this was the bug we fixed in build_sim!

**Step 1.3: Update Tool Description**
```typescript
export default {
  name: 'test_sim',
  description: `Runs tests on a simulator by UUID or name.

WORKFLOW:
1. Set defaults once: session-set-defaults({ projectPath: "/path/to/Project.xcodeproj", scheme: "MyScheme" })
2. Then call: test_sim({ simulatorName: "iPhone 16" })

REQUIRED (or session defaults):
- scheme: The scheme to test
- projectPath OR workspacePath: Path to .xcodeproj or .xcworkspace

OPTIONAL:
- simulatorId OR simulatorName: Which simulator (uses first available if omitted)
- platform: "iOS Simulator" (default), "watchOS Simulator", "tvOS Simulator", "visionOS Simulator"
- configuration: "Debug" (default) or "Release"
- derivedDataPath: Custom path for build products
- extraArgs: Additional xcodebuild arguments
- preferXcodebuild: Use xcodebuild instead of xcodemake
- testRunnerEnv: Environment variables for test runner

EXAMPLE (with session defaults):
  session-set-defaults({ projectPath: "/path/to/App.xcodeproj", scheme: "MyScheme" })
  test_sim({ simulatorName: "iPhone 16" })

EXAMPLE (without session defaults):
  test_sim({
    projectPath: "/path/to/App.xcodeproj",
    scheme: "MyScheme",
    simulatorName: "iPhone 16"
  })`,
  schema: publicSchemaObject.shape,
  // ... handler below
};
```

**Step 1.4: Replace Handler**
```typescript
export default {
  // ... name, description, schema above
  handler: createSessionAwareTool<TestSimulatorParams>({
    internalSchema: testSimulatorSchema,
    logicFunction: test_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [
      {
        allOf: ['scheme'],
        message: `scheme is required.

Set with: session-set-defaults({ "scheme": "MyScheme" })
OR provide explicitly in test_sim call.`
      },
      {
        oneOf: ['projectPath', 'workspacePath'],
        message: `Either projectPath or workspacePath required.

Set with: session-set-defaults({ "projectPath": "/path/to/MyApp.xcodeproj" })
OR provide explicitly in test_sim call.`
      },
    ],
    exclusivePairs: [
      ['projectPath', 'workspacePath'],
      ['simulatorId', 'simulatorName'],
    ],
  }),
};
```

### Phase 2: Testing

#### File: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

**Add Session Integration Tests**

```typescript
import { sessionStore } from '../../../../utils/session-store.ts';

describe('test_sim with session defaults', () => {
  beforeEach(() => {
    // Clear session state before each test
    sessionStore.clear();
  });

  describe('Session Defaults Integration', () => {
    it('should use session defaults for all missing parameters', async () => {
      // Set comprehensive session defaults
      sessionStore.setDefaults({
        projectPath: '/path/to/TestProject.xcodeproj',
        scheme: 'TestScheme',
        simulatorName: 'iPhone 16',
        configuration: 'Debug',
        useLatestOS: true,
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Succeeded\n** TEST SUCCEEDED **',
      });

      // Call with empty parameters - should use all session defaults
      const result = await test_simLogic({}, mockExecutor);

      expect(result.isError).toBe(false);
      expect(mockExecutor).toHaveBeenCalledWith(
        expect.arrayContaining([
          '-project',
          '/path/to/TestProject.xcodeproj',
          '-scheme',
          'TestScheme',
          '-configuration',
          'Debug',
        ]),
        expect.any(String)
      );
    });

    it('should prioritize explicit parameters over session defaults', async () => {
      // Set session defaults
      sessionStore.setDefaults({
        projectPath: '/session/path.xcodeproj',
        scheme: 'SessionScheme',
        configuration: 'Release',
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Succeeded\n** TEST SUCCEEDED **',
      });

      // Provide explicit overrides
      const result = await test_simLogic(
        {
          projectPath: '/explicit/path.xcodeproj',
          scheme: 'ExplicitScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor
      );

      expect(result.isError).toBe(false);
      expect(mockExecutor).toHaveBeenCalledWith(
        expect.arrayContaining([
          '-project',
          '/explicit/path.xcodeproj',
          '-scheme',
          'ExplicitScheme',
        ]),
        expect.any(String)
      );
      // Should NOT contain session values
      expect(mockExecutor).not.toHaveBeenCalledWith(
        expect.arrayContaining(['-scheme', 'SessionScheme']),
        expect.any(String)
      );
    });

    it('should merge session defaults with explicit parameters', async () => {
      // Set some defaults
      sessionStore.setDefaults({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Succeeded\n** TEST SUCCEEDED **',
      });

      // Provide additional explicit parameter
      const result = await test_simLogic(
        {
          simulatorName: 'iPhone 16',
          configuration: 'Release', // Override default Debug
        },
        mockExecutor
      );

      expect(result.isError).toBe(false);
      expect(mockExecutor).toHaveBeenCalledWith(
        expect.arrayContaining([
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
        ]),
        expect.any(String)
      );
    });

    it('should validate requirements after session merge', async () => {
      // Set only projectPath in session, missing scheme
      sessionStore.setDefaults({
        projectPath: '/path/to/project.xcodeproj',
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      // Don't provide scheme explicitly either
      const result = await test_simLogic({ simulatorName: 'iPhone 16' }, mockExecutor);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scheme is required');
      expect(result.content[0].text).toContain('session-set-defaults');
    });
  });

  describe('XOR Constraints with Session Defaults', () => {
    it('should reject conflicting session defaults', async () => {
      // Set conflicting defaults (both projectPath AND workspacePath)
      sessionStore.setDefaults({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'TestScheme',
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await test_simLogic({ simulatorName: 'iPhone 16' }, mockExecutor);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should reject explicit parameter conflicting with session default', async () => {
      // Session has projectPath
      sessionStore.setDefaults({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'TestScheme',
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      // Explicit workspacePath conflicts with session projectPath
      const result = await test_simLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          simulatorName: 'iPhone 16',
        },
        mockExecutor
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should allow explicit parameter to override session default without conflict', async () => {
      // Session has projectPath
      sessionStore.setDefaults({
        projectPath: '/session/project.xcodeproj',
        scheme: 'TestScheme',
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Succeeded\n** TEST SUCCEEDED **',
      });

      // Explicit projectPath should REPLACE session projectPath (not conflict)
      const result = await test_simLogic(
        {
          projectPath: '/explicit/project.xcodeproj',
          simulatorName: 'iPhone 16',
        },
        mockExecutor
      );

      expect(result.isError).toBe(false);
      expect(mockExecutor).toHaveBeenCalledWith(
        expect.arrayContaining(['-project', '/explicit/project.xcodeproj']),
        expect.any(String)
      );
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error when no session defaults and missing required params', async () => {
      // No session defaults set
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await test_simLogic({ simulatorName: 'iPhone 16' }, mockExecutor);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('session-set-defaults');
      expect(result.content[0].text).toContain('scheme');
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should show clear recovery path in error messages', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await test_simLogic({}, mockExecutor);

      expect(result.isError).toBe(true);
      // Should include example of how to fix
      expect(result.content[0].text).toMatch(/session-set-defaults.*scheme/);
      expect(result.content[0].text).toMatch(/session-set-defaults.*projectPath/);
    });
  });

  describe('Preserves Existing Validation', () => {
    it('should still reject both projectPath and workspacePath when explicit', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await test_simLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'TestScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should still reject macOS platform', async () => {
      sessionStore.setDefaults({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'TestScheme',
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await test_simLogic(
        {
          platform: 'macOS' as any, // Force invalid platform
          simulatorName: 'iPhone 16',
        },
        mockExecutor
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('macOS platform is not supported');
      expect(result.content[0].text).toContain('test_macos');
    });
  });
});
```

### Phase 3: Documentation

#### File: `AGENT_QUICK_START.md`

Add new section after line 150 (Session Management examples):

```markdown
## Session Management Workflow

XcodeBuildMCP supports **session defaults** to reduce repetitive parameters across tool calls.

### How Session Defaults Work

1. **Set defaults once** for common parameters like `projectPath`, `scheme`, `configuration`
2. **Use any tool** with minimal parameters - session defaults are automatically applied
3. **Override when needed** - explicit parameters always take precedence

### Step-by-Step Example

#### Step 1: Set Defaults
```bash
session-set-defaults({
  "projectPath": "/Users/dale/Projects/orchestrator/orchestrator.xcodeproj",
  "scheme": "orchestrator",
  "configuration": "Debug"
})
```

#### Step 2: Use Tools with Minimal Parameters
```bash
# Build with just simulator name
build_sim({ "simulatorName": "iPhone 16" })

# Test with just simulator name
test_sim({ "simulatorName": "iPhone 16" })

# Run with just simulator name
build_run_sim({ "simulatorName": "iPhone 16" })
```

#### Step 3: Override When Needed
```bash
# Use different scheme for this one call
test_sim({
  "simulatorName": "iPhone 16",
  "scheme": "orchestrator-unit-tests"  # Overrides session default
})
```

### Supported Session Parameters

All build/test/run tools support these session defaults:

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectPath` | string | Path to .xcodeproj file |
| `workspacePath` | string | Path to .xcworkspace file |
| `scheme` | string | Xcode scheme name |
| `configuration` | string | Build configuration (Debug/Release) |
| `simulatorName` | string | Simulator name (e.g., "iPhone 16") |
| `simulatorId` | string | Simulator UUID |
| `deviceId` | string | Physical device UDID |
| `useLatestOS` | boolean | Use latest OS for named simulator |
| `arch` | string | Architecture (arm64/x86_64) |

### Managing Session Defaults

**View Current Defaults:**
```bash
session-show-defaults()
```

**Clear Specific Defaults:**
```bash
session-clear-defaults({ "keys": ["scheme", "configuration"] })
```

**Clear All Defaults:**
```bash
session-clear-defaults()
```

### Best Practices

1. **Set project-level defaults at start of session**
   - `projectPath` or `workspacePath`
   - `scheme`
   - `configuration` if not Debug

2. **Use explicit parameters for one-off changes**
   - Different simulator
   - Different scheme
   - Release builds

3. **Clear defaults when switching projects**
   ```bash
   session-clear-defaults()
   session-set-defaults({ "projectPath": "/new/project.xcodeproj", "scheme": "NewScheme" })
   ```

### Troubleshooting

**Error: "scheme is required"**
```bash
# Either set session default:
session-set-defaults({ "scheme": "MyScheme" })

# Or provide explicitly:
test_sim({ "scheme": "MyScheme", "projectPath": "/path/to/project.xcodeproj" })
```

**Error: "Either projectPath or workspacePath is required"**
```bash
# Set session default:
session-set-defaults({ "projectPath": "/path/to/MyApp.xcodeproj" })

# Or provide explicitly:
test_sim({ "projectPath": "/path/to/MyApp.xcodeproj", "scheme": "MyScheme" })
```

**Error: "projectPath and workspacePath are mutually exclusive"**
```bash
# Clear conflicting defaults:
session-clear-defaults({ "keys": ["projectPath", "workspacePath"] })

# Then set only one:
session-set-defaults({ "workspacePath": "/path/to/MyApp.xcworkspace" })
```
```

## Task Breakdown

### Task 1: Core Implementation (3-4 hours)
- [ ] **1.1**: Add `createSessionAwareTool` import to test_sim.ts
- [ ] **1.2**: Create publicSchemaObject with omitted fields
- [ ] **1.3**: Update tool description with session workflow examples
- [ ] **1.4**: Replace handler with createSessionAwareTool
- [ ] **1.5**: Define requirements array with helpful error messages
- [ ] **1.6**: Define exclusivePairs array
- [ ] **1.7**: Run typecheck and fix any type errors
- [ ] **1.8**: Run lint and fix any linting errors

### Task 2: Testing (2-3 hours)
- [ ] **2.1**: Add session integration test suite to test_sim.test.ts
- [ ] **2.2**: Test: Session defaults for all parameters
- [ ] **2.3**: Test: Explicit parameters override session
- [ ] **2.4**: Test: Merge session + explicit parameters
- [ ] **2.5**: Test: Validate requirements after merge
- [ ] **2.6**: Test: Reject conflicting session defaults
- [ ] **2.7**: Test: Explicit param conflicts with session
- [ ] **2.8**: Test: Override replaces (doesn't conflict)
- [ ] **2.9**: Test: Error messages include recovery paths
- [ ] **2.10**: Test: Preserve existing XOR validation
- [ ] **2.11**: Run full test suite and ensure all pass
- [ ] **2.12**: Verify test coverage ≥90% for new code

### Task 3: Documentation (1-2 hours)
- [ ] **3.1**: Add Session Management Workflow section to AGENT_QUICK_START.md
- [ ] **3.2**: Document step-by-step session workflow
- [ ] **3.3**: Add session parameters reference table
- [ ] **3.4**: Add best practices section
- [ ] **3.5**: Add troubleshooting section with common errors
- [ ] **3.6**: Update test_sim examples to show session workflow
- [ ] **3.7**: Review and polish documentation

### Task 4: Quality Validation (1 hour)
- [ ] **4.1**: Run `npm run build` and verify success
- [ ] **4.2**: Run `npm run typecheck` and verify zero errors
- [ ] **4.3**: Run `npm run lint` and verify zero errors
- [ ] **4.4**: Run `npm run test` and verify all 1151+ tests pass
- [ ] **4.5**: Manual test: Set session defaults and call test_sim
- [ ] **4.6**: Manual test: Override session defaults
- [ ] **4.7**: Manual test: Verify error messages with no session
- [ ] **4.8**: Test with real AI agent and verify <2 attempts

## Acceptance Criteria

### Functional ✅
- [ ] test_sim uses createSessionAwareTool pattern
- [ ] Session defaults properly merged with explicit parameters
- [ ] Explicit parameters override session defaults
- [ ] XOR constraints validated after merge (projectPath/workspacePath)
- [ ] XOR constraints validated after merge (simulatorId/simulatorName)
- [ ] Clear error messages include session-set-defaults recovery examples

### Testing ✅
- [ ] All existing test_sim logic tests pass unchanged
- [ ] 10+ new session integration test scenarios added
- [ ] Tests verify explicit overrides session
- [ ] Tests verify XOR errors after merge
- [ ] Test coverage ≥90% for new session code

### Documentation ✅
- [ ] AGENT_QUICK_START.md has Session Management Workflow section
- [ ] Tool description shows session workflow clearly
- [ ] Error messages are actionable with examples
- [ ] Troubleshooting guide for common errors

### Quality ✅
- [ ] npm run typecheck passes (zero TypeScript errors)
- [ ] npm run lint passes (zero linting errors)
- [ ] npm run test passes (all tests pass)
- [ ] npm run build succeeds
- [ ] Manual agent test shows ≤2 attempts to success

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Agent Success Rate | ~20% | TBD | ≥80% |
| Attempts to Success | 3-4 | TBD | ≤2 |
| Error Message Quality | Generic | TBD | Actionable |
| Session Workflow Adoption | 0% | TBD | ≥50% |

## Dependencies

✅ All dependencies already exist in codebase:
- `createSessionAwareTool` (`src/utils/typed-tool-factory.ts:63-174`)
- `sessionStore` (`src/utils/session-store.ts:1-48`)
- Working examples: `build_sim`, `build_run_sim`

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| Breaking existing tests | Low | High | Keep logic function unchanged, only modify handler |
| XOR validation fails | Low | High | Comprehensive test coverage for XOR scenarios |
| Session merge conflicts | Medium | Medium | exclusivePairs automatically prunes conflicts |
| Agent confusion | Low | Low | Clear error messages with examples |

## References

### Internal Code
- Session-aware factory: `src/utils/typed-tool-factory.ts:63-174`
- Working example: `src/mcp/tools/simulator/build_run_sim.ts:512-540`
- Session store: `src/utils/session-store.ts:1-48`
- Test pattern: `src/mcp/tools/simulator/__tests__/build_sim.test.ts`

### Research Documents
- Architecture analysis: `RESEARCH_SESSION_MANAGEMENT.md`
- Design patterns: `docs/research/MCP_TOOL_DESIGN_BEST_PRACTICES.md`
- Schema research: `docs/research/SCHEMA_DESIGN_RESEARCH.md`
- Problem analysis: `FIX_PROPOSAL_test_sim.md`

### External Resources
- MCP Specification: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- Zod Documentation: https://zod.dev/api#refine
- CLI Best Practices: https://clig.dev

### Related Issues
- GitHub Issue: [#2](https://github.com/carmandale/XcodeBuildMCP/issues/2)

---

**Spec Version**: 1.0
**Last Updated**: 2025-10-13
**Status**: Ready for implementation
