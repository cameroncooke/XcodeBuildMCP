#!/usr/bin/env node

/**
 * XcodeBuildMCP - Main entry point
 *
 * This file serves as the entry point for the XcodeBuildMCP server, importing and registering
 * all tool modules with the MCP server. It follows the platform-specific approach for Xcode tools.
 *
 * Responsibilities:
 * - Creating and starting the MCP server
 * - Registering all platform-specific tool modules
 * - Configuring server options and logging
 * - Handling server lifecycle events
 */

// Import Sentry instrumentation
import './utils/sentry.js';

// Import server components
import { createServer, startServer } from './server/server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import utilities
import { log } from './utils/logger.js';

// Import version
import { version } from './version.js';
import { loadPlugins } from './core/plugin-registry.js';

// Import xcodemake utilities
import { isXcodemakeEnabled, isXcodemakeAvailable } from './utils/xcodemake.js';

// Import resource management
import { registerResources } from './core/resources.js';

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    // Check if xcodemake is enabled and available
    if (isXcodemakeEnabled()) {
      log('info', 'xcodemake is enabled, checking if available...');
      const available = await isXcodemakeAvailable();
      if (available) {
        log('info', 'xcodemake is available and will be used for builds');
      } else {
        log(
          'warn',
          'xcodemake is enabled but could not be made available, falling back to xcodebuild',
        );
      }
    } else {
      log('debug', 'xcodemake is disabled, using standard xcodebuild');
    }

    // Create the server
    const server = createServer();

    // Make server available globally for dynamic tools
    (globalThis as { mcpServer?: McpServer }).mcpServer = server;

    // Add notification capability for dynamic tool updates
    (server as McpServer & { notifyToolsChanged?: () => Promise<void> }).notifyToolsChanged =
      async (): Promise<void> => {
        await server.server.notification({
          method: 'notifications/tools/list_changed',
          params: {},
        });
      };

    // Determine operating mode
    const isDynamicMode = process.env.XCODEBUILDMCP_DYNAMIC_TOOLS === 'true';

    if (isDynamicMode) {
      log('info', '🔍 Starting in DYNAMIC mode');
      // In dynamic mode, only load the discover_tools initially
      const plugins = await loadPlugins();
      const discoverTool = plugins.get('discover_tools');

      if (!discoverTool) {
        throw new Error('discover_tools not found - required for dynamic mode');
      }

      server.tool(
        discoverTool.name,
        discoverTool.description ?? '',
        discoverTool.schema,
        discoverTool.handler,
      );

      // Register resources in dynamic mode (returns true if registered)
      await registerResources(server);

      log('info', '   Use discover_tools to enable relevant workflows on-demand');
    } else {
      log('info', '📋 Starting in STATIC mode');

      // Register resources first in static mode to determine tool filtering
      await registerResources(server);

      // In static mode, load all plugins except discover_tools
      const plugins = await loadPlugins();
      for (const plugin of plugins.values()) {
        if (plugin.name !== 'discover_tools') {
          server.tool(plugin.name, plugin.description ?? '', plugin.schema, plugin.handler);
        }
      }
    }

    // Start the server
    await startServer(server);

    // Clean up on exit
    process.on('SIGTERM', async () => {
      await server.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await server.close();
      process.exit(0);
    });

    // Log successful startup
    const mode = isDynamicMode ? 'Dynamic' : 'Static';
    log('info', `XcodeBuildMCP server (version ${version}) started successfully in ${mode} mode`);

    if (isDynamicMode) {
      log('info', 'Use "discover_tools" to enable relevant tool workflows for your task');
    }
  } catch (error) {
    console.error('Fatal error in main():', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled exception:', error);
  // Give Sentry a moment to send the error before exiting
  setTimeout(() => process.exit(1), 1000);
});
