import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { bootstrapServer } from './server/bootstrap.ts';
import { createServer } from './server/server.ts';
import { log } from './utils/logger.ts';
import { initSentry } from './utils/sentry.ts';

export const configSchema = z.object({
  incrementalBuildsEnabled: z
    .boolean()
    .default(false)
    .describe('Enable incremental builds via xcodemake (true/false).'),
  enabledWorkflows: z
    .string()
    .default('')
    .describe('Comma-separated list of workflows to load at startup.'),
  sentryDisabled: z.boolean().default(false).describe('Disable Sentry error reporting.'),
  debug: z.boolean().default(false).describe('Enable debug logging.'),
});

export type SmitheryConfig = z.infer<typeof configSchema>;

function applyConfig(config: SmitheryConfig): string[] {
  process.env.INCREMENTAL_BUILDS_ENABLED = config.incrementalBuildsEnabled ? '1' : '0';
  process.env.XCODEBUILDMCP_ENABLED_WORKFLOWS = config.enabledWorkflows;
  process.env.XCODEBUILDMCP_SENTRY_DISABLED = config.sentryDisabled ? 'true' : 'false';
  process.env.XCODEBUILDMCP_DEBUG = config.debug ? 'true' : 'false';

  return config.enabledWorkflows
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

export default function createSmitheryServer({ config }: { config: SmitheryConfig }): McpServer {
  const workflowNames = applyConfig(config);

  initSentry();

  const server = createServer();
  const bootstrapPromise = bootstrapServer(server, { enabledWorkflows: workflowNames }).catch(
    (error) => {
      log(
        'error',
        `Failed to bootstrap Smithery server: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    },
  );

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
