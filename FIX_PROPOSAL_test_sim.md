# Fix Proposal: test_sim Tool Reliability Issues

## Executive Summary

Agents are consistently failing to use `test_sim` due to **three fundamental architectural problems**:

1. **Schema Mismatch**: MCP schema shows all parameters as optional, but validation requires XOR constraints that are invisible to agents
2. **Session Defaults Not Integrated**: Session management tools exist but are completely ignored by test/build tools
3. **Misleading Documentation**: Tool descriptions don't clearly communicate the session workflow pattern

## Root Cause Analysis

### Problem 1: Schema Design Flaw

**Current Implementation** (`test_sim.ts:134`):
```typescript
schema: baseSchemaObject.shape, // MCP SDK compatibility
```

This exposes:
```typescript
{
  projectPath: optional,
  workspacePath: optional,
  scheme: required,
  simulatorId: optional,
  simulatorName: optional,
  // ... other optional fields
}
```

**Actual Validation** (`test_sim.ts:138`):
```typescript
const validatedParams = testSimulatorSchema.parse(args);
```

Where `testSimulatorSchema` includes:
```typescript
.refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
  message: 'Either projectPath or workspacePath is required.',
})
```

**Why This Fails:**
- MCP protocol cannot serialize `.refine()` constraints
- Agents see "optional" but tool enforces "required (XOR)"
- Result: Agents make 2-3 failed attempts before getting parameters right

### Problem 2: Session Defaults Completely Unused

**Current Session Management:**
```bash
$ tree src/mcp/tools/session-management/
├── session_clear_defaults.ts
├── session_set_defaults.ts
└── session_show_defaults.ts
```

**Session Store Implementation:**
```typescript
// src/utils/session-store.ts
export type SessionDefaults = {
  projectPath?: string;
  workspacePath?: string;
  scheme?: string;
  configuration?: string;
  simulatorName?: string;
  simulatorId?: string;
  deviceId?: string;
  useLatestOS?: boolean;
  arch?: 'arm64' | 'x86_64';
};
```

**Reality Check:**
```bash
$ grep -r "sessionStore.get" src/mcp/tools/
# Results: ONLY in session-management tools!
# NO test tools, NO build tools use session defaults
```

**Why This Fails:**
- Agents call `session-set-defaults` believing it will help
- Then call `test_sim` which completely ignores those defaults
- Result: Same validation errors as if session-set-defaults was never called

### Problem 3: Chat Log Evidence

From your agent chat log:
```
1. MCP error -32602: Invalid arguments for tool test_sim:
   { "path": ["scheme"], "message": "Required" }
   → Agent forgot scheme, but remembered platform

2. Parameter validation failed:
   "Either projectPath or workspacePath is required."
   → Agent provided scheme but no path (thought session defaults would work)
```

## Proposed Fixes

### Fix 1: Make Schema Match Validation (High Priority)

**Option A: Make Everything Optional + Session Defaults**
```typescript
// test_sim.ts
import { sessionStore } from '../../../utils/session-store.ts';

export async function test_simLogic(
  params: TestSimulatorParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Merge session defaults with provided parameters
  const effectiveParams = {
    projectPath: params.projectPath ?? sessionStore.get('projectPath'),
    workspacePath: params.workspacePath ?? sessionStore.get('workspacePath'),
    scheme: params.scheme ?? sessionStore.get('scheme'),
    configuration: params.configuration ?? sessionStore.get('configuration'),
    simulatorId: params.simulatorId ?? sessionStore.get('simulatorId'),
    simulatorName: params.simulatorName ?? sessionStore.get('simulatorName'),
    platform: params.platform ?? 'iOS Simulator',
    useLatestOS: params.useLatestOS ?? sessionStore.get('useLatestOS'),
    // ... other fields
  };

  // Validate after merging
  if (!effectiveParams.projectPath && !effectiveParams.workspacePath) {
    return createErrorResponse(
      'Missing required parameter',
      'Either projectPath or workspacePath is required. Set via session-set-defaults or provide directly.'
    );
  }

  if (!effectiveParams.scheme) {
    return createErrorResponse(
      'Missing required parameter',
      'scheme is required. Set via session-set-defaults or provide directly.'
    );
  }

  // Continue with merged parameters...
}
```

**Benefits:**
- ✅ Schema accurately shows "all optional" (matches agent expectations)
- ✅ Session defaults actually work as intended
- ✅ Clear error messages guide agents to use session-set-defaults
- ✅ Backward compatible with existing usage

**Option B: Make Schema Show Requirements (Breaking Change)**
```typescript
// Create separate schema for MCP that shows actual requirements
const mcpSchema = z.object({
  projectPath: z.string().describe('Path to .xcodeproj file. Required unless workspacePath provided.'),
  workspacePath: z.string().describe('Path to .xcworkspace file. Required unless projectPath provided.'),
  scheme: z.string().describe('The scheme to use (Required)'),
  platform: z.enum(['iOS Simulator', 'watchOS Simulator', 'tvOS Simulator', 'visionOS Simulator'])
    .default('iOS Simulator')
    .describe('Target simulator platform'),
  // ... rest of schema with no optionals for required fields
}).partial(); // Make everything optional at runtime for session defaults

export default {
  name: 'test_sim',
  schema: mcpSchema.shape,
  // ... handler
};
```

**Benefits:**
- ✅ Schema clearly communicates requirements
- ❌ Still doesn't solve session defaults integration
- ❌ Breaking change for existing code

### Fix 2: Update Tool Description (Quick Win)

