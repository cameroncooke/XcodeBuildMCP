import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolResponse } from '../../types/common.ts';
import { XcodeToolsBridgeManager } from './manager.ts';
import { StandaloneXcodeToolsBridge } from './standalone.ts';

let manager: XcodeToolsBridgeManager | null = null;
let standalone: StandaloneXcodeToolsBridge | null = null;

export interface XcodeToolsBridgeToolHandler {
  statusTool(): Promise<ToolResponse>;
  syncTool(): Promise<ToolResponse>;
  disconnectTool(): Promise<ToolResponse>;
  listToolsTool(params: { refresh?: boolean }): Promise<ToolResponse>;
  callToolTool(params: {
    remoteTool: string;
    arguments: Record<string, unknown>;
    timeoutMs?: number;
  }): Promise<ToolResponse>;
}

export function getXcodeToolsBridgeManager(server?: McpServer): XcodeToolsBridgeManager | null {
  if (manager) return manager;
  if (!server) return null;
  manager = new XcodeToolsBridgeManager(server);
  return manager;
}

export function peekXcodeToolsBridgeManager(): XcodeToolsBridgeManager | null {
  return manager;
}

export function getXcodeToolsBridgeToolHandler(
  server?: McpServer,
): XcodeToolsBridgeToolHandler | null {
  if (server) {
    return getXcodeToolsBridgeManager(server);
  }
  standalone ??= new StandaloneXcodeToolsBridge();
  return standalone;
}

export async function shutdownXcodeToolsBridge(): Promise<void> {
  await manager?.shutdown();
  await standalone?.shutdown();
  manager = null;
  standalone = null;
}
