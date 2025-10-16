# Framework Documentation Research: Schema Design & Best Practices

**Research Date**: 2025-10-13
**Researcher**: Claude Code (Framework Documentation Researcher)
**Project**: XcodeBuildMCP
**Focus**: Zod Schema Design, MCP Protocol Specification, TypeScript Type Safety

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Zod Schema Documentation](#zod-schema-documentation)
3. [MCP Protocol Specification](#mcp-protocol-specification)
4. [MCP TypeScript SDK Patterns](#mcp-typescript-sdk-patterns)
5. [TypeScript Best Practices](#typescript-best-practices)
6. [XcodeBuildMCP Current Implementation](#xcodebuildmcp-current-implementation)
7. [Recommended Patterns](#recommended-patterns)
8. [References](#references)

---

## Executive Summary

This document provides comprehensive research on schema design patterns, validation strategies, and type-safety approaches for XcodeBuildMCP's tool system. The research focuses on:

- **Zod Schema Validation**: Best practices for optional/nullable parameters, refinements, transformations
- **MCP Protocol**: Tool schema requirements, parameter validation, JSON Schema format
- **TypeScript Patterns**: Type-safe parameter merging, generic constraints, session integration
- **Current Implementation**: XcodeBuildMCP's existing patterns and architecture

### Key Findings

1. **Zod operates in "parse then transform" mode**: Validation happens first, then transformations
2. **MCP Protocol uses JSON Schema**: Tools must serialize Zod schemas to JSON Schema format
3. **XcodeBuildMCP uses typed-tool-factory**: Provides type-safe boundary crossing from MCP to domain logic
4. **Session-aware tools need special handling**: Parameter merging with session defaults requires careful schema design

---

## Zod Schema Documentation

### Version Information

- **Installed Version**: `zod@3.24.2`
- **Official Documentation**: https://zod.dev/api
- **Source Repository**: https://github.com/colinhacks/zod

### Core Concepts

#### 1. Optional vs Nullable vs Nullish

```typescript
// Optional: allows undefined
const optional = z.string().optional();  // string | undefined

// Nullable: allows null
const nullable = z.string().nullable();  // string | null

// Nullish: allows both null and undefined
const nullish = z.string().nullish();    // string | null | undefined
```

**Key Insight**: Use `.optional()` for parameters that can be omitted from the MCP tool call. This is the primary pattern for optional tool parameters.

#### 2. Default Values

```typescript
// Provides default value when input is undefined
const withDefault = z.string().default("default_value");

// Works with optional parameters
const optionalWithDefault = z.string().optional().default("fallback");
```

**Important**: `.default()` only triggers when the value is `undefined`, not when it's missing from the object entirely. For session defaults, you need to merge objects **before** validation.

#### 3. Refinements and Validation

```typescript
// Custom validation logic
const refined = z.string().refine(
  val => val.length > 8,
  { message: "String must be longer than 8 characters" }
);

// Multiple refinements chain together
const multiRefined = z.string()
  .min(3, "Too short")
  .refine(val => !val.includes(" "), "No spaces allowed");
```

**Best Practice**: Use built-in validators (`.min()`, `.max()`, `.email()`) before custom `.refine()` calls. This provides better error messages.

#### 4. Transformations

```typescript
// Transform after validation passes
const transformed = z.string().transform(val => val.toUpperCase());

// Preprocess before validation
const preprocessed = z.preprocess(
  (val) => String(val).trim(),
  z.string().min(1)
);
```

**Critical Rule**: Zod validates first, then transforms. This means:
1. Input is validated against schema
2. Validation passes → transformations run
3. Validation fails → transformations never run

#### 5. Type Inference

```typescript
// Extract TypeScript type from Zod schema
const userSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
});

type User = z.infer<typeof userSchema>;
// Result: { name: string; age?: number }
```

**XcodeBuildMCP Pattern**: Every tool uses `z.infer<typeof schema>` to create a strongly-typed params interface:

```typescript
const myToolSchema = z.object({
  requiredParam: z.string(),
  optionalParam: z.number().optional(),
});

type MyToolParams = z.infer<typeof myToolSchema>;
```

### Schema Design Patterns for Optional Parameters

#### Pattern 1: Simple Optional Parameter

```typescript
const schema = z.object({
  requiredParam: z.string(),
  optionalParam: z.string().optional(),
});

// Valid calls:
// { requiredParam: "value" }
// { requiredParam: "value", optionalParam: "optional" }
```

#### Pattern 2: Optional with Default

```typescript
const schema = z.object({
  requiredParam: z.string(),
  optionalParam: z.string().optional().default("default_value"),
});

// When optionalParam is undefined, it becomes "default_value"
```

#### Pattern 3: Conditional Validation (XOR Pattern)

```typescript
const schema = z.object({
  option1: z.string().optional(),
  option2: z.string().optional(),
}).refine(
  data => (data.option1 != null) !== (data.option2 != null),
  { message: "Provide exactly one of option1 or option2" }
);
```

**Warning**: This pattern doesn't work well with session defaults because `.refine()` validates the **merged** object, not the original user input.

#### Pattern 4: At-Least-One Validation

```typescript
const schema = z.object({
  option1: z.string().optional(),
  option2: z.string().optional(),
  option3: z.string().optional(),
}).refine(
  data => data.option1 != null || data.option2 != null || data.option3 != null,
  { message: "Provide at least one option" }
);
```

### Limitations When Using Session Defaults

**Critical Issue**: Zod's `.refine()` validates the **final merged object** after session defaults are applied, not the user's original input.

**Example Problem**:

```typescript
// Schema with XOR validation
const schema = z.object({
  simulatorId: z.string().optional(),
  simulatorName: z.string().optional(),
}).refine(
  data => (data.simulatorId != null) !== (data.simulatorName != null),
  { message: "Provide exactly one" }
);

// Session has: { simulatorId: "ABC123" }
// User provides: {} (empty)
// Merged: { simulatorId: "ABC123" }
// Result: ✅ Passes validation (but user didn't provide anything!)

// User provides: { simulatorName: "iPhone 15" }
// Merged: { simulatorId: "ABC123", simulatorName: "iPhone 15" }
// Result: ❌ Fails validation (XOR violated!)
```

**Solution**: Implement XOR/mutual exclusivity **outside** of Zod schema, in the session-aware tool factory (see `createSessionAwareTool` implementation).

---

## MCP Protocol Specification

### Official Documentation

- **Specification Version**: 2025-06-18 (latest)
- **URL**: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- **Protocol Repository**: https://github.com/modelcontextprotocol/modelcontextprotocol

### Tool Schema Structure

Every MCP tool must have:

```json
{
  "name": "unique_tool_name",
  "inputSchema": {
    "type": "object",
    "properties": {
      "paramName": {
        "type": "string",
        "description": "Parameter description for AI"
      }
    },
    "required": ["paramName"]
  }
}
```

#### Required Fields

1. **name** (string): Unique identifier for the tool
2. **inputSchema** (object): JSON Schema defining expected parameters

#### Optional Fields

1. **title** (string): Human-readable name
2. **description** (string): Functionality description
3. **outputSchema** (object): JSON Schema defining output structure
4. **annotations** (object): Additional behavioral properties

### Parameter Validation Requirements

#### Required vs Optional Parameters

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "required_param": { "type": "string" },
      "optional_param": { "type": "string" }
    },
    "required": ["required_param"]
  }
}
```

**MCP Interpretation**:
- Parameters in `required` array: **MUST** be provided by client
- Parameters not in `required`: **MAY** be omitted by client
- Missing required parameters → Tool call fails before handler executes

#### Type Constraints

JSON Schema supports standard types:
- `string`
- `number`
- `integer`
- `boolean`
- `array`
- `object`
- `null`

**Type Combinations**:

```json
{
  "paramName": {
    "type": ["string", "null"]  // Allows string OR null
  }
}
```

### Validation Principles

1. **Servers MUST validate all tool inputs** against the schema
2. **Clients SHOULD validate tool results** against output schema (if provided)
3. **Output schemas enforce strict data validation** for structured results
4. **Descriptions provide context** for AI models to understand parameter usage

### Schema Serialization

MCP requires **JSON Schema format**, not Zod schemas. XcodeBuildMCP handles this conversion:

```typescript
// XcodeBuildMCP pattern
import { z } from 'zod';

const myToolSchema = z.object({
  param: z.string().describe('Parameter description'),
});

export default {
  name: 'my_tool',
  description: 'Tool description',
  schema: myToolSchema.shape,  // Exposes Zod shape for MCP SDK conversion
  handler: createTypedTool(myToolSchema, myToolLogic, getExecutor),
};
```

**How MCP SDK Handles It**:

The `@camsoft/mcp-sdk` package includes `zod-to-json-schema` (v3.24.1) as a dependency, which automatically converts Zod schemas to JSON Schema format during tool registration.

---

## MCP TypeScript SDK Patterns

### Installed Version

- **Package**: `@camsoft/mcp-sdk@1.17.1`
- **Repository**: https://github.com/modelcontextprotocol/typescript-sdk
- **Dependencies**: `zod@^3.23.8`, `zod-to-json-schema@^3.24.1`

### Tool Registration API

#### Method 1: Single Tool Registration

```typescript
import { McpServer } from '@camsoft/mcp-sdk/server/mcp.js';
import { z } from 'zod';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });

server.registerTool(
  'tool_name',                    // Tool identifier
  {
    description: 'What it does',  // AI-readable description
    inputSchema: {                // Zod schema shape
      param: z.string().describe('Parameter description'),
    },
  },
  async (args) => {               // Handler function
    // args is Record<string, unknown>
    return {
      content: [{ type: 'text', text: 'Result' }]
    };
  }
);
```

#### Method 2: Bulk Tool Registration

```typescript
server.registerTools([
  {
    name: 'tool_1',
    config: {
      description: 'First tool',
      inputSchema: { param: z.string() },
    },
    callback: async (args) => { /* ... */ },
  },
  {
    name: 'tool_2',
    config: {
      description: 'Second tool',
      inputSchema: { param: z.number() },
    },
    callback: async (args) => { /* ... */ },
  },
]);
```

**XcodeBuildMCP Uses Bulk Registration**: See `src/utils/tool-registry.ts` for implementation.

### Handler Signature

```typescript
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResponse>;
```

**Key Points**:
1. **Input type**: Always `Record<string, unknown>` (generic object)
2. **Return type**: `Promise<ToolResponse>` (project-specific type)
3. **No runtime validation**: Handler receives raw object, validation must be explicit

### Type Safety Challenge

The MCP SDK handler signature is intentionally generic (`Record<string, unknown>`), creating a **type boundary** that must be crossed safely.

**Unsafe Pattern** (Type Assertion):

```typescript
// ❌ DANGEROUS: No runtime validation
async (args: Record<string, unknown>) => {
  const params = args as MyToolParams;  // Type assertion = trust without verify
  // If args doesn't match MyToolParams, this causes runtime errors!
}
```

**Safe Pattern** (Runtime Validation):

```typescript
// ✅ SAFE: Runtime validation with Zod
async (args: Record<string, unknown>) => {
  const validatedParams = myToolSchema.parse(args);  // Throws on invalid input
  // validatedParams is now proven to be MyToolParams
}
```

### XcodeBuildMCP's Solution: `createTypedTool` Factory

See: `src/utils/typed-tool-factory.ts`

```typescript
export function createTypedTool<TParams>(
  schema: z.ZodType<TParams>,
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>,
  getExecutor: () => CommandExecutor,
) {
  return async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Runtime validation - the ONLY safe way to cross the type boundary
      const validatedParams = schema.parse(args);

      // Now we have guaranteed type safety - no assertions needed!
      return await logicFunction(validatedParams, getExecutor());
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors in a user-friendly way
        const errorMessages = error.errors.map((e) => {
          const path = e.path.length > 0 ? `${e.path.join('.')}` : 'root';
          return `${path}: ${e.message}`;
        });

        return createErrorResponse(
          'Parameter validation failed',
          `Invalid parameters:\n${errorMessages.join('\n')}`
        );
      }
      throw error;
    }
  };
}
```

**Benefits**:
1. ✅ Compile-time type safety (TypeScript enforces `TParams` consistency)
2. ✅ Runtime validation (Zod validates actual input)
3. ✅ No unsafe type assertions
4. ✅ Friendly error messages for validation failures
5. ✅ Separation of concerns (MCP boundary vs domain logic)

---

## TypeScript Best Practices

### Utility Types for Parameter Merging

TypeScript provides built-in utility types for transforming type definitions:

#### `Partial<T>` - Make All Properties Optional

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// Result: { id?: string; name?: string; email?: string }
```