**Current:**
```typescript
description: 'Runs tests on a simulator by UUID or name using xcodebuild test and parses xcresult output. Works with both Xcode projects (.xcodeproj) and workspaces (.xcworkspace). IMPORTANT: Requires either projectPath or workspacePath, plus scheme and either simulatorId or simulatorName. Example: test_sim({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme", simulatorName: "iPhone 16", platform: "iOS Simulator" })',
```

**Proposed:**
```typescript
description: `Runs tests on a simulator by UUID or name.

WORKFLOW:
1. Set defaults once: session-set-defaults({ projectPath: "/path/to/Project.xcodeproj", scheme: "MyScheme" })
2. Then call: test_sim({ simulatorName: "iPhone 16" })

REQUIRED PARAMETERS (or session defaults):
- scheme: The scheme to test
- projectPath OR workspacePath: Path to .xcodeproj or .xcworkspace

OPTIONAL:
- simulatorId OR simulatorName: Which simulator (defaults to first available)
- platform: "iOS Simulator" (default), "watchOS Simulator", etc.
- configuration: "Debug" (default) or "Release"

Example (with session defaults):
  session-set-defaults({ projectPath: "/path/to/App.xcodeproj", scheme: "MyScheme" })
  test_sim({ simulatorName: "iPhone 16" })

Example (without session defaults):
  test_sim({
    projectPath: "/path/to/App.xcodeproj",
    scheme: "MyScheme",
    simulatorName: "iPhone 16"
  })`,
```

**Benefits:**
- ✅ Clear workflow guidance
- ✅ Emphasizes session defaults pattern
- ✅ Shows both usage patterns
- ✅ No code changes required

### Fix 3: Create Utility for Session Merging (Best Practice)

```typescript
// src/utils/session-merge.ts
import { sessionStore, SessionDefaults } from './session-store.ts';

export function mergeWithSessionDefaults<T extends Partial<SessionDefaults>>(
  params: T
): Required<Pick<SessionDefaults, keyof T>> {
  const merged: any = {};

  for (const key in params) {
    merged[key] = params[key] ?? sessionStore.get(key);
  }

  return merged;
}

// Usage in test_sim.ts:
const effectiveParams = mergeWithSessionDefaults({
  projectPath: params.projectPath,
  workspacePath: params.workspacePath,
  scheme: params.scheme,
  configuration: params.configuration,
  simulatorId: params.simulatorId,
  simulatorName: params.simulatorName,
  useLatestOS: params.useLatestOS,
});
```

## Recommended Implementation Plan

### Phase 1: Immediate (Quick Wins)
1. ✅ **Update tool description** with clear workflow guidance (Fix 2)
2. ✅ **Add session defaults integration** to test_sim (Fix 1 Option A)
3. ✅ **Improve error messages** to mention session-set-defaults

### Phase 2: Architecture Improvement (Next Sprint)
1. Create `mergeWithSessionDefaults` utility (Fix 3)
2. Apply session defaults integration to ALL build/test tools
3. Add integration tests for session workflow

### Phase 3: Documentation (Ongoing)
1. Update AGENT_QUICK_START.md with session workflow examples
2. Add troubleshooting guide for common parameter validation errors
3. Create session management guide

## Testing Plan

### Unit Tests
```typescript
describe('test_sim with session defaults', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  it('should use session defaults for missing parameters', async () => {
    sessionStore.setDefaults({
      projectPath: '/path/to/Project.xcodeproj',
      scheme: 'TestScheme'
    });

    const result = await test_simLogic(
      { simulatorName: 'iPhone 16' },
      mockExecutor
    );

    expect(result.isError).toBe(false);
  });

  it('should prioritize explicit parameters over session defaults', async () => {
    sessionStore.setDefaults({
      scheme: 'DefaultScheme'
    });

    const result = await test_simLogic(
      {
        projectPath: '/path/to/Project.xcodeproj',
        scheme: 'OverrideScheme',
        simulatorName: 'iPhone 16'
      },
      mockExecutor
    );

    // Verify OverrideScheme was used, not DefaultScheme
  });
});
```

### Integration Tests
```typescript
describe('session workflow integration', () => {
  it('should support full session workflow', async () => {
    // 1. Set defaults
    await session_set_defaultsLogic({
      projectPath: '/path/to/Project.xcodeproj',
      scheme: 'MyScheme'
    });

    // 2. Run test with minimal parameters
    const result = await test_simLogic(
      { simulatorName: 'iPhone 16' },
      mockExecutor
    );

    expect(result.isError).toBe(false);
  });
});
```

## Success Metrics

After implementing these fixes, we should see:

1. **Reduced Failed Attempts**: Agents should succeed on first or second try (not 3-4 tries)
2. **Better Error Messages**: When validation fails, agents understand how to fix it
3. **Session Adoption**: Agents naturally use session-set-defaults for repetitive tasks
4. **Code Coverage**: Session defaults integration covered by tests

## Risk Assessment

**Low Risk:**
- Fix 2 (description update): Documentation only
- Fix 3 (utility function): New code, no breaking changes

**Medium Risk:**
- Fix 1 Option A (session integration): Changes existing tool behavior
  - Mitigation: Extensive testing, backward compatibility preserved

**High Risk:**
- Fix 1 Option B (schema changes): Breaking change
  - Mitigation: Don't implement until Phase 2, after session integration proven

## Conclusion

The current architecture has a **fundamental disconnect** between:
1. What agents see (optional parameters)
2. What tools validate (required with XOR constraints)
3. What session management provides (defaults that tools ignore)

**Recommendation**: Implement Phase 1 immediately to restore agent reliability. The combination of clear documentation (Fix 2) and session integration (Fix 1 Option A) will resolve 90% of agent failures.
