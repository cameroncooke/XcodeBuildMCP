// Import macOS build tools
import {
  registerMacOSBuildWorkspaceTool,
  registerMacOSBuildProjectTool,
  registerMacOSBuildAndRunWorkspaceTool,
  registerMacOSBuildAndRunProjectTool,
} from '../tools/build_macos.js';

// Import simulator build tools
import {
  registerSimulatorBuildByNameWorkspaceTool,
  registerSimulatorBuildByNameProjectTool,
  registerSimulatorBuildByIdWorkspaceTool,
  registerSimulatorBuildByIdProjectTool,
  registerSimulatorBuildAndRunByNameWorkspaceTool,
  registerSimulatorBuildAndRunByNameProjectTool,
  registerSimulatorBuildAndRunByIdWorkspaceTool,
  registerSimulatorBuildAndRunByIdProjectTool,
} from '../tools/build_ios_simulator.js';

// Import device build tools
import { registerDeviceBuildTools } from '../tools/build_ios_device.js';

// Import simulator test tools
import {
  registerSimulatorTestByNameWorkspaceTool,
  registerSimulatorTestByNameProjectTool,
  registerSimulatorTestByIdWorkspaceTool,
  registerSimulatorTestByIdProjectTool,
} from '../tools/test_ios_simulator.js';
import {
  registerAppleDeviceTestWorkspaceTool,
  registerAppleDeviceTestProjectTool,
} from '../tools/test_ios_device.js';
import {
  registerMacOSTestWorkspaceTool,
  registerMacOSTestProjectTool,
} from '../tools/test_macos.js';

// Import device discovery tools
import {
  registerListDevicesTool,
  registerInstallAppDeviceTool,
  registerLaunchAppDeviceTool,
} from '../tools/device.js';

// Import app path tools
import {
  registerGetMacOSAppPathWorkspaceTool,
  registerGetMacOSAppPathProjectTool,
  registerGetDeviceAppPathWorkspaceTool,
  registerGetDeviceAppPathProjectTool,
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
  registerSetSimulatorLocationTool,
  registerResetSimulatorLocationTool,
  registerSetNetworkConditionTool,
  registerResetNetworkConditionTool,
} from '../tools/simulator.js';

// Import bundle ID tools
import { registerGetMacOSBundleIdTool, registerGetAppBundleIdTool } from '../tools/bundleId.js';

// Import swift package tools
import { registerBuildSwiftPackageTool } from '../tools/build-swift-package.js';
import { registerTestSwiftPackageTool } from '../tools/test-swift-package.js';
import {
  registerRunSwiftPackageTool,
  registerStopSwiftPackageTool,
  registerListSwiftPackageTool,
  registerCleanSwiftPackageTool,
} from '../tools/run-swift-package.js';

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

// Import device log capture tools
import {
  registerStartDeviceLogCaptureTool,
  registerStopDeviceLogCaptureTool,
} from '../tools/device_log.js';

// Import axe tools
import { registerAxeTools } from '../tools/axe.js';

// Import screenshot tool
import { registerScreenshotTool } from '../tools/screenshot.js';

// Import diagnostic tool
import { registerDiagnosticTool } from '../tools/diagnostic.js';

