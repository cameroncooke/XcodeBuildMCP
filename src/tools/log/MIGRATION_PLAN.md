# Migration Plans: Simulator Log Tools

This file contains 2 tools that need to be migrated to plugins/logging/:

1. start_sim_log_cap
2. stop_sim_log_cap

---

# Migration Plan: start_sim_log_cap

## Tool Information
- **Tool Name**: start_sim_log_cap
- **Current Location**: src/tools/log/index.ts
- **Target Plugin**: plugins/logging/start_sim_log_cap.js
- **Workflow Group**: Logging tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/log/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const startSimLogCapToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const startSimLogCapToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const startSimLogCapToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function startSimLogCapToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool(
  server,
  startSimLogCapToolName,
  startSimLogCapToolDescription,
  startSimLogCapToolSchema,
  startSimLogCapToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/logging/start_sim_log_cap.js`:
```javascript
import {
  startSimLogCapToolName,
  startSimLogCapToolDescription,
  startSimLogCapToolSchema,
  startSimLogCapToolHandler
} from '../../src/tools/log/index.js';

export default {
  name: startSimLogCapToolName,
  description: startSimLogCapToolDescription,
  schema: startSimLogCapToolSchema,
  handler: startSimLogCapToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/log/index.test.ts plugins/logging/start_sim_log_cap.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import startSimLogCap from './start_sim_log_cap.js';`
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

# Migration Plan: stop_sim_log_cap

## Tool Information
- **Tool Name**: stop_sim_log_cap
- **Current Location**: src/tools/log/index.ts
- **Target Plugin**: plugins/logging/stop_sim_log_cap.js
- **Workflow Group**: Logging tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/log/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const stopSimLogCapToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const stopSimLogCapToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const stopSimLogCapToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function stopSimLogCapToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool(
  server,
  stopSimLogCapToolName,
  stopSimLogCapToolDescription,
  stopSimLogCapToolSchema,
  stopSimLogCapToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/logging/stop_sim_log_cap.js`:
```javascript
import {
  stopSimLogCapToolName,
  stopSimLogCapToolDescription,
  stopSimLogCapToolSchema,
  stopSimLogCapToolHandler
} from '../../src/tools/log/index.js';

export default {
  name: stopSimLogCapToolName,
  description: stopSimLogCapToolDescription,
  schema: stopSimLogCapToolSchema,
  handler: stopSimLogCapToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/log/index.test.ts plugins/logging/stop_sim_log_cap.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import stopSimLogCap from './stop_sim_log_cap.js';`
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

1. Both tools are in the same file, so extract both sets of exports at once
2. These tools manage stateful log capture sessions for simulators
3. start_sim_log_cap returns a session ID, stop_sim_log_cap uses that ID
4. The tools use the log capture utility functions from src/utils/log_capture.ts
5. Different from device log tools - these are for simulators