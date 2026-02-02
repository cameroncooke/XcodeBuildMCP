import type { Argv } from 'yargs';
import { startMcpServer } from '../../server/start-mcp-server.ts';

/**
 * Register the `mcp` command to start the MCP server.
 */
export function registerMcpCommand(app: Argv): void {
  app.command('mcp', 'Start the MCP server (for use with MCP clients)', {}, async () => {
    await startMcpServer();
  });
}
