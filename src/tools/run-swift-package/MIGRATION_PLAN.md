# Migration Plans: Swift Package Run/List/Stop/Clean Tools

This file contains 4 tools that need to be migrated separately:
1. swift_package_run
2. swift_package_clean  
3. swift_package_list
4. swift_package_stop

---

# Migration Plan: swift_package_run

## Status: ✅ COMPLETED (2025-06-27)

## Tool Information
- **Tool Name**: swift_package_run
- **Current Location**: src/tools/run-swift-package/index.ts
- **Target Plugin**: plugins/swift-package/swift_package_run.js
- **Workflow Group**: Swift Package Manager tools

## Migration Process

### Step 1: Validate Existing Tool Works
```bash
npm test -- src/tools/run-swift-package/index.test.ts
```
Expected: All existing tests pass

### Step 2: Surgical Edits to Tool File

Add 4 exports BEFORE the first register function:

```typescript
// GENERIC PATTERN:
export const swiftPackageRunToolName = '<extract_from_registerTool_second_param>';
export const swiftPackageRunToolDescription = '<extract_from_registerTool_third_param>';
export const swiftPackageRunToolSchema = {
  // Extract the entire schema object from registerTool fourth param
};
export async function swiftPackageRunToolHandler(params: {
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
  swiftPackageRunToolName,         // was: 'literal_string'
  swiftPackageRunToolDescription,  // was: 'literal_string'
  swiftPackageRunToolSchema,       // was: { inline object }
  swiftPackageRunToolHandler,      // was: async function
);
```

### Step 3-11: Follow standard migration steps...

---

# Migration Plan: swift_package_clean

## Tool Information
- **Tool Name**: swift_package_clean
- **Current Location**: src/tools/run-swift-package/index.ts
- **Target Plugin**: plugins/swift-package/swift_package_clean.js
- **Workflow Group**: Swift Package Manager tools

## Migration Process

Same pattern as above, but for the second registerTool call in the file.

---

# Migration Plan: swift_package_list

## Tool Information
- **Tool Name**: swift_package_list
- **Current Location**: src/tools/run-swift-package/index.ts
- **Target Plugin**: plugins/swift-package/swift_package_list.js
- **Workflow Group**: Swift Package Manager tools

## Migration Process

Same pattern as above, but for the third registerTool call in the file.

---

# Migration Plan: swift_package_stop

## Tool Information
- **Tool Name**: swift_package_stop
- **Current Location**: src/tools/run-swift-package/index.ts
- **Target Plugin**: plugins/swift-package/swift_package_stop.js
- **Workflow Group**: Swift Package Manager tools

## Migration Process

Same pattern as above, but for the fourth registerTool call in the file.

---

## Special Considerations

Since all 4 tools are in the same file:
1. Extract all 4 sets of exports at once (16 total exports)
2. Update all 4 registerTool calls
3. Create 4 separate plugin files
4. Copy the test file 4 times and edit each for its specific tool
5. The original test file likely tests all 4 tools - each plugin test should only test its specific tool