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

// Import process for stdout configuration
import process from 'node:process';

// Import resource management
import { registerResources } from './core/resources.js';

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    // Increase stdout maxListeners to prevent EventEmitter memory leak warnings
    // during bulk tool registration in dynamic mode (80+ tools)
    process.stdout.setMaxListeners(100);
    
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

    // Check if dynamic tools mode is enabled
    const isDynamicMode = process.env.XCODEBUILDMCP_DYNAMIC_TOOLS === 'true';

    if (isDynamicMode) {
      // DYNAMIC MODE: Only load discovery tools initially
      log('info', '🚀 Initializing server in dynamic mode...');
      const plugins = await loadPlugins();
      let registeredCount = 0;
      
      // Only register discovery tools initially
      for (const plugin of plugins.values()) {
        // Only load discover_tools and discovery-related tools initially
        if (plugin.name === 'discover_tools' || plugin.name === 'discover_projs') {
          server.tool(plugin.name, plugin.description ?? '', plugin.schema, plugin.handler);
          registeredCount++;
        }
      }
      log('info', `✅ Registered ${registeredCount} discovery tools in dynamic mode.`);
      log('info', 'Use discover_tools to enable additional workflows based on your task.');
    } else {
      // STATIC MODE: Load all tools immediately  
      log('info', '🚀 Initializing server in static mode...');
      const plugins = await loadPlugins();
      let registeredCount = 0;
      for (const plugin of plugins.values()) {
        server.tool(plugin.name, plugin.description ?? '', plugin.schema, plugin.handler);
        registeredCount++;
      }
      log('info', `✅ Registered ${registeredCount} tools in static mode.`);
    }
    
    await registerResources(server);

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
    log('info', `XcodeBuildMCP server (version ${version}) started successfully`);
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
