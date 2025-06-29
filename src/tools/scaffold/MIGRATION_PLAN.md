# Migration Plans: Scaffold Tools

This file contains 2 tools that need to be migrated to plugins/utilities/:

1. scaffold_ios_project
2. scaffold_macos_project

---

# Migration Plan: scaffold_ios_project

## Tool Information
- **Tool Name**: scaffold_ios_project
- **Current Location**: src/tools/scaffold/index.ts
- **Target Plugin**: plugins/utilities/scaffold_ios_project.js
- **Workflow Group**: General utilities

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/scaffold/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const scaffoldIosProjectToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const scaffoldIosProjectToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const scaffoldIosProjectToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function scaffoldIosProjectToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool<ScaffoldiOSProjectParams>(
  server,
  scaffoldIosProjectToolName,
  scaffoldIosProjectToolDescription,
  scaffoldIosProjectToolSchema,
  scaffoldIosProjectToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/utilities/scaffold_ios_project.js`:
```javascript
import {
  scaffoldIosProjectToolName,
  scaffoldIosProjectToolDescription,
  scaffoldIosProjectToolSchema,
  scaffoldIosProjectToolHandler
} from '../../src/tools/scaffold/index.js';

export default {
  name: scaffoldIosProjectToolName,
  description: scaffoldIosProjectToolDescription,
  schema: scaffoldIosProjectToolSchema,
  handler: scaffoldIosProjectToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/scaffold/index.test.ts plugins/utilities/scaffold_ios_project.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import scaffoldIosProject from './scaffold_ios_project.js';`
   - Find and replace tool name references
   - Remove tests for other tools in the file
   - Add plugin structure test

### Step 5: Validate

After surgical edits:
```bash
npm run build  # Should succeed
npm test       # Original tests still pass, new plugin tests pass
```

---

# Migration Plan: scaffold_macos_project

## Tool Information
- **Tool Name**: scaffold_macos_project
- **Current Location**: src/tools/scaffold/index.ts
- **Target Plugin**: plugins/utilities/scaffold_macos_project.js
- **Workflow Group**: General utilities

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/scaffold/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const scaffoldMacosProjectToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const scaffoldMacosProjectToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const scaffoldMacosProjectToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function scaffoldMacosProjectToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool<ScaffoldmacOSProjectParams>(
  server,
  scaffoldMacosProjectToolName,
  scaffoldMacosProjectToolDescription,
  scaffoldMacosProjectToolSchema,
  scaffoldMacosProjectToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/utilities/scaffold_macos_project.js`:
```javascript
import {
  scaffoldMacosProjectToolName,
  scaffoldMacosProjectToolDescription,
  scaffoldMacosProjectToolSchema,
  scaffoldMacosProjectToolHandler
} from '../../src/tools/scaffold/index.js';

export default {
  name: scaffoldMacosProjectToolName,
  description: scaffoldMacosProjectToolDescription,
  schema: scaffoldMacosProjectToolSchema,
  handler: scaffoldMacosProjectToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/scaffold/index.test.ts plugins/utilities/scaffold_macos_project.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import scaffoldMacosProject from './scaffold_macos_project.js';`
   - Find and replace tool name references
   - Remove tests for other tools in the file
   - Add plugin structure test

### Step 5: Validate

After surgical edits:
```bash
npm run build  # Should succeed
npm test       # Original tests still pass, new plugin tests pass
```

---

## Special Considerations

1. Both tools use registerTool pattern
2. scaffold_ios_project creates iOS projects from templates
3. scaffold_macos_project creates macOS projects from templates
4. Both tools use versioned templates from GitHub releases
5. Complex schemas with many configuration options
6. The test file needs to be copied twice and edited for each specific tool