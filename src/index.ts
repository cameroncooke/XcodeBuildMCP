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

// Import server components
import { createServer, startServer } from './server/server.ts';

// Import utilities
import { log } from './utils/logger.ts';
import { initSentry } from './utils/sentry.ts';
import { getDefaultDebuggerManager } from './utils/debugger/index.ts';

// Import version
import { version } from './version.ts';

// Import process for stdout configuration
import process from 'node:process';

import { bootstrapServer } from './server/bootstrap.ts';

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    initSentry();

    // Create the server
    const server = createServer();

    await bootstrapServer(server);

    // Start the server
    await startServer(server);

    // Clean up on exit
    process.on('SIGTERM', async () => {
      await getDefaultDebuggerManager().disposeAll();
      await server.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await getDefaultDebuggerManager().disposeAll();
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
