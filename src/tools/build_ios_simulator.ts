/**
 * iOS Simulator Build Tools - Tools for building and running iOS applications in simulators
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../utils/logger.js';
import { XcodePlatform } from '../utils/xcode.js';
import { validateRequiredParam, createTextResponse } from '../utils/validation.js';
import { ToolResponse } from '../types/common.js';
import { executeXcodeBuild } from '../utils/build-utils.js';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  configurationSchema,
  derivedDataPathSchema,
  extraArgsSchema,
  simulatorNameSchema,
  simulatorIdSchema,
  useLatestOSSchema,
} from './common.js';
import { execSync } from 'child_process';

// --- Private Helper Functions ---

/**
 * Internal logic for building iOS Simulator apps.
 */
async function _handleIOSSimulatorBuildLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  simulatorName?: string;
  simulatorId?: string;
  useLatestOS: boolean;
  derivedDataPath?: string;
  extraArgs?: string[];
}): Promise<ToolResponse> {
  log('info', `Starting iOS Simulator build for scheme ${params.scheme} (internal)`);

  return executeXcodeBuild(
    {
      ...params,
    },
    {
      platform: XcodePlatform.iOSSimulator,
      simulatorName: params.simulatorName,
      simulatorId: params.simulatorId,
      useLatestOS: params.useLatestOS,
      logPrefix: 'iOS Simulator Build',
    },
    'build',
  );
}

/**
 * Internal logic for building and running iOS Simulator apps.
 */
async function _handleIOSSimulatorBuildAndRunLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  simulatorName?: string;
  simulatorId?: string;
  useLatestOS: boolean;
  derivedDataPath?: string;
  extraArgs?: string[];
}): Promise<ToolResponse> {
  log('info', `Starting iOS Simulator build and run for scheme ${params.scheme} (internal)`);

  try {
    // --- Build Step ---
    const buildResult = await _handleIOSSimulatorBuildLogic(params);

    if (buildResult.isError) {
      return buildResult; // Return the build error
    }

    // --- Get App Path Step ---
    // Use executeXcodeBuild for more consistent error handling
    const appPathResult = await executeXcodeBuild(
      {
        ...params,
      },
      {
        platform: XcodePlatform.iOSSimulator,
        simulatorName: params.simulatorName,
        simulatorId: params.simulatorId,
        useLatestOS: params.useLatestOS ?? true,
        logPrefix: 'Get App Path',
      },
      'showBuildSettings',
    );

    // If there was an error with the command execution, return it
    if (appPathResult.isError) {
      return createTextResponse(
        `Build succeeded, but failed to get app path: ${appPathResult.content?.[0]?.text || 'Unknown error'}`,
        true,
      );
    }

    // Extract build settings output
    let buildSettingsOutput = '';
    if (appPathResult.content) {
      for (const item of appPathResult.content) {
        if (item.type === 'text' && !item.text.includes('✅') && !item.text.includes('⚠️')) {
          buildSettingsOutput = item.text;
          break;
        }
      }
    }

    // Extract CODESIGNING_FOLDER_PATH from build settings to get app path
    const appPathMatch = buildSettingsOutput.match(/CODESIGNING_FOLDER_PATH = (.+\.app)/);
    if (!appPathMatch || !appPathMatch[1]) {
      return createTextResponse(
        `Build succeeded, but could not find app path in build settings.`,
        true,
      );
    }

    const appBundlePath = appPathMatch[1].trim();
    log('info', `App bundle path for run: ${appBundlePath}`);

    // --- Find/Boot Simulator Step ---
    let simulatorUuid = params.simulatorId;
    if (!simulatorUuid && params.simulatorName) {
      try {
        log('info', `Finding simulator UUID for name: ${params.simulatorName}`);
        const simulatorsOutput = execSync('xcrun simctl list devices available --json').toString();
        const simulatorsJson = JSON.parse(simulatorsOutput);
        let foundSimulator = null;

        // Find the simulator in the available devices list
        for (const runtime in simulatorsJson.devices) {
          const devices = simulatorsJson.devices[runtime];
          for (const device of devices) {
            if (device.name === params.simulatorName && device.isAvailable) {
              foundSimulator = device;
              break;
            }
          }
          if (foundSimulator) break;
        }

        if (foundSimulator) {
          simulatorUuid = foundSimulator.udid;
          log('info', `Found simulator for run: ${foundSimulator.name} (${simulatorUuid})`);
        } else {
          return createTextResponse(
            `Build succeeded, but could not find an available simulator named '${params.simulatorName}'. Use list_simulators({}) to check available devices.`,
            true,
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return createTextResponse(
          `Build succeeded, but error finding simulator: ${errorMessage}`,
          true,
        );
      }
    }

    if (!simulatorUuid) {
      return createTextResponse(
        'Build succeeded, but no simulator specified and failed to find a suitable one.',
        true,
      );
    }

    // Ensure simulator is booted
    try {
      log('info', `Checking simulator state for UUID: ${simulatorUuid}`);
      const simulatorStateOutput = execSync('xcrun simctl list devices').toString();
      const simulatorLine = simulatorStateOutput
        .split('\n')
        .find((line) => line.includes(simulatorUuid));

      const isBooted = simulatorLine ? simulatorLine.includes('(Booted)') : false;

      if (!simulatorLine) {
        return createTextResponse(
          `Build succeeded, but could not find simulator with UUID: ${simulatorUuid}`,
          true,
        );
      }

      if (!isBooted) {
        log('info', `Booting simulator ${simulatorUuid}`);
        execSync(`xcrun simctl boot "${simulatorUuid}"`);
        // Wait a moment for the simulator to fully boot
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        log('info', `Simulator ${simulatorUuid} is already booted`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error checking/booting simulator: ${errorMessage}`);
      return createTextResponse(
        `Build succeeded, but error checking/booting simulator: ${errorMessage}`,
        true,
      );
    }

    // --- Open Simulator UI Step ---
    try {
      log('info', 'Opening Simulator app');
      execSync('open -a Simulator');
      // Give the Simulator app time to open
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('warning', `Warning: Could not open Simulator app: ${errorMessage}`);
      // Don't fail the whole operation for this
    }

    // --- Install App Step ---
    try {
      log('info', `Installing app at path: ${appBundlePath} to simulator: ${simulatorUuid}`);
      execSync(`xcrun simctl install "${simulatorUuid}" "${appBundlePath}"`);
      // Wait a moment for installation to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error installing app: ${errorMessage}`);
      return createTextResponse(
        `Build succeeded, but error installing app on simulator: ${errorMessage}`,
        true,
      );
    }

    // --- Get Bundle ID Step ---
    let bundleId;
    try {
      log('info', `Extracting bundle ID from app: ${appBundlePath}`);

      // Try PlistBuddy first (more reliable)
      try {
        bundleId = execSync(
          `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${appBundlePath}/Info.plist"`,
        )
          .toString()
          .trim();
      } catch (plistError: unknown) {
        // Fallback to defaults if PlistBuddy fails
        const errorMessage = plistError instanceof Error ? plistError.message : String(plistError);
        log('warning', `PlistBuddy failed, trying defaults: ${errorMessage}`);
        bundleId = execSync(`defaults read "${appBundlePath}/Info" CFBundleIdentifier`)
          .toString()
          .trim();
      }

      if (!bundleId) {
        throw new Error('Could not extract bundle ID from Info.plist');
      }

      log('info', `Bundle ID for run: ${bundleId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error getting bundle ID: ${errorMessage}`);
      return createTextResponse(
        `Build and install succeeded, but error getting bundle ID: ${errorMessage}`,
        true,
      );
    }

    // --- Launch App Step ---
    try {
      log('info', `Launching app with bundle ID: ${bundleId} on simulator: ${simulatorUuid}`);
      execSync(`xcrun simctl launch "${simulatorUuid}" "${bundleId}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error launching app: ${errorMessage}`);
      return createTextResponse(
        `Build and install succeeded, but error launching app on simulator: ${errorMessage}`,
        true,
      );
    }

    // --- Success ---
    log('info', '✅ iOS simulator build & run succeeded.');

    const target = params.simulatorId
      ? `simulator UUID ${params.simulatorId}`
      : `simulator name '${params.simulatorName}'`;

    return {
      content: [
        {
          type: 'text',
          text: `✅ iOS simulator build and run succeeded for scheme ${params.scheme} targeting ${target}.
          
The app (${bundleId}) is now running in the iOS Simulator. 
If you don't see the simulator window, it may be hidden behind other windows. The Simulator app should be open.`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error in iOS Simulator build and run: ${errorMessage}`);
    return createTextResponse(`Error in iOS Simulator build and run: ${errorMessage}`, true);
  }
}

// --- Public Tool Definitions ---

/**
 * Registers the iOS Simulator build by name workspace tool
 */
export function registerIOSSimulatorBuildByNameWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    simulatorName: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
  };

  registerTool<Params>(
    server,
    'ios_simulator_build_by_name_workspace',
    "Builds an iOS app from a workspace for a specific simulator by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: ios_simulator_build_by_name_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
      if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

      // Provide defaults
      return _handleIOSSimulatorBuildLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true,
      });
    },
  );
}

/**
 * Registers the iOS Simulator build by name project tool
 */
export function registerIOSSimulatorBuildByNameProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    simulatorName: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
  };

  registerTool<Params>(
    server,
    'ios_simulator_build_by_name_project',
    "Builds an iOS app from a project file for a specific simulator by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: ios_simulator_build_by_name_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
      if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

      // Provide defaults
      return _handleIOSSimulatorBuildLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true,
      });
    },
  );
}

/**
 * Registers the iOS Simulator build by ID workspace tool
 */
export function registerIOSSimulatorBuildByIdWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    simulatorId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
  };

  registerTool<Params>(
    server,
    'ios_simulator_build_by_id_workspace',
    "Builds an iOS app from a workspace for a specific simulator by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: ios_simulator_build_by_id_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
      if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

      // Provide defaults
      return _handleIOSSimulatorBuildLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true, // May be ignored by xcodebuild
      });
    },
  );
}

/**
 * Registers the iOS Simulator build by ID project tool
 */
export function registerIOSSimulatorBuildByIdProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    simulatorId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
  };

  registerTool<Params>(
    server,
    'ios_simulator_build_by_id_project',
    "Builds an iOS app from a project file for a specific simulator by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: ios_simulator_build_by_id_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
      if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

      // Provide defaults
      return _handleIOSSimulatorBuildLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true, // May be ignored by xcodebuild
      });
    },
  );
}

/**
 * Registers the iOS Simulator build and run by name workspace tool
 */
export function registerIOSSimulatorBuildAndRunByNameWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    simulatorName: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
  };

  registerTool<Params>(
    server,
    'ios_simulator_build_and_run_by_name_workspace',
    "Builds and runs an iOS app from a workspace on a simulator specified by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: ios_simulator_build_and_run_by_name_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
      if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

      // Provide defaults
      return _handleIOSSimulatorBuildAndRunLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true,
      });
    },
  );
}

/**
 * Registers the iOS Simulator build and run by name project tool
 */
export function registerIOSSimulatorBuildAndRunByNameProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    simulatorName: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
  };

  registerTool<Params>(
    server,
    'ios_simulator_build_and_run_by_name_project',
    "Builds and runs an iOS app from a project file on a simulator specified by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: ios_simulator_build_and_run_by_name_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
      if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

      // Provide defaults
      return _handleIOSSimulatorBuildAndRunLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true,
      });
    },
  );
}

/**
 * Registers the iOS Simulator build and run by ID workspace tool
 */
export function registerIOSSimulatorBuildAndRunByIdWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    simulatorId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
  };

  registerTool<Params>(
    server,
    'ios_simulator_build_and_run_by_id_workspace',
    "Builds and runs an iOS app from a workspace on a simulator specified by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: ios_simulator_build_and_run_by_id_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
      if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

      // Provide defaults
      return _handleIOSSimulatorBuildAndRunLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true, // May be ignored
      });
    },
  );
}

/**
 * Registers the iOS Simulator build and run by ID project tool
 */
export function registerIOSSimulatorBuildAndRunByIdProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    simulatorId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
  };

  registerTool<Params>(
    server,
    'ios_simulator_build_and_run_by_id_project',
    "Builds and runs an iOS app from a project file on a simulator specified by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: ios_simulator_build_and_run_by_id_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
      if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

      // Provide defaults
      return _handleIOSSimulatorBuildAndRunLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? true, // May be ignored
      });
    },
  );
}

// Register all iOS simulator build tools
export function registerIOSSimulatorBuildTools(server: McpServer): void {
  registerIOSSimulatorBuildByNameWorkspaceTool(server);
  registerIOSSimulatorBuildByNameProjectTool(server);
  registerIOSSimulatorBuildByIdWorkspaceTool(server);
  registerIOSSimulatorBuildByIdProjectTool(server);
}

// Register all iOS simulator build and run tools
export function registerIOSSimulatorBuildAndRunTools(server: McpServer): void {
  registerIOSSimulatorBuildAndRunByNameWorkspaceTool(server);
  registerIOSSimulatorBuildAndRunByNameProjectTool(server);
  registerIOSSimulatorBuildAndRunByIdWorkspaceTool(server);
  registerIOSSimulatorBuildAndRunByIdProjectTool(server);
}
