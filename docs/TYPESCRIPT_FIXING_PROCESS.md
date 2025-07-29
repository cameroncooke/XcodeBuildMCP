# TypeScript Error Fixing Process

## Overview

This document outlines the systematic process for fixing TypeScript compilation errors in the XcodeBuildMCP project. The project has hundreds of TypeScript errors that need to be methodically resolved while maintaining functionality and test coverage.

## Main Orchestrator Process

### 1. Initial Assessment

Run the TypeScript check to get current error count:
```bash
npm run typecheck
```

### 2. Error Analysis and File Prioritization

Create a working list of files with errors. Group related files together (production file + test file).

### 3. Parallel Sub-Agent Orchestration

**CRITICAL**: Always run 5-10 sub-agents in parallel, not sequentially. Each sub-agent works on one production file and its corresponding test file.

### 4. Sub-Agent Task Assignment

For each file pair, create a sub-agent with this prompt template:

```
You are tasked with fixing TypeScript compilation errors in a specific file from the XcodeBuildMCP project.

**Context**: XcodeBuildMCP is an MCP server that exposes Xcode operations as tools. The project uses:
- Strict TypeScript compilation with no implicit any
- Dependency injection pattern for testing
- Zod schemas for parameter validation
- Standardized tool structure with logic functions and handlers

**Your Assignment**:
- Production file: [FILE_PATH]
- Test file (if exists): [TEST_FILE_PATH]

**Process to Follow**:
1. First, verify the TypeScript errors exist by reading the file and understanding the compilation issues
2. Apply the minimal changes needed to fix ONLY the TypeScript compilation errors
3. Do NOT refactor or change functionality - only fix type issues
4. Ensure all tests still pass after your changes
5. Verify the TypeScript errors are resolved

**Common Error Patterns and Solutions**:

1. **Parameter Type Mismatches**: 
   - Add explicit type definitions for tool parameters
   - Use type assertions where validation functions expect Record<string, unknown>
   - Example: `const paramsRecord = params as Record<string, unknown>;`

2. **Missing Type Definitions**:
   - Define parameter types explicitly: `type ToolNameParams = { param1: string; param2?: number; }`
   - Update function signatures to use typed parameters

3. **Validation Response Issues**:
   - Some validation functions may return undefined
   - Use non-null assertion when certain: `return validation.errorResponse!;`

4. **Handler Type Casting**:
   - Cast args in handler: `return toolLogic(args as ToolNameParams, executor);`

5. **Index Signature Errors**:
   - For dynamic property access, ensure proper typing or use type assertions
   - Consider using Record<string, T> for objects with dynamic keys

**Red-Green Verification Pattern**:
1. RED: Confirm the error exists (run focused type check or analyze the code)
2. FIX: Apply minimal changes to resolve the type error
3. GREEN: Verify the error is gone and tests still pass

**Return Requirements**:
- Report the specific TypeScript errors you found
- Describe the fixes you applied
- Confirm all errors in your assigned files are resolved
- Confirm tests still pass (if test file was modified)
```

### 5. Sub-Agent Validation

When a sub-agent completes:
1. Review the changes to ensure they only fix TypeScript errors
2. Verify no functionality was changed
3. Run focused type check on the modified files
4. Ensure tests still pass

### 6. Atomic Commits

**IMPORTANT**: Commit ONLY the files completed by each sub-agent:
```bash
# Stage only the specific files
git add [production_file] [test_file]

# Commit with descriptive message
git commit -m "fix: resolve TypeScript errors in [tool_name]"
```

**Never use `git add .` or commit all staged files** - other agents may have work in progress.

### 7. Progress Tracking

Maintain a list of:
- Files assigned to sub-agents (in progress)
- Files completed and committed
- Files remaining to be processed

### 8. Continuous Verification

Periodically run `npm run typecheck` to track overall progress and ensure no regressions.

## Common TypeScript Error Themes

### 1. Parameter Type Definition Issues

**Problem**: Tool logic functions accept parameters but TypeScript can't infer types from validation.

**Solution Pattern**:
```typescript
// Define explicit parameter type
type MyToolParams = {
  requiredParam: string;
  optionalParam?: string;
};

// Use in logic function
export async function myToolLogic(
  params: MyToolParams,
  executor: CommandExecutor
): Promise<ToolResponse> {
  // For validation compatibility
  const paramsRecord = params as Record<string, unknown>;
  
  // Use paramsRecord for validation calls
  const validation = validateRequiredParam('requiredParam', paramsRecord.requiredParam);
  
  // Use params for direct access
  const value = params.requiredParam;
}
```

### 2. Index Signature Errors

**Problem**: Dynamic property access on objects without index signatures.

**Solution**:
```typescript
// Option 1: Add index signature to type
type ConfigWithIndex = {
  [key: string]: string;
  specificProp: string;
};

// Option 2: Use type assertion
const value = (config as any)[dynamicKey];

// Option 3: Use Record type
const config: Record<string, string> = {};
```

### 3. Strict Null Checks

**Problem**: TypeScript can't guarantee non-null values.

**Solution**:
```typescript
// Use non-null assertion when certain
if (!validation.isValid) return validation.errorResponse!;

// Or add explicit check
if (!validation.isValid && validation.errorResponse) {
  return validation.errorResponse;
}
```

### 4. Union Type Narrowing

**Problem**: TypeScript can't narrow union types automatically.

**Solution**:
```typescript
// Use type guards
if ('error' in result) {
  // result is error type
} else {
  // result is success type
}

// Or use discriminated unions
type Result = 
  | { success: true; data: string }
  | { success: false; error: string };
```

### 5. Async Function Return Types

**Problem**: Missing Promise return type annotations.

**Solution**:
```typescript
// Always specify return type for async functions
async function myFunction(): Promise<ToolResponse> {
  // ...
}
```

## Quality Checklist

Before committing any fix:
- [ ] TypeScript errors in the file are resolved
- [ ] No functionality changes were made
- [ ] All existing tests pass
- [ ] Code follows existing patterns
- [ ] Only necessary type changes were applied
- [ ] Type assertions are used sparingly and appropriately

## Important Notes

1. **Preserve Functionality**: Never change business logic while fixing types
2. **Minimal Changes**: Apply the smallest change that fixes the type error
3. **Test Coverage**: Ensure all tests continue to pass
4. **Type Safety**: Prefer explicit types over `any` whenever possible
5. **Validation Pattern**: Maintain the existing validation pattern with type compatibility
6. **Atomic Commits**: Each commit should contain only one tool's fixes

## Error Priority

Focus on errors in this order:
1. Build-critical path tools (core functionality)
2. High-usage workflow groups
3. Utility and helper functions
4. Test files
5. Experimental or deprecated tools