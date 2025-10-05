# Stateful Session Defaults for MCP Tools — Design, Middleware, and Plan

Below is a concise architecture and implementation plan to introduce a session-aware defaults layer that removes repeated tool parameters from public schemas, while keeping all tool logic and tests unchanged.

## Architecture Overview

- **Core idea**: keep logic functions and tests untouched; move argument consolidation into a session-aware interop layer and expose minimal public schemas.
- **Data flow**:
  - Client calls a tool with zero or few args → session middleware merges session defaults → validates with the internal schema → calls the existing logic function.
- **Components**:
  - `SessionStore` (singleton, in-memory): set/get/clear/show defaults.
  - Session-aware tool factory: merges defaults, performs preflight requirement checks (allOf/oneOf), then validates with the tool's internal zod schema.
  - Public vs internal schema: plugins register a minimal "public" input schema; handlers validate with the unchanged "internal" schema.

## Core Types

```typescript
// src/utils/session-store.ts
export type SessionDefaults = {
  projectPath?: string;
  workspacePath?: string;
  scheme?: string;
  configuration?: string;
  simulatorName?: string;
  simulatorId?: string;
  deviceId?: string;
  useLatestOS?: boolean;
  arch?: 'arm64' | 'x86_64';
};
```

## Session Store (singleton)

```typescript
// src/utils/session-store.ts
import { log } from './logger.ts';

class SessionStore {
  private defaults: SessionDefaults = {};

  setDefaults(partial: Partial<SessionDefaults>): void {
    this.defaults = { ...this.defaults, ...partial };
    log('info', '[Session] Defaults set', { keys: Object.keys(partial) });
  }

  clear(keys?: (keyof SessionDefaults)[]): void {
    if (!keys || keys.length === 0) {
      this.defaults = {};
      log('info', '[Session] All defaults cleared');
      return;
    }
    for (const k of keys) delete this.defaults[k];
    log('info', '[Session] Defaults cleared', { keys });
  }

  get<K extends keyof SessionDefaults>(key: K): SessionDefaults[K] {
    return this.defaults[key];
  }

  getAll(): SessionDefaults {
    return { ...this.defaults };
  }
}

export const sessionStore = new SessionStore();
```

## Session-Aware Tool Factory

```typescript
// src/utils/typed-tool-factory.ts (add new helper, keep createTypedTool as-is)
import { z } from 'zod';
import { sessionStore, type SessionDefaults } from './session-store.ts';
import type { CommandExecutor } from './execution/index.ts';
import { createErrorResponse } from './responses/index.ts';
import type { ToolResponse } from '../types/common.ts';

export type SessionRequirement =
  | { allOf: (keyof SessionDefaults)[]; message?: string }
  | { oneOf: (keyof SessionDefaults)[]; message?: string };

function missingFromArgsAndSession(
  keys: (keyof SessionDefaults)[],
  args: Record<string, unknown>,
): string[] {
  return keys.filter((k) => args[k] == null && sessionStore.get(k) == null);
}

export function createSessionAwareTool<TParams>(opts: {
  internalSchema: z.ZodType<TParams>;
  logicFunction: (params: TParams, executor: CommandExecutor) => Promise<ToolResponse>;
  getExecutor: () => CommandExecutor;
  // Optional extras to improve UX and ergonomics
  sessionKeys?: (keyof SessionDefaults)[];
  requirements?: SessionRequirement[]; // preflight, friendlier than raw zod errors
}) {
  const { internalSchema, logicFunction, getExecutor, sessionKeys = [], requirements = [] } = opts;

  return async (rawArgs: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Merge: explicit args take precedence over session defaults
      const merged: Record<string, unknown> = { ...sessionStore.getAll(), ...rawArgs };

      // Preflight requirement checks (clear message how to fix)
      for (const req of requirements) {
        if ('allOf' in req) {
          const missing = missingFromArgsAndSession(req.allOf, rawArgs);
          if (missing.length > 0) {
            return createErrorResponse(
              'Missing required session defaults',
              `${req.message ?? `Required: ${req.allOf.join(', ')}`}\n` +
                `Set with: session-set-defaults { ${missing.map((k) => `"${k}": "..."`).join(', ')} }`,
            );
          }
        } else if ('oneOf' in req) {
          const missing = missingFromArgsAndSession(req.oneOf, rawArgs);
          // oneOf satisfied if at least one is present in merged
          const satisfied = req.oneOf.some((k) => merged[k] != null);
          if (!satisfied) {
            return createErrorResponse(
              'Missing required session defaults',
              `${req.message ?? `Provide one of: ${req.oneOf.join(', ')}`}\n` +
                `Set with: session-set-defaults { "${req.oneOf[0]}": "..." }`,
            );
          }
        }
      }

      // Validate against unchanged internal schema (logic/api untouched)
      const validated = internalSchema.parse(merged);
      return await logicFunction(validated, getExecutor());
    } catch (error) {
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.') || 'root'}: ${e.message}`);
        return createErrorResponse(
          'Parameter validation failed',
          `Invalid parameters:\n${msgs.join('\n')}\n` +
            `Tip: set session defaults via session-set-defaults`,
        );
      }
      throw error;
    }
  };
}
```

## Plugin Migration Pattern (Example: build_sim)

Public schema hides session fields; handler uses session-aware factory with internal schema and requirements; logic function unchanged.

```typescript
// src/mcp/tools/simulator/build_sim.ts (key parts only)
import { z } from 'zod';
import { createSessionAwareTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';

// Existing internal schema (unchanged)…
const baseOptions = { /* as-is (scheme, simulatorId, simulatorName, configuration, …) */ };
const baseSchemaObject = z.object({
  projectPath: z.string().optional(),
  workspacePath: z.string().optional(),
  ...baseOptions,
});
const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);
const buildSimulatorSchema = baseSchema
  .refine(/* as-is: projectPath XOR workspacePath */)
  .refine(/* as-is: simulatorId XOR simulatorName */);

