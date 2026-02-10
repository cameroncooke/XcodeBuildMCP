# XcodeBuildMCP CLI Conversion Plan

This document outlines the architectural plan to convert XcodeBuildMCP into a first-class CLI tool (`xcodebuildcli`) while maintaining full MCP server compatibility.

## Overview

### Goals

1. **First-class CLI**: Separate CLI binary (`xcodebuildcli`) that invokes tools and exits
2. **MCP server unchanged**: `xcodebuildmcp` remains the long-lived stdio MCP server
3. **Shared tool logic**: All three runtimes (MCP, CLI, daemon) invoke the same underlying tool handlers
4. **Session defaults parity**: Identical behavior in all modes
5. **Stateful operation support**: Full daemon architecture for log capture, video recording, debugging, SwiftPM background

### Non-Goals

- Breaking existing MCP client integrations
- Changing the MCP protocol or tool schemas
- Wrapping MCP inside CLI (architecturally wrong)

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CLI Framework | yargs | Better dynamic command generation, strict validation, array support |
| Stateful Support | Full daemon | Unix domain socket for complete multi-step stateful operations |
| Daemon Communication | Unix domain socket | macOS only, simple protocol, reliable |
| Stateful Tools Priority | All equally | Logging, video, debugging, SwiftPM all route to daemon |
| Tool Name Format | kebab-case | CLI-friendly, disambiguated when collisions exist |
| CLI Binary Name | `xcodebuildcli` | Distinct from MCP server binary |

---

## Target Runtime Model

### Entry Points

| Binary | Entry Point | Description |
|--------|-------------|-------------|
| `xcodebuildmcp` | `src/index.ts` | MCP server (stdio, long-lived) - unchanged |
| `xcodebuildcli` | `src/cli.ts` | CLI (short-lived, exits after action) |
| Internal | `src/daemon.ts` | Daemon (Unix socket server, long-lived) |

### Execution Modes

- **Stateless tools**: CLI runs tools **in-process** by default (fast path)
- **Stateful tools** (log capture, video, debugging, SwiftPM background): CLI routes to **daemon** over Unix domain socket

### Naming Rules

- CLI tool names are **kebab-case**
- Internal MCP tool names remain **unchanged** (e.g., `build_sim`, `start_sim_log_cap`)
- CLI tool names are **derived** from MCP tool names, **disambiguated** when duplicates exist

**Disambiguation rule:**
- If a tool's kebab-name is unique across enabled workflows: use it (e.g., `build-sim`)
- If duplicated across workflows (e.g., `clean` exists in multiple): CLI name becomes `<workflow>-<tool>` (e.g., `simulator-clean`, `device-clean`)

---

## Directory Structure

### New Files

```
src/
  cli.ts                           # xcodebuildcli entry point (yargs)
  daemon.ts                        # daemon entry point (unix socket server)
  runtime/
    bootstrap-runtime.ts           # shared runtime bootstrap (config + session defaults)
    naming.ts                      # kebab-case + disambiguation + arg key transforms
    tool-catalog.ts                # loads workflows/tools, builds ToolCatalog with cliName mapping
    tool-invoker.ts                # shared "invoke tool by cliName" implementation
    types.ts                       # shared core interfaces (ToolDefinition, ToolCatalog, Invoker)
  daemon/
    protocol.ts                    # daemon protocol types (request/response, errors)
    framing.ts                     # length-prefixed framing helpers for net.Socket
    socket-path.ts                 # resolves default socket path + ensures dirs + cleanup
    daemon-server.ts               # Unix socket server + request router
  cli/
    yargs-app.ts                   # builds yargs instance, registers commands
    daemon-client.ts               # CLI -> daemon client (unix socket, protocol)
    commands/
      daemon.ts                    # yargs commands: daemon start/stop/status/restart
      tools.ts                     # yargs command: tools (list available tool commands)
    register-tool-commands.ts      # auto-register tool commands from schemas
    schema-to-yargs.ts             # converts Zod schema shape -> yargs options
    output.ts                      # prints ToolResponse to terminal
```

