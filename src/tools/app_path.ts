/**
 * App Path Tools - Tools for retrieving app bundle paths
 *
 * This module provides tools for retrieving app bundle paths for various platforms
 * (macOS, iOS, watchOS, etc.) from both project files and workspaces.
 *
 * Responsibilities:
 * - Retrieving app bundle paths for simulator builds
 * - Retrieving app bundle paths for device builds
 * - Retrieving app bundle paths for macOS builds
 * - Supporting architecture-specific builds for macOS
 * - Handling platform-specific destination parameters
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../utils/logger.js';
import { validateRequiredParam, createTextResponse } from '../utils/validation.js';
import { ToolResponse, XcodePlatform } from '../types/common.js';
import { executeXcodeCommand, constructDestinationString } from '../utils/xcode.js';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  configurationSchema,
  simulatorNameSchema,
  simulatorIdSchema,
  useLatestOSSchema,
  platformSimulatorSchema,
  BaseWorkspaceParams,
  BaseProjectParams,
  BaseAppPathSimulatorNameParams,
  BaseAppPathSimulatorIdParams,
} from './common.js';
import { z } from 'zod';

// Schema for architecture parameter
const archSchema = z
  .enum(['arm64', 'x86_64'])
  .optional()
  .describe('Architecture to build for (arm64 or x86_64). For macOS only.');

// --- Private Helper Functions ---

/**
 * Internal function to handle getting app path
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
  arch?: string;
}): Promise<ToolResponse> {
  log('info', `Getting app path for scheme ${params.scheme} on platform ${params.platform}`);

  try {
    // Create the command array for xcodebuild with -showBuildSettings option
    const command = ['xcodebuild', '-showBuildSettings'];

    // Add the workspace or project
    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    // Add the scheme and configuration
    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);

    // Handle destination based on platform
    const isSimulatorPlatform = [
      XcodePlatform.iOSSimulator,
      XcodePlatform.watchOSSimulator,
      XcodePlatform.tvOSSimulator,
      XcodePlatform.visionOSSimulator,
    ].includes(params.platform);

    let destinationString = '';

    if (isSimulatorPlatform) {
      if (params.simulatorId) {
        destinationString = `platform=${params.platform},id=${params.simulatorId}`;
      } else if (params.simulatorName) {
        destinationString = `platform=${params.platform},name=${params.simulatorName}${params.useLatestOS ? ',OS=latest' : ''}`;
      } else {
        return createTextResponse(
          `For ${params.platform} platform, either simulatorId or simulatorName must be provided`,
          true,
        );
      }
    } else if (params.platform === XcodePlatform.macOS) {
      destinationString = constructDestinationString(
        params.platform,
        undefined,
        undefined,
        false,
        params.arch,
      );
    } else if (params.platform === XcodePlatform.iOS) {
      destinationString = 'generic/platform=iOS';
    } else if (params.platform === XcodePlatform.watchOS) {
      destinationString = 'generic/platform=watchOS';
    } else if (params.platform === XcodePlatform.tvOS) {
      destinationString = 'generic/platform=tvOS';
    } else if (params.platform === XcodePlatform.visionOS) {
      destinationString = 'generic/platform=visionOS';
    } else {
      return createTextResponse(`Unsupported platform: ${params.platform}`, true);
    }

    command.push('-destination', destinationString);

    // Execute the command directly
    const result = await executeXcodeCommand(command, 'Get App Path');

    if (!result.success) {
      return createTextResponse(`Failed to get app path: ${result.error}`, true);
    }

    if (!result.output) {
      return createTextResponse('Failed to extract build settings output from the result.', true);
    }

    const buildSettingsOutput = result.output;
    const builtProductsDirMatch = buildSettingsOutput.match(/BUILT_PRODUCTS_DIR = (.+)$/m);
    const fullProductNameMatch = buildSettingsOutput.match(/FULL_PRODUCT_NAME = (.+)$/m);

    if (!builtProductsDirMatch || !fullProductNameMatch) {
      return createTextResponse(
        'Failed to extract app path from build settings. Make sure the app has been built first.',
        true,
      );
    }

    const builtProductsDir = builtProductsDirMatch[1].trim();
    const fullProductName = fullProductNameMatch[1].trim();
    const appPath = `${builtProductsDir}/${fullProductName}`;

    let nextStepsText = '';
    if (params.platform === XcodePlatform.macOS) {
      nextStepsText = `Next Steps:
1. Get bundle ID: get_macos_bundle_id({ appPath: "${appPath}" })
2. Launch the app: launch_macos_app({ appPath: "${appPath}" })`;
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
          type: 'text',
          text: `✅ App path retrieved successfully: ${appPath}`,
        },
        {
          type: 'text',
          text: nextStepsText,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error retrieving app path: ${errorMessage}`);
    return createTextResponse(`Error retrieving app path: ${errorMessage}`, true);
  }
}

// --- Public Tool Definitions ---

/**
 * Registers the get_mac_app_path_ws tool
 */
export function registerGetMacOSAppPathWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams & { configuration?: string; arch?: string };
  registerTool<Params>(
    server,
    'get_mac_app_path_ws',
    "Gets the app bundle path for a macOS application using a workspace. IMPORTANT: Requires workspacePath and scheme. Example: get_mac_app_path_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      arch: archSchema,
    },
    async (params: Params) => {
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        platform: XcodePlatform.macOS,
        useLatestOS: true,
        arch: params.arch, // Pass the architecture parameter
      });
    },
  );
}

/**
 * Registers the get_mac_app_path_proj tool
 */
export function registerGetMacOSAppPathProjectTool(server: McpServer): void {
  type Params = BaseProjectParams & { configuration?: string; arch?: string };
  registerTool<Params>(
    server,
    'get_mac_app_path_proj',
    "Gets the app bundle path for a macOS application using a project file. IMPORTANT: Requires projectPath and scheme. Example: get_mac_app_path_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      arch: archSchema,
    },
    async (params: Params) => {
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        platform: XcodePlatform.macOS,
        useLatestOS: true,
        arch: params.arch,
      });
    },
  );
}

/**
 * Registers the get_ios_dev_app_path_ws tool
 */
export function registerGetiOSDeviceAppPathWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams & { configuration?: string };
  registerTool<Params>(
    server,
    'get_ios_dev_app_path_ws',
    "Gets the app bundle path for an iOS physical device application using a workspace. IMPORTANT: Requires workspacePath and scheme. Example: get_ios_dev_app_path_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
    },
    async (params: Params) => {
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        platform: XcodePlatform.iOS,
        useLatestOS: true,
      });
    },
  );
}

/**
 * Registers the get_ios_dev_app_path_proj tool
 */
export function registerGetiOSDeviceAppPathProjectTool(server: McpServer): void {
  type Params = BaseProjectParams & { configuration?: string };
  registerTool<Params>(
    server,
    'get_ios_dev_app_path_proj',
    "Gets the app bundle path for an iOS physical device application using a project file. IMPORTANT: Requires projectPath and scheme. Example: get_ios_dev_app_path_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
    },
    async (params: Params) => {
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return _handleGetAppPathLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        platform: XcodePlatform.iOS,
        useLatestOS: true,
      });
    },
  );
}

/**
 * Registers the get_sim_app_path_name_ws tool
 */
export function registerGetSimulatorAppPathByNameWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams & BaseAppPathSimulatorNameParams;
  registerTool<Params>(
    server,
    'get_sim_app_path_name_ws',
    "Gets the app bundle path for a simulator by name using a workspace. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorName. Example: get_sim_app_path_name_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
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
    },
  );
}

/**
 * Registers the get_sim_app_path_name_proj tool
 */
export function registerGetSimulatorAppPathByNameProjectTool(server: McpServer): void {
  type Params = BaseProjectParams & BaseAppPathSimulatorNameParams;
  registerTool<Params>(
    server,
    'get_sim_app_path_name_proj',
    "Gets the app bundle path for a simulator by name using a project file. IMPORTANT: Requires projectPath, scheme, platform, and simulatorName. Example: get_sim_app_path_name_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
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
    },
  );
}

/**
 * Registers the get_sim_app_path_id_ws tool
 */
export function registerGetSimulatorAppPathByIdWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams & BaseAppPathSimulatorIdParams;
  registerTool<Params>(
    server,
    'get_sim_app_path_id_ws',
    "Gets the app bundle path for a simulator by UUID using a workspace. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorId. Example: get_sim_app_path_id_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
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
    },
  );
}

/**
 * Registers the get_sim_app_path_id_proj tool
 */
export function registerGetSimulatorAppPathByIdProjectTool(server: McpServer): void {
  type Params = BaseProjectParams & BaseAppPathSimulatorIdParams;
  registerTool<Params>(
    server,
    'get_sim_app_path_id_proj',
    "Gets the app bundle path for a simulator by UUID using a project file. IMPORTANT: Requires projectPath, scheme, platform, and simulatorId. Example: get_sim_app_path_id_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
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
    },
  );
}