export type BuildSimulatorParams = z.infer<typeof buildSimulatorSchema>;

// Public schema = internal minus session-managed fields
const sessionManaged = [
  'projectPath',
  'workspacePath',
  'scheme',
  'configuration',
  'simulatorId',
  'simulatorName',
  'useLatestOS',
] as const;

const publicSchemaObject = baseSchemaObject.omit(
  Object.fromEntries(sessionManaged.map((k) => [k, true])) as Record<string, true>,
);

export default {
  name: 'build_sim',
  description: 'Builds an app for an iOS simulator.',
  schema: publicSchemaObject.shape, // what the MCP client sees
  handler: createSessionAwareTool<BuildSimulatorParams>({
    internalSchema: buildSimulatorSchema,
    logicFunction: build_simLogic,
    getExecutor: getDefaultCommandExecutor,
    sessionKeys: sessionManaged,
    requirements: [
      { allOf: ['scheme'], message: 'scheme is required' },
      { oneOf: ['projectPath', 'workspacePath'], message: 'Provide a project or workspace' },
      { oneOf: ['simulatorId', 'simulatorName'], message: 'Provide simulatorId or simulatorName' },
    ],
  }),
};
```

This same pattern applies to `build_run_sim`, `test_sim`, device/macos tools, etc. Public schemas become minimal, while internal schemas and logic remain unchanged.

## New Tool Group: session-management

### session_set_defaults.ts

```typescript
// src/mcp/tools/session-management/session_set_defaults.ts
import { z } from 'zod';
import { sessionStore, type SessionDefaults } from '../../../utils/session-store.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';

const schemaObj = z.object({
  projectPath: z.string().optional(),
  workspacePath: z.string().optional(),
  scheme: z.string().optional(),
  configuration: z.string().optional(),
  simulatorName: z.string().optional(),
  simulatorId: z.string().optional(),
  deviceId: z.string().optional(),
  useLatestOS: z.boolean().optional(),
  arch: z.enum(['arm64', 'x86_64']).optional(),
});
type Params = z.infer<typeof schemaObj>;

async function logic(params: Params): Promise<import('../../../types/common.ts').ToolResponse> {
  sessionStore.setDefaults(params as Partial<SessionDefaults>);
  const current = sessionStore.getAll();
  return { content: [{ type: 'text', text: `Defaults updated:\n${JSON.stringify(current, null, 2)}` }] };
}

export default {
  name: 'session-set-defaults',
  description: 'Set session defaults used by other tools.',
  schema: schemaObj.shape,
  handler: createTypedTool(schemaObj, logic, getDefaultCommandExecutor),
};
```

### session_clear_defaults.ts

```typescript
// src/mcp/tools/session-management/session_clear_defaults.ts
import { z } from 'zod';
import { sessionStore } from '../../../utils/session-store.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';

const keys = [
  'projectPath','workspacePath','scheme','configuration',
  'simulatorName','simulatorId','deviceId','useLatestOS','arch',
] as const;
const schemaObj = z.object({
  keys: z.array(z.enum(keys)).optional(),
  all: z.boolean().optional(),
});

async function logic(params: z.infer<typeof schemaObj>) {
  if (params.all || !params.keys) sessionStore.clear();
  else sessionStore.clear(params.keys);
  return { content: [{ type: 'text', text: 'Session defaults cleared' }] };
}

export default {
  name: 'session-clear-defaults',
  description: 'Clear selected or all session defaults.',
  schema: schemaObj.shape,
  handler: createTypedTool(schemaObj, logic, getDefaultCommandExecutor),
};
```

### session_show_defaults.ts

```typescript
// src/mcp/tools/session-management/session_show_defaults.ts
import { sessionStore } from '../../../utils/session-store.ts';

export default {
  name: 'session-show-defaults',
  description: 'Show current session defaults.',
  schema: {}, // no args
  handler: async () => {
    const current = sessionStore.getAll();
    return { content: [{ type: 'text', text: JSON.stringify(current, null, 2) }] };
  },
};
```

## Step-by-Step Implementation Plan (Incremental, buildable at each step)

1. **Add SessionStore** ✅ **DONE**
   - New file: `src/utils/session-store.ts`.
   - No existing code changes; run: `npm run build`, `lint`, `test`.
   - Commit checkpoint (after review): see Commit & Review Protocol below.

2. **Add session-management tools** ✅ **DONE**
   - New folder: `src/mcp/tools/session-management` with the three tools above.
   - Register via existing plugin discovery (same pattern as others).
   - Build and test.
   - Commit checkpoint (after review).

3. **Add session-aware tool factory** ✅ **DONE**
   - Add `createSessionAwareTool` to `src/utils/typed-tool-factory.ts` (keep `createTypedTool` intact).
   - Unit tests for requirement preflight and merge precedence.
   - Commit checkpoint (after review).

4. **Migrate 2-3 representative tools**
   - Example: `simulator/build_sim`, `macos/build_macos`, `device/build_device`.
   - Create `publicSchemaObject` (omit session fields), switch handler to `createSessionAwareTool` with requirements.
   - Keep internal schema and logic unchanged. Build and test.
   - Commit checkpoint (after review).

5. **Migrate remaining tools in small batches**
   - Apply the same pattern across simulator/device/macos/test utilities.
   - After each batch: `npm run typecheck`, `lint`, `test`.
   - Commit checkpoint (after review).

6. **Final polish**
   - Add tests for session tools and session-aware preflight error messages.
   - Ensure public schemas no longer expose session parameters globally.
   - Commit checkpoint (after review).

## Standard Testing & DI Checklist (Mandatory)

- Handlers must use dependency injection; tests must never call real executors.
- For validation-only tests, calling the handler is acceptable because Zod validation occurs before executor acquisition.
- For logic tests that would otherwise trigger `getDefaultCommandExecutor`, export the logic function and test it directly (no executor needed if logic doesn’t use one):

```ts
// Example: src/mcp/tools/session-management/session_clear_defaults.ts
export async function sessionClearDefaultsLogic(params: Params): Promise<ToolResponse> { /* ... */ }
export default {
  name: 'session-clear-defaults',
  handler: createTypedTool(schemaObj, sessionClearDefaultsLogic, getDefaultCommandExecutor),
};

// Test: import logic and call directly to avoid real executor
import plugin, { sessionClearDefaultsLogic } from '../session_clear_defaults.ts';
```

- Add tests for the new group and tools:
  - Group metadata test: `src/mcp/tools/session-management/__tests__/index.test.ts`
  - Tool tests: `session_set_defaults.test.ts`, `session_clear_defaults.test.ts`, `session_show_defaults.test.ts`
  - Utils tests: `src/utils/__tests__/session-store.test.ts`
  - Factory tests: `src/utils/__tests__/session-aware-tool-factory.test.ts` covering:
    - Preflight requirements (allOf/oneOf)
    - Merge precedence (explicit args override session defaults)
    - Zod error reporting with helpful tips

- Always run locally before requesting review:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`

### Minimal Changes Policy for Tests (Enforced)

- Only make material, essential edits to tests required by the code change (e.g., new preflight error messages or added/removed fields).
- Do not change sample input values or defaults in tests (e.g., flipping a boolean like `preferXcodebuild`) unless strictly necessary to validate behavior.
- Preserve the original intent and coverage of logic-function tests; keep handler vs logic boundaries intact.
- When session-awareness is added, prefer setting/clearing session defaults around tests rather than altering existing assertions or sample inputs.

### Tool Description Policy (Enforced)

- Keep tool descriptions concise (maximum one short sentence).
- Do not mention session defaults, setup steps, examples, or parameter relationships in descriptions.
- Use clear, imperative phrasing (e.g., "Builds an app for an iOS simulator.").
- Apply consistently across all migrated tools; update any tests that assert `description` to match the concise string only.

## Commit & Review Protocol (Enforced)

At the end of each numbered step above:

1. Ensure all checks pass: `typecheck`, `lint`, `test`.
   - Verify tool descriptions comply with the Tool Description Policy (concise, no session-defaults mention).
2. Stage only the files for that step.
3. Prepare a concise commit message focused on the “why”.
4. Request manual review and approval before committing. Do not push.

Example messages per step:

- Step 1 (SessionStore)
  - `chore(utils): add in-memory SessionStore for session defaults`
  - Body: “Introduces singleton SessionStore with set/get/clear/show for session defaults; no behavior changes.”

- Step 2 (session-management tools)
  - `feat(session-management): add set/clear/show session defaults tools and workflow metadata`
  - Body: “Adds tools to manage session defaults and exposes workflow metadata; minimal schemas via typed factory.”

- Step 3 (middleware)
  - `feat(utils): add createSessionAwareTool with preflight requirements and args>session merge`
  - Body: “Session-aware interop layer performing requirements checks and Zod validation against internal schema.”

- Step 6 (tests/final polish)
  - `test(session-management): add tool, store, and middleware tests; export logic for DI`
  - Body: “Covers group metadata, tools, SessionStore, and factory (requirements/merge/errors). No production behavior changes.”

Approval flow:
- After preparing messages and confirming checks, request maintainer approval.
- On approval: commit locally (no push).
- On rejection: revise and re-run checks.

Note on commit hooks and selective commits:
- The pre-commit hook runs format/lint/build and can auto-add or modify files, causing additional files to be included in the commit. If you must commit a minimal subset, skip hooks with: `git commit --no-verify` (use sparingly and run `npm run typecheck && npm run lint && npm run test` manually first).

## Safety, Buildability, Testability

- Logic functions and their types remain unchanged; existing unit tests that import logic directly continue to pass.
- Public schemas shrink; MCP clients see smaller input schemas without session fields.
- Handlers validate with internal schemas after session-defaults merge, preserving runtime guarantees.
- Preflight requirement checks return clear guidance, e.g., "Provide one of: projectPath or workspacePath" + "Set with: session-set-defaults { "projectPath": "..." }".

## Developer Usage

- **Set defaults once**:
  - `session-set-defaults { "workspacePath": "...", "scheme": "App", "simulatorName": "iPhone 16" }`
- **Run tools without args**:
  - `build_sim {}`
- **Inspect/reset**:
  - `session-show-defaults {}`
  - `session-clear-defaults { "all": true }`

## Manual Testing with mcpli (CLI)

The following commands exercise the session workflow end‑to‑end using the built server.

1) Build the server (required after code changes):

```bash
npm run build
```

2) Discover a scheme (optional helper):

```bash
mcpli --raw list-schemes --projectPath "/Volumes/Developer/XcodeBuildMCP/example_projects/iOS/MCPTest.xcodeproj" -- node build/index.js
```

3) Set the session defaults (project/workspace, scheme, and simulator):

```bash
mcpli --raw session-set-defaults \
  --projectPath "/Volumes/Developer/XcodeBuildMCP/example_projects/iOS/MCPTest.xcodeproj" \
  --scheme MCPTest \
  --simulatorName "iPhone 16" \
  -- node build/index.js
```

4) Verify defaults are stored:

```bash
mcpli --raw session-show-defaults -- node build/index.js
```

5) Run a session‑aware tool with zero or minimal args (defaults are merged automatically):

```bash
# Optionally provide a scratch derived data path and a short timeout
mcpli --tool-timeout=60 --raw build_sim --derivedDataPath "/tmp/XBMCP_DD" -- node build/index.js
```

Troubleshooting:

- If you see validation errors like “Missing required session defaults …”, (re)run step 3 with the missing keys.
- If you see connect ECONNREFUSED or the daemon appears flaky:
  - Check logs: `mcpli daemon log --since=10m -- node build/index.js`
  - Restart daemon: `mcpli daemon restart -- node build/index.js`
  - Clean daemon state: `mcpli daemon clean -- node build/index.js` then `mcpli daemon start -- node build/index.js`
  - After code changes, always: `npm run build` then `mcpli daemon restart -- node build/index.js`

Notes:

- Public schemas for session‑aware tools intentionally omit session fields (e.g., `scheme`, `projectPath`, `simulatorName`). Provide them once via `session-set-defaults` and then call the tool with zero/minimal flags.
- Use `--tool-timeout=<seconds>` to cap long‑running builds during manual testing.

## Next Steps

Would you like me to proceed with Phase 1–3 implementation (store + session tools + middleware), then migrate a first tool (build_sim) and run the test suite?