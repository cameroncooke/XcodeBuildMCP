import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let serverInstance: McpServer | undefined;

export function getServer(): McpServer | undefined {
  return serverInstance;
}

export function setServer(server: McpServer): void {
  serverInstance = server;
}

export function __resetServerStateForTests(): void {
  serverInstance = undefined;
}

export { serverInstance as server };
