#!/usr/bin/env node

/**
 * XcodeBuildMCP - Main entry point
 * This file imports and configures the MCP server and tools
 */

// Import server components
import { createServer, startServer } from './server/server.js';

// Import tools from refactored modules
// macOS build tools
import {
  registerMacOSBuildTools,
  registerMacOSBuildAndRunTools,
} from './tools/build_macos.js';

// iOS simulator build tools
import {
  registerIOSSimulatorBuildTools,
  registerIOSSimulatorBuildAndRunTools,
} from './tools/build_ios_simulator.js';

// iOS device build tools
import { registerIOSDeviceBuildTools } from './tools/build_ios_device.js';

// App path tools
import {
  registerGetAppPathByNameWorkspaceTool,
  registerGetAppPathByNameProjectTool,
  registerGetAppPathByIdWorkspaceTool,
  registerGetAppPathByIdProjectTool,
  registerGetAppPathForDeviceWorkspaceTool,
  registerGetAppPathForDeviceProjectTool,
} from './tools/app_path.js';

// Build settings and scheme tools
import {
  registerShowBuildSettingsWorkspaceTool,
  registerShowBuildSettingsProjectTool,
  registerListSchemesWorkspaceTool,
  registerListSchemesProjectTool,
} from './tools/build_settings.js';

// Simulator tools
import {
  registerListSimulatorsTool,
  registerBootSimulatorTool,
  registerOpenSimulatorTool,
  registerInstallAppInSimulatorTool,
  registerLaunchAppInSimulatorTool,
} from './tools/simulator.js';

// Bundle ID tools
import { registerGetMacOSBundleIdTool, registerGetiOSBundleIdTool } from './tools/bundleId.js';

// Clean tool - Import new split tools
import { registerCleanWorkspaceTool, registerCleanProjectTool } from './tools/clean.js';

// Launch tools
import { registerLaunchMacOSAppTool } from './tools/launch.js';

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
    registerListSimulatorsTool(server);

    // 2. Clean tool
    registerCleanWorkspaceTool(server);
    registerCleanProjectTool(server);

    // 3. Build tools
    registerMacOSBuildTools(server);
    registerIOSSimulatorBuildTools(server);
    registerIOSDeviceBuildTools(server);

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

    // 6. Simulator management tools
    registerBootSimulatorTool(server);
    registerOpenSimulatorTool(server);

    // 7. App installation and launch tools
    registerInstallAppInSimulatorTool(server);
    registerLaunchAppInSimulatorTool(server);

    // 8. Bundle ID tools
    registerGetMacOSBundleIdTool(server);
    registerGetiOSBundleIdTool(server);

    // 9. Launch tools
    registerLaunchMacOSAppTool(server);

    // 10. Build and run tools
    registerMacOSBuildAndRunTools(server);
    registerIOSSimulatorBuildAndRunTools(server);

    // Start the server
    await startServer(server);

    // Log successful startup
    log('info', 'XcodeBuildMCP server started successfully');
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