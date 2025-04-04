/**
 * App Path Tools - Tools for retrieving app bundle paths
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../utils/logger.js';
import {
  executeXcodeCommand,
  XcodePlatform,
  constructDestinationString,
} from '../utils/xcode.js';
import {
  validateRequiredParam,
  createTextResponse,
} from '../utils/validation.js';
import { ToolResponse } from '../types/common.js';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  configurationSchema,
  simulatorNameSchema,
  simulatorIdSchema,
  useLatestOSSchema,
  platformDeviceSchema,
  platformSimulatorSchema,
  BaseWorkspaceParams,
  BaseProjectParams,
  BaseAppPathDeviceParams,
  BaseAppPathSimulatorNameParams,
  BaseAppPathSimulatorIdParams,
} from './common.js';

// --- Private Helper Functions ---

/**
 * Internal function to handle getting app path logic
 */
async function _handleGetAppPathLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  platform: XcodePlatform;
  simulatorName?: string;
  simulatorId?: string;
  useLatestOS: boolean;
}): Promise<ToolResponse> {
  log('info', `Getting app path for scheme ${params.scheme} on platform ${params.platform}`);

  try {
    const command = ['xcodebuild'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    } 

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);

    let destinationString: string;
    if (params.platform === XcodePlatform.macOS) {
      destinationString = 'platform=macOS';
    } else if (params.platform === XcodePlatform.iOS) {
      destinationString = 'generic/platform=iOS';
    } else if (params.platform === XcodePlatform.iOSSimulator) {
      if (params.simulatorId) {
        destinationString = constructDestinationString(
          XcodePlatform.iOSSimulator,
          undefined,
          params.simulatorId
        );
      } else if (params.simulatorName) {
        destinationString = constructDestinationString(
          XcodePlatform.iOSSimulator,
          params.simulatorName,
          undefined,
          params.useLatestOS
        );
      } else {
        return createTextResponse(
          'For iOS Simulator platform, either simulatorId or simulatorName must be provided',
          true
        );
      }
    } else {
      return createTextResponse(`Unsupported platform: ${params.platform}`, true);
    }

    command.push('-destination', destinationString);
    command.push('-showBuildSettings');

    const result = await executeXcodeCommand(command, 'Show Build Settings');

    if (!result.success) {
      return createTextResponse(`Failed to get build settings: ${result.error}`, true);
    }

    const builtProductsDirMatch = result.output.match(/BUILT_PRODUCTS_DIR = (.+)$/m);
    const fullProductNameMatch = result.output.match(/FULL_PRODUCT_NAME = (.+)$/m);

    if (!builtProductsDirMatch || !fullProductNameMatch) {
      return createTextResponse(
        'Failed to extract app path from build settings. Make sure the app has been built first.',
        true
      );
    }

    const builtProductsDir = builtProductsDirMatch[1].trim();
    const fullProductName = fullProductNameMatch[1].trim();
    const appPath = `${builtProductsDir}/${fullProductName}`;

    let nextStepsText = '';
    if (params.platform === XcodePlatform.macOS) {
      nextStepsText = `Next Steps:
1. Get bundle ID: get_macos_bundle_id({ appPath: "${appPath}" })
2. Launch the app: open "${appPath}"`;
    } else if (params.platform === XcodePlatform.iOSSimulator) {
      nextStepsText = `Next Steps:
1. Get bundle ID: get_ios_bundle_id({ appPath: "${appPath}" })
2. Boot simulator: boot_simulator({ simulatorUuid: "SIMULATOR_UUID" })
3. Install app: install_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", appPath: "${appPath}" })
4. Launch app: launch_app_in_simulator({ simulatorUuid: "SIMULATOR_UUID", bundleId: "BUNDLE_ID" })`;
    } else if (params.platform === XcodePlatform.iOS) {
      nextStepsText = `Next Steps:
1. Get bundle ID: get_ios_bundle_id({ appPath: "${appPath}" })
2. Use Xcode to install the app on your connected iOS device`;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ App path retrieved successfully: ${appPath}`,
        },
        {
          type: 'text' as const,
          text: nextStepsText,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error getting app path: ${errorMessage}`);
    return createTextResponse(`Error getting app path: ${errorMessage}`, true);
  }
}

// --- Public Tool Definitions ---

/**
 * Registers the get app path for device workspace tool
 */
export function registerGetAppPathForDeviceWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams & BaseAppPathDeviceParams;
  registerTool<Params>(
    server,
    'get_app_path_for_device_workspace',
    "Gets the app bundle path from build settings for a device platform (macOS, iOS, etc.) using a workspace. IMPORTANT: Requires workspacePath, scheme, and platform. Example: get_app_path_for_device_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'macOS' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      platform: platformDeviceSchema,
      configuration: configurationSchema,
    },
    async (params: Params) => {
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;
      
      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const platformValidation = validateRequiredParam('platform', params.platform);
      if (!platformValidation.isValid) return platformValidation.errorResponse!;
      
      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: true, 
      });
    }
  );
}

/**
 * Registers the get_app_path_for_device_project tool
 */
export function registerGetAppPathForDeviceProjectTool(server: McpServer): void {
  type Params = BaseProjectParams & BaseAppPathDeviceParams;
  registerTool<Params>(
    server,
    'get_app_path_for_device_project',
    "Gets the app bundle path from build settings for a device platform (macOS, iOS, etc.) using a project file. IMPORTANT: Requires projectPath, scheme, and platform. Example: get_app_path_for_device_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'macOS' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      platform: platformDeviceSchema,
      configuration: configurationSchema,
    },
    async (params: Params) => {
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const platformValidation = validateRequiredParam('platform', params.platform);
      if (!platformValidation.isValid) return platformValidation.errorResponse!;
      
      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: true, 
      });
    }
  );
}

/**
 * Registers the get_app_path_by_name_workspace tool
 */
export function registerGetAppPathByNameWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams & BaseAppPathSimulatorNameParams;
  registerTool<Params>(
    server,
    'get_app_path_by_name_workspace',
    "Gets the app bundle path from build settings for a simulator platform using a workspace and simulator name. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorName. Example: get_app_path_by_name_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      platform: platformSimulatorSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      useLatestOS: useLatestOSSchema, 
    },
    async (params: Params) => {
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;
      
      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const platformValidation = validateRequiredParam('platform', params.platform);
      if (!platformValidation.isValid) return platformValidation.errorResponse!;

      const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
      if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;
      
      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true,
      });
    }
  );
}

/**
 * Registers the get_app_path_by_name_project tool
 */
export function registerGetAppPathByNameProjectTool(server: McpServer): void {
  type Params = BaseProjectParams & BaseAppPathSimulatorNameParams;
  registerTool<Params>(
    server,
    'get_app_path_by_name_project',
    "Gets the app bundle path from build settings for a simulator platform using a project file and simulator name. IMPORTANT: Requires projectPath, scheme, platform, and simulatorName. Example: get_app_path_by_name_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      platform: platformSimulatorSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      useLatestOS: useLatestOSSchema, 
    },
    async (params: Params) => {
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const platformValidation = validateRequiredParam('platform', params.platform);
      if (!platformValidation.isValid) return platformValidation.errorResponse!;

      const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
      if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;
      
      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true,
      });
    }
  );
}

/**
 * Registers the get_app_path_by_id_workspace tool
 */
export function registerGetAppPathByIdWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams & BaseAppPathSimulatorIdParams;
  registerTool<Params>(
    server,
    'get_app_path_by_id_workspace',
    "Gets the app bundle path from build settings for a simulator platform using a workspace and simulator UUID. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorId. Example: get_app_path_by_id_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      platform: platformSimulatorSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      useLatestOS: useLatestOSSchema, 
    },
    async (params: Params) => {
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;
      
      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const platformValidation = validateRequiredParam('platform', params.platform);
      if (!platformValidation.isValid) return platformValidation.errorResponse!;

      const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
      if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;
      
      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true,
      });
    }
  );
}

/**
 * Registers the get_app_path_by_id_project tool
 */
export function registerGetAppPathByIdProjectTool(server: McpServer): void {
  type Params = BaseProjectParams & BaseAppPathSimulatorIdParams;
  registerTool<Params>(
    server,
    'get_app_path_by_id_project',
    "Gets the app bundle path from build settings for a simulator platform using a project file and simulator UUID. IMPORTANT: Requires projectPath, scheme, platform, and simulatorId. Example: get_app_path_by_id_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      platform: platformSimulatorSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      useLatestOS: useLatestOSSchema, 
    },
    async (params: Params) => {
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const platformValidation = validateRequiredParam('platform', params.platform);
      if (!platformValidation.isValid) return platformValidation.errorResponse!;

      const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
      if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;
      
      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true,
      });
    }
  );
}
