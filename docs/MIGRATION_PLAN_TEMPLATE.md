# Migration Plan: <tool_name>

## Tool Information
- **Tool Name**: <tool_name>
- **Current Location**: src/tools/<tool-folder>/index.ts
- **Target Plugin**: plugins/<workflow-group>/<plugin_filename>.js
- **Workflow Group**: <workflow-group-name>

## Migration Process

### Step 1: Validate Existing Tool Works
```bash
npm test -- src/tools/<tool-folder>/index.test.ts
```
Expected: All existing tests pass

### Step 2: Surgical Edits to Tool File

Add 4 exports BEFORE the register function:

```typescript
// GENERIC PATTERN:
export const <toolName>ToolName = '<extract_from_registerTool_second_param>';
export const <toolName>ToolDescription = '<extract_from_registerTool_third_param>';
export const <toolName>ToolSchema = {
  // Extract the entire schema object from registerTool fourth param
};
export async function <toolName>ToolHandler(params: {
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
  <toolName>ToolName,         // was: 'literal_string'
  <toolName>ToolDescription,  // was: 'literal_string'
  <toolName>ToolSchema,       // was: { inline object }
  <toolName>ToolHandler,      // was: async function
);
```

### Step 3: Validate Refactored Tool
```bash
npm run build
npm test -- src/tools/<tool-folder>/index.test.ts
```
Expected: Same tests still pass

### Step 4: Create Plugin Wrapper

Create plugins/<workflow-group>/<plugin_filename>.js:

```javascript
// GENERIC PLUGIN PATTERN:
import {
  <toolName>ToolName,
  <toolName>ToolDescription,
  <toolName>ToolSchema,
  <toolName>ToolHandler,
} from '../../src/tools/<tool-folder>/index.js';

export default {
  name: <toolName>ToolName,
  description: <toolName>ToolDescription,
  schema: <toolName>ToolSchema,
  async handler(params) {
    return await <toolName>ToolHandler(params);
  },
};
```

### Step 5: Copy Test File
```bash
cp src/tools/<tool-folder>/index.test.ts \
   plugins/<workflow-group>/<plugin_filename>.test.ts
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
   - Find: '<tool_name> tool'
   - Replace: '<plugin_name> plugin'

5. **Replace registration tests with structure tests**:
   - Find: tests that verify tool registration
   - Replace with:
     - Test plugin.name equals expected
     - Test plugin.description equals expected
     - Test plugin.schema has expected properties
     - Test plugin.handler is a function

### Step 7: Run Plugin Tests
```bash
npm test -- plugins/<workflow-group>/<plugin_filename>.test.ts
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
git add plugins/<workflow-group>/<plugin_filename>.js \
        plugins/<workflow-group>/<plugin_filename>.test.ts \
        src/tools/<tool-folder>/index.ts \
        src/tools/<tool-folder>/MIGRATION_PLAN.md
git commit -m "Migrate <tool_name> tool to plugin architecture"
```

## Key Principles
- **Surgical edits only** - Find and replace specific patterns
- **No modifications to original tests** - They remain untouched
- **Use file system cp** - Not code copy-paste
- **Test continuously** - Validate after each step
- **Track test count** - Should increase by ~9 per tool