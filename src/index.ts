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
import './utils/sentry.ts';

// Import server components
import { createServer, startServer } from './server/server.ts';
import { McpServer } from '@camsoft/mcp-sdk/server/mcp.js';

// Import MCP types for logging
import { SetLevelRequestSchema } from '@camsoft/mcp-sdk/types.js';

// Import utilities
import { log, setLogLevel, type LogLevel } from './utils/logger.ts';

// Import version
import { version } from './version.ts';

// Import xcodemake utilities
import { isXcodemakeEnabled, isXcodemakeAvailable } from './utils/xcodemake.ts';

// Import process for stdout configuration
import process from 'node:process';

// Import resource management
import { registerResources } from './core/resources.ts';
import {
  registerDiscoveryTools,
  registerAllToolsStatic,
  registerSelectedWorkflows,
} from './utils/tool-registry.ts';

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

    // Register logging/setLevel handler
    server.server.setRequestHandler(SetLevelRequestSchema, async (request) => {
      const { level } = request.params;
      setLogLevel(level as LogLevel);
      log('info', `Client requested log level: ${level}`);
      return {}; // Empty result as per MCP spec
    });

    // Make server available globally for dynamic tools
    (globalThis as { mcpServer?: McpServer }).mcpServer = server;

    // Check if dynamic tools mode is explicitly disabled
    const isDynamicModeEnabled = process.env.XCODEBUILDMCP_DYNAMIC_TOOLS === 'true';

    if (isDynamicModeEnabled) {
      // DYNAMIC MODE: Start with discovery tools only
      log('info', '🚀 Initializing server in dynamic tools mode...');
      await registerDiscoveryTools(server);
      log('info', '💡 Use discover_tools to enable additional workflows based on your task.');
    } else {
      // STATIC MODE: Check for selective workflows
      const enabledWorkflows = process.env.XCODEBUILDMCP_ENABLED_WORKFLOWS;

      if (enabledWorkflows) {
        const workflowNames = enabledWorkflows.split(',');
        log('info', `🚀 Initializing server with selected workflows: ${workflowNames.join(', ')}`);
        await registerSelectedWorkflows(server, workflowNames);
      } else {
        log('info', '🚀 Initializing server in static tools mode...');
        await registerAllToolsStatic(server);
      }
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