### Modified Files

- `src/server/bootstrap.ts` - Refactor to use shared runtime bootstrap
- `src/core/plugin-types.ts` - Extend `PluginMeta` with optional CLI metadata
- `tsup.config.ts` - Add `cli` and `daemon` entries
- `package.json` - Add `xcodebuildcli` bin, add yargs dependency

---

## Core Interfaces

### Tool Definition and Catalog

**File:** `src/runtime/types.ts`

```typescript
import type * as z from 'zod';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ToolResponse } from '../types/common.ts';
import type { ToolSchemaShape, PluginMeta } from '../core/plugin-types.ts';

export type RuntimeKind = 'cli' | 'daemon' | 'mcp';

export interface ToolDefinition {
  /** Stable CLI command name (kebab-case, disambiguated) */
  cliName: string;

  /** Original MCP tool name as declared today (unchanged) */
  mcpName: string;

  /** Workflow directory name (e.g., "simulator", "device", "logging") */
  workflow: string;

  description?: string;
  annotations?: ToolAnnotations;

  /**
   * Schema shape used to generate yargs flags for CLI.
   * Must include ALL parameters (not the session-default-hidden version).
   */
  cliSchema: ToolSchemaShape;

  /**
   * Schema shape used for MCP registration (what you already have).
   */
  mcpSchema: ToolSchemaShape;

  /**
   * Whether CLI MUST route this tool to the daemon (stateful operations).
   */
  stateful: boolean;

  /**
   * Shared handler (same used by MCP today). No duplication.
   */
  handler: PluginMeta['handler'];
}

export interface ToolCatalog {
  tools: ToolDefinition[];
  getByCliName(name: string): ToolDefinition | null;
  resolve(input: string): { tool?: ToolDefinition; ambiguous?: string[]; notFound?: boolean };
}

export interface InvokeOptions {
  runtime: RuntimeKind;
  enabledWorkflows?: string[];
  forceDaemon?: boolean;
  socketPath?: string;
}

export interface ToolInvoker {
  invoke(toolName: string, args: Record<string, unknown>, opts: InvokeOptions): Promise<ToolResponse>;
}
```

### Plugin CLI Metadata Extension

**File:** `src/core/plugin-types.ts` (modify)

```typescript
export interface PluginCliMeta {
  /** Optional override of derived CLI name */
  name?: string;
  /** Full schema shape for CLI flag generation (legacy, includes session-managed fields) */
  schema?: ToolSchemaShape;
  /** Mark tool as requiring daemon routing */
  stateful?: boolean;
}

export interface PluginMeta {
  readonly name: string;
  readonly schema: ToolSchemaShape;
  readonly description?: string;
  readonly annotations?: ToolAnnotations;
  readonly cli?: PluginCliMeta;          // NEW (optional)
  handler(params: Record<string, unknown>): Promise<ToolResponse>;
}
```

### Daemon Protocol

**File:** `src/daemon/protocol.ts`

```typescript
export const DAEMON_PROTOCOL_VERSION = 1 as const;

export type DaemonMethod =
  | 'daemon.status'
  | 'daemon.stop'
  | 'tool.list'
  | 'tool.invoke';

export interface DaemonRequest<TParams = unknown> {
  v: typeof DAEMON_PROTOCOL_VERSION;
  id: string;
  method: DaemonMethod;
  params?: TParams;
}

export type DaemonErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'AMBIGUOUS_TOOL'
  | 'TOOL_FAILED'
  | 'INTERNAL';

export interface DaemonError {
  code: DaemonErrorCode;
  message: string;
  data?: unknown;
}

export interface DaemonResponse<TResult = unknown> {
  v: typeof DAEMON_PROTOCOL_VERSION;
  id: string;
  result?: TResult;
  error?: DaemonError;
}

export interface ToolInvokeParams {
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolInvokeResult {
  response: unknown;
}

export interface DaemonStatusResult {
  pid: number;
  socketPath: string;
  startedAt: string;
  enabledWorkflows: string[];
  toolCount: number;
}
```

