## Goal & constraints (grounded in current code)

Implement a real **`lldb-dap` Debug Adapter Protocol backend** that plugs into the existing debugger architecture without changing MCP tool names/schemas. The DAP backend remains **opt-in only** via `XCODEBUILDMCP_DEBUGGER_BACKEND=dap` (current selection logic in `src/utils/debugger/debugger-manager.ts`).

Key integration points already in place:

- **Backend contract**: `src/utils/debugger/backends/DebuggerBackend.ts`
- **Backend selection & session lifecycle**: `src/utils/debugger/debugger-manager.ts`
- **MCP tool surface area**: `src/mcp/tools/debugging/*` (attach, breakpoints, stack, variables, command, detach)
- **Subprocess patterns**: `src/utils/execution/interactive-process.ts` (interactive, piped stdio, test-safe default spawner)
- **DI/test safety**: defaults throw under Vitest (`getDefaultCommandExecutor`, `getDefaultInteractiveSpawner`)
- **Docs baseline**: `docs/DAP_BACKEND_IMPLEMENTATION_PLAN.md`, `docs/DEBUGGING_ARCHITECTURE.md`

---

## Implementation status (current)

Implemented modules and behavior (as of this document):

- DAP protocol and transport: `src/utils/debugger/dap/types.ts`, `src/utils/debugger/dap/transport.ts`
- Adapter discovery: `src/utils/debugger/dap/adapter-discovery.ts`
- Backend implementation: `src/utils/debugger/backends/dap-backend.ts`
- Conditional breakpoints: backend-level support via `DebuggerBackend.addBreakpoint(..., { condition })`
- Tool updates: `src/mcp/tools/debugging/debug_breakpoint_add.ts` passes conditions to backend
- Health check: `doctor` now reports `lldb-dap` availability
- Tests: DAP transport framing, backend mapping, and debugger manager selection tests

### MCP tool → DAP request mapping (current)

| MCP tool | DebuggerManager call | DAP requests |
| --- | --- | --- |
| `debug_attach_sim` | `createSession` → `attach` | `initialize` → `attach` → `configurationDone` |
| `debug_lldb_command` | `runCommand` | `evaluate` (context: `repl`) |
| `debug_stack` | `getStack` | `threads` → `stackTrace` |
| `debug_variables` | `getVariables` | `threads` → `stackTrace` → `scopes` → `variables` |
| `debug_breakpoint_add` | `addBreakpoint` | `setBreakpoints` / `setFunctionBreakpoints` |
| `debug_breakpoint_remove` | `removeBreakpoint` | `setBreakpoints` / `setFunctionBreakpoints` |
| `debug_detach` | `detach` | `disconnect` |

### Breakpoint strategy (current)

- Breakpoints are stateful: DAP removal re-applies `setBreakpoints`/`setFunctionBreakpoints` with the remaining list.
- Conditions are passed as part of the breakpoint request in both backends:
  - DAP: `breakpoints[].condition` or `functionBreakpoints[].condition`
  - LLDB CLI: `breakpoint modify -c "<condition>" <id>`

---

## Architectural decisions to make (explicit)

### 1) Spawn model: one `lldb-dap` process per debug session
**Decision**: Each `DebuggerManager.createSession()` creates a new backend instance, which owns a single `lldb-dap` subprocess for the lifetime of that session.

- Aligns with current LLDB CLI backend (one long-lived interactive `lldb` per session).
- Keeps multi-session support (`DebuggerManager.sessions: Map`) straightforward.

### 2) Transport abstraction: DAP framing + request correlation in a dedicated module
**Decision**: Build a dedicated DAP transport that:
- implements `Content-Length` framing
- correlates requests/responses by `seq`
- emits DAP events

This keeps `DapBackend` focused on **mapping MCP tool operations → DAP requests**.

### 3) Breakpoint conditions support: move condition handling into the backend API
**Decision**: Extend internal debugger API to support conditional breakpoints *without relying on* “LLDB command follow-ups” (which are CLI-specific).

This avoids depending on DAP `evaluate` for breakpoint modification and keeps semantics consistent across backends.

---

## Implementation plan (by component / file)

### A) Add DAP protocol & transport layer

#### New files

##### 1) `src/utils/debugger/dap/types.ts`
Define minimal DAP types used by the backend (not a full spec).

Example types (illustrative, not exhaustive):

