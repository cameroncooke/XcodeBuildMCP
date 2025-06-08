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
 * - Registering resources, prompts, and sampling capabilities
 */

// Import Sentry instrumentation
import './utils/sentry.js';

// Import server components
import { createServer, startServer } from './server/server.js';

// Import utilities
import { log } from './utils/logger.js';

// Import version
import { version } from './version.js';
import { registerTools } from './utils/register-tools.js';

// Import xcodemake utilities
import { isXcodemakeEnabled, isXcodemakeAvailable } from './utils/xcodemake.js';

// Import new MCP capabilities
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import { registerSampling } from './sampling/index.js';
import { loadCapabilitiesConfig } from './config/index.js';

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    // Load capabilities configuration
    const capabilitiesConfig = loadCapabilitiesConfig();

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

    // Create the server with capabilities configuration
    const server = createServer(capabilitiesConfig);

    // Register tools (always available for backward compatibility)
    if (capabilitiesConfig.tools) {
      registerTools(server);
    }

    // Register resources if enabled
    if (capabilitiesConfig.resources) {
      registerResources(server);
    }

    // Register prompts if enabled
    if (capabilitiesConfig.prompts) {
      registerPrompts(server);
    }

    // Register sampling if enabled
    if (capabilitiesConfig.sampling) {
      registerSampling(server);
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