---

## Shared Runtime Bootstrap

**File:** `src/runtime/bootstrap-runtime.ts`

```typescript
import process from 'node:process';
import { initConfigStore, getConfig, type RuntimeConfigOverrides } from '../utils/config-store.ts';
import { sessionStore } from '../utils/session-store.ts';
import { getDefaultFileSystemExecutor } from '../utils/command.ts';
import type { FileSystemExecutor } from '../utils/FileSystemExecutor.ts';
import type { RuntimeKind } from './types.ts';

export interface BootstrapRuntimeOptions {
  runtime: RuntimeKind;
  cwd?: string;
  fs?: FileSystemExecutor;
  configOverrides?: RuntimeConfigOverrides;
}

export interface BootstrappedRuntime {
  runtime: RuntimeKind;
  cwd: string;
  config: ReturnType<typeof getConfig>;
}

export async function bootstrapRuntime(opts: BootstrapRuntimeOptions): Promise<BootstrappedRuntime> {
  const cwd = opts.cwd ?? process.cwd();
  const fs = opts.fs ?? getDefaultFileSystemExecutor();

  await initConfigStore({ cwd, fs, overrides: opts.configOverrides });

  const config = getConfig();

  const defaults = config.sessionDefaults ?? {};
  if (Object.keys(defaults).length > 0) {
    sessionStore.setDefaults(defaults);
  }

  return { runtime: opts.runtime, cwd, config };
}
```

---

## Tool Catalog

**File:** `src/runtime/tool-catalog.ts`

```typescript
import { loadWorkflowGroups } from '../core/plugin-registry.ts';
import { resolveSelectedWorkflows } from '../utils/workflow-selection.ts';
import type { ToolCatalog, ToolDefinition } from './types.ts';
import { toKebabCase, disambiguateCliNames } from './naming.ts';

export async function buildToolCatalog(opts: {
  enabledWorkflows: string[];
}): Promise<ToolCatalog> {
  const workflowGroups = await loadWorkflowGroups();
  const selection = resolveSelectedWorkflows(opts.enabledWorkflows, workflowGroups);

  const tools: ToolDefinition[] = [];

  for (const wf of selection.selectedWorkflows) {
    for (const tool of wf.tools) {
      const baseCliName = tool.cli?.name ?? toKebabCase(tool.name);
      tools.push({
        cliName: baseCliName,
        mcpName: tool.name,
        workflow: wf.directoryName,
        description: tool.description,
        annotations: tool.annotations,
        mcpSchema: tool.schema,
        cliSchema: tool.cli?.schema ?? tool.schema,
        stateful: Boolean(tool.cli?.stateful),
        handler: tool.handler,
      });
    }
  }

  const disambiguated = disambiguateCliNames(tools);

  return {
    tools: disambiguated,
    getByCliName(name) {
      return disambiguated.find((t) => t.cliName === name) ?? null;
    },
    resolve(input) {
      const exact = disambiguated.filter((t) => t.cliName === input);
      if (exact.length === 1) return { tool: exact[0] };

      const aliasMatches = disambiguated.filter((t) => toKebabCase(t.mcpName) === input);
      if (aliasMatches.length === 1) return { tool: aliasMatches[0] };
      if (aliasMatches.length > 1) return { ambiguous: aliasMatches.map((t) => t.cliName) };

      return { notFound: true };
    },
  };
}
```

**File:** `src/runtime/naming.ts`

