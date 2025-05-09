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

// Import utilities
import { log } from './utils/logger.js';

// Import idb setup utility
import { version } from './version.js';
import { registerTools } from './utils/register-tools.js';

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    // Create the server
    const server = createServer();

    // Register tools
    registerTools(server);

    // Handle process termination gracefully
    process.on('SIGTERM', () => {
      log('info', 'Received SIGTERM signal, shutting down gracefully...');
      server.disconnect().catch(error => {
        log('error', `Error during graceful shutdown: ${error}`);
      });
    });

    process.on('SIGINT', () => {
      log('info', 'Received SIGINT signal, shutting down gracefully...');
      server.disconnect().catch(error => {
        log('error', `Error during graceful shutdown: ${error}`);
      });
    });

    // Handle uncaught errors to prevent crashes
    process.on('uncaughtException', (error) => {
      log('error', `Uncaught exception: ${error.stack || error.message}`);
      // Don't exit immediately - allow time for cleanup
      server.disconnect().catch(() => {}).finally(() => {
        setTimeout(() => process.exit(1), 1000);
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      log('error', `Unhandled promise rejection at: ${promise}`);
      log('error', `Reason: ${reason}`);
    });

    // Start the server
    await startServer(server);

    // Log successful startup
    log('info', `XcodeBuildMCP server (version ${version}) started successfully`);
  } catch (error) {
    log('error', `Fatal error in main(): ${error}`);
    console.error('Fatal error in main():', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  log('error', `Unhandled exception in main(): ${error.stack || error.message}`);
  console.error('Unhandled exception:', error);
  // Give Sentry a moment to send the error before exiting
  setTimeout(() => process.exit(1), 1000);
});
