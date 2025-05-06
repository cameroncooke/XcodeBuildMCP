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

// Import macOS build tools
import { registerMacOSBuildTools, registerMacOSBuildAndRunTools } from './tools/build_macos.js';

// Import iOS simulator build tools
import {
  registerIOSSimulatorBuildTools,
  registerIOSSimulatorBuildAndRunTools,
} from './tools/build_ios_simulator.js';

// Import iOS device build tools
import { registerIOSDeviceBuildTools } from './tools/build_ios_device.js';

// Import app path tools
import {
  registerGetMacOSAppPathWorkspaceTool,
  registerGetMacOSAppPathProjectTool,
  registerGetiOSDeviceAppPathWorkspaceTool,
  registerGetiOSDeviceAppPathProjectTool,
  registerGetSimulatorAppPathByNameWorkspaceTool,
  registerGetSimulatorAppPathByNameProjectTool,
  registerGetSimulatorAppPathByIdWorkspaceTool,
  registerGetSimulatorAppPathByIdProjectTool,
} from './tools/app_path.js';

// Import build settings and scheme tools
import {
  registerShowBuildSettingsWorkspaceTool,
  registerShowBuildSettingsProjectTool,
  registerListSchemesWorkspaceTool,
  registerListSchemesProjectTool,
} from './tools/build_settings.js';

// Import simulator tools
import {
  registerListSimulatorsTool,
  registerBootSimulatorTool,
  registerOpenSimulatorTool,
  registerInstallAppInSimulatorTool,
  registerLaunchAppInSimulatorTool,
  registerLaunchAppWithLogsInSimulatorTool,
  registerSetSimulatorAppearanceTool,
} from './tools/simulator.js';

// Import bundle ID tools
import { registerGetMacOSBundleIdTool, registerGetiOSBundleIdTool } from './tools/bundleId.js';

// Import clean tool
import { registerCleanWorkspaceTool, registerCleanProjectTool } from './tools/clean.js';

// Import launch tools
import { registerLaunchMacOSAppTool } from './tools/launch.js';

// Import project/workspace discovery tool
import { registerDiscoverProjectsTool } from './tools/discover_projects.js';

// Import utilities
import { log } from './utils/logger.js';

// Import log capture tools
import {
  registerStartSimulatorLogCaptureTool,
  registerStopAndGetSimulatorLogTool,
} from './tools/log.js';

// Import idb tools
import { registerIdbTools } from './tools/idb.js';

// Import diagnostic tool
import { registerDiagnosticTool } from './tools/diagnostic.js';

// Import idb setup utility
import { setupIdb } from './utils/idb-setup.js';
import { version } from './version.js';

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    // Create the server
    const server = createServer();

    // Register the project/workspace discovery tool
    registerDiscoverProjectsTool(server);

    // Register List/Discovery tools first
    registerListSchemesWorkspaceTool(server);
    registerListSchemesProjectTool(server);
    registerListSimulatorsTool(server);

    // Register Clean tools
    registerCleanWorkspaceTool(server);
    registerCleanProjectTool(server);

    // Register Build tools
    registerMacOSBuildTools(server);
    registerIOSSimulatorBuildTools(server);
    registerIOSDeviceBuildTools(server);

    // Register Build settings tools
    registerShowBuildSettingsWorkspaceTool(server);
    registerShowBuildSettingsProjectTool(server);

    // Register App path tools
    registerGetMacOSAppPathWorkspaceTool(server);
    registerGetMacOSAppPathProjectTool(server);
    registerGetiOSDeviceAppPathWorkspaceTool(server);
    registerGetiOSDeviceAppPathProjectTool(server);
    registerGetSimulatorAppPathByNameWorkspaceTool(server);
    registerGetSimulatorAppPathByNameProjectTool(server);
    registerGetSimulatorAppPathByIdWorkspaceTool(server);
    registerGetSimulatorAppPathByIdProjectTool(server);

    // Register Simulator management tools
    registerBootSimulatorTool(server);
    registerOpenSimulatorTool(server);
    registerSetSimulatorAppearanceTool(server);

    // Register App installation and launch tools
    registerInstallAppInSimulatorTool(server);
    registerLaunchAppInSimulatorTool(server);
    registerLaunchAppWithLogsInSimulatorTool(server);

    // Register Bundle ID tools
    registerGetMacOSBundleIdTool(server);
    registerGetiOSBundleIdTool(server);

    // Register Launch tools
    registerLaunchMacOSAppTool(server);

    // Register build and run tools
    registerMacOSBuildAndRunTools(server);
    registerIOSSimulatorBuildAndRunTools(server);

    // Register log capture tools
    registerStartSimulatorLogCaptureTool(server);
    registerStopAndGetSimulatorLogTool(server);

    // Register idb tools for iOS simulator UI automation
    setupIdb();
    registerIdbTools(server);

    // Register diagnostic tool (only available when XCODEBUILDMCP_DEBUG is set)
    if (process.env.XCODEBUILDMCP_DEBUG) {
      registerDiagnosticTool(server);
    }

    // Start the server
    await startServer(server);

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