**Use Case**: Update operations where only some fields are modified.

#### `Required<T>` - Make All Properties Required

```typescript
type RequiredUser = Required<PartialUser>;
// Result: { id: string; name: string; email: string }
```

**Use Case**: Ensuring all optional properties are filled after merging with defaults.

#### `Pick<T, K>` - Select Specific Properties

```typescript
type UserCredentials = Pick<User, 'email' | 'password'>;
// Result: { email: string; password: string }
```

**Use Case**: Creating subset types for specific operations.

#### `Omit<T, K>` - Exclude Specific Properties

```typescript
type UserWithoutId = Omit<User, 'id'>;
// Result: { name: string; email: string }
```

**Use Case**: Creation payloads that exclude auto-generated fields.

### Combining Utility Types

```typescript
// Update type: Some fields optional, some omitted
type UserUpdate = Partial<Omit<User, 'id'>>;
// Result: { name?: string; email?: string }

// Nested transformations
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

### Generic Constraints with Defaults

```typescript
// Generic type with constraint
function merge<T extends object, U extends object>(
  defaults: T,
  overrides: U
): T & U {
  return { ...defaults, ...overrides };
}

// Generic with default type
type Container<T = string> = {
  value: T;
};

// No explicit type = uses default
const stringContainer: Container = { value: "hello" };