```ts
export type DapRequest<C = unknown> = {
  seq: number;
  type: 'request';
  command: string;
  arguments?: C;
};

export type DapResponse<B = unknown> = {
  seq: number;
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: B;
};

export type DapEvent<B = unknown> = {
  seq: number;
  type: 'event';
  event: string;
  body?: B;
};
```

Also define bodies used in mapping:
- `InitializeResponseBody` (capabilities)
- `ThreadsResponseBody`
- `StackTraceResponseBody`
- `ScopesResponseBody`
- `VariablesResponseBody`
- `SetBreakpointsResponseBody`
- `EvaluateResponseBody`
- event bodies: `StoppedEventBody`, `OutputEventBody`, `TerminatedEventBody`

**Side effects / impact**: none outside debugger subsystem; ensures type safety inside DAP modules.

---

##### 2) `src/utils/debugger/dap/transport.ts`
Implement DAP over stdio.

**Dependencies / imports**
- `node:events` (EventEmitter) or a small typed emitter pattern
- `src/utils/execution/index.ts` for `InteractiveSpawner` and `InteractiveProcess` types
- `src/utils/logging/index.ts` for `log`
- `src/utils/CommandExecutor.ts` type (for adapter discovery helper if kept here)

**Core responsibilities**
- Spawn adapter process (or accept an already spawned `InteractiveProcess`)
- Parse stdout stream into discrete DAP messages using `Content-Length` framing
- Maintain:
  - `nextSeq: number`
  - `pending: Map<number, { resolve, reject, timeout }>` keyed by request `seq`
- Expose:
  - `sendRequest(command, args, opts?) => Promise<body>`
  - event subscription: `onEvent(handler)` or `on('event', ...)`
  - lifecycle: `dispose()` (must not throw)

**Key function signatures**

```ts
export type DapTransportOptions = {
  spawner: InteractiveSpawner;
  adapterCommand: string[]; // e.g. ['xcrun', 'lldb-dap'] or [resolvedPath]
  env?: Record<string, string>;
  cwd?: string;
  logPrefix?: string;
};

export class DapTransport {
  constructor(opts: DapTransportOptions);

  sendRequest<A, B>(
    command: string,
    args?: A,
    opts?: { timeoutMs?: number },
  ): Promise<B>;

  onEvent(handler: (evt: DapEvent) => void): () => void;

  dispose(): void; // best-effort, never throw
}
```

**Framing logic**
- Maintain an internal `Buffer`/string accumulator for stdout.
- Repeatedly:
  - find `\r\n\r\n`
  - parse headers for `Content-Length`
  - wait until body bytes are available
  - `JSON.parse` body into `{ type: 'response' | 'event' | 'request' }`

**Process failure handling**
- On adapter `exit`/`error`, reject all pending requests with a clear error (and include exit detail).
- Log stderr output at `debug` level; do **not** feed stderr into framing.

**Concurrency**
- Transport supports multiple in-flight requests concurrently (DAP allows it).
- Backend may still serialize higher-level operations if stateful.

**Side effects**
- Add a long-lived child process per session.
- Requires careful memory management in the framing buffer (ensure you slice consumed bytes).

---

### B) Adapter discovery (`xcrun --find lldb-dap`)

#### New helper (recommended)
##### 3) `src/utils/debugger/dap/adapter-discovery.ts` (new)
**Purpose**: centralize resolution and produce actionable errors when DAP is explicitly selected but unavailable.

**Uses**
- `CommandExecutor` to run `xcrun --find lldb-dap`
- `log` for diagnostics
- throw a `DependencyError` (from `src/utils/errors.ts`) or plain `Error` with a consistent message

Example signature:

```ts
import type { CommandExecutor } from '../../execution/index.ts';

export async function resolveLldbDapCommand(opts: {
  executor: CommandExecutor;
}): Promise<string[]>;
// returns e.g. ['xcrun', 'lldb-dap'] OR [absolutePath]
```

**Design choice**
- Returning `['xcrun','lldb-dap']` is simplest (no dependency on parsing).
- Returning `[absolutePath]` provides a stronger “tool exists” guarantee.

**Impact**
- Enables a clean error message early in session creation.
- Keeps `DapBackend` simpler.

---

### C) Implement `DapBackend` (current)

#### Modify file: `src/utils/debugger/backends/dap-backend.ts`

**Implemented** as a real backend that:
- discovers adapter (`resolveLldbDapCommand`)
- creates `DapTransport`
- performs DAP handshake (`initialize`)
- attaches by PID (`attach`)
- maps backend interface methods to DAP requests

