# Migration Plans: UI Testing (AXE) Tools

This file contains 10 tools that need to be migrated to plugins/ui-testing/:

1. describe_ui
2. tap
3. long_press
4. swipe
5. type_text
6. key_press
7. button
8. key_sequence
9. touch
10. gesture

## Important Note

These tools use `server.tool()` instead of `registerTool()`. The migration pattern needs adjustment:

### Original Pattern:
```typescript
server.tool(
  'tool_name',
  'description',
  { schema },
  async handler
);
```

### Migration Pattern:
```typescript
// Extract as:
export const toolNameToolName = 'tool_name';
export const toolNameToolDescription = 'description';
export const toolNameToolSchema = { schema };
export async function toolNameToolHandler(params) { 
  // handler body
}

// Update to:
server.tool(
  toolNameToolName,
  toolNameToolDescription,
  toolNameToolSchema,
  toolNameToolHandler
);
```

---

# Migration Plan: describe_ui

## Tool Information
- **Tool Name**: describe_ui
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/describe_ui.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: tap

## Tool Information
- **Tool Name**: tap
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/tap.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: long_press

## Tool Information
- **Tool Name**: long_press
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/long_press.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: swipe

## Tool Information
- **Tool Name**: swipe
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/swipe.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: type_text

## Tool Information
- **Tool Name**: type_text
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/type_text.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: key_press

## Tool Information
- **Tool Name**: key_press
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/key_press.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: button

## Tool Information
- **Tool Name**: button
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/button.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: key_sequence

## Tool Information
- **Tool Name**: key_sequence
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/key_sequence.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: touch

## Tool Information
- **Tool Name**: touch
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/touch.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: gesture

## Tool Information
- **Tool Name**: gesture
- **Current Location**: src/tools/axe/index.ts
- **Target Plugin**: plugins/ui-testing/gesture.js
- **Workflow Group**: UI automation tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

## Special Considerations

1. All tools use server.tool() instead of registerTool()
2. Extract all 10 sets of exports at once (40 total exports)
3. Update all 10 server.tool calls
4. Create 10 plugin files in ui-testing/
5. These tools use the bundled axe binary for UI automation
6. Many tools have complex coordinate and timing logic
7. The test pattern is the same - copy and surgically edit