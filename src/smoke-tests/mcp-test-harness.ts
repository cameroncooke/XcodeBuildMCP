import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ChildProcess } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CommandExecutor, CommandResponse } from '../utils/CommandExecutor.ts';
import {
  __setTestCommandExecutorOverride,
  __setTestFileSystemExecutorOverride,
  __clearTestExecutorOverrides,
} from '../utils/command.ts';
import {
  __resetConfigStoreForTests,
  initConfigStore,
  type RuntimeConfigOverrides,
} from '../utils/config-store.ts';
import { __resetServerStateForTests } from '../server/server-state.ts';
import { __resetToolRegistryForTests } from '../utils/tool-registry.ts';
import { createMockFileSystemExecutor } from '../test-utils/mock-executors.ts';
import { createServer } from '../server/server.ts';
import { bootstrapServer } from '../server/bootstrap.ts';
import { sessionStore } from '../utils/session-store.ts';
import {
  __setTestDebuggerToolContextOverride,
  __clearTestDebuggerToolContextOverride,
  DebuggerManager,
} from '../utils/debugger/index.ts';
import { getPackageRoot } from '../core/manifest/load-manifest.ts';
import { shutdownXcodeToolsBridge } from '../integrations/xcode-tools-bridge/index.ts';

export interface CapturedCommand {
  command: string[];
  logPrefix?: string;
  useShell?: boolean;
  opts?: { env?: Record<string, string>; cwd?: string };
  detached?: boolean;
}

export interface McpTestHarness {
  client: Client;
  capturedCommands: CapturedCommand[];
  cleanup(): Promise<void>;
}

export interface McpTestHarnessOptions {
  enabledWorkflows?: string[];
  commandResponses?: Record<string, { success: boolean; output: string }>;
}

const defaultCommandResponse: CommandResponse = {
  success: true,
  output: '',
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  process: { pid: 99999 } as ChildProcess,
  exitCode: 0,
};

export async function createMcpTestHarness(opts?: McpTestHarnessOptions): Promise<McpTestHarness> {
  const capturedCommands: CapturedCommand[] = [];

  const capturingExecutor: CommandExecutor = async (
    command,
    logPrefix,
    useShell,
    execOpts,
    detached,
  ) => {
    capturedCommands.push({ command, logPrefix, useShell, opts: execOpts, detached });

    if (opts?.commandResponses) {
      const commandStr = command.join(' ');
      for (const [pattern, response] of Object.entries(opts.commandResponses)) {
        if (commandStr.includes(pattern)) {
          return {
            ...defaultCommandResponse,
            ...response,
          };
        }
      }
    }

    return defaultCommandResponse;
  };

  // Reset all singletons
  __resetConfigStoreForTests();
  __resetServerStateForTests();
  __resetToolRegistryForTests();
  sessionStore.clear();

  // Set executor overrides on the vitest-resolved source modules
  __setTestCommandExecutorOverride(capturingExecutor);
  __setTestFileSystemExecutorOverride(createMockFileSystemExecutor());

  // Also set overrides on the built module instances (used by dynamically imported tool handlers)
  const buildRoot = resolve(getPackageRoot(), 'build');
  const builtCommandModule = (await import(
    pathToFileURL(resolve(buildRoot, 'utils/command.js')).href
  )) as {
    __setTestCommandExecutorOverride: typeof __setTestCommandExecutorOverride;
    __setTestFileSystemExecutorOverride: typeof __setTestFileSystemExecutorOverride;
    __clearTestExecutorOverrides: typeof __clearTestExecutorOverrides;
  };
  builtCommandModule.__setTestCommandExecutorOverride(capturingExecutor);
  builtCommandModule.__setTestFileSystemExecutorOverride(createMockFileSystemExecutor());

  // Set debugger tool context override (source module)
  __setTestDebuggerToolContextOverride({
    executor: capturingExecutor,
    debugger: new DebuggerManager(),
  });

  // Set debugger tool context override (built module)
  const builtDebuggerModule = (await import(
    pathToFileURL(resolve(buildRoot, 'utils/debugger/tool-context.js')).href
  )) as {
    __setTestDebuggerToolContextOverride: typeof __setTestDebuggerToolContextOverride;
    __clearTestDebuggerToolContextOverride: typeof __clearTestDebuggerToolContextOverride;
  };
  builtDebuggerModule.__setTestDebuggerToolContextOverride({
    executor: capturingExecutor,
    debugger: new DebuggerManager(),
  });

  // Initialize the built config-store module (separate singleton from source module).
  // Tool modules loaded from build/ use this config store for schema resolution
  // (e.g. session-aware vs legacy schema selection) and requirement validation.
  const builtConfigStoreModule = (await import(
    pathToFileURL(resolve(buildRoot, 'utils/config-store.js')).href
  )) as {
    __resetConfigStoreForTests: typeof __resetConfigStoreForTests;
    initConfigStore: typeof initConfigStore;
  };
  builtConfigStoreModule.__resetConfigStoreForTests();
  const mockFs = createMockFileSystemExecutor();
  await builtConfigStoreModule.initConfigStore({
    cwd: '/test',
    fs: mockFs,
    overrides: {
      debug: true,
      disableXcodeAutoSync: true,
    } satisfies RuntimeConfigOverrides,
  });

  // Import the built session-store module (separate singleton from source module).
  // Session-aware tool handlers in build/ read/write defaults via this store.
  const builtSessionStoreModule = (await import(
    pathToFileURL(resolve(buildRoot, 'utils/session-store.js')).href
  )) as {
    sessionStore: typeof sessionStore;
  };
  builtSessionStoreModule.sessionStore.clear();

  // Create server (uses the real createServer + manifest system)
  const server = createServer();

  // Bootstrap with workflows enabled for maximum coverage.
  // xcode-ide is excluded: it connects to the real Xcode tools bridge MCP
  // server which triggers system permission prompts and requires Xcode.
  const allWorkflows = opts?.enabledWorkflows ?? [
    'simulator',
    'simulator-management',
    'device',
    'macos',
    'project-discovery',
    'project-scaffolding',
    'session-management',
    'swift-package',
    'logging',
    'debugging',
    'ui-automation',
    'utilities',
    'workflow-discovery',
    'doctor',
  ];

  await bootstrapServer(server, {
    enabledWorkflows: allWorkflows,
    configOverrides: {
      debug: true,
      disableXcodeAutoSync: true,
    },
    fileSystemExecutor: createMockFileSystemExecutor(),
  });

  // Create InMemoryTransport linked pair
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  // Connect server to one end
  await server.connect(serverTransport);

  // Create and connect client to the other end
  const client = new Client({ name: 'e2e-test-client', version: '1.0.0' });
  await client.connect(clientTransport);

  return {
    client,
    capturedCommands,
    async cleanup(): Promise<void> {
      await client.close();
      await server.close();
      await shutdownXcodeToolsBridge();
      __clearTestExecutorOverrides();
      builtCommandModule.__clearTestExecutorOverrides();
      __clearTestDebuggerToolContextOverride();
      builtDebuggerModule.__clearTestDebuggerToolContextOverride();
      __resetConfigStoreForTests();
      builtConfigStoreModule.__resetConfigStoreForTests();
      __resetServerStateForTests();
      __resetToolRegistryForTests();
      sessionStore.clear();
      builtSessionStoreModule.sessionStore.clear();
    },
  };
}