```typescript
import type { ToolDefinition } from './types.ts';

export function toKebabCase(name: string): string {
  return name
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[A-Z]/g, (m) => m.toLowerCase())
    .toLowerCase();
}

export function disambiguateCliNames(tools: ToolDefinition[]): ToolDefinition[] {
  const groups = new Map<string, ToolDefinition[]>();
  for (const t of tools) {
    groups.set(t.cliName, [...(groups.get(t.cliName) ?? []), t]);
  }

  return tools.map((t) => {
    const same = groups.get(t.cliName) ?? [];
    if (same.length <= 1) return t;
    return { ...t, cliName: `${t.workflow}-${t.cliName}` };
  });
}
```

---

## Daemon Architecture

### Socket Path

**File:** `src/daemon/socket-path.ts`

```typescript
import { mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function defaultSocketPath(): string {
  return join(homedir(), '.xcodebuildcli', 'daemon.sock');
}

export function ensureSocketDir(socketPath: string): void {
  const dir = socketPath.split('/').slice(0, -1).join('/');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function removeStaleSocket(socketPath: string): void {
  if (existsSync(socketPath)) unlinkSync(socketPath);
}
```

### Length-Prefixed Framing

**File:** `src/daemon/framing.ts`

```typescript
import type net from 'node:net';

export function writeFrame(socket: net.Socket, obj: unknown): void {
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(json.length, 0);
  socket.write(Buffer.concat([header, json]));
}

export function createFrameReader(onMessage: (msg: unknown) => void) {
  let buffer = Buffer.alloc(0);

  return (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const len = buffer.readUInt32BE(0);
      if (buffer.length < 4 + len) return;

      const payload = buffer.subarray(4, 4 + len);
      buffer = buffer.subarray(4 + len);

      const msg = JSON.parse(payload.toString('utf8'));
      onMessage(msg);
    }
  };
}
```

### Daemon Server

**File:** `src/daemon/daemon-server.ts`

```typescript
import net from 'node:net';
import { writeFrame, createFrameReader } from './framing.ts';
import type { ToolCatalog } from '../runtime/types.ts';
import type { DaemonRequest, DaemonResponse, ToolInvokeParams } from './protocol.ts';
import { DAEMON_PROTOCOL_VERSION } from './protocol.ts';
import { DefaultToolInvoker } from '../runtime/tool-invoker.ts';

export interface DaemonServerContext {
  socketPath: string;
  startedAt: string;
  enabledWorkflows: string[];
  catalog: ToolCatalog;
}

export function startDaemonServer(ctx: DaemonServerContext): net.Server {
  const invoker = new DefaultToolInvoker(ctx.catalog);

  const server = net.createServer((socket) => {
    const onData = createFrameReader(async (msg) => {
      const req = msg as DaemonRequest;
      const base = { v: DAEMON_PROTOCOL_VERSION, id: req?.id ?? 'unknown' };

      try {
        if (req.v !== DAEMON_PROTOCOL_VERSION) {
          return writeFrame(socket, { ...base, error: { code: 'BAD_REQUEST', message: 'Unsupported protocol version' } });
        }

        switch (req.method) {
          case 'daemon.status':
            return writeFrame(socket, {
              ...base,
              result: {
                pid: process.pid,
                socketPath: ctx.socketPath,
                startedAt: ctx.startedAt,
                enabledWorkflows: ctx.enabledWorkflows,
                toolCount: ctx.catalog.tools.length,
              },
            });

          case 'daemon.stop':
            writeFrame(socket, { ...base, result: { ok: true } });
            server.close(() => process.exit(0));
            return;

          case 'tool.list':
            return writeFrame(socket, {
              ...base,
              result: ctx.catalog.tools.map((t) => ({
                name: t.cliName,
                workflow: t.workflow,
                description: t.description ?? '',
                stateful: t.stateful,
              })),
            });

          case 'tool.invoke': {
            const params = req.params as ToolInvokeParams;
            const response = await invoker.invoke(params.tool, params.args ?? {}, {
              runtime: 'daemon',
              enabledWorkflows: ctx.enabledWorkflows,
            });
            return writeFrame(socket, { ...base, result: { response } });
          }

          default:
            return writeFrame(socket, { ...base, error: { code: 'BAD_REQUEST', message: `Unknown method` } });
        }
      } catch (error) {
        return writeFrame(socket, {
          ...base,
          error: { code: 'INTERNAL', message: error instanceof Error ? error.message : String(error) },
        });
      }
    });

    socket.on('data', onData);
  });

  return server;
}
```

