// Import macOS build tools
import {
  registerMacOSBuildWorkspaceTool,
  registerMacOSBuildProjectTool,
  registerMacOSBuildAndRunWorkspaceTool,
  registerMacOSBuildAndRunProjectTool,
} from '../tools/build_macos.js';

// Import iOS simulator build tools
import {
  registerIOSSimulatorBuildByNameWorkspaceTool,
  registerIOSSimulatorBuildByNameProjectTool,
  registerIOSSimulatorBuildByIdWorkspaceTool,
  registerIOSSimulatorBuildByIdProjectTool,
  registerIOSSimulatorBuildAndRunByNameWorkspaceTool,
  registerIOSSimulatorBuildAndRunByNameProjectTool,
  registerIOSSimulatorBuildAndRunByIdWorkspaceTool,
  registerIOSSimulatorBuildAndRunByIdProjectTool,
} from '../tools/build_ios_simulator.js';

// Import iOS device build tools
import { registerIOSDeviceBuildTools } from '../tools/build_ios_device.js';

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
} from '../tools/app_path.js';

// Import build settings and scheme tools
import {
  registerShowBuildSettingsWorkspaceTool,
  registerShowBuildSettingsProjectTool,
  registerListSchemesWorkspaceTool,
  registerListSchemesProjectTool,
} from '../tools/build_settings.js';

// Import simulator tools
import {
  registerListSimulatorsTool,
  registerBootSimulatorTool,
  registerOpenSimulatorTool,
  registerInstallAppInSimulatorTool,
  registerLaunchAppInSimulatorTool,
  registerLaunchAppWithLogsInSimulatorTool,
  registerSetSimulatorAppearanceTool,
} from '../tools/simulator.js';

// Import bundle ID tools
import { registerGetMacOSBundleIdTool, registerGetiOSBundleIdTool } from '../tools/bundleId.js';

// Import clean tool
import { registerCleanWorkspaceTool, registerCleanProjectTool } from '../tools/clean.js';

// Import launch tools
import { registerLaunchMacOSAppTool } from '../tools/launch.js';

// Import project/workspace discovery tool
import { registerDiscoverProjectsTool } from '../tools/discover_projects.js';

// Import log capture tools
import {
  registerStartSimulatorLogCaptureTool,
  registerStopAndGetSimulatorLogTool,
} from '../tools/log.js';

// Import idb tools
import { registerIdbTools } from '../tools/idb.js';

// Import diagnostic tool
import { registerDiagnosticTool } from '../tools/diagnostic.js';

// Import idb setup utility
import { setupIdb } from '../utils/idb-setup.js';

// Import MCP server
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import tool group utilities
import { ToolGroup, registerIfEnabled } from './tool-groups.js';

