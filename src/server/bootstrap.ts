import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import process from 'node:process';
import { registerResources } from '../core/resources.ts';
import { log, setLogLevel, type LogLevel } from '../utils/logger.ts';
import { registerWorkflows } from '../utils/tool-registry.ts';

export interface BootstrapOptions {
  enabledWorkflows?: string[];
}

function parseEnabledWorkflows(value: string): string[] {
  return value
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

export async function bootstrapServer(
  server: McpServer,
  options: BootstrapOptions = {},
): Promise<void> {
  server.server.setRequestHandler(SetLevelRequestSchema, async (request) => {
    const { level } = request.params;
    setLogLevel(level as LogLevel);
    log('info', `Client requested log level: ${level}`);
    return {};
  });

  const defaultEnabledWorkflows = ['simulator'];

  const enabledWorkflows = options.enabledWorkflows?.length
    ? options.enabledWorkflows
    : process.env.XCODEBUILDMCP_ENABLED_WORKFLOWS
      ? parseEnabledWorkflows(process.env.XCODEBUILDMCP_ENABLED_WORKFLOWS)
      : defaultEnabledWorkflows;

  if (enabledWorkflows.length > 0) {
    log('info', `🚀 Initializing server with selected workflows: ${enabledWorkflows.join(', ')}`);
    await registerWorkflows(enabledWorkflows);
  } else {
    log('info', '🚀 Initializing server with all tools...');
    await registerWorkflows([]);
  }

  await registerResources(server);
}
