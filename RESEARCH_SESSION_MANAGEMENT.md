# XcodeBuildMCP Repository Research: Session Management Integration

**Research Date**: 2025-10-13
**Purpose**: Understand session management architecture and patterns to inform test_sim tool integration

---

## 1. Session Management Architecture

### Core Components

#### SessionStore (`src/utils/session-store.ts`)
**Lines 1-48**: Singleton in-memory store for session defaults

**Key Features**:
- **Type Definition** (lines 3-13): `SessionDefaults` includes:
  - `projectPath`, `workspacePath` (mutually exclusive project identifiers)
  - `scheme`, `configuration` (build settings)
  - `simulatorName`, `simulatorId` (mutually exclusive simulator identifiers)
  - `deviceId` (device identifier)
  - `useLatestOS` (simulator OS selection)
  - `arch` (architecture: 'arm64' | 'x86_64')

- **Storage Pattern** (lines 15-45):
  - `setDefaults(partial)`: Merges new defaults into existing ones (line 18-21)
  - `clear(keys?)`: Clears all or specific keys (lines 23-36)
  - `get<K>(key)`: Retrieves single default value (lines 38-40)
  - `getAll()`: Returns copy of all defaults (lines 42-44)

**Critical Detail**: Line 47 exports singleton instance `sessionStore`

#### Session-Aware Tool Factory (`src/utils/typed-tool-factory.ts`)

**Lines 63-174**: `createSessionAwareTool<TParams>` function

**Key Features**:

1. **Requirement Types** (lines 63-65):
   - `allOf`: All specified keys must be present
   - `oneOf`: At least one specified key must be present
   - Optional custom error messages

2. **Argument Sanitization** (lines 92-96):
   - Treats `null` and `undefined` as "not provided"
   - Only includes explicitly provided values in sanitizedArgs
   - **Critical**: Empty object `{}` from client means "use all session defaults"

3. **Factory-Level Mutual Exclusivity Check** (lines 98-110):
   - Checks `exclusivePairs` BEFORE merging session defaults
   - Rejects if user provides multiple values from an exclusive pair
   - Example: `{ projectPath: '/a', workspacePath: '/b' }` → error

4. **Session Defaults Merge** (line 113):
   - `merged = { ...sessionStore.getAll(), ...sanitizedArgs }`
   - **Explicit args override session defaults**

5. **Exclusive Pair Pruning** (lines 115-128):
   - **Only when user provides a concrete value**
   - Drops conflicting session defaults from the pair
   - Example: If session has `simulatorName` but user provides `simulatorId`, drop `simulatorName` from merged

6. **Requirements Validation** (lines 130-155):
   - `allOf`: All keys must be in merged (line 132-141)
   - `oneOf`: At least one key must be in merged (line 142-154)
   - Returns friendly error messages with session-set-defaults hints

7. **Schema Validation** (line 157):
   - Validates merged result against internal schema
   - All XOR constraints enforced by schema's `.refine()` calls

8. **Error Handling** (lines 159-173):
   - Zod errors formatted with helpful tips
   - Suggests using session-set-defaults tool

---

## 2. Test Tool Patterns

### test_sim Tool (`src/mcp/tools/simulator/test_sim.ts`)

**Current State**: Does NOT use session-aware factory

**Schema Structure**:
- **Base Schema** (lines 19-68): All fields including session-manageable ones
- **With XOR Validation** (lines 74-84):
  - Line 75-76: Requires at least one of projectPath/workspacePath
  - Line 78-80: Rejects both projectPath AND workspacePath
  - Line 81-84: Platform validation (rejects macOS)

**Handler Pattern** (lines 135-162):
- Uses manual try-catch with inline validation
- Validates with `testSimulatorSchema.parse(args)`
- Formats Zod errors manually
- Calls `test_simLogic(validatedParams, executor)`

**Key Observations**:
1. No session defaults integration
2. Manual error formatting duplicates factory logic
3. XOR constraints in schema but not in factory-level checks
4. **Schema expects both XOR sides to be optional but requires one**

### test_macos Tool (`src/mcp/tools/macos/test_macos.ts`)

**Pattern**: Uses `createTypedTool` (NOT session-aware)

**Handler** (lines 324-330):
```typescript
handler: createTypedTool<TestMacosParams>(
  testMacosSchema as z.ZodType<TestMacosParams>,
  (params: TestMacosParams) => {
    return testMacosLogic(params, getDefaultCommandExecutor(), getDefaultFileSystemExecutor());
  },
  getDefaultCommandExecutor,
)
```

**Key Observations**:
1. Uses standard typed tool factory
2. No session defaults support
3. XOR validation only in schema (lines 52-58)

### test_device Tool (`src/mcp/tools/device/test_device.ts`)

**Pattern**: Uses `createTypedTool` (NOT session-aware)

**Handler** (lines 281-294):
- Similar to test_macos
- No session defaults integration
- XOR validation in schema only (lines 51-57)

---

## 3. Session-Aware Tool Integration Patterns

### build_sim Tool (`src/mcp/tools/simulator/build_sim.ts`)

**Lines 168-186**: Complete session-aware implementation

**Key Pattern Elements**:

1. **Dual Schema Structure**:
   - **Internal Schema** (lines 56-82): Full validation with XOR constraints
   - **Public Schema** (lines 157-166): Omits session-managed fields

2. **Public Schema Creation** (lines 157-166):
```typescript
const publicSchemaObject = baseSchemaObject.omit({
  projectPath: true,
  workspacePath: true,
  scheme: true,
  configuration: true,
  simulatorId: true,
  simulatorName: true,
  useLatestOS: true,
  // platform is NOT omitted - it's available for clients to specify
} as const);
```

3. **Handler Configuration** (lines 172-185):
```typescript
handler: createSessionAwareTool<BuildSimulatorParams>({
  internalSchema: buildSimulatorSchema as unknown as z.ZodType<BuildSimulatorParams>,
  logicFunction: build_simLogic,
  getExecutor: getDefaultCommandExecutor,
  requirements: [
    { allOf: ['scheme'], message: 'scheme is required' },
    { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
    { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
  ],
  exclusivePairs: [
    ['projectPath', 'workspacePath'],
    ['simulatorId', 'simulatorName'],
  ],
})
```

**Key Observations**:
1. Internal schema has XOR constraints via `.refine()`
2. Factory requirements declare what's needed (allOf/oneOf)
3. Factory exclusivePairs enable session pruning
4. Public schema exposes only non-session fields
5. Logic function unchanged - receives fully validated params

### build_run_sim Tool (`src/mcp/tools/simulator/build_run_sim.ts`)

**Lines 522-540**: Identical pattern to build_sim

**Observations**:
- Same dual schema approach
- Same requirements and exclusivePairs
- Demonstrates consistent pattern across tools

---

## 4. Schema Patterns with XOR Constraints

### Standard Pattern (All Session-Aware Tools)

**Step 1**: Base Schema Object
```typescript
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('...'),
  workspacePath: z.string().optional().describe('...'),
  // ... other fields
});
```

**Step 2**: Preprocessor Application
```typescript
const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);
```
**Purpose**: Converts empty strings to `undefined` for cleaner optional field handling

**Step 3**: XOR Constraint Addition
```typescript
const toolSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });
```

**Step 4**: Type Inference
```typescript
export type ToolParams = z.infer<typeof toolSchema>;
```

**Step 5**: Public Schema (Session-Aware Only)
```typescript
const publicSchemaObject = baseSchemaObject.omit({
  projectPath: true,
  workspacePath: true,
  // ... session-managed fields
} as const);
```

### XOR Constraint Pattern Details

**Two-Step Validation**:
1. **At least one required**: `val.projectPath !== undefined || val.workspacePath !== undefined`
2. **Not both**: `!(val.projectPath !== undefined && val.workspacePath !== undefined)`

**Why Two Refines?**:
- First ensures at least one is provided
- Second ensures they're mutually exclusive
- Together create true XOR behavior

---

## 5. Relationship Between Schema and Factory

### Critical Understanding: Two Layers of Validation

#### Layer 1: Factory-Level (Pre-Validation)

**Purpose**: Enable session defaults and provide friendly errors

**Factory Checks** (`createSessionAwareTool`):
1. **Sanitization**: Null/undefined treated as "not provided"
2. **Factory-Level XOR Check**: Rejects multiple explicit values from exclusivePairs
3. **Session Merge**: Combines session + explicit args (explicit wins)
4. **Session Pruning**: Removes conflicting session defaults per exclusivePairs
5. **Requirements Check**: Validates allOf/oneOf on merged data
6. **Then passes to schema validation**

#### Layer 2: Schema-Level (Final Validation)

**Purpose**: Enforce type safety and business rules

**Schema Validation**:
1. Validates merged data against internal schema
2. Enforces XOR via `.refine()` calls
3. Ensures all type constraints
4. Final safety net

### Why Both Layers?

**Factory Level**:
- **User-Friendly**: "Missing required session defaults" vs raw Zod error
- **Session Logic**: Handles merge, pruning, precedence
- **XOR Enforcement**: Prevents explicit conflicts BEFORE merge

**Schema Level**:
- **Type Safety**: Ensures final data structure correctness
- **Business Rules**: All domain constraints enforced
- **Safety Net**: Catches any factory logic bugs

### Example Flow

**Input**: `{ simulatorId: 'ABC' }`
**Session Defaults**: `{ scheme: 'App', projectPath: '/x', simulatorName: 'iPhone 16' }`

**Factory Processing**:
1. Sanitize: `simulatorId` is concrete
2. Factory XOR: Only one value from `[simulatorId, simulatorName]` → OK
3. Merge: `{ scheme: 'App', projectPath: '/x', simulatorId: 'ABC', simulatorName: 'iPhone 16' }`
4. Prune: User provided `simulatorId`, so drop `simulatorName` → `{ scheme: 'App', projectPath: '/x', simulatorId: 'ABC' }`
5. Requirements: Check allOf/oneOf → OK
6. Pass to schema

**Schema Validation**:
1. XOR refinement: Only one of `simulatorId`/`simulatorName` → OK
2. Type checks: All fields valid → OK
3. Return validated params to logic

**Result**: Logic receives `{ scheme: 'App', projectPath: '/x', simulatorId: 'ABC' }`

---

## 6. Integration Tests (`src/utils/__tests__/session-aware-tool-factory.test.ts`)

### Test Coverage

**Lines 46-56**: Basic merge behavior
- Sets session defaults
- Calls handler with empty object
- Verifies logic receives merged params

**Lines 58-85**: Explicit args override session
- Session has one value
- Args provide different value
- Verifies arg wins

**Lines 87-92**: allOf requirement validation
- Missing required field
- Returns friendly error message

**Lines 94-99**: oneOf requirement validation
- None of the options provided
- Returns friendly error with session-set-defaults hint

**Lines 101-111**: Zod error formatting
- Invalid type provided
- Formats error with "Tip: set session defaults"

**Lines 113-134**: Session pruning with null
- User provides `null` for conflicting field
- Session default NOT pruned (null = not provided)

**Lines 136-157**: Session pruning with undefined
- User provides `undefined` for conflicting field
- Session default NOT pruned (undefined = not provided)

**Lines 159-189**: Factory-level XOR check
- User provides both sides of exclusive pair
- Factory rejects BEFORE schema validation
- Error: "Mutually exclusive parameters provided"

### Key Test Insights

1. **Sanitization Works**: `null` and `undefined` don't trigger pruning
2. **Factory XOR Enforced**: Multiple explicit values rejected early
3. **Session Pruning Logic**: Only concrete user values trigger pruning
4. **Friendly Errors**: All error paths provide helpful messages
5. **Schema Still Validates**: Factory doesn't bypass schema checks

---

## 7. Current test_sim Problem Analysis

### The Mismatch

**Current test_sim** (`src/mcp/tools/simulator/test_sim.ts`):
- **Schema** (lines 74-84): XOR constraints via `.refine()`
- **Handler** (lines 135-162): Manual validation, no session support
- **Public Schema** (line 134): `baseSchemaObject.shape` - exposes ALL fields

### What Needs to Change

**To match build_sim pattern**:

1. **Keep Internal Schema** (lines 74-84):
   - XOR constraints stay
   - Used for final validation
   - No changes needed

2. **Add Public Schema**:
   - Omit session-managed fields
   - Expose only per-call configuration

3. **Replace Handler** (lines 135-162):
   - Use `createSessionAwareTool`
   - Define requirements (allOf/oneOf)
   - Define exclusivePairs

4. **Result**:
   - Factory handles session merge + pruning + requirements
   - Schema validates final merged data
   - Logic function unchanged

### Why XOR Constraints Stay in Schema

**Factory exclusivePairs**:
- Prevent user from providing both explicit values
- Enable session default pruning

**Schema refines**:
- Validate final merged data structure
- Ensure business rules after merge
- Safety net for factory bugs

**Both Are Needed**:
- Factory: User-facing validation + session logic
- Schema: Type safety + final correctness

---

## 8. Other Tools Using Session Defaults

### Complete List of Session-Aware Tools

**From Grep Results** (`src/mcp/tools/`):

#### Simulator Tools
- `simulator/build_sim.ts` (lines 168-186)
- `simulator/build_run_sim.ts` (lines 522-540)

#### Build Tools (Likely Patterns)
Based on schema-helpers usage, these tools likely follow similar patterns:
- `simulator/stop_app_sim.ts`
- `simulator/launch_app_sim.ts`
- `simulator/get_sim_app_path.ts`
- `macos/build_macos.ts`
- `macos/build_run_macos.ts`
- `macos/get_mac_app_path.ts`
- `device/build_device.ts`
- `device/get_device_app_path.ts`

#### Project Discovery
- `project-discovery/show_build_settings.ts`
- `project-discovery/list_schemes.ts`

#### Utilities
- `utilities/clean.ts`

### Pattern Consistency

All session-aware tools follow the same pattern:
1. Internal schema with XOR constraints
2. Public schema omitting session fields
3. Handler using `createSessionAwareTool`
4. Requirements and exclusivePairs defined
5. Logic function unchanged

---

## 9. Testing Requirements for test_sim Migration

### Test Files That Need Updates

1. **Tool Test** (`src/mcp/tools/simulator/__tests__/test_sim.test.ts`):
   - Add session defaults test cases
   - Test requirement validation errors
   - Test exclusivePairs behavior
   - Ensure logic tests unchanged (using direct logic function calls)

2. **Integration Pattern**:
   - Follow test patterns from `build_sim.__tests__/build_sim.test.ts`
   - Test session merge behavior
   - Test public schema (omitted fields not visible)

### DI Testing Pattern (From TESTING.md)

**Critical**: NO Vitest mocking allowed

**Pattern**:
```typescript
import { test_simLogic } from '../test_sim.ts';
import { createMockExecutor } from '../../../test-utils/mock-executors.ts';

it('should use session defaults', async () => {
  sessionStore.setDefaults({
    scheme: 'Test',
    projectPath: '/path/proj.xcodeproj',
    simulatorId: 'SIM-123'
  });

  const mockExecutor = createMockExecutor({
    success: true,
    output: 'TEST SUCCEEDED'
  });

  // Test handler (includes session merge)
  const result = await toolHandler({});

  // Or test logic directly (bypass session, test pure logic)
  const params = { scheme: 'Test', projectPath: '/x', simulatorId: 'S' };
  const logicResult = await test_simLogic(params, mockExecutor);
});
```

---

## 10. Recommended Implementation Approach for test_sim

### Phase 1: Add Public Schema & Update Handler

**File**: `src/mcp/tools/simulator/test_sim.ts`

**Changes**:

1. **After line 87** (type definition), add public schema:
```typescript
// Public schema = internal minus session-managed fields
const publicSchemaObject = baseSchemaObject.omit({
  projectPath: true,
  workspacePath: true,
  scheme: true,
  configuration: true,
  simulatorId: true,
  simulatorName: true,
  useLatestOS: true,
  // platform is NOT omitted - it's available for clients to specify
  // testRunnerEnv is NOT omitted - per-test configuration
} as const);
```

2. **Replace handler** (lines 135-162) with:
```typescript
export default {
  name: 'test_sim',
  description: 'Runs tests on a simulator.',
  schema: publicSchemaObject.shape, // Public schema for MCP clients
  handler: createSessionAwareTool<TestSimulatorParams>({
    internalSchema: testSimulatorSchema as unknown as z.ZodType<TestSimulatorParams>,
    logicFunction: test_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [
      { allOf: ['scheme'], message: 'scheme is required' },
      { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
      { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
    ],
    exclusivePairs: [
      ['projectPath', 'workspacePath'],
      ['simulatorId', 'simulatorName'],
    ],
  }),
};
```

3. **Add import**:
```typescript
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';
```

### Phase 2: Update Tests

**File**: `src/mcp/tools/simulator/__tests__/test_sim.test.ts`