### Daemon Entry Point

**File:** `src/daemon.ts`

```typescript
#!/usr/bin/env node
import net from 'node:net';
import { bootstrapRuntime } from './runtime/bootstrap-runtime.ts';
import { buildToolCatalog } from './runtime/tool-catalog.ts';
import { ensureSocketDir, defaultSocketPath, removeStaleSocket } from './daemon/socket-path.ts';
import { startDaemonServer } from './daemon/daemon-server.ts';

async function main(): Promise<void> {
  const runtime = await bootstrapRuntime({ runtime: 'daemon' });
  const socketPath = process.env.XCODEBUILDCLI_SOCKET ?? defaultSocketPath();

  ensureSocketDir(socketPath);

  try {
    await new Promise<void>((resolve, reject) => {
      const s = net.createConnection(socketPath, () => {
        s.end();
        reject(new Error('Daemon already running'));
      });
      s.on('error', () => resolve());
    });
  } catch (e) {
    throw e;
  }

  removeStaleSocket(socketPath);

  const catalog = await buildToolCatalog({ enabledWorkflows: runtime.config.enabledWorkflows });

  const server = startDaemonServer({
    socketPath,
    startedAt: new Date().toISOString(),
    enabledWorkflows: runtime.config.enabledWorkflows,
    catalog,
  });

  server.listen(socketPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## CLI Architecture

### CLI Entry Point

**File:** `src/cli.ts`

```typescript
#!/usr/bin/env node
import { bootstrapRuntime } from './runtime/bootstrap-runtime.ts';
import { buildToolCatalog } from './runtime/tool-catalog.ts';
import { buildYargsApp } from './cli/yargs-app.ts';

