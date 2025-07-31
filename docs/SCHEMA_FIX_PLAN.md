# TypeScript Type Safety Migration Guide (AI Agent)

## Quick Reference: Target Pattern

Replace unsafe type casting with runtime validation using createTypedTool factory:

```typescript
// ❌ UNSAFE (Before)
handler: async (args: Record<string, unknown>) => {
  return toolLogic(args as unknown as ToolParams, executor);
}

// ✅ SAFE (After)  
const toolSchema = z.object({ param: z.string() });
type ToolParams = z.infer<typeof toolSchema>;

// Logic function uses typed parameters (createTypedTool handles validation)
export async function toolLogic(
  params: ToolParams,  // Fully typed - validation handled by createTypedTool
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // No validation needed - params guaranteed valid by factory
  // Use params directly with full type safety
}

handler: createTypedTool(toolSchema, toolLogic, getDefaultCommandExecutor)
```

## CRITICAL UPDATE: Consistent Executor Injection Pattern

**✅ COMPLETED**: All executor injection now happens **explicitly from the call site** for consistency.

**Required Pattern**: All tools must pass executors explicitly to `createTypedTool`:
```typescript
// ✅ CONSISTENT PATTERN (Required)
handler: createTypedTool(toolSchema, toolLogic, getDefaultCommandExecutor)

// ❌ OLD PATTERN (No longer supported) 
handler: createTypedTool(toolSchema, toolLogic) // Missing executor parameter
```

This ensures consistent dependency injection across all tools and maintains testability with mock executors.

## CRITICAL: Dependency Injection Testing Works with Typed Parameters

**Dependency injection testing is preserved!** Tests can pass typed object literals directly to logic functions. The `createTypedTool` factory handles the MCP boundary validation, while logic functions get full type safety.

## Migration Detection & Progress Tracking

Find tools that need migration:
```bash
npm run check-migration:unfixed    # Show only tools needing migration
npm run check-migration:summary    # Show overall progress (X/85 tools)
npm run check-migration:verbose    # Detailed analysis of all tools
```

## Core Problem: Unsafe Type Boundary Crossing

MCP SDK requires `Record<string, unknown>` → Our logic needs typed parameters → Solution: Runtime validation with Zod at the boundary.

## Per-Tool Migration Process

### Step 1: Pre-Migration Analysis
```bash
# Check if tool needs migration
npm run check-migration:unfixed | grep "tool_name.ts"
```

### Step 2: Identify Unsafe Patterns
Look for these patterns in the tool file:
- `args as unknown as SomeType` (handler casting)
- `params as Record<string, unknown>` (back-casting)  
- Manual type definitions: `type ToolParams = { ... }` without `z.infer`
- Inline schemas: `schema: { param: z.string() }`

Transform tool using this exact pattern:

```typescript
// 1. Import the factory (only change needed for imports)
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// 2. Convert schema from ZodRawShape to ZodObject
const toolSchema = z.object({
  requiredParam: z.string().describe('Description'),
  optionalParam: z.string().optional().describe('Optional description'),
});

// 3. Use z.infer for type safety (createTypedTool handles validation)
type ToolParams = z.infer<typeof toolSchema>;

export async function toolLogic(
  params: ToolParams, // Fully typed - validation handled by createTypedTool
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // No validation needed - params guaranteed valid by factory
  // Use params directly with full type safety
}

// 4. Replace handler with factory (MUST include executor parameter)
export default {
  name: 'tool_name',
  description: 'Tool description...',
  schema: toolSchema.shape, // MCP SDK compatibility  
  handler: createTypedTool(toolSchema, toolLogic, getDefaultCommandExecutor), // Safe factory with explicit executor
};
```

### Step 4: Validation Commands
Run these commands after migration:
```bash
npm run lint                           # Must pass (no casting warnings)
npm run typecheck                      # Must pass (no TypeScript errors)  
npm run test                           # Must pass (all tests)
npm run check-migration:unfixed        # Should not list this tool anymore
```

## Migration Workflow (Complete Process)

### 1. Find Next Tool to Migrate
```bash
npm run check-migration:unfixed | head -5  # Get next 5 tools to work on
```

### 2. Select One Tool and Migrate It
Pick one tool file and apply the migration pattern above.

### 3. Validate Single Tool Migration  
```bash
npm run lint src/mcp/tools/path/to/tool.ts   # Check specific file
npm run typecheck                            # Check overall project
npm run test                                 # Run all tests
```

### 4. Verify Progress
```bash
npm run check-migration:summary              # Check overall progress
```

### 5. Repeat Until Complete
Continue until `npm run check-migration:unfixed` shows no tools.

## Migration Checklist (Per Tool)

- [ ] Import `createTypedTool` factory and `getDefaultCommandExecutor`
- [ ] Convert schema: `{...}` → `z.object({...})`  
- [ ] Add type: `type ToolParams = z.infer<typeof toolSchema>`
- [ ] Update logic function signature: `params: ToolParams` (fully typed)
- [ ] Remove ALL `as` casting from logic function
- [ ] Update handler: `createTypedTool(toolSchema, toolLogic, getDefaultCommandExecutor)` **← MUST include executor!**
- [ ] Verify: `npm run lint && npm run typecheck && npm run test`

## Common Migration Patterns (Before/After Examples)

### Pattern 1: Handler with Unsafe Casting
```typescript
// ❌ BEFORE (Unsafe)
handler: async (args: Record<string, unknown>) => {
  return toolLogic(args as unknown as ToolParams, getDefaultCommandExecutor());
}

// ✅ AFTER (Safe with explicit executor)
handler: createTypedTool(toolSchema, toolLogic, getDefaultCommandExecutor)
```

### Pattern 2: Back-casting in Logic Function
```typescript
// ❌ BEFORE (Unsafe) 
export async function toolLogic(params: ToolParams): Promise<ToolResponse> {
  const paramsRecord = params as Record<string, unknown>; // Remove this!
}

// ✅ AFTER (Safe with createTypedTool)
export async function toolLogic(params: ToolParams): Promise<ToolResponse> {
  // Use params directly - they're guaranteed valid by createTypedTool
}
```

### Pattern 3: Manual Type Definition
```typescript
// ❌ BEFORE (Manual types)
type BuildParams = {
  workspacePath: string;
  scheme: string;
};

// ✅ AFTER (Inferred types)
const buildSchema = z.object({
  workspacePath: z.string().describe('Path to workspace'),
  scheme: z.string().describe('Scheme to build'),
});
type BuildParams = z.infer<typeof buildSchema>;
```

## Troubleshooting Common Issues

### Issue: Import errors for `createTypedTool`
**Solution**: Add import: `import { createTypedTool } from '../../../utils/typed-tool-factory.js';`

### Issue: Schema validation failures
**Solution**: Check that schema matches actual parameter usage in logic function

### Issue: TypeScript errors after migration
**Solution**: Run `npm run typecheck` and fix any remaining type issues

### Issue: Test failures after migration  
**Solution**: Update tests that mock parameters to match new schema requirements

## Final Validation

When all tools are migrated:
```bash
npm run check-migration:summary    # Should show 85/85 migrated
npm run lint                       # Should pass with no warnings
npm run typecheck                  # Should pass with no errors  
npm run test                       # Should pass all tests
```

**Success Criteria**: 
- `npm run check-migration:unfixed` returns empty (no tools need migration)
- All validation commands pass
- Zero unsafe type casting in codebase