**Add Test Cases**:

1. Session defaults merge test
2. Explicit args override session test
3. Requirements validation tests
4. ExclusivePairs behavior tests
5. Public schema validation (omitted fields)

**Pattern**: Follow `build_sim.__tests__/build_sim.test.ts` structure

### Phase 3: Validation

**Checklist**:
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Manual test with mcpli/reloaderoo
- [ ] Description follows Tool Description Policy (concise)

---

## 11. Key Architectural Insights

### Design Philosophy

1. **Separation of Concerns**:
   - Factory: Session management, user-friendly errors
   - Schema: Type safety, business rules
   - Logic: Pure business logic, unchanged

2. **Progressive Enhancement**:
   - Tools work without session defaults (explicit args)
   - Session defaults reduce repetition
   - Both modes supported seamlessly

3. **Type Safety Maintained**:
   - Factory validates requirements before schema
   - Schema validates final merged data
   - Logic receives guaranteed-valid params

4. **Testing Strategy**:
   - Test logic functions directly with mock executors
   - Test factory behavior with integration tests
   - No Vitest mocking - dependency injection only

### Common Pitfalls to Avoid

1. **Don't Remove Schema XOR Constraints**:
   - Factory exclusivePairs ≠ schema refinements
   - Both serve different purposes
   - Both are required

2. **Don't Change Logic Signatures**:
   - Logic functions stay unchanged
   - Only handlers change to session-aware
   - Tests of logic remain valid

3. **Don't Omit All Optional Fields from Public Schema**:
   - Only session-managed fields omitted
   - Per-call configuration (like `platform`) stays public
   - Test-specific fields (like `testRunnerEnv`) stay public

4. **Don't Forget Preprocessing**:
   - `z.preprocess(nullifyEmptyStrings, ...)` stays
   - Handles empty string → undefined conversion
   - Critical for optional field behavior

---

## 12. File Locations Reference

### Core Session Management
- **SessionStore**: `/src/utils/session-store.ts` (lines 1-48)
- **Factory**: `/src/utils/typed-tool-factory.ts` (lines 63-174)
- **Schema Helpers**: `/src/utils/schema-helpers.ts` (lines 1-25)

### Session Management Tools
- **Set Defaults**: `/src/mcp/tools/session-management/session_set_defaults.ts`
- **Clear Defaults**: `/src/mcp/tools/session-management/session_clear_defaults.ts`
- **Show Defaults**: `/src/mcp/tools/session-management/session_show_defaults.ts`

### Example Session-Aware Tools
- **build_sim**: `/src/mcp/tools/simulator/build_sim.ts` (lines 168-186)
- **build_run_sim**: `/src/mcp/tools/simulator/build_run_sim.ts` (lines 522-540)

### Test Tools (Current State)
- **test_sim**: `/src/mcp/tools/simulator/test_sim.ts` (lines 1-164) - **Not session-aware**
- **test_macos**: `/src/mcp/tools/macos/test_macos.ts` (lines 1-332) - Not session-aware
- **test_device**: `/src/mcp/tools/device/test_device.ts` (lines 1-296) - Not session-aware

### Test Files
- **Factory Tests**: `/src/utils/__tests__/session-aware-tool-factory.test.ts` (lines 1-191)
- **SessionStore Tests**: `/src/utils/__tests__/session-store.test.ts`
- **build_sim Tests**: `/src/mcp/tools/simulator/__tests__/build_sim.test.ts`

### Documentation
- **Session Plan**: `/docs/session_management_plan.md` (lines 1-485)
- **Testing Guide**: `/docs/TESTING.md`
- **Architecture**: `/docs/ARCHITECTURE.md`

---

## Summary

The session management system is a well-designed middleware layer that:
1. **Preserves existing logic** - no changes to business logic functions
2. **Provides friendly UX** - clear error messages with actionable hints
3. **Maintains type safety** - factory AND schema validation
4. **Enables progressive enhancement** - works with or without session defaults

The test_sim tool can be migrated by:
1. Adding a public schema that omits session fields
2. Replacing the handler with createSessionAwareTool
3. Defining requirements and exclusivePairs
4. Keeping the internal schema and logic unchanged

This pattern is proven by build_sim and build_run_sim implementations, and follows the architectural principles documented in the session management plan.