async function main(): Promise<void> {
  const runtime = await bootstrapRuntime({ runtime: 'cli' });
  const catalog = await buildToolCatalog({ enabledWorkflows: runtime.config.enabledWorkflows });

  const yargsApp = buildYargsApp({ catalog, runtimeConfig: runtime.config });
  await yargsApp.parseAsync();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### Yargs App

**File:** `src/cli/yargs-app.ts`

```typescript
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ToolCatalog } from '../runtime/types.ts';
import { registerDaemonCommands } from './commands/daemon.ts';
import { registerToolsCommand } from './commands/tools.ts';
import { registerToolCommands } from './register-tool-commands.ts';
import { version } from '../version.ts';

export function buildYargsApp(opts: {
  catalog: ToolCatalog;
  runtimeConfig: { enabledWorkflows: string[] };
}) {
  const app = yargs(hideBin(process.argv))
    .scriptName('xcodebuildcli')
    .strict()
    .recommendCommands()
    .wrap(Math.min(120, yargs.terminalWidth()))
    .parserConfiguration({
      'camel-case-expansion': true,
      'strip-dashed': true,
    })
    .option('socket', {
      type: 'string',
      describe: 'Override daemon unix socket path',
      default: process.env.XCODEBUILDCLI_SOCKET,
    })
    .option('daemon', {
      type: 'boolean',
      describe: 'Force daemon execution even for stateless tools',
      default: false,
    })
    .version(version)
    .help();

  registerDaemonCommands(app);
  registerToolsCommand(app, opts.catalog);
  registerToolCommands(app, opts.catalog);

  return app;
}
```

### Schema to Yargs Conversion

**File:** `src/cli/schema-to-yargs.ts`

```typescript
import * as z from 'zod';

export type YargsOpt =
  | { type: 'string'; array?: boolean; choices?: string[]; describe?: string }
  | { type: 'number'; array?: boolean; describe?: string }
  | { type: 'boolean'; describe?: string };

function unwrap(t: z.ZodTypeAny): z.ZodTypeAny {
  if (t instanceof z.ZodOptional) return unwrap(t.unwrap());
  if (t instanceof z.ZodNullable) return unwrap(t.unwrap());
  if (t instanceof z.ZodDefault) return unwrap(t.removeDefault());
  if (t instanceof z.ZodEffects) return unwrap(t.innerType());
  return t;
}

export function zodToYargsOption(t: z.ZodTypeAny): YargsOpt | null {
  const u = unwrap(t);

  if (u instanceof z.ZodString) return { type: 'string' };
  if (u instanceof z.ZodNumber) return { type: 'number' };
  if (u instanceof z.ZodBoolean) return { type: 'boolean' };

  if (u instanceof z.ZodEnum) return { type: 'string', choices: u.options };
  if (u instanceof z.ZodNativeEnum) return { type: 'string', choices: Object.values(u.enum) as string[] };

  if (u instanceof z.ZodArray) {
    const inner = unwrap(u.element);
    if (inner instanceof z.ZodString) return { type: 'string', array: true };
    if (inner instanceof z.ZodNumber) return { type: 'number', array: true };
    return null;
  }

  return null;
}
```

### Tool Command Registration

**File:** `src/cli/register-tool-commands.ts`

```typescript
import type { Argv } from 'yargs';
import type { ToolCatalog } from '../runtime/types.ts';
import { DefaultToolInvoker } from '../runtime/tool-invoker.ts';
import { zodToYargsOption } from './schema-to-yargs.ts';
import { toKebabCase } from '../runtime/naming.ts';
import { printToolResponse } from './output.ts';

export function registerToolCommands(app: Argv, catalog: ToolCatalog): void {
  const invoker = new DefaultToolInvoker(catalog);

  for (const tool of catalog.tools) {
    app.command(
      tool.cliName,
      tool.description ?? '',
      (y) => {
        y.option('json', {
          type: 'string',
          describe: 'JSON object of tool args (merged with flags)',
        });

        for (const [key, zt] of Object.entries(tool.cliSchema)) {
          const opt = zodToYargsOption(zt as z.ZodTypeAny);
          if (!opt) continue;

          const flag = toKebabCase(key);
          y.option(flag, {
            type: opt.type,
            array: (opt as { array?: boolean }).array,
            choices: (opt as { choices?: string[] }).choices,
            describe: (opt as { describe?: string }).describe,
          });
        }

        return y;
      },
      async (argv) => {
        const { json, socket, daemon, _, $0, ...rest } = argv as Record<string, unknown>;

        const jsonArgs = json ? (JSON.parse(String(json)) as Record<string, unknown>) : {};
        const flagArgs = rest as Record<string, unknown>;
        const args = { ...flagArgs, ...jsonArgs };

        const response = await invoker.invoke(tool.cliName, args, {
          runtime: 'cli',
          forceDaemon: Boolean(daemon),
          socketPath: socket as string | undefined,
        });

        printToolResponse(response);
      },
    );
  }
}
```

### CLI Output

**File:** `src/cli/output.ts`

```typescript
import type { ToolResponse } from '../types/common.ts';

export function printToolResponse(res: ToolResponse): void {
  for (const item of res.content ?? []) {
    if (item.type === 'text') {
      console.log(item.text);
    } else if (item.type === 'image') {
      console.log(`[image ${item.mimeType}, ${item.data.length} bytes base64]`);
    }
  }
  if (res.isError) process.exitCode = 1;
}
```

---

## Build Configuration

### tsup.config.ts

```typescript
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'doctor-cli': 'src/doctor-cli.ts',
    cli: 'src/cli.ts',
    daemon: 'src/daemon.ts',
  },
  // ...existing config...
});
```

### package.json

```json
{
  "bin": {
    "xcodebuildmcp": "build/cli.js",
    "xcodebuildmcp-doctor": "build/doctor-cli.js",
    "xcodebuildcli": "build/cli.js"
  },
  "dependencies": {
    "yargs": "^17.7.2"
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation

1. Add `src/runtime/bootstrap-runtime.ts`
2. Refactor `src/server/bootstrap.ts` to call shared bootstrap
3. Add `src/cli.ts`, `src/daemon.ts` entries to `tsup.config.ts`
4. Add `xcodebuildcli` bin + `yargs` dependency in `package.json`

**Result:** Builds produce `build/cli.js` and `build/daemon.js`, MCP server unchanged.

### Phase 2: Tool Catalog + Direct CLI Invocation (Stateless)

1. Implement `src/runtime/naming.ts`, `src/runtime/tool-catalog.ts`, `src/runtime/tool-invoker.ts`, `src/runtime/types.ts`
2. Implement `src/cli/yargs-app.ts`, `src/cli/schema-to-yargs.ts`, `src/cli/register-tool-commands.ts`, `src/cli/output.ts`
3. Add `xcodebuildcli tools` list command

**Result:** `xcodebuildcli <tool>` works for stateless tools in-process.

### Phase 3: Daemon Protocol + Server + Client

1. Implement `src/daemon/protocol.ts`, `src/daemon/framing.ts`, `src/daemon/socket-path.ts`
2. Implement `src/daemon/daemon-server.ts` and wire into `src/daemon.ts`
3. Implement `src/cli/daemon-client.ts`
4. Implement `xcodebuildcli daemon start|stop|status|restart`

**Result:** Daemon starts, responds to status, can invoke tools.

### Phase 4: Stateful Routing

1. Add `cli.stateful = true` metadata to all stateful tools (logging, video, debugging, swift-package background)
2. Modify `DefaultToolInvoker` to require daemon when `tool.stateful === true`
3. Add CLI auto-start behavior: if daemon required and not running, start it programmatically

**Result:** Stateful commands run through daemon reliably; state persists across CLI invocations.

### Phase 5: Full CLI Schema Coverage

1. For all tools, ensure `tool.cli.schema` is present and complete
2. Ensure schema-to-yargs supports all Zod types used (string/number/boolean/enum/array)
3. Require complex/nested values via `--json` fallback

**Result:** CLI is first-class with full native flags.

---

## Command Examples

```bash
# List available tools
xcodebuildcli tools

# Run stateless tool with native flags
xcodebuildcli build-sim --scheme MyApp --project-path ./App.xcodeproj

# Run tool with JSON input
xcodebuildcli build-sim --json '{"scheme":"MyApp"}'

# Daemon management
xcodebuildcli daemon start
xcodebuildcli daemon status
xcodebuildcli daemon stop

# Stateful tools (automatically route to daemon)
xcodebuildcli start-sim-log-cap --simulator-id ABCD-1234
xcodebuildcli stop-sim-log-cap --session-id xyz

# Force daemon execution for any tool
xcodebuildcli build-sim --daemon --scheme MyApp

# Help
xcodebuildcli --help
xcodebuildcli build-sim --help
```

---

## Invariants

1. **MCP unchanged**: `xcodebuildmcp` continues to work exactly as before
2. **Build/runtime separation unchanged**: MCP and CLI continue to use shared tool handlers
3. **No code duplication**: CLI invokes same `PluginMeta.handler` functions
4. **Session defaults identical**: All runtimes use `bootstrapRuntime()` → `sessionStore`
5. **Tool logic shared**: `src/mcp/tools/*` remains single source of truth
6. **Daemon is macOS-only**: Uses Unix domain sockets; CLI fails with clear error on non-macOS
