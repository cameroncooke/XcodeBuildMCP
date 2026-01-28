import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { bootstrapServer } from './server/bootstrap.ts';
import { createServer } from './server/server.ts';
import { log } from './utils/logger.ts';
import { initSentry } from './utils/sentry.ts';

// Empty config schema - all configuration comes from config.yaml and env vars
export const configSchema = z.object({});

export type SmitheryConfig = z.infer<typeof configSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function createSmitheryServer(options: { config: SmitheryConfig }): McpServer {
  const server = createServer();
  const bootstrapPromise: Promise<void> = (async (): Promise<void> => {
    initSentry();
    await bootstrapServer(server);
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
