import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { bootstrapServer } from './server/bootstrap.ts';
import { createServer } from './server/server.ts';
import { log } from './utils/logger.ts';
import { initSentry } from './utils/sentry.ts';
import { getDefaultFileSystemExecutor } from './utils/command.ts';
import { initConfigStore, type RuntimeConfigOverrides } from './utils/config-store.ts';

export const configSchema = z.object({
  incrementalBuildsEnabled: z
    .boolean()
    .default(false)
    .describe('Enable incremental builds via xcodemake (true/false).'),
  enabledWorkflows: z
    .string()
    .default('')
    .describe('Comma-separated list of workflows to load at startup.'),
  debug: z.boolean().default(false).describe('Enable debug logging.'),
});

export type SmitheryConfig = z.infer<typeof configSchema>;

function parseEnabledWorkflows(value: string): string[] {
  return value
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

function buildOverrides(config: SmitheryConfig): RuntimeConfigOverrides {
  return {
    incrementalBuildsEnabled: config.incrementalBuildsEnabled,
    debug: config.debug,
    enabledWorkflows: parseEnabledWorkflows(config.enabledWorkflows),
  };
}

export default function createSmitheryServer({ config }: { config: SmitheryConfig }): McpServer {
  const overrides = buildOverrides(config);

  const server = createServer();
  const bootstrapPromise: Promise<void> = (async (): Promise<void> => {
    await initConfigStore({
      cwd: process.cwd(),
      fs: getDefaultFileSystemExecutor(),
      overrides,
    });
    initSentry();
    await bootstrapServer(server, { configOverrides: overrides });
  })().catch((error) => {
    log(
      'error',
      `Failed to bootstrap Smithery server: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  });

  const handler: ProxyHandler<McpServer> = {
    get(target, prop, receiver): unknown {
      if (prop === 'connect') {
        return async (...args: unknown[]): Promise<unknown> => {
          await bootstrapPromise;
          const connect = target.connect.bind(target) as (...connectArgs: unknown[]) => unknown;
          return connect(...args);
        };
      }
      return Reflect.get(target, prop, receiver) as unknown;
    },
  };

  return new Proxy(server, handler);
}