**Dependencies**
- `DapTransport`
- `resolveLldbDapCommand`
- `getDefaultCommandExecutor` and `getDefaultInteractiveSpawner` (production defaults)
- `log`
- existing backend interface/types

**Constructor / factory**
Update `createDapBackend()` to accept injectable deps, mirroring the CLI backend’s injection style.

```ts
export async function createDapBackend(opts?: {
  executor?: CommandExecutor;
  spawner?: InteractiveSpawner;
  requestTimeoutMs?: number;
}): Promise<DebuggerBackend>;
```

> This is critical for tests because defaults throw under Vitest.

**Session state to maintain inside `DapBackend`**
- `transport: DapTransport | null`
- `attached: boolean`
- `lastStoppedThreadId: number | null`
- `cachedThreads: { id: number; name?: string }[] | null` (optional)
- breakpoint registry:
  - `breakpointsById: Map<number, BreakpointSpec & { condition?: string }>`
  - for DAP “remove breakpoint”, you must re-issue `setBreakpoints`/`setFunctionBreakpoints` with the updated list, so also keep:
    - `fileLineBreakpointsByFile: Map<string, Array<{ line: number; condition?: string; id?: number }>>`
    - `functionBreakpoints: Array<{ name: string; condition?: string; id?: number }>`
- optional cached stack frames from the last `stackTrace` call (for variables lookup)

**Backend lifecycle mapping**
- `attach()`:
  1) spawn `lldb-dap`
  2) `initialize`
  3) `attach` with pid (+ waitFor mapping)
  4) `configurationDone` if required by lldb-dap behavior (plan for it even if no-op)
  5) mark attached

- `detach()`
  - send `disconnect` with `terminateDebuggee: false` (do not kill app)
  - dispose transport / kill process

- `dispose()`
  - best-effort cleanup; **must not throw** (important because `DebuggerManager.createSession` calls dispose to clean up on attach failure)

**Method mappings (MCP tools → DebuggerManager → DapBackend)**

1) `runCommand(command: string, opts?)`
- Map to DAP `evaluate` with `context: 'repl'`
- Return string output from `EvaluateResponse.body.result` and/or `body.output`
- If adapter doesn’t support command-style repl evaluation, return a clear error message suggesting `lldb-cli` backend.

2) `getStack(opts?: { threadIndex?: number; maxFrames?: number })`
- DAP sequence:
  - `threads`
  - select thread:
    - if a `stopped` event has a `threadId`, prefer that when `threadIndex` is undefined
    - else map `threadIndex` to array index (document this)
  - `stackTrace({ threadId, startFrame: 0, levels: maxFrames })`
- Format output as readable text (LLDB-like) to keep tool behavior familiar:
  - `frame #<i>: <name> at <path>:<line>`
- If stackTrace fails due to running state, return a helpful error:
  - “Process is running; pause or hit a breakpoint to fetch stack.”

3) `getVariables(opts?: { frameIndex?: number })`
- DAP sequence:
  - resolve thread as above
  - `stackTrace` to get frames
  - choose frame by `frameIndex` (default 0)
  - `scopes({ frameId })`
  - for each scope: `variables({ variablesReference })`
- Format output as text with sections per scope:
  - `Locals:\n  x = 1\n  y = ...`

4) `addBreakpoint(spec: BreakpointSpec, opts?: { condition?: string })`
- For `file-line`:
  - update `fileLineBreakpointsByFile[file]`
  - call `setBreakpoints({ source: { path: file }, breakpoints: [{ line, condition }] })`
  - parse returned `breakpoints[]` to find matching line and capture `id`
- For `function`:
  - update `functionBreakpoints`
  - call `setFunctionBreakpoints({ breakpoints: [{ name, condition }] })`
- Return `BreakpointInfo`:
  - `id` must be a number (from DAP breakpoint id; if missing, generate a synthetic id and store mapping, but prefer real id)
  - `rawOutput` can be a pretty JSON snippet or a short text summary

5) `removeBreakpoint(id: number)`
- Look up spec in `breakpointsById`
- Remove it from the corresponding registry
- Re-issue `setBreakpoints` or `setFunctionBreakpoints` with the remaining breakpoints
- Return text confirmation

**Important: DAP vs existing condition flow**
- Today `debug_breakpoint_add` sets condition by issuing an LLDB command after creation.
- With the above, condition becomes part of breakpoint creation and removal logic, backend-agnostic.

---

### D) Internal API adjustment for conditional breakpoints (recommended)

