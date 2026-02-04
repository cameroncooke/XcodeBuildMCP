import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { XcodeToolsBridgeManager } from './manager.ts';

let manager: XcodeToolsBridgeManager | null = null;

export function getXcodeToolsBridgeManager(server?: McpServer): XcodeToolsBridgeManager | null {
  if (manager) return manager;
  if (!server) return null;
  manager = new XcodeToolsBridgeManager(server);
  return manager;
}

export async function shutdownXcodeToolsBridge(): Promise<void> {
  await manager?.shutdown();
  manager = null;
}