// Explicit type overrides default
const numberContainer: Container<number> = { value: 42 };
```

### Type-Safe Parameter Merging Pattern

```typescript
interface SessionDefaults {
  simulatorId?: string;
  projectPath?: string;
  scheme?: string;
}

interface ToolParams {
  simulatorId?: string;
  projectPath?: string;
  scheme?: string;
  additionalArg: boolean;
}

function mergeWithSession<T extends Partial<SessionDefaults>>(
  args: T,
  session: SessionDefaults
): T & SessionDefaults {
  // User-provided args override session defaults
  return { ...session, ...args };
}

// Usage
const session: SessionDefaults = { simulatorId: "ABC123" };
const userArgs: Partial<ToolParams> = { additionalArg: true };

const merged = mergeWithSession(userArgs, session);
// Type: { simulatorId?: string; projectPath?: string; scheme?: string; additionalArg: boolean }
```

### Common Pitfalls with Generic Defaults

**Issue**: When one generic parameter uses its default, other parameters may also fall back to defaults instead of inferring types.

```typescript
// Problematic pattern
function process<T = string, U = number>(
  first: T,
  second?: U
): void {}

// Calling with explicit first type
process<boolean>(true);  // T = boolean, U = number (default, not inferred!)

// Better: Don't use defaults when inference is important
function process<T, U>(
  first: T,
  second?: U
): void {}
```

**XcodeBuildMCP Approach**: Explicit type parameters for session-aware tools, no generic defaults that could interfere with type inference.

---

## XcodeBuildMCP Current Implementation

### Tool Architecture Overview

```
src/
├── mcp/
│   └── tools/
│       ├── simulator/              # Canonical simulator tools
│       ├── simulator-management/    # Re-exports from simulator
│       ├── device/                 # Canonical device tools
│       └── ...                     # Other workflow groups
├── utils/
│   ├── typed-tool-factory.ts       # Type-safe tool handler factory
│   ├── session-store.ts            # Session defaults storage
│   └── tool-registry.ts            # Tool registration with MCP server
└── core/
    ├── plugin-registry.ts          # Auto-discovery system
    └── generated-plugins.ts        # Build-time generated loaders
```

### Standard Tool Pattern

See: `src/mcp/tools/simulator/boot_sim.ts`

```typescript
import { z } from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';

// 1. Define Zod schema
const bootSimSchema = z.object({
  simulatorUuid: z.string().describe('UUID of the simulator to use'),
});

// 2. Infer TypeScript type
type BootSimParams = z.infer<typeof bootSimSchema>;

// 3. Implement testable logic function
export async function boot_simLogic(
  params: BootSimParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Logic implementation...
}

// 4. Export tool definition
export default {
  name: 'boot_sim',
  description: 'Boots an iOS simulator. Example: boot_sim({ simulatorUuid: "UUID" })',
  schema: bootSimSchema.shape,  // MCP SDK compatibility
  handler: createTypedTool(bootSimSchema, boot_simLogic, getDefaultCommandExecutor),
};
```

### Session-Aware Tool Pattern

See: `src/utils/typed-tool-factory.ts` - `createSessionAwareTool` function

```typescript
export function createSessionAwareTool<TParams>(opts: {
  internalSchema: z.ZodType<TParams>;
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>;
  getExecutor: () => CommandExecutor;
  sessionKeys?: (keyof SessionDefaults)[];
  requirements?: SessionRequirement[];
  exclusivePairs?: (keyof SessionDefaults)[][];
}) {
  const { internalSchema, logicFunction, getExecutor, requirements = [], exclusivePairs = [] } = opts;

  return async (rawArgs: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // 1. Sanitize: treat null/undefined as "not provided"
      const sanitizedArgs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawArgs)) {
        if (v !== null && v !== undefined) sanitizedArgs[k] = v;
      }

      // 2. Factory-level mutual exclusivity check
      for (const pair of exclusivePairs) {
        const provided = pair.filter(k =>
          Object.prototype.hasOwnProperty.call(sanitizedArgs, k)
        );
        if (provided.length >= 2) {
          return createErrorResponse(
            'Parameter validation failed',
            `Mutually exclusive parameters provided: ${provided.join(', ')}. Provide only one.`
          );
        }
      }

      // 3. Merge session defaults with user args (args override session)
      const merged: Record<string, unknown> = {
        ...sessionStore.getAll(),
        ...sanitizedArgs
      };

      // 4. Apply exclusive pair pruning
      for (const pair of exclusivePairs) {
        const userProvidedConcrete = pair.some(k =>
          Object.prototype.hasOwnProperty.call(sanitizedArgs, k)
        );
        if (!userProvidedConcrete) continue;

        for (const k of pair) {
          if (!Object.prototype.hasOwnProperty.call(sanitizedArgs, k) && k in merged) {
            delete merged[k];
          }
        }
      }

      // 5. Validate requirements (allOf / oneOf)
      for (const req of requirements) {
        if ('allOf' in req) {
          const missing = req.allOf.filter(k => merged[k] == null);
          if (missing.length > 0) {
            return createErrorResponse(
              'Missing required session defaults',
              `Required: ${req.allOf.join(', ')}\nSet with: session-set-defaults`
            );
          }
        } else if ('oneOf' in req) {
          const satisfied = req.oneOf.some(k => merged[k] != null);
          if (!satisfied) {
            return createErrorResponse(
              'Missing required session defaults',
              `Provide one of: ${req.oneOf.join(', ')}\nSet with: session-set-defaults`
            );
          }
        }
      }

      // 6. Validate merged object with Zod schema
      const validated = internalSchema.parse(merged);
      return await logicFunction(validated, getExecutor());
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => {
          const path = e.path.length > 0 ? `${e.path.join('.')}` : 'root';
          return `${path}: ${e.message}`;
        });

        return createErrorResponse(
          'Parameter validation failed',
          `Invalid parameters:\n${errorMessages.join('\n')}\nTip: set session defaults via session-set-defaults`
        );
      }
      throw error;
    }
  };
}
```

### Key Design Decisions

#### 1. Why `schema.shape` Instead of Full Schema?

```typescript
export default {
  schema: bootSimSchema.shape,  // ← Using .shape property
  // NOT: schema: bootSimSchema (full ZodObject)
};
```

**Reason**: MCP SDK expects a plain object mapping property names to Zod types:

```typescript
// What MCP SDK expects
inputSchema: {
  param1: z.string(),
  param2: z.number(),
}

// What .shape provides
bootSimSchema.shape === {
  simulatorUuid: ZodString { /* ... */ }
}
```

The `.shape` property extracts the internal property map from `z.object()`, which is exactly what the MCP SDK registration function expects.

#### 2. Why Separate Logic Functions?

```typescript
// Logic function (testable with dependency injection)
export async function boot_simLogic(
  params: BootSimParams,
  executor: CommandExecutor,
): Promise<ToolResponse> { /* ... */ }

// Tool definition (uses logic function)
export default {
  handler: createTypedTool(bootSimSchema, boot_simLogic, getExecutor),
};
```

**Benefits**:
- **Testability**: Logic function can be tested with mock executors
- **Separation of Concerns**: MCP boundary handling vs business logic
- **Reusability**: Logic can be reused by resources or other tools
- **Type Safety**: Clear contract between MCP layer and domain logic

#### 3. Why Not Use `.refine()` for XOR Validation?

**Problem**: When using session defaults, `.refine()` validates the **merged** object:

```typescript
// Schema with XOR validation
const schema = z.object({
  option1: z.string().optional(),
  option2: z.string().optional(),
}).refine(data => (data.option1 != null) !== (data.option2 != null));

// Session: { option1: "from_session" }
// User: { option2: "from_user" }
// Merged: { option1: "from_session", option2: "from_user" }
// Result: ❌ Fails XOR validation (both present!)
```

**Solution**: Implement XOR validation **before** merging, using `exclusivePairs` in `createSessionAwareTool`:

```typescript
createSessionAwareTool({
  exclusivePairs: [['option1', 'option2']],  // ← Factory handles XOR
  // ...
});
```

This checks user input **before** session defaults are merged, preserving the XOR semantics.

---

## Recommended Patterns

### Pattern 1: Simple Tool (No Session Integration)

Use when tool parameters are **always explicit** and **never** fall back to session defaults.

```typescript
import { z } from 'zod';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

const myToolSchema = z.object({
  requiredParam: z.string().describe('Required parameter'),
  optionalParam: z.number().optional().describe('Optional parameter'),
});

type MyToolParams = z.infer<typeof myToolSchema>;

export async function myToolLogic(
  params: MyToolParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Implementation...
}

export default {
  name: 'my_tool',
  description: 'Tool description with usage example',
  schema: myToolSchema.shape,
  handler: createTypedTool(myToolSchema, myToolLogic, getDefaultCommandExecutor),
};
```

### Pattern 2: Session-Aware Tool with Simple Fallback

Use when tool parameters **can** fall back to session defaults, but have **no XOR constraints**.

```typescript
import { z } from 'zod';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';

const internalSchema = z.object({
  projectPath: z.string().describe('Path to project'),
  scheme: z.string().describe('Build scheme'),
  configuration: z.enum(['Debug', 'Release']).default('Debug'),
});

type MyToolParams = z.infer<typeof internalSchema>;

export async function myToolLogic(
  params: MyToolParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Implementation...
}

export default {
  name: 'my_tool',
  description: 'Session-aware tool with fallback to defaults',
  schema: internalSchema.shape,
  handler: createSessionAwareTool({
    internalSchema,
    logicFunction: myToolLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [
      { allOf: ['projectPath', 'scheme'] }  // Both required from session or args
    ],
  }),
};
```

### Pattern 3: Session-Aware Tool with XOR Constraints

Use when tool has **mutually exclusive parameters** that can fall back to session defaults.

```typescript
import { z } from 'zod';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';

const internalSchema = z.object({
  simulatorId: z.string().optional().describe('Simulator UUID'),
  simulatorName: z.string().optional().describe('Simulator name'),
  projectPath: z.string().describe('Path to project'),
});

type MyToolParams = z.infer<typeof internalSchema>;

export async function myToolLogic(
  params: MyToolParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // Implementation...
}

export default {
  name: 'my_tool',
  description: 'Session-aware tool with XOR constraints',
  schema: internalSchema.shape,
  handler: createSessionAwareTool({
    internalSchema,
    logicFunction: myToolLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [
      { oneOf: ['simulatorId', 'simulatorName'] }  // Exactly one required
    ],
    exclusivePairs: [
      ['simulatorId', 'simulatorName']  // Factory-level XOR enforcement
    ],
  }),
};
```

### Pattern 4: Optional Parameters with Validation

Use when optional parameters need **conditional validation** (e.g., min length if provided).

```typescript
import { z } from 'zod';

const myToolSchema = z.object({
  requiredParam: z.string(),
  optionalString: z.string().min(3).optional(),  // If provided, must be ≥3 chars
  optionalNumber: z.number().positive().optional(),  // If provided, must be positive
});
```

**Behavior**:
- `optionalString` not provided → ✅ Valid
- `optionalString: "ab"` → ❌ Invalid (too short)
- `optionalString: "abc"` → ✅ Valid

### Pattern 5: Complex Default Fallback Chain

Use when defaults come from **multiple sources** (tool default, session default, environment).

```typescript
import { z } from 'zod';

const internalSchema = z.object({
  configuration: z.enum(['Debug', 'Release']),  // No .default() here!
});

type MyToolParams = z.infer<typeof internalSchema>;

export async function myToolLogic(
  params: MyToolParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // At this point, configuration is guaranteed to exist (from session or args)
}

export default {
  name: 'my_tool',
  schema: internalSchema.shape,
  handler: createSessionAwareTool({
    internalSchema,
    logicFunction: myToolLogic,
    getExecutor: getDefaultCommandExecutor,
    // If neither args nor session provide configuration, validation fails
    // This forces user to set session default: session_set_defaults({ configuration: "Debug" })
  }),
};
```

---

## References

### Official Documentation

1. **Zod Documentation**: https://zod.dev/
2. **MCP Specification**: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
3. **MCP TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
4. **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/

### Related Articles

1. **Zod Optional/Nullable Differences**: https://gist.github.com/ciiqr/ee19e9ff3bb603f8c42b00f5ad8c551e
2. **TypeScript Utility Types Guide**: https://www.typescriptlang.org/docs/handbook/utility-types.html
3. **Schema Validation Best Practices**: https://www.turing.com/blog/data-integrity-through-zod-validation
4. **TypeScript Generic Constraints**: https://www.typescripttutorial.net/typescript-tutorial/typescript-generic-constraints/

### XcodeBuildMCP Documentation

1. **Plugin Development Guide**: `docs/PLUGIN_DEVELOPMENT.md`
2. **Architecture Guide**: `docs/ARCHITECTURE.md`
3. **Testing Guide**: `docs/TESTING.md`

### Key Source Files

1. **Typed Tool Factory**: `src/utils/typed-tool-factory.ts`
2. **Tool Registry**: `src/utils/tool-registry.ts`
3. **Plugin Registry**: `src/core/plugin-registry.ts`
4. **Example Tool**: `src/mcp/tools/simulator/boot_sim.ts`

---

## Appendix: Common Pitfalls and Solutions

### Pitfall 1: Using `.refine()` with Session Defaults

**Problem**: XOR validation fails when session defaults are present.

**Solution**: Use `exclusivePairs` in `createSessionAwareTool` instead of `.refine()`.

### Pitfall 2: Forgetting `.shape` in Schema Export

**Problem**: Exporting full `z.object()` instead of `.shape` property.

```typescript
// ❌ Wrong
export default {
  schema: myToolSchema,  // ZodObject instance
};

// ✅ Correct
export default {
  schema: myToolSchema.shape,  // { param1: ZodString, param2: ZodNumber }
};
```

### Pitfall 3: Unsafe Type Assertions in Handlers

**Problem**: Using `as` to cast `Record<string, unknown>` to typed params.

```typescript
// ❌ Unsafe
handler: async (args: Record<string, unknown>) => {
  const params = args as MyToolParams;  // No runtime validation!
};

// ✅ Safe
handler: createTypedTool(myToolSchema, myToolLogic, getDefaultCommandExecutor);
```

### Pitfall 4: Mixing `.default()` with Session Merging

**Problem**: Using `.default()` in schema when session merging should provide defaults.

**Solution**: Handle defaults during merging phase, not in Zod schema:

```typescript
// ❌ Confusing: Default in schema AND session merging
const schema = z.object({
  config: z.string().default('Debug'),  // Which takes precedence?
});

// ✅ Clear: Session provides defaults, schema validates
const schema = z.object({
  config: z.string(),  // No default here
});

// Session: { config: "Debug" }  ← Default comes from here
```

### Pitfall 5: Forgetting to Sanitize Null/Undefined

**Problem**: Client sends `{ param: null }`, which overrides session default.

**Solution**: `createSessionAwareTool` sanitizes null/undefined before merging:

```typescript
// Sanitization step (already implemented in createSessionAwareTool)
const sanitizedArgs: Record<string, unknown> = {};
for (const [k, v] of Object.entries(rawArgs)) {
  if (v !== null && v !== undefined) sanitizedArgs[k] = v;
}
```

This ensures `{ param: null }` is treated the same as `{}` (not provided).

---

**End of Research Document**
