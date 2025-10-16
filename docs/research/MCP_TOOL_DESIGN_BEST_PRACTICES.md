# MCP Tool Design Best Practices Research

**Research Date**: 2025-10-13
**Context**: Best practices for designing MCP tools with session-aware parameter handling, Zod validation, and AI agent-friendly patterns.

## Table of Contents

1. [MCP Tool Schema Design](#mcp-tool-schema-design)
2. [Zod XOR Constraints](#zod-xor-constraints)
3. [Session/Context Pattern](#sessioncontext-pattern)
4. [AI Agent Friendly Patterns](#ai-agent-friendly-patterns)
5. [TypeScript Utility Patterns](#typescript-utility-patterns)
6. [Recommendations for XcodeBuildMCP](#recommendations-for-xcodebuildmcp)

---

## 1. MCP Tool Schema Design

### Official MCP Specification Requirements

**Source**: [MCP Tools Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)

#### Tool Definition Components

Every MCP tool consists of:
- `name`: Unique identifier (required)
- `title`: Human-readable display name (optional)
- `description`: Functional description (required)
- `inputSchema`: JSON Schema defining input parameters (required)
- `outputSchema`: JSON Schema defining output structure (optional)

#### Parameter Validation Requirements

**Critical Rule**: "Servers MUST validate all tool inputs"

The MCP specification states:
- Servers must validate all inputs against the defined schema
- Clients should validate inputs before sending
- Support for both primitive and complex object types
- Required vs optional parameters should be clearly defined

### Optional Parameters with Runtime Validation

**Pattern**: Parameters can be optional in the schema but required through runtime validation logic.

**Best Practice from Research**:

```typescript
// Schema: All parameters optional
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to .xcworkspace file'),
  scheme: z.string().describe('Required: The scheme to use'),
});

// Runtime: XOR validation via refinement
const validatedSchema = baseSchemaObject.refine(
  (val) => val.projectPath !== undefined || val.workspacePath !== undefined,
  { message: 'Either projectPath or workspacePath is required.' }
);
```

**Why This Works**:
1. Schema remains flexible for session-based defaults
2. Runtime validation enforces business logic constraints
3. AI agents see all possible parameters in schema
4. Clear error messages guide parameter selection

### Schema Description Best Practices

**Source**: Multiple MCP server implementations and MCP specification

**Guidelines**:
- Include usage examples in tool descriptions
- Mark mutual exclusivity in parameter descriptions
- Use "EITHER...OR" language for clarity
- Provide concrete examples (e.g., "iPhone 16" not just "simulator name")

**Example**:
```typescript
simulatorId: z.string().optional().describe(
  'UUID of the simulator (from list_sims). Provide EITHER this OR simulatorName, not both'
)
```

---

## 2. Zod XOR Constraints

### Community Solutions for Mutually Exclusive Parameters

**Source**: [Zod GitHub Issue #3372](https://github.com/colinhacks/zod/issues/3372)

### Pattern 1: Refinement Method (Recommended)

**Endorsed by Zod maintainer (Colin)**:

```typescript
z.object({
  userId: z.string().optional(),
  userIds: z.string().array().optional(),
}).refine(
  (val) => !!val.userId !== !!val.userIds, // XOR logic
  { message: "Specify userId or userIds, not both" }
);
```

**Advantages**:
- Simple and clear
- Custom error messages
- Works with any number of parameters

**Limitations**:
- Does not strictly enforce type signature at compile-time
- Validation only occurs at runtime

### Pattern 2: Multiple Mutually Exclusive Keys

**For more than 2 parameters**:

```typescript
const mutuallyExclusiveKeys = ['project', 'task', 'workspace'] as const;

const schema = z.object({
  project: z.string().optional(),
  task: z.string().optional(),
  workspace: z.string().optional(),
  archived: z.boolean().optional(),
}).refine(
  (data) => {
    const presentKeys = mutuallyExclusiveKeys.filter(
      (key) => data[key] !== undefined
    );
    return presentKeys.length <= 1;
  },
  {
    message: `Only one of ${mutuallyExclusiveKeys.join(', ')} can be present`
  }
);
```

### Pattern 3: Two-Stage Validation (At Least One + XOR)

**For "exactly one required" scenarios**:

```typescript
const schema = baseSchema
  .refine(
    (val) => val.projectPath !== undefined || val.workspacePath !== undefined,
    { message: 'Either projectPath or workspacePath is required.' }
  )
  .refine(
    (val) => !(val.projectPath !== undefined && val.workspacePath !== undefined),
    { message: 'projectPath and workspacePath are mutually exclusive. Provide only one.' }
  );
```

**Why Two Refinements**:
1. First: Ensures at least one parameter is provided
2. Second: Ensures only one parameter is provided
3. Separate error messages for different failure modes
4. Easier for AI agents to understand what went wrong

---

## 3. Session/Context Pattern

### CLI Configuration Precedence Standards

**Source**: [Command Line Interface Guidelines](https://clig.dev/)

#### Standard Precedence Chain (Highest to Lowest)

1. **Command-line Flags** (explicit parameters)
2. **Shell Environment Variables**
3. **Project-level Configuration** (e.g., `.env`, config files)
4. **User-level Configuration**
5. **System-wide Configuration**
6. **Built-in Defaults**

**Principle**: "Make the default the right thing for most users"

### Session Management Patterns

**Source**: [Software Engineering Stack Exchange](https://softwareengineering.stackexchange.com/questions/373201/how-should-i-manage-user-session-in-cli-application)

#### Common Approaches in CLI Tools

**Pattern 1: Hidden Config Files**
- Store session data in `~/.tool-name` or similar
- Examples: `.netrc` for auth tokens, `.aws/credentials`
- Cloud CLIs (Azure, OpenShift, Bluemix) use this pattern

**Pattern 2: Explicit Session Commands**
- `session-set-defaults` to establish context
- `session-clear-defaults` to reset
- `session-show-defaults` to inspect

**Pattern 3: Environment Variables**
- For behavior that varies with terminal session context
- Time-limited or scope-limited configuration

### Parameter Merging Strategy

**Best Practice Pattern**:

```typescript
// 1. Sanitize: Treat null/undefined as "not provided"
const sanitizedArgs = Object.fromEntries(
  Object.entries(rawArgs).filter(([_, v]) => v !== null && v !== undefined)
);

// 2. Merge: Explicit args override session defaults
const merged = { ...sessionStore.getAll(), ...sanitizedArgs };

// 3. Validate: Check requirements against merged parameters
// 4. Execute: Use merged parameters
```

**Key Insights**:
- Null/undefined should not override session defaults
- Empty strings should be converted to null (via preprocessing)
- Explicit parameters always win over session defaults

### Mutual Exclusivity with Session Defaults

**Advanced Pattern**: When explicit parameter provided, drop conflicting session defaults

```typescript
// If user provides simulatorId, drop simulatorName from session
for (const pair of exclusivePairs) {
  const userProvidedConcrete = pair.some((k) =>
    Object.prototype.hasOwnProperty.call(sanitizedArgs, k)
  );

  if (!userProvidedConcrete) continue;

  // Drop other keys in pair that came from session
  for (const k of pair) {
    if (!Object.prototype.hasOwnProperty.call(sanitizedArgs, k) && k in merged) {
      delete merged[k];
    }
  }
}
```

**Why This Matters**:
- Prevents session defaults from violating XOR constraints
- User's explicit choice takes precedence
- Session defaults remain useful without causing conflicts

---

## 4. AI Agent Friendly Patterns

### Error Message Design for AI Agents

**Source**: [Nordic APIs - Designing API Error Messages for AI Agents](https://nordicapis.com/designing-api-error-messages-for-ai-agents/)

#### Critical Principles

**1. Provide Explicit Recovery Paths**

AI agents need much more explicit instructions than humans:

```typescript
// ❌ Bad: Generic error
"Missing required parameter"

// ✅ Good: Actionable guidance
"Either projectPath or workspacePath is required.
Set with: session-set-defaults { \"projectPath\": \"...\" }
OR provide explicitly: test_sim({ projectPath: \"...\", ... })"
```

**2. Include Structured Context and Suggestions**

```typescript
return createErrorResponse(
  'Missing required session defaults',
  `Required: scheme, projectPath (or workspacePath), simulatorId (or simulatorName)

Set with: session-set-defaults {
  "scheme": "MyAppScheme",
  "projectPath": "/path/to/MyApp.xcodeproj",
  "simulatorId": "ABC-123-UUID"
}

OR provide explicitly in tool call.`
);
```

**3. Link to Documentation**

Include URIs to documentation for complex errors:
```typescript
errorResponse: {
  message: "Parameter validation failed",
  details: "...",
  documentation: "https://docs.example.com/errors/PARAM_VALIDATION"
}
```

**4. Make Messages Clear, Specific, and Actionable**

**Best Practice Components**:
- Brief human-readable summary
- Detailed description with context
- Application-specific error code
- Links to troubleshooting steps

### Tool Description Best Practices

**Pattern**: Include usage examples directly in description

```typescript
description:
  'Runs tests on a simulator by UUID or name. ' +
  'IMPORTANT: Requires scheme and either simulatorId or simulatorName. ' +
  'Example: test_sim({ ' +
    'projectPath: "/path/to/MyProject.xcodeproj", ' +
    'scheme: "MyScheme", ' +
    'simulatorName: "iPhone 16" ' +
  '})'
```

**Why This Works**:
- AI agents learn by example
- Reduces trial-and-error
- Shows parameter relationships
- Demonstrates realistic values

### Parameter Descriptions

**Guidelines**:
- Use "EITHER...OR...not both" language
- Show concrete examples in descriptions
- Link to related tools (e.g., "from list_sims")
- Explain when parameters are ignored (e.g., "useLatestOS ignored with simulatorId")

---

## 5. TypeScript Utility Patterns

### Type-Safe Tool Factory Pattern

**Pattern**: Separate schema validation from business logic

```typescript
export function createTypedTool<TParams>(
  schema: z.ZodType<TParams>,
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>,
  getExecutor: () => CommandExecutor,
) {
  return async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Runtime validation provides type safety
      const validatedParams = schema.parse(args);
      return await logicFunction(validatedParams, getExecutor());
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors
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
- Type safety via Zod inference
- Testable business logic (no MCP SDK dependency)
- Consistent error formatting
- Single responsibility principle

### Session-Aware Tool Factory Pattern

**Advanced Pattern**: Integrate session defaults with validation

```typescript
export function createSessionAwareTool<TParams>(opts: {
  internalSchema: z.ZodType<TParams>;
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>;
  getExecutor: () => CommandExecutor;
  sessionKeys?: (keyof SessionDefaults)[];
  requirements?: SessionRequirement[];
  exclusivePairs?: (keyof SessionDefaults)[][]; // Mutual exclusivity handling
}) {
  return async (rawArgs: Record<string, unknown>): Promise<ToolResponse> => {
    // 1. Sanitize args (null/undefined = not provided)
    // 2. Check factory-level mutual exclusivity
    // 3. Merge with session defaults
    // 4. Apply exclusive pair pruning
    // 5. Validate requirements
    // 6. Parse with internal schema
    // 7. Execute logic function
  };
}
```

**Key Features**:
- `requirements`: Defines what must be present (allOf/oneOf)
- `exclusivePairs`: Defines mutually exclusive parameters
- `sessionKeys`: Documents which session keys are used
- Automatic merging and validation

### Schema Preprocessing Pattern

**Pattern**: Normalize empty strings to null before validation

```typescript
export function nullifyEmptyStrings(obj: unknown): unknown {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(nullifyEmptyStrings);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.trim() === '') {
      result[key] = null;
    } else {
      result[key] = nullifyEmptyStrings(value);
    }
  }
  return result;
}

// Usage
const schema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);
```

**Why This Matters**:
- Empty strings from UI inputs don't override session defaults
- Consistent "not provided" semantics
- Prevents accidental overrides

---

## 6. Recommendations for XcodeBuildMCP

### Current State Analysis

**Existing Patterns in XcodeBuildMCP**:

1. ✅ **`test_sim` tool**: Uses XOR refinement validation (good)
2. ✅ **`build_run_sim` tool**: Uses `createSessionAwareTool` with requirements and exclusivePairs (excellent)
3. ✅ **Session store**: Simple, focused implementation
4. ✅ **Typed tool factory**: Separates validation from logic

### Specific Recommendations

#### 1. Migrate `test_sim` to Session-Aware Pattern

**Current Issue**: `test_sim` doesn't support session defaults, leading to repetitive parameter specification.

**Recommended Migration**:

```typescript
// Public schema (omit session-manageable parameters)
const publicSchemaObject = baseSchemaObject.omit({
  projectPath: true,
  workspacePath: true,
  scheme: true,
  simulatorId: true,
  simulatorName: true,
  useLatestOS: true,
} as const);

export default {
  name: 'test_sim',
  description: '...',
  schema: publicSchemaObject.shape,
  handler: createSessionAwareTool<TestSimulatorParams>({
    internalSchema: testSimulatorSchema,
    logicFunction: test_simLogic,
    getExecutor: getDefaultCommandExecutor,
    requirements: [
      { allOf: ['scheme'], message: 'scheme is required' },
      { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
      // Note: simulatorId/simulatorName NOT required (can use default booted simulator)
    ],
    exclusivePairs: [
      ['projectPath', 'workspacePath'],
      ['simulatorId', 'simulatorName'],
    ],
  }),
};
```

**Benefits**:
- Consistent with `build_run_sim` pattern
- Reduces repeated parameter specification
- Maintains XOR validation
- Clear error messages with session guidance

#### 2. Enhanced Error Messages

**Add session-aware guidance to all validation errors**:

```typescript
return createErrorResponse(
  'Parameter validation failed',
  `Invalid parameters:\n${errorMessages.join('\n')}\n\n` +
  `Tip: Set session defaults to avoid repeating parameters:\n` +
  `session-set-defaults { "scheme": "MyScheme", "projectPath": "..." }`
);
```

#### 3. Documentation for Session Workflow

**Add to tool descriptions**:

```typescript
description:
  'Runs tests on a simulator. ' +
  'Session-aware: Set defaults with session-set-defaults to avoid repeating parameters. ' +
  'Example with session: session-set-defaults({ scheme: "MyScheme", projectPath: "..." }) ' +
  'then test_sim({ simulatorName: "iPhone 16" })'
```

#### 4. Consistent Schema Structure

**Follow pattern from `build_run_sim`**:

1. Define `baseOptions` (non-exclusive parameters)
2. Define `baseSchemaObject` with all parameters (for internal validation)
3. Apply preprocessing with `nullifyEmptyStrings`
4. Apply refinements for XOR validation
5. Create `publicSchemaObject` by omitting session-manageable parameters
6. Use `createSessionAwareTool` with clear requirements

#### 5. Testing Pattern

**Ensure test coverage for**:
- XOR validation (both refinement stages)
- Session default merging
- Exclusive pair pruning
- Empty string preprocessing
- Error message content

---

## Summary of Best Practices

### Schema Design
1. Use optional parameters in base schema for flexibility
2. Apply runtime validation via `.refine()` for business logic
3. Use two-stage refinement for "exactly one" scenarios
4. Include usage examples in descriptions
5. Mark mutual exclusivity clearly in parameter descriptions

### Session Management
1. Follow CLI precedence: explicit args > session > defaults
2. Sanitize null/undefined to prevent overriding session defaults
3. Preprocess empty strings to null
4. Prune conflicting session defaults when explicit parameters provided
5. Provide clear error messages with session-set guidance

### AI Agent Friendliness
1. Include explicit recovery paths in error messages
2. Show concrete examples in tool descriptions
3. Use "EITHER...OR...not both" language
4. Provide structured context in errors
5. Link related tools (e.g., "from list_sims")

### TypeScript Patterns
1. Separate business logic from MCP handler boilerplate
2. Use factory functions for consistency
3. Type-safe validation with Zod inference
4. Document session keys usage
5. Test with dependency injection

---

## References

1. [MCP Tools Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
2. [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
3. [Zod XOR Discussion](https://github.com/colinhacks/zod/issues/3372)
4. [CLI Guidelines](https://clig.dev/)
5. [Nordic APIs - AI Agent Error Messages](https://nordicapis.com/designing-api-error-messages-for-ai-agents/)
6. [Speakeasy - REST API Error Handling](https://www.speakeasy.com/api-design/errors)
7. [Software Engineering SE - CLI Session Management](https://softwareengineering.stackexchange.com/questions/373201/how-should-i-manage-user-session-in-cli-application)

---

**End of Research Document**
