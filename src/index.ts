#!/usr/bin/env node

/**
 * XcodeBuildMCP - Main entry point
 * This file imports and configures the MCP server and tools
 */

// Import server components
import { createServer, startServer } from './server/server.js';

// Import individual tools instead of tool groups
// Build tools - Import new split tools
import {
  registerMacOSBuildWorkspaceTool,
  registerMacOSBuildProjectTool,
  registerIOSSimulatorBuildByNameWorkspaceTool,
  registerIOSSimulatorBuildByNameProjectTool,
  registerIOSSimulatorBuildByIdWorkspaceTool,
  registerIOSSimulatorBuildByIdProjectTool,
  registerIOSDeviceBuildWorkspaceTool,
  registerIOSDeviceBuildProjectTool,
  registerMacOSBuildAndRunWorkspaceTool,
  registerMacOSBuildAndRunProjectTool,
  registerIOSSimulatorBuildAndRunByNameWorkspaceTool,
  registerIOSSimulatorBuildAndRunByNameProjectTool,
  registerIOSSimulatorBuildAndRunByIdWorkspaceTool,
  registerIOSSimulatorBuildAndRunByIdProjectTool,
  registerShowBuildSettingsWorkspaceTool,
  registerShowBuildSettingsProjectTool,
  registerGetAppPathByNameWorkspaceTool,
  registerGetAppPathByNameProjectTool,
  registerGetAppPathByIdWorkspaceTool,
  registerGetAppPathByIdProjectTool,
  registerGetAppPathForDeviceWorkspaceTool,
  registerGetAppPathForDeviceProjectTool,
  registerListSchemesWorkspaceTool,
  registerListSchemesProjectTool,
} from './tools/build.js';

// Simulator tools (unaffected by this refactor)
import {
  registerListSimulatorsTool,
  registerBootSimulatorTool,
  registerOpenSimulatorTool,
  registerInstallAppInSimulatorTool,
  registerLaunchAppInSimulatorTool,
} from './tools/simulator.js';

// Bundle ID tools (unaffected by this refactor)
import { registerGetMacOSBundleIdTool, registerGetiOSBundleIdTool } from './tools/bundleId.js';

// Clean tool - Import new split tools
import { registerCleanWorkspaceTool, registerCleanProjectTool } from './tools/clean.js';

// Import utilities
import { log } from './utils/logger.js';

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    // Create the server
    const server = createServer();

    // Register tools in a logical order, using the new split functions

    // 1. List/Discovery tools first
    registerListSchemesWorkspaceTool(server);
    registerListSchemesProjectTool(server);
    registerListSimulatorsTool(server); // Unchanged

    // 2. Clean tool
    registerCleanWorkspaceTool(server);
    registerCleanProjectTool(server);

    // 3. Build tools
    registerMacOSBuildWorkspaceTool(server);
    registerMacOSBuildProjectTool(server);
    registerIOSSimulatorBuildByNameWorkspaceTool(server);
    registerIOSSimulatorBuildByNameProjectTool(server);
    registerIOSSimulatorBuildByIdWorkspaceTool(server);
    registerIOSSimulatorBuildByIdProjectTool(server);
    registerIOSDeviceBuildWorkspaceTool(server);
    registerIOSDeviceBuildProjectTool(server);

    // 4. Build settings tool
    registerShowBuildSettingsWorkspaceTool(server);
    registerShowBuildSettingsProjectTool(server);

    // 5. App path tools (after build)
    registerGetAppPathByNameWorkspaceTool(server);
    registerGetAppPathByNameProjectTool(server);
    registerGetAppPathByIdWorkspaceTool(server);
    registerGetAppPathByIdProjectTool(server);
    registerGetAppPathForDeviceWorkspaceTool(server);
    registerGetAppPathForDeviceProjectTool(server);

    // 6. Simulator control tools (Unchanged)
    registerBootSimulatorTool(server);
    registerOpenSimulatorTool(server);

    // 7. App installation and launch tools (Unchanged)
    registerInstallAppInSimulatorTool(server);
    registerLaunchAppInSimulatorTool(server);

    // 8. Bundle ID tools (Unchanged)
    registerGetMacOSBundleIdTool(server);
    registerGetiOSBundleIdTool(server);

    // 9. Build and run tools (combines multiple steps)
    registerMacOSBuildAndRunWorkspaceTool(server);
    registerMacOSBuildAndRunProjectTool(server);
    registerIOSSimulatorBuildAndRunByNameWorkspaceTool(server);
    registerIOSSimulatorBuildAndRunByNameProjectTool(server);
    registerIOSSimulatorBuildAndRunByIdWorkspaceTool(server);
    registerIOSSimulatorBuildAndRunByIdProjectTool(server);

    // Start the server
    await startServer(server);

    // Log successful startup
    log('info', 'XcodeBuildMCP server started successfully with refactored tools');
  } catch (error) {
    console.error('Fatal error in main():', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled exception:', error);
  process.exit(1);
});