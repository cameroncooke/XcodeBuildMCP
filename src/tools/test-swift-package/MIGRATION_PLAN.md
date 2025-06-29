# Migration Plan: swift_package_test

## Status: ✅ COMPLETED

## Tool Information
- **Tool Name**: swift_package_test
- **Current Location**: src/tools/test-swift-package/index.ts
- **Target Plugin**: plugins/swift-package/swift_package_test.js
- **Workflow Group**: Swift Package Manager tools

## Migration Process

### Step 1: Validate Existing Tool Works
```bash
npm test -- src/tools/test-swift-package/index.test.ts
```
Expected: All existing tests pass

### Step 2: Surgical Edits to Tool File

Add 4 exports BEFORE the register function:

```typescript
// GENERIC PATTERN:
export const swiftPackageTestToolName = '<extract_from_registerTool_second_param>';
export const swiftPackageTestToolDescription = '<extract_from_registerTool_third_param>';
export const swiftPackageTestToolSchema = {
  // Extract the entire schema object from registerTool fourth param
};
export async function swiftPackageTestToolHandler(params: {
  // Extract parameter type from handler function
}): Promise<ToolResponse> {
  // CUT the handler function body from inside registerTool
  // PASTE it here
}
```

Update the register function to use exports:
```typescript
// PATTERN:
registerTool(
  server,
  swiftPackageTestToolName,         // was: 'literal_string'
  swiftPackageTestToolDescription,  // was: 'literal_string'
  swiftPackageTestToolSchema,       // was: { inline object }
  swiftPackageTestToolHandler,      // was: async function
);
```

### Step 3: Validate Refactored Tool
```bash
npm run build
npm test -- src/tools/test-swift-package/index.test.ts
```
Expected: Same tests still pass

### Step 4: Create Plugin Wrapper

Create plugins/swift-package/swift_package_test.js:

```javascript
// GENERIC PLUGIN PATTERN:
import {
  swiftPackageTestToolName,
  swiftPackageTestToolDescription,
  swiftPackageTestToolSchema,
  swiftPackageTestToolHandler,
} from '../../src/tools/test-swift-package/index.js';

export default {
  name: swiftPackageTestToolName,
  description: swiftPackageTestToolDescription,
  schema: swiftPackageTestToolSchema,
  async handler(params) {
    return await swiftPackageTestToolHandler(params);
  },
};
```

### Step 5: Copy Test File
```bash
cp src/tools/test-swift-package/index.test.ts \
   plugins/swift-package/swift_package_test.test.ts
```

### Step 6: Surgical Edits to Plugin Test

Required edits to the copied test file:

1. **Update imports**:
   - Find: import register function
   - Replace: import plugin default export

2. **Remove server mocking**:
   - Find: createMockServer function
   - Delete: entire function
   - Find: getRegisteredTool function
   - Delete: entire function

3. **Update test calls**:
   - Find: patterns that get tool from server then call handler
   - Replace: direct plugin.handler calls

4. **Update test descriptions**:
   - Find: 'swift_package_test tool'
   - Replace: 'swift_package_test plugin'

5. **Replace registration tests with structure tests**:
   - Find: tests that verify tool registration
   - Replace with:
     - Test plugin.name equals expected
     - Test plugin.description equals expected
     - Test plugin.schema has expected properties
     - Test plugin.handler is a function

### Step 7: Run Plugin Tests
```bash
npm test -- plugins/swift-package/swift_package_test.test.ts
```
Expected: New tests pass

### Step 8: Run All Tests
```bash
npm test
```
Expected: Original count + new plugin tests

### Step 9: Final Validation
```bash
npm run build
npm run lint
```

### Step 10: Live Testing
- Start MCP Inspector
- Test the tool functionality
- Verify identical behavior

### Step 11: Commit
```bash
git add plugins/swift-package/swift_package_test.js \
        plugins/swift-package/swift_package_test.test.ts \
        src/tools/test-swift-package/index.ts \
        src/tools/test-swift-package/MIGRATION_PLAN.md
git commit -m "Migrate swift_package_test tool to plugin architecture"
```

## Key Principles
- **Surgical edits only** - Find and replace specific patterns
- **No modifications to original tests** - They remain untouched
- **Use file system cp** - Not code copy-paste
- **Test continuously** - Validate after each step
- **Track test count** - Should increase by ~9 per tool

## Migration Completion Notes

### Completed: 2025-06-27

#### Results:
- ✅ All original tests pass (25 tests)
- ✅ All plugin tests pass (26 tests - 25 original + 1 plugin structure test)
- ✅ Build succeeds
- ✅ No regressions

#### Key Issue Resolved:
- Plugin test initially failed due to incorrect mock import paths
- Fixed by updating paths from `../../utils/` to `../../src/utils/`
- This is a common issue when copying test files to plugin directories

#### Files Created/Modified:
1. **Modified**: `src/tools/test-swift-package/index.ts` - Added 4 exports, updated registerTool
2. **Created**: `plugins/swift-package/swift_package_test.js` - Plugin wrapper
3. **Created**: `plugins/swift-package/swift_package_test.test.ts` - Plugin tests
4. **Updated**: `docs/MIGRATION_STATUS_V2.md` - Marked as completed