#### Modify: `src/utils/debugger/backends/DebuggerBackend.ts`
Update signature:

```ts
addBreakpoint(spec: BreakpointSpec, opts?: { condition?: string }): Promise<BreakpointInfo>;
```

#### Modify: `src/utils/debugger/debugger-manager.ts`
Update method:

```ts
async addBreakpoint(
  id: string | undefined,
  spec: BreakpointSpec,
  opts?: { condition?: string },
): Promise<BreakpointInfo>
```

Pass `opts` through to `backend.addBreakpoint`.

**Impact**
- Requires updating both backends + the tool call site.
- Improves cross-backend compatibility and avoids “DAP evaluate must support breakpoint modify”.

#### Modify: `src/utils/debugger/backends/lldb-cli-backend.ts`
Implement condition via LLDB command internally after breakpoint creation (current behavior, just moved):

- after parsing breakpoint id:
  - if `opts?.condition`, run `breakpoint modify -c "<escaped>" <id>`

This keeps condition support identical for LLDB CLI users.

---

### E) Update MCP tool logic to use new breakpoint API

#### Modify: `src/mcp/tools/debugging/debug_breakpoint_add.ts`
Change logic to pass `condition` into `ctx.debugger.addBreakpoint(...)` and remove the follow-up `breakpoint modify ...` command.

**Before**
- call `addBreakpoint()`
- if condition, call `runCommand("breakpoint modify ...")`

**After**
- call `addBreakpoint(sessionId, spec, { condition })`
- no extra `runCommand` required

**Impact / side effects**
- Output remains the same shape, but the “rawOutput” content for DAP may differ (acceptable).
- Improves backend portability.

---

### F) Backend selection & opt-in behavior (already mostly correct)

#### Modify (optional but recommended): `src/utils/debugger/debugger-manager.ts`
Keep selection rules but improve failure clarity:

- If backend kind is `dap`, and adapter discovery fails, throw an error like:
  - `DAP backend selected but lldb-dap not found. Ensure Xcode is installed and xcrun can locate lldb-dap, or set XCODEBUILDMCP_DEBUGGER_BACKEND=lldb-cli.`

Also ensure that dispose failures do not mask attach failures:
- in `createSession` catch, wrap `dispose()` in its own try/catch (even if backend should not throw).

---

### G) Diagnostics / “doctor” integration (validation surface)

#### Modify: `src/mcp/tools/doctor/doctor.ts` (not shown in provided contents)
Add a DAP capability line:
- `lldb-dap available: yes/no`
- if env selects dap, include a prominent warning/error section when missing

Implementation approach:
- reuse `CommandExecutor` and call `xcrun --find lldb-dap`
- do not fail doctor entirely if missing; just report

**Side effects**
- Improves discoverability and reduces “mystery failures” when users opt into dap.

---

## Concurrency & state management plan

### Transport-level
- Fully concurrent in-flight DAP requests supported via:
  - `seq` generation
  - `pending` map keyed by `seq`
- Each request can set its own timeout (`timeoutMs`).

### Backend-level
Use a serialized queue **only where state mutation occurs**, e.g.:
- updating breakpoint registries
- attach/detach transitions

Pattern (same as LLDB CLI backend):

```ts
private queue: Promise<unknown> = Promise.resolve();

private enqueue<T>(work: () => Promise<T>): Promise<T> { ... }
```

**Reasoning**
- Prevent races such as:
  - addBreakpoint + removeBreakpoint in parallel, reissuing `setBreakpoints` inconsistently.

---

## Error handling & logging strategy

### Error taxonomy (pragmatic, consistent with current tools)
- Backend throws `Error` with clear messages.
- MCP tools already catch and wrap errors via `createErrorResponse(...)`.

### Where to log
- `DapTransport`:
  - `log('debug', ...)` for raw events (optionally gated by env)
  - `log('error', ...)` on process exit while requests are pending
- `DapBackend`:
  - minimal `info` logs on attach/detach
  - `debug` logs for request mapping (command names, not full payloads unless opted in)

### New optional env flags (config plan)
Document these (no need to require them):
- `XCODEBUILDMCP_DAP_REQUEST_TIMEOUT_MS` (default to 30_000)
- `XCODEBUILDMCP_DAP_LOG_EVENTS=true` (default false)

---

## Tests (architecture-aware, DI-compliant)

Even though this is “testing”, it directly impacts design because default spawners/executors throw under Vitest.

### 1) Add a first-class mock interactive spawner utility
#### Modify: `src/test-utils/mock-executors.ts`
Add:

```ts
export function createMockInteractiveSpawner(script: {
  // map writes -> stdout/stderr emissions, or a programmable fake
}): InteractiveSpawner;
```

This avoids ad-hoc manual mocks and matches the project’s “approved mocks live in test-utils” philosophy.

### 2) DAP framing tests
New: `src/utils/debugger/dap/__tests__/transport-framing.test.ts`
- Feed partial header/body chunks into the transport parser using `PassThrough` streams behind a mock InteractiveProcess.
- Assert:
  - correct parsing across chunk boundaries
  - multiple messages in one chunk
  - invalid Content-Length handling

### 3) Backend mapping tests (no real lldb-dap)
New: `src/utils/debugger/backends/__tests__/dap-backend.test.ts`
- Use `createMockExecutor()` to fake adapter discovery.
- Use `createMockInteractiveSpawner()` to simulate an adapter that returns scripted DAP responses:
  - initialize → success
  - attach → success
  - threads/stackTrace/scopes/variables → stable fixtures
- Validate:
  - `getStack()` formatting
  - `getVariables()` formatting
  - breakpoint add/remove registry behavior
  - `dispose()` never throws

### 4) DebuggerManager selection test
New: `src/utils/debugger/__tests__/debugger-manager-dap.test.ts`
- Inject a custom `backendFactory` that returns a fake backend (or the scripted DAP backend) and verify:
  - env selection
  - attach failure triggers dispose
  - current session behavior unchanged

---

## Docs updates (grounded in existing docs)

### 1) Update `docs/DAP_BACKEND_IMPLEMENTATION_PLAN.md`
Replace/extend the existing outline with the following:
- finalized module list (`dap/types.ts`, `dap/transport.ts`, discovery helper)
- breakpoint strategy (stateful re-issue `setBreakpoints`)
- explicit mapping table per MCP tool

### 2) Update `docs/DEBUGGING_ARCHITECTURE.md`
Add a section “DAP Backend (lldb-dap)”:
- how it’s selected (opt-in)
- differences vs LLDB CLI (structured stack/variables, breakpoint reapplication)
- note about process state (stack/variables usually require stopped context)
- explain that conditional breakpoints are implemented backend-side

---

## Configuration & validation steps (manual / operational)

### Validation steps (local)
1. Ensure `lldb-dap` is discoverable:
   - `xcrun --find lldb-dap`
2. Run server with DAP enabled:
   - `XCODEBUILDMCP_DEBUGGER_BACKEND=dap node build/index.js mcp`
3. Use existing MCP tool flow:
   - `debug_attach_sim` (attach by PID or bundleId)
   - `debug_breakpoint_add` (with condition)
   - trigger breakpoint (or pause via `debug_lldb_command` if implemented via evaluate)
   - `debug_stack`, `debug_variables`
   - `debug_detach`

### Expected behavioral constraints to document
- If the target is running and no stop context exists, DAP `stackTrace`/`variables` may fail; return guidance in tool output (“pause or set breakpoint”).

---

## Summary of files modified / added

### Add
- `src/utils/debugger/dap/types.ts`
- `src/utils/debugger/dap/transport.ts`
- `src/utils/debugger/dap/adapter-discovery.ts` (recommended)

### Modify
- `src/utils/debugger/backends/dap-backend.ts` (real implementation)
- `src/utils/debugger/backends/DebuggerBackend.ts` (add breakpoint condition option)
- `src/utils/debugger/backends/lldb-cli-backend.ts` (support condition via new opts)
- `src/utils/debugger/debugger-manager.ts` (pass-through opts; optional improved error handling)
- `src/mcp/tools/debugging/debug_breakpoint_add.ts` (use backend-level condition support)
- `src/mcp/tools/doctor/doctor.ts` (report `lldb-dap` availability)
- `docs/DAP_BACKEND_IMPLEMENTATION_PLAN.md`
- `docs/DEBUGGING_ARCHITECTURE.md`
- `src/test-utils/mock-executors.ts` (add mock interactive spawner)

---

## Critical “don’t miss” requirements
- `dispose()` in DAP backend and transport must be **best-effort and never throw** because `DebuggerManager.createSession()` will call dispose on attach failure.
- Avoid any use of default executors/spawners in tests; ensure `createDapBackend()` accepts injected `executor` + `spawner`.
- Breakpoint removal requires stateful re-application with `setBreakpoints` / `setFunctionBreakpoints`; plan for breakpoint registries from day one.
