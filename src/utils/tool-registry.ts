import { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadPlugins } from '../core/plugin-registry.js';
import { ToolResponse } from '../types/common.js';
import { log } from './logger.js';

// Global registry to track registered tools for cleanup
const toolRegistry = new Map<string, RegisteredTool>();

/**
 * Register a tool and track it for potential removal
 */
export function registerAndTrackTool(
  server: McpServer,
  name: string,
  config: Parameters<McpServer['registerTool']>[1],
  callback: Parameters<McpServer['registerTool']>[2],
): RegisteredTool {
  const registeredTool = server.registerTool(name, config, callback);
  toolRegistry.set(name, registeredTool);
  return registeredTool;
}

/**
 * Register multiple tools and track them for potential removal
 */
export function registerAndTrackTools(
  server: McpServer,
  tools: Parameters<McpServer['registerTools']>[0],
): RegisteredTool[] {
  const registeredTools = server.registerTools(tools);

  // Track each registered tool
  tools.forEach((tool, index) => {
    if (registeredTools[index]) {
      toolRegistry.set(tool.name, registeredTools[index]);
    }
  });

  return registeredTools;
}

/**
 * Check if a tool is already registered
 */
export function isToolRegistered(name: string): boolean {
  return toolRegistry.has(name);
}

/**
 * Remove a specific tracked tool by name
 */
export function removeTrackedTool(name: string): boolean {
  const tool = toolRegistry.get(name);
  if (!tool) {
    return false;
  }

  try {
    tool.remove();
    toolRegistry.delete(name);
    log('debug', `✅ Removed tool: ${name}`);
    return true;
  } catch (error) {
    log('error', `❌ Failed to remove tool ${name}: ${error}`);
    return false;
  }
}

/**
 * Remove multiple tracked tools by names
 */
export function removeTrackedTools(names: string[]): string[] {
  const removedTools: string[] = [];

  for (const name of names) {
    if (removeTrackedTool(name)) {
      removedTools.push(name);
    }
  }

  return removedTools;
}

/**
 * Remove all currently tracked tools
 */
export function removeAllTrackedTools(): void {
  const toolNames = Array.from(toolRegistry.keys());

  if (toolNames.length === 0) {
    return;
  }

  log('info', `Removing ${toolNames.length} tracked tools...`);

  const removedTools = removeTrackedTools(toolNames);
  log('info', `✅ Removed ${removedTools.length} tracked tools`);
}

/**
 * Get the number of currently tracked tools
 */
export function getTrackedToolCount(): number {
  return toolRegistry.size;
}

/**
 * Get the names of currently tracked tools
 */
export function getTrackedToolNames(): string[] {
  return Array.from(toolRegistry.keys());
}

/**
 * Register only discovery tools (discover_tools, discover_projs) with tracking
 */
export async function registerDiscoveryTools(server: McpServer): Promise<void> {
  const plugins = await loadPlugins();
  let registeredCount = 0;

  // Only register discovery tools initially
  const discoveryTools = [];
  for (const plugin of plugins.values()) {
    // Only load discover_tools and discover_projs initially - other tools will be loaded via workflows
    if (plugin.name === 'discover_tools' || plugin.name === 'discover_projs') {
      discoveryTools.push({
        name: plugin.name,
        config: {
          description: plugin.description ?? '',
          inputSchema: plugin.schema,
        },
        // Adapt callback to match SDK's expected signature
        callback: (args: unknown): Promise<ToolResponse> =>
          plugin.handler(args as Record<string, unknown>),
      });
      registeredCount++;
    }
  }

  // Register discovery tools using bulk registration with tracking
  if (discoveryTools.length > 0) {
    registerAndTrackTools(server, discoveryTools);
  }

  log('info', `✅ Registered ${registeredCount} discovery tools in dynamic mode.`);
}

/**
 * Register all tools (static mode) - no tracking needed since these won't be removed
 */
export async function registerAllToolsStatic(server: McpServer): Promise<void> {
  const plugins = await loadPlugins();
  const allTools = [];

  for (const plugin of plugins.values()) {
    allTools.push({
      name: plugin.name,
      config: {
        description: plugin.description ?? '',
        inputSchema: plugin.schema,
      },
      // Adapt callback to match SDK's expected signature
      callback: (args: unknown): Promise<ToolResponse> =>
        plugin.handler(args as Record<string, unknown>),
    });
  }

  // Register all tools using bulk registration (no tracking since static tools aren't removed)
  if (allTools.length > 0) {
    server.registerTools(allTools);
  }

  log('info', `✅ Registered ${allTools.length} tools in static mode.`);
}
