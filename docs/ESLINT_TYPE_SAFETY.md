# ESLint Type Safety Rules

This document explains the ESLint rules added to prevent TypeScript anti-patterns and improve type safety.

## Rules Added

### Error-Level Rules (Block CI/Deployment)

These rules prevent dangerous type casting patterns that can lead to runtime errors:

#### `@typescript-eslint/consistent-type-assertions`
- **Purpose**: Prevents dangerous object literal type assertions
- **Example**: Prevents `{ foo: 'bar' } as ComplexType`
- **Rationale**: Object literal assertions can hide missing properties

#### `@typescript-eslint/no-unsafe-*` (5 rules)
- **no-unsafe-argument**: Prevents passing `any` to typed parameters
- **no-unsafe-assignment**: Prevents assigning `any` to typed variables  
- **no-unsafe-call**: Prevents calling `any` as a function
- **no-unsafe-member-access**: Prevents accessing properties on `any`
- **no-unsafe-return**: Prevents returning `any` from typed functions

**Example of prevented anti-pattern:**
```typescript
// ❌ BAD - This would now be an ESLint error
function handleParams(args: Record<string, unknown>) {
  const typedParams = args as MyToolParams; // Unsafe casting
  return typedParams.someProperty as string; // Unsafe member access
}

// ✅ GOOD - Proper validation approach
function handleParams(args: Record<string, unknown>) {
  const typedParams = MyToolParamsSchema.parse(args); // Runtime validation
  return typedParams.someProperty; // Type-safe access
}
```

#### `@typescript-eslint/ban-ts-comment`
- **Purpose**: Prevents unsafe TypeScript comments
- **Blocks**: `@ts-ignore`, `@ts-nocheck`
- **Allows**: `@ts-expect-error` (with description)

### Warning-Level Rules (Encourage Best Practices)

These rules encourage modern TypeScript patterns but don't block builds:

#### `@typescript-eslint/prefer-nullish-coalescing`
- **Purpose**: Prefer `??` over `||` for default values
- **Example**: `value ?? 'default'` instead of `value || 'default'`
- **Rationale**: More precise handling of falsy values (0, '', false)

#### `@typescript-eslint/prefer-optional-chain`
- **Purpose**: Prefer `?.` for safe property access
- **Example**: `obj?.prop` instead of `obj && obj.prop`
- **Rationale**: More concise and readable

#### `@typescript-eslint/prefer-as-const`
- **Purpose**: Prefer `as const` for literal types
- **Example**: `['a', 'b'] as const` instead of `['a', 'b'] as string[]`

## Test File Exceptions

Test files (`.test.ts`) have relaxed rules for flexibility:
- All `no-unsafe-*` rules are disabled
- `no-explicit-any` is disabled
- Tests often need to test error conditions and edge cases

## Impact on Codebase

### Current Status (Post-Implementation)
- **387 total issues detected**
  - **207 errors**: Require fixing for type safety
  - **180 warnings**: Can be gradually improved

### Gradual Migration Strategy

1. **Phase 1** (Immediate): Error-level rules prevent new anti-patterns
2. **Phase 2** (Ongoing): Gradually fix warning-level violations
3. **Phase 3** (Future): Consider promoting warnings to errors

### Benefits

1. **Prevents Regression**: New code can't introduce the anti-patterns we just fixed
2. **Runtime Safety**: Catches potential runtime errors at compile time  
3. **Code Quality**: Encourages modern TypeScript best practices
4. **Developer Experience**: Better IDE support and autocomplete

## Related Issues Fixed

These rules prevent the specific anti-patterns identified in PR review:

1. **✅ Type Casting in Parameters**: `args as SomeType` patterns now flagged
2. **✅ Unsafe Property Access**: `params.field as string` patterns prevented
3. **✅ Missing Validation**: Encourages schema validation over casting
4. **✅ Return Type Mismatches**: Function signature inconsistencies caught
5. **✅ Nullish Coalescing**: Promotes safer default value handling

## Agent Orchestration for ESLint Fixes

### Parallel Agent Strategy

When fixing ESLint issues across the codebase:

1. **Deploy Multiple Agents**: Run agents in parallel on different files
2. **Single File Focus**: Each agent works on ONE tool file at a time
3. **Individual Linting**: Agents run `npm run lint path/to/single/file.ts` only
4. **Immediate Commits**: Commit each agent's work as soon as they complete
5. **Never Wait**: Don't wait for all agents to finish before committing
6. **Avoid Full Linting**: Never run `npm run lint` without a file path (eats context)
7. **Progress Tracking**: Update todo list and periodically check overall status
8. **Loop Until Done**: Keep deploying agents until all issues are resolved

### Example Commands for Agents

```bash
# Single file linting (what agents should run)
npm run lint src/mcp/tools/device-project/test_device_proj.ts

# NOT this (too much context)
npm run lint
```

### Commit Strategy

- **Individual commits**: One commit per agent completion
- **Clear messages**: `fix: resolve ESLint errors in tool_name.ts`
- **Never batch**: Don't wait to commit multiple files together
- **Progress preservation**: Each fix is immediately saved

## Future Improvements

Consider adding these rules in future iterations:

- `@typescript-eslint/strict-boolean-expressions`: Stricter boolean logic
- `@typescript-eslint/prefer-reduce-type-parameter`: Better generic usage
- `@typescript-eslint/switch-exhaustiveness-check`: Complete switch statements