# Migration Plans: iOS Simulator Build Tools (UPDATED with Sharing Strategy)

This file contains 8 tools that need to be migrated. Based on PLUGIN_MIGRATION_PLAN.md, ALL 8 tools need to be available in BOTH simulator-workspace/ and simulator-project/ directories.

## Primary Implementation (in simulator-workspace/)
1. build_sim_name_ws
2. build_sim_id_ws
3. build_run_sim_name_ws
4. build_run_sim_id_ws
5. build_sim_name_proj
6. build_sim_id_proj
7. build_run_sim_name_proj
8. build_run_sim_id_proj

## Re-exports (in simulator-project/)
All 8 tools above will be re-exported from simulator-workspace/

---

# Migration Plan: build_sim_name_ws

## Tool Information
- **Tool Name**: build_sim_name_ws
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Primary Plugin**: plugins/simulator-workspace/build_sim_name_ws.js
- **Re-export Plugin**: plugins/simulator-project/build_sim_name_ws.js
- **Workflow Group**: Simulator tools (shared between workspace and project)

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/build-ios-simulator/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const buildSimNameWsToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const buildSimNameWsToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const buildSimNameWsToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function buildSimNameWsToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool<Params>(
  server,
  buildSimNameWsToolName,
  buildSimNameWsToolDescription,
  buildSimNameWsToolSchema,
  buildSimNameWsToolHandler
);
```

### Step 3a: Create Primary Plugin File

Create `plugins/simulator-workspace/build_sim_name_ws.js`:
```javascript
import {
  buildSimNameWsToolName,
  buildSimNameWsToolDescription,
  buildSimNameWsToolSchema,
  buildSimNameWsToolHandler
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildSimNameWsToolName,
  description: buildSimNameWsToolDescription,
  schema: buildSimNameWsToolSchema,
  handler: buildSimNameWsToolHandler,
};
```

### Step 3b: Create Re-export Plugin File

Create `plugins/simulator-project/build_sim_name_ws.js`:
```javascript
// Re-export from simulator-workspace to avoid duplication
export { default } from '../simulator-workspace/build_sim_name_ws.js';
```

### Step 4a: Create Primary Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/build-ios-simulator/index.test.ts plugins/simulator-workspace/build_sim_name_ws.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import buildSimNameWs from './build_sim_name_ws.js';`
   - Find and replace tool name references
   - Remove tests for other tools in the file
   - Add plugin structure test

### Step 4b: Create Re-export Test File

Create `plugins/simulator-project/build_sim_name_ws.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import buildSimNameWs from './build_sim_name_ws.js';
import buildSimNameWsOriginal from '../simulator-workspace/build_sim_name_ws.js';

describe('build_sim_name_ws re-export', () => {
  it('should re-export the same plugin object', () => {
    expect(buildSimNameWs).toBe(buildSimNameWsOriginal);
  });
  
  it('should have the correct tool name', () => {
    expect(buildSimNameWs.name).toBe('build_sim_name_ws');
  });
});
```

### Step 5: Validate

After surgical edits:
```bash
npm run build  # Should succeed
npm test       # Original tests still pass, new plugin tests pass
```

---

# Migration Plan: build_sim_id_ws

[Similar pattern with primary in simulator-workspace/ and re-export in simulator-project/]

---

# Migration Plan: build_run_sim_name_ws

[Similar pattern with primary in simulator-workspace/ and re-export in simulator-project/]

---

# Migration Plan: build_run_sim_id_ws

[Similar pattern with primary in simulator-workspace/ and re-export in simulator-project/]

---

# Migration Plan: build_sim_name_proj

## Tool Information
- **Tool Name**: build_sim_name_proj
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Primary Plugin**: plugins/simulator-workspace/build_sim_name_proj.js (YES, in workspace!)
- **Re-export Plugin**: plugins/simulator-project/build_sim_name_proj.js
- **Workflow Group**: Simulator tools (shared between workspace and project)

## Important Note

Even though this is a "proj" tool, the primary implementation still goes in simulator-workspace/ directory, and simulator-project/ gets the re-export. This maintains a single source of truth.

[Rest of migration follows same pattern]

---

## Special Considerations

1. All 8 tools from this file go primarily in simulator-workspace/
2. All 8 tools get re-exported in simulator-project/
3. This means creating 8 primary plugins + 8 re-export files = 16 plugin files total
4. Primary tests are full copies from original, re-export tests are minimal
5. The original test file gets copied 8 times for primary tests
6. 8 minimal re-export test files are created from scratch