// Define tool registrations with their workflow-based groups
const toolRegistrations = [
  // Project Discovery and Information tools
  {
    register: registerDiscoverProjectsTool,
    groups: [ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_DISCOVER_PROJECTS',
  },
  {
    register: registerListSchemesWorkspaceTool,
    groups: [ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_LIST_SCHEMES_WORKSPACE',
  },
  {
    register: registerListSchemesProjectTool,
    groups: [ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_LIST_SCHEMES_PROJECT',
  },
  {
    register: registerListSimulatorsTool,
    groups: [ToolGroup.SIMULATOR_MANAGEMENT, ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_LIST_SIMULATORS',
  },
  {
    register: registerShowBuildSettingsWorkspaceTool,
    groups: [ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_SHOW_BUILD_SETTINGS_WORKSPACE',
  },
  {
    register: registerShowBuildSettingsProjectTool,
    groups: [ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_SHOW_BUILD_SETTINGS_PROJECT',
  },

  // Clean tools
  {
    register: registerCleanWorkspaceTool,
    groups: [
      ToolGroup.MACOS_WORKFLOW,
      ToolGroup.IOS_SIMULATOR_WORKFLOW,
      ToolGroup.IOS_DEVICE_WORKFLOW,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_CLEAN_WORKSPACE',
  },
  {
    register: registerCleanProjectTool,
    groups: [
      ToolGroup.MACOS_WORKFLOW,
      ToolGroup.IOS_SIMULATOR_WORKFLOW,
      ToolGroup.IOS_DEVICE_WORKFLOW,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_CLEAN_PROJECT',
  },

  // macOS build tools
  {
    register: registerMacOSBuildWorkspaceTool,
    groups: [ToolGroup.MACOS_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_MACOS_BUILD_WORKSPACE',
  },
  {
    register: registerMacOSBuildProjectTool,
    groups: [ToolGroup.MACOS_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_MACOS_BUILD_PROJECT',
  },
  {
    register: registerMacOSBuildAndRunWorkspaceTool,
    groups: [ToolGroup.MACOS_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_MACOS_BUILD_AND_RUN_WORKSPACE',
  },
  {
    register: registerMacOSBuildAndRunProjectTool,
    groups: [ToolGroup.MACOS_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_MACOS_BUILD_AND_RUN_PROJECT',
  },

  // iOS Simulator build tools
  {
    register: registerIOSSimulatorBuildByNameWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_BY_NAME_WORKSPACE',
  },
  {
    register: registerIOSSimulatorBuildByNameProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_BY_NAME_PROJECT',
  },
  {
    register: registerIOSSimulatorBuildByIdWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_BY_ID_WORKSPACE',
  },
  {
    register: registerIOSSimulatorBuildByIdProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_BY_ID_PROJECT',
  },
  {
    register: registerIOSSimulatorBuildAndRunByNameWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_AND_RUN_BY_NAME_WORKSPACE',
  },
  {
    register: registerIOSSimulatorBuildAndRunByNameProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_AND_RUN_BY_NAME_PROJECT',
  },
  {
    register: registerIOSSimulatorBuildAndRunByIdWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_AND_RUN_BY_ID_WORKSPACE',
  },
  {
    register: registerIOSSimulatorBuildAndRunByIdProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_AND_RUN_BY_ID_PROJECT',
  },

  // iOS Device build tools
  {
    register: registerIOSDeviceBuildTools,
    groups: [ToolGroup.IOS_DEVICE_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_IOS_DEVICE_BUILD_TOOLS',
  },

  // App path tools
  {
    register: registerGetMacOSAppPathWorkspaceTool,
    groups: [ToolGroup.MACOS_WORKFLOW, ToolGroup.APP_DEPLOYMENT, ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_GET_MACOS_APP_PATH_WORKSPACE',
  },
  {
    register: registerGetMacOSAppPathProjectTool,
    groups: [ToolGroup.MACOS_WORKFLOW, ToolGroup.APP_DEPLOYMENT, ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_GET_MACOS_APP_PATH_PROJECT',
  },
  {
    register: registerGetiOSDeviceAppPathWorkspaceTool,
    groups: [ToolGroup.IOS_DEVICE_WORKFLOW, ToolGroup.APP_DEPLOYMENT, ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_GET_IOS_DEVICE_APP_PATH_WORKSPACE',
  },
  {
    register: registerGetiOSDeviceAppPathProjectTool,
    groups: [ToolGroup.IOS_DEVICE_WORKFLOW, ToolGroup.APP_DEPLOYMENT, ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_GET_IOS_DEVICE_APP_PATH_PROJECT',
  },
  {
    register: registerGetSimulatorAppPathByNameWorkspaceTool,
    groups: [
      ToolGroup.IOS_SIMULATOR_WORKFLOW,
      ToolGroup.APP_DEPLOYMENT,
      ToolGroup.PROJECT_DISCOVERY,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_GET_SIMULATOR_APP_PATH_BY_NAME_WORKSPACE',
  },
  {
    register: registerGetSimulatorAppPathByNameProjectTool,
    groups: [
      ToolGroup.IOS_SIMULATOR_WORKFLOW,
      ToolGroup.APP_DEPLOYMENT,
      ToolGroup.PROJECT_DISCOVERY,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_GET_SIMULATOR_APP_PATH_BY_NAME_PROJECT',
  },
  {
    register: registerGetSimulatorAppPathByIdWorkspaceTool,
    groups: [
      ToolGroup.IOS_SIMULATOR_WORKFLOW,
      ToolGroup.APP_DEPLOYMENT,
      ToolGroup.PROJECT_DISCOVERY,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_GET_SIMULATOR_APP_PATH_BY_ID_WORKSPACE',
  },
  {
    register: registerGetSimulatorAppPathByIdProjectTool,
    groups: [
      ToolGroup.IOS_SIMULATOR_WORKFLOW,
      ToolGroup.APP_DEPLOYMENT,
      ToolGroup.PROJECT_DISCOVERY,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_GET_SIMULATOR_APP_PATH_BY_ID_PROJECT',
  },

  // Simulator management tools
  {
    register: registerBootSimulatorTool,
    groups: [ToolGroup.SIMULATOR_MANAGEMENT, ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_BOOT_SIMULATOR',
  },
  {
    register: registerOpenSimulatorTool,
    groups: [ToolGroup.SIMULATOR_MANAGEMENT, ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_OPEN_SIMULATOR',
  },
  {
    register: registerSetSimulatorAppearanceTool,
    groups: [ToolGroup.SIMULATOR_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_SET_SIMULATOR_APPEARANCE',
  },

  // App installation and launch tools
  {
    register: registerInstallAppInSimulatorTool,
    groups: [ToolGroup.APP_DEPLOYMENT, ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_INSTALL_APP_IN_SIMULATOR',
  },
  {
    register: registerLaunchAppInSimulatorTool,
    groups: [ToolGroup.APP_DEPLOYMENT, ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_LAUNCH_APP_IN_SIMULATOR',
  },
  {
    register: registerLaunchAppWithLogsInSimulatorTool,
    groups: [ToolGroup.APP_DEPLOYMENT, ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.DIAGNOSTICS],
    envVar: 'XCODEBUILDMCP_TOOL_LAUNCH_APP_WITH_LOGS_IN_SIMULATOR',
  },

  // Bundle ID tools
  {
    register: registerGetMacOSBundleIdTool,
    groups: [ToolGroup.MACOS_WORKFLOW, ToolGroup.APP_DEPLOYMENT, ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_GET_MACOS_BUNDLE_ID',
  },
  {
    register: registerGetiOSBundleIdTool,
    groups: [
      ToolGroup.IOS_SIMULATOR_WORKFLOW,
      ToolGroup.IOS_DEVICE_WORKFLOW,
      ToolGroup.APP_DEPLOYMENT,
      ToolGroup.PROJECT_DISCOVERY,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_GET_IOS_BUNDLE_ID',
  },

  // Launch tools
  {
    register: registerLaunchMacOSAppTool,
    groups: [ToolGroup.MACOS_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_LAUNCH_MACOS_APP',
  },

  // Log capture tools
  {
    register: registerStartSimulatorLogCaptureTool,
    groups: [ToolGroup.DIAGNOSTICS, ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_START_SIMULATOR_LOG_CAPTURE',
  },
  {
    register: registerStopAndGetSimulatorLogTool,
    groups: [ToolGroup.DIAGNOSTICS, ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_STOP_AND_GET_SIMULATOR_LOG',
  },

  // UI automation tools
  {
    register: registerUIAutomationTools,
    groups: [ToolGroup.UI_TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_UI_AUTOMATION_TOOLS',
  },
];

// Registers the UI automation tools (will be split into individual tools in the future)
function registerUIAutomationTools(server: McpServer): void {
  setupIdb();
  registerIdbTools(server);
}

// Diagnostic tool
const diagnosticTool = {
  register: registerDiagnosticTool,
  groups: [ToolGroup.DIAGNOSTICS],
  envVar: 'XCODEBUILDMCP_DEBUG',
};

export function registerTools(server: McpServer): void {
  // Register all tools using the new system
  for (const toolReg of toolRegistrations) {
    registerIfEnabled(server, toolReg);
  }

  // Register diagnostic tool - conditionally based on debug env var
  if (process.env.XCODEBUILDMCP_DEBUG) {
    registerIfEnabled(server, diagnosticTool);
  }
}