// Import scaffold tool
import { registerScaffoldTools } from '../tools/scaffold.js';

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
    register: registerListDevicesTool,
    groups: [ToolGroup.DEVICE_MANAGEMENT, ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_LIST_DEVICES',
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

  // Swift Package tools
  {
    register: registerBuildSwiftPackageTool,
    groups: [ToolGroup.SWIFT_PACKAGE_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_SWIFT_PACKAGE_BUILD',
  },
  {
    register: registerTestSwiftPackageTool,
    groups: [ToolGroup.SWIFT_PACKAGE_WORKFLOW, ToolGroup.TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_SWIFT_PACKAGE_TEST',
  },
  {
    register: registerRunSwiftPackageTool,
    groups: [ToolGroup.SWIFT_PACKAGE_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_SWIFT_PACKAGE_RUN',
    isWriteTool: true,
  },
  {
    register: registerStopSwiftPackageTool,
    groups: [ToolGroup.SWIFT_PACKAGE_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_SWIFT_PACKAGE_STOP',
    isWriteTool: true,
  },
  {
    register: registerListSwiftPackageTool,
    groups: [ToolGroup.SWIFT_PACKAGE_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_SWIFT_PACKAGE_LIST',
  },
  {
    register: registerCleanSwiftPackageTool,
    groups: [ToolGroup.SWIFT_PACKAGE_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_SWIFT_PACKAGE_CLEAN',
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
    register: registerSimulatorBuildByNameWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_BUILD_BY_NAME_WORKSPACE',
  },
  {
    register: registerSimulatorBuildByNameProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_BUILD_BY_NAME_PROJECT',
  },
  {
    register: registerSimulatorBuildByIdWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_BUILD_BY_ID_WORKSPACE',
  },
  {
    register: registerSimulatorBuildByIdProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_BUILD_BY_ID_PROJECT',
  },
  {
    register: registerSimulatorBuildAndRunByNameWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_BUILD_AND_RUN_BY_NAME_WORKSPACE',
  },
  {
    register: registerSimulatorBuildAndRunByNameProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_BUILD_AND_RUN_BY_NAME_PROJECT',
  },
  {
    register: registerSimulatorBuildAndRunByIdWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_BUILD_AND_RUN_BY_ID_WORKSPACE',
  },
  {
    register: registerSimulatorBuildAndRunByIdProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.APP_DEPLOYMENT],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_BUILD_AND_RUN_BY_ID_PROJECT',
  },

  // iOS Device build tools
  {
    register: registerDeviceBuildTools,
    groups: [ToolGroup.IOS_DEVICE_WORKFLOW],
    envVar: 'XCODEBUILDMCP_TOOL_DEVICE_BUILD_TOOLS',
  },

  // Test tools
  {
    register: registerSimulatorTestByNameWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_TEST_BY_NAME_WORKSPACE',
  },
  {
    register: registerSimulatorTestByNameProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_TEST_BY_NAME_PROJECT',
  },
  {
    register: registerSimulatorTestByIdWorkspaceTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_TEST_BY_ID_WORKSPACE',
  },
  {
    register: registerSimulatorTestByIdProjectTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_SIMULATOR_TEST_BY_ID_PROJECT',
  },
  {
    register: registerAppleDeviceTestWorkspaceTool,
    groups: [ToolGroup.IOS_DEVICE_WORKFLOW, ToolGroup.TESTING, ToolGroup.DEVICE_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_DEVICE_TEST_WORKSPACE',
  },
  {
    register: registerAppleDeviceTestProjectTool,
    groups: [ToolGroup.IOS_DEVICE_WORKFLOW, ToolGroup.TESTING, ToolGroup.DEVICE_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_DEVICE_TEST_PROJECT',
  },
  {
    register: registerMacOSTestWorkspaceTool,
    groups: [ToolGroup.MACOS_WORKFLOW, ToolGroup.TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_MACOS_TEST_WORKSPACE',
  },
  {
    register: registerMacOSTestProjectTool,
    groups: [ToolGroup.MACOS_WORKFLOW, ToolGroup.TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_MACOS_TEST_PROJECT',
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
    register: registerGetDeviceAppPathWorkspaceTool,
    groups: [
      ToolGroup.IOS_DEVICE_WORKFLOW,
      ToolGroup.APP_DEPLOYMENT,
      ToolGroup.PROJECT_DISCOVERY,
      ToolGroup.DEVICE_MANAGEMENT,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_GET_DEVICE_APP_PATH_WORKSPACE',
  },
  {
    register: registerGetDeviceAppPathProjectTool,
    groups: [
      ToolGroup.IOS_DEVICE_WORKFLOW,
      ToolGroup.APP_DEPLOYMENT,
      ToolGroup.PROJECT_DISCOVERY,
      ToolGroup.DEVICE_MANAGEMENT,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_GET_DEVICE_APP_PATH_PROJECT',
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
  {
    register: registerSetSimulatorLocationTool,
    groups: [ToolGroup.SIMULATOR_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_SET_SIMULATOR_LOCATION',
  },
  {
    register: registerResetSimulatorLocationTool,
    groups: [ToolGroup.SIMULATOR_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_RESET_SIMULATOR_LOCATION',
  },
  {
    register: registerSetNetworkConditionTool,
    groups: [ToolGroup.SIMULATOR_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_SET_NETWORK_CONDITION',
  },
  {
    register: registerResetNetworkConditionTool,
    groups: [ToolGroup.SIMULATOR_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_RESET_NETWORK_CONDITION',
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
  {
    register: registerInstallAppDeviceTool,
    groups: [ToolGroup.APP_DEPLOYMENT, ToolGroup.IOS_DEVICE_WORKFLOW, ToolGroup.DEVICE_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_INSTALL_APP_DEVICE',
    isWriteTool: true,
  },
  {
    register: registerLaunchAppDeviceTool,
    groups: [ToolGroup.APP_DEPLOYMENT, ToolGroup.IOS_DEVICE_WORKFLOW, ToolGroup.DEVICE_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_LAUNCH_APP_DEVICE',
  },

  // Bundle ID tools
  {
    register: registerGetMacOSBundleIdTool,
    groups: [ToolGroup.MACOS_WORKFLOW, ToolGroup.APP_DEPLOYMENT, ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_GET_MACOS_BUNDLE_ID',
  },
  {
    register: registerGetAppBundleIdTool,
    groups: [
      ToolGroup.IOS_SIMULATOR_WORKFLOW,
      ToolGroup.IOS_DEVICE_WORKFLOW,
      ToolGroup.APP_DEPLOYMENT,
      ToolGroup.PROJECT_DISCOVERY,
      ToolGroup.SIMULATOR_MANAGEMENT,
      ToolGroup.DEVICE_MANAGEMENT,
    ],
    envVar: 'XCODEBUILDMCP_TOOL_GET_APP_BUNDLE_ID',
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

  // Device log capture tools
  {
    register: registerStartDeviceLogCaptureTool,
    groups: [ToolGroup.DIAGNOSTICS, ToolGroup.IOS_DEVICE_WORKFLOW, ToolGroup.DEVICE_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_START_DEVICE_LOG_CAPTURE',
  },
  {
    register: registerStopDeviceLogCaptureTool,
    groups: [ToolGroup.DIAGNOSTICS, ToolGroup.IOS_DEVICE_WORKFLOW, ToolGroup.DEVICE_MANAGEMENT],
    envVar: 'XCODEBUILDMCP_TOOL_STOP_DEVICE_LOG_CAPTURE',
  },

  // UI automation tools
  {
    register: registerUIAutomationTools,
    groups: [ToolGroup.UI_TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_UI_AUTOMATION_TOOLS',
  },

  // Screenshot tool
  {
    register: registerScreenshotTool,
    groups: [ToolGroup.IOS_SIMULATOR_WORKFLOW, ToolGroup.UI_TESTING],
    envVar: 'XCODEBUILDMCP_TOOL_SCREENSHOT',
  },

  // Scaffold tool
  {
    register: registerScaffoldTools,
    groups: [ToolGroup.PROJECT_DISCOVERY],
    envVar: 'XCODEBUILDMCP_TOOL_SCAFFOLD_PROJECT',
  },
];

// Registers the UI automation tools (will be split into individual tools in the future)
function registerUIAutomationTools(server: McpServer): void {
  registerAxeTools(server);
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
