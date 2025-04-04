/**
 * Build Tool - Uses xcodebuild to build Xcode projects and workspaces
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  executeXcodeCommand,
  addXcodeParameters,
  XcodePlatform,
  constructDestinationString,
  XcodeParams,
} from '../utils/xcode.js';
import {
  createTextResponse,
} from '../utils/validation.js';
import { ToolResponse } from '../types/common.js';
import { execSync } from 'child_process';

// --- Private Helper Functions ---

/**
 * Internal logic for building macOS apps.
 */
async function _handleMacOSBuildLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  derivedDataPath?: string;
  extraArgs?: string[];
}): Promise<ToolResponse> {
  const warningMessages: { type: 'text'; text: string }[] = [];
  // Initial check moved to public functions, assume one path is present here.

  log('info', `Starting macOS build for scheme ${params.scheme} (internal)`);

  try {
    const command = ['xcodebuild'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    } // No else needed, one path is guaranteed by callers

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);
    command.push('-destination', 'platform=macOS');

    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    if (params.extraArgs) {
      command.push(...params.extraArgs);
    }

    command.push('build');

    const result = await executeXcodeCommand(command, 'macOS Build');

    if (!result.success) {
      return createTextResponse(`macOS build failed: ${result.error}`, true);
    }

    const appPathMatch = result.output.match(/\/.*\.app/);
    const appBundlePath = appPathMatch ? appPathMatch[0] : null;

    const responseContent = [
      ...warningMessages,
      {
        type: 'text' as const,
        text: `✅ macOS build successful!`,
      },
    ];

    const getAppPathParams: Record<string, string> = {
      scheme: `"${params.scheme}"`,
      platform: `"${XcodePlatform.macOS}"`,
    };
    if (params.workspacePath) getAppPathParams.workspacePath = `"${params.workspacePath}"`;
    if (params.projectPath) getAppPathParams.projectPath = `"${params.projectPath}"`;

    const getAppPathArgs = Object.entries(getAppPathParams)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    const getAppPathToolName = params.workspacePath
      ? 'get_app_path_for_device_workspace'
      : 'get_app_path_for_device_project';

    responseContent.push({
      type: 'text' as const,
      text: `Next Steps:
1. Get app path: ${getAppPathToolName}({ ${getAppPathArgs} })
2. Launch the app: launch_macos_app({ appPath: "PATH_FROM_ABOVE" })`,
    });

    if (appBundlePath) {
      responseContent.push({
        type: 'text' as const,
        text: `Detected app bundle path: ${appBundlePath}`,
      });
    }

    return {
      content: responseContent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during macOS build: ${errorMessage}`);
    return createTextResponse(`Error during macOS build: ${errorMessage}`, true);
  }
}

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
  const warningMessages: { type: 'text'; text: string }[] = [];
  // Initial check moved to public functions

  log('info', `Starting iOS Simulator build for scheme ${params.scheme} (internal)`);

  try {
    const command = ['xcodebuild'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);

    try {
      const destination = constructDestinationString(
        XcodePlatform.iOSSimulator,
        params.simulatorName,
        params.simulatorId,
        params.useLatestOS,
      );
      command.push('-destination', destination);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      warningMessages.push({
        type: 'text' as const,
        text: `Warning: ${errorMessage}. Using default destination.`,
      });
      // Adjust default based on name/id presence for better compatibility
      const defaultDest = params.simulatorId
        ? `platform=iOS Simulator,id=${params.simulatorId}`
        : `platform=iOS Simulator,name=${params.simulatorName ?? 'iPhone'},OS=latest`;
      command.push('-destination', defaultDest);
    }

    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    if (params.extraArgs) {
      command.push(...params.extraArgs);
    }

    command.push('build');

    const result = await executeXcodeCommand(command, 'iOS Simulator Build');

    if (!result.success) {
      return createTextResponse(`iOS Simulator build failed: ${result.error}`, true);
    }

    const appPathMatch = result.output.match(/\/.*\.app/);
    const appBundlePath = appPathMatch ? appPathMatch[0] : null;

    const responseContent = [
      ...warningMessages,
      {
        type: 'text' as const,
        text: `✅ iOS Simulator build successful!`,
      },
    ];

    // Dynamically determine the correct 'get_app_path' tool and arguments
    const getAppPathParams: Record<string, string> = {
      scheme: `"${params.scheme}"`,
      platform: `"${XcodePlatform.iOSSimulator}"`,
    };
    let getAppPathToolName = '';
    if (params.simulatorId) {
      getAppPathToolName = params.workspacePath
        ? 'get_app_path_by_id_workspace'
        : 'get_app_path_by_id_project';
      getAppPathParams.simulatorId = `"${params.simulatorId}"`;
    } else if (params.simulatorName) {
      getAppPathToolName = params.workspacePath
        ? 'get_app_path_by_name_workspace'
        : 'get_app_path_by_name_project';
      getAppPathParams.simulatorName = `"${params.simulatorName}"`;
    }
    // Fallback if neither name nor id provided (shouldn't happen with new structure)
    else {
      getAppPathToolName = params.workspacePath
        ? 'get_app_path_by_name_workspace' // Default to name-based
        : 'get_app_path_by_name_project';
      getAppPathParams.simulatorName = '"iPhone"'; // Default simulator name
    }

    if (params.workspacePath) getAppPathParams.workspacePath = `"${params.workspacePath}"`;
    if (params.projectPath) getAppPathParams.projectPath = `"${params.projectPath}"`;

    const getAppPathArgs = Object.entries(getAppPathParams)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    responseContent.push({
      type: 'text' as const,
      text: `Next Steps:
1. Get app path: ${getAppPathToolName}({ ${getAppPathArgs} })
2. List simulators: list_simulators({})
3. Boot a simulator: boot_simulator({ simulatorUuid: "UUID_FROM_ABOVE" })
4. Install the app: install_app_in_simulator({ simulatorUuid: "UUID_FROM_ABOVE", appPath: "PATH_FROM_STEP_1" })`, // Corrected placeholder
    });

    if (appBundlePath) {
      responseContent.push({
        type: 'text' as const,
        text: `Detected app bundle path during build: ${appBundlePath} (Use get_app_path tool for canonical path)`,
      });
    }

    return {
      content: responseContent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during iOS Simulator build: ${errorMessage}`);
    return createTextResponse(`Error during iOS Simulator build: ${errorMessage}`, true);
  }
}

/**
 * Internal logic for building iOS device apps.
 */
async function _handleIOSDeviceBuildLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  derivedDataPath?: string;
  extraArgs?: string[];
}): Promise<ToolResponse> {
  const warningMessages: { type: 'text'; text: string }[] = [];
  // Initial check moved to public functions

  log('info', `Starting iOS Device build for scheme ${params.scheme} (internal)`);

  try {
    const command = ['xcodebuild'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);
    command.push('-destination', 'generic/platform=iOS');

    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    if (params.extraArgs) {
      command.push(...params.extraArgs);
    }

    command.push('build');

    const result = await executeXcodeCommand(command, 'iOS Device Build');

    if (!result.success) {
      return createTextResponse(`iOS Device build failed: ${result.error}`, true);
    }

    const appPathMatch = result.output.match(/\/.*\.app/);
    const appBundlePath = appPathMatch ? appPathMatch[0] : null;

    const responseContent = [
      ...warningMessages,
      {
        type: 'text' as const,
        text: `✅ iOS Device build successful!`,
      },
    ];

    const getAppPathParams: Record<string, string> = {
      scheme: `"${params.scheme}"`,
      platform: `"${XcodePlatform.iOS}"`,
    };
    if (params.workspacePath) getAppPathParams.workspacePath = `"${params.workspacePath}"`;
    if (params.projectPath) getAppPathParams.projectPath = `"${params.projectPath}"`;

    const getAppPathArgs = Object.entries(getAppPathParams)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    const getAppPathToolName = params.workspacePath
      ? 'get_app_path_for_device_workspace'
      : 'get_app_path_for_device_project';

    responseContent.push({
      type: 'text' as const,
      text: `Next Steps:
1. Get app path: ${getAppPathToolName}({ ${getAppPathArgs} })`,
    });

    if (appBundlePath) {
      responseContent.push({
        type: 'text' as const,
        text: `Detected app bundle path: ${appBundlePath} (Use get_app_path tool for canonical path)`,
      });
    }

    return {
      content: responseContent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during iOS Device build: ${errorMessage}`);
    return createTextResponse(`Error during iOS Device build: ${errorMessage}`, true);
  }
}

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
  const warningMessages: { type: 'text'; text: string }[] = [];
  // Initial check moved to public functions

  const isSimulatorPlatform = [
    XcodePlatform.iOSSimulator,
    XcodePlatform.watchOSSimulator,
    XcodePlatform.tvOSSimulator,
    XcodePlatform.visionOSSimulator,
  ].includes(params.platform);

  log(
    'info',
    `Starting get app path for scheme ${params.scheme} on platform ${params.platform} (internal)`,
  );

  try {
    const command = ['xcodebuild'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);

    if (isSimulatorPlatform) {
      try {
        const destination = constructDestinationString(
          params.platform,
          params.simulatorName,
          params.simulatorId,
          params.useLatestOS,
        );
        command.push('-destination', destination);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        warningMessages.push({
          type: 'text' as const,
          text: `Warning: ${errorMessage}. Using default destination.`,
        });
        // Adjust default based on name/id presence
        const defaultDest = params.simulatorId
          ? `platform=${params.platform},id=${params.simulatorId}`
          : `platform=${params.platform},name=${params.simulatorName ?? 'Default'},OS=latest`; // Use a generic name if none provided
        command.push('-destination', defaultDest);
      }
    } else {
      // Handle non-simulator platforms (generic destinations)
      const genericPlatform = params.platform.replace(' Simulator', ''); // e.g., iOS, macOS
      if (
        [
          XcodePlatform.macOS,
          XcodePlatform.iOS,
          XcodePlatform.watchOS,
          XcodePlatform.tvOS,
          XcodePlatform.visionOS,
        ].includes(params.platform)
      ) {
        command.push('-destination', `generic/platform=${genericPlatform}`);
      } else {
        // Fallback for potentially unsupported device platforms? Or just use the platform name.
        command.push('-destination', `platform=${params.platform}`);
      }
    }

    command.push('-showBuildSettings');

    const result = await executeXcodeCommand(command, 'Get App Path');

    if (!result.success) {
      return createTextResponse(`Failed to get app path: ${result.error}`, true);
    }

    const productDirMatch = result.output.match(/BUILT_PRODUCTS_DIR\s*=\s*(.*?)(?:\s|$)/);
    const productNameMatch = result.output.match(/FULL_PRODUCT_NAME\s*=\s*(.*?)(?:\s|$)/);

    if (!productDirMatch || !productDirMatch[1] || !productNameMatch || !productNameMatch[1]) {
      return createTextResponse(
        `Could not extract app path from build settings. Ensure scheme '${params.scheme}' and configuration '${params.configuration}' are valid for the specified platform/destination.`,
        true,
      );
    }

    const appBundlePath = `${productDirMatch[1].trim()}/${productNameMatch[1].trim()}`;
    log('info', `App bundle path: ${appBundlePath}`);

    const responseContent = [
      ...warningMessages,
      {
        type: 'text' as const,
        text: `✅ App bundle path for scheme '${params.scheme}' (${params.configuration}) on ${params.platform}: ${appBundlePath}`,
      },
    ];

    // Add platform-specific next steps
    if (params.platform === XcodePlatform.macOS) {
      responseContent.push({
        type: 'text' as const,
        text: `Next Steps:
1. Launch the app: launch_macos_app({ appPath: "${appBundlePath}" })
2. Get bundle ID: get_macos_bundle_id({ appPath: "${appBundlePath}" })`,
      });
    } else if (isSimulatorPlatform) {
      responseContent.push({
        type: 'text' as const,
        text: `Next Steps:
1. List simulators: list_simulators({})
2. Boot a simulator: boot_simulator({ simulatorUuid: "UUID_FROM_ABOVE" })
3. Install the app: install_app_in_simulator({ simulatorUuid: "UUID_FROM_ABOVE", appPath: "${appBundlePath}" })
4. Get bundle ID: get_ios_bundle_id({ appPath: "${appBundlePath}" })`,
      });
    } else {
      // Assuming non-macOS, non-simulator is iOS device or similar
      responseContent.push({
        type: 'text' as const,
        text: `Next Steps:
1. Get bundle ID: get_ios_bundle_id({ appPath: "${appBundlePath}" })
(Manual installation to device required)`,
      });
    }

    return {
      content: responseContent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error getting app path: ${errorMessage}`);
    return createTextResponse(`Error getting app path: ${errorMessage}`, true);
  }
}

/**
 * Internal logic for showing build settings.
 */
async function _handleShowBuildSettingsLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
}): Promise<ToolResponse> {
  const warningMessages: { type: 'text'; text: string }[] = [];
  // Initial check moved to public functions

  log('info', `Starting xcodebuild show build settings for scheme ${params.scheme} (internal)`);

  try {
    const command = ['xcodebuild'];
    // Use a simplified params object for addXcodeParameters
    const xcodeParams = {
      workspacePath: params.workspacePath,
      projectPath: params.projectPath,
      scheme: params.scheme,
    };
    addXcodeParameters(command, xcodeParams, 'Showing Build Settings');
    command.push('-showBuildSettings');

    const result = await executeXcodeCommand(command, 'Show Build Settings');

    if (!result.success) {
      return createTextResponse(`Show build settings operation failed: ${result.error}`, true);
    }

    const responseContent = [
      ...warningMessages,
      {
        type: 'text' as const,
        text: `✅ Build settings for scheme '${params.scheme}':\n${result.output}`,
      },
    ];

    return {
      content: responseContent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during show build settings operation: ${errorMessage}`);
    return createTextResponse(`Show build settings operation failed: ${errorMessage}`, true);
  }
}

/**
 * Internal logic for listing schemes.
 */
async function _handleListSchemesLogic(params: {
  workspacePath?: string;
  projectPath?: string;
}): Promise<ToolResponse> {
  // Initial check moved to public functions
  log('info', 'Starting list schemes request (internal)');

  try {
    const command = ['xcodebuild'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    command.push('-list');

    const result = await executeXcodeCommand(command, 'List Schemes');

    if (!result.success) {
      return createTextResponse(`List schemes operation failed: ${result.error}`, true);
    }

    // More robust parsing for schemes
    const lines = result.output.split('\n');
    let schemesSection = false;
    const schemes: string[] = [];
    for (const line of lines) {
      if (line.trim().startsWith('Schemes:')) {
        schemesSection = true;
        continue;
      }
      if (schemesSection && line.trim().length > 0) {
        // Check if we've hit the next section (e.g., Configurations)
        if (line.match(/^[A-Za-z]+:/)) {
            break; // Stop parsing schemes if a new section header is found
        }
        schemes.push(line.trim());
      } else if (schemesSection && line.trim().length === 0) {
        // Allow one blank line after "Schemes:", but stop if more follow
        if (schemes.length > 0) break;
      }
    }


    let responseText = `Available schemes:\n`;
    if (schemes.length > 0) {
      for (const scheme of schemes) {
        responseText += `- ${scheme}\n`;
      }
    } else {
        responseText = "No schemes found. Output:\n" + result.output;
    }

    // Determine tool names based on path provided
    const buildToolName = params.workspacePath ? 'macos_build_workspace' : 'macos_build_project';
    const buildSettingsToolName = params.workspacePath ? 'show_build_settings_workspace' : 'show_build_settings_project';
    const pathArg = params.workspacePath ? `workspacePath: "${params.workspacePath}"` : `projectPath: "${params.projectPath}"`;

     responseText += `\nNext Steps (Example with first scheme '${schemes[0] || 'YOUR_SCHEME'}'):
1. Show build settings: ${buildSettingsToolName}({ ${pathArg}, scheme: "${schemes[0] || 'YOUR_SCHEME'}" })
2. Build for macOS: ${buildToolName}({ ${pathArg}, scheme: "${schemes[0] || 'YOUR_SCHEME'}" })`;


    return {
      content: [
        {
          type: 'text' as const,
          text: responseText,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during list schemes operation: ${errorMessage}`);
    return createTextResponse(`List schemes operation failed: ${errorMessage}`, true);
  }
}

/**
 * Internal logic for building and running macOS apps.
 */
async function _handleMacOSBuildAndRunLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  derivedDataPath?: string;
  extraArgs?: string[];
}): Promise<ToolResponse> {
  log('info', `Starting macOS build and run for scheme ${params.scheme} (internal)`);

  try {
    // --- Build Step ---
    const buildCommand = ['xcodebuild'];
    const buildParams: XcodeParams = { ...params, destination: 'platform=macOS' };
    addXcodeParameters(buildCommand, buildParams, 'macOS Build (for Run)');
    buildCommand.push('build');
    const buildResult = await executeXcodeCommand(buildCommand, 'macOS Build (for Run)');

    if (!buildResult.success) {
      return createTextResponse(`macOS build failed: ${buildResult.error}`, true);
    }

    // --- Get App Path Step ---
    const appPathParams = {
      workspacePath: params.workspacePath,
      projectPath: params.projectPath,
      scheme: params.scheme,
      configuration: params.configuration,
      platform: XcodePlatform.macOS, // Explicitly set platform for clarity
      useLatestOS: true, // Default, doesn't affect macOS much
    };
    const appPathResponse = await _handleGetAppPathLogic(appPathParams);

    if (appPathResponse.isError || !appPathResponse.content?.[0]?.text) {
      return createTextResponse(
        `Build succeeded, but failed to get app path: ${appPathResponse.content[0]?.text ?? 'Unknown error'}`,
        true,
      );
    }

    // Extract path from the successful response text
    const responseText = appPathResponse.content?.[0]?.text as string;
    const appPathMatch = responseText ? responseText.match(
      /✅ App bundle path.*?:\s*(.*?)(?:\n|$)/
    ) : null;
    if (!appPathMatch || !appPathMatch[1]) {
      return createTextResponse(
        `Build succeeded, but could not parse app path from settings output: ${appPathResponse.content[0].text}`,
        true,
      );
    }
    const appBundlePath = appPathMatch[1].trim();
    log('info', `App bundle path for run: ${appBundlePath}`);

    // --- Launch Step ---
    try {
      execSync(`open "${appBundlePath}"`);
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Successfully built and launched macOS app: ${appBundlePath}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error launching macOS app: ${errorMessage}`);
      return createTextResponse(`Build succeeded, but error launching macOS app: ${errorMessage}`, true);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during macOS build and run: ${errorMessage}`);
    return createTextResponse(`macOS build and run failed: ${errorMessage}`, true);
  }
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
    const buildParams = { ...params, platform: XcodePlatform.iOSSimulator };
    const buildResponse = await _handleIOSSimulatorBuildLogic(buildParams);

    const buildResponseText = buildResponse.content?.[0]?.text as string;
    if (buildResponse.isError || !buildResponseText || !buildResponseText.includes('successful')) {
      return createTextResponse(
        `iOS Simulator build failed: ${buildResponse.content[0]?.text ?? 'Unknown build error'}`,
        true,
      );
    }

    // --- Get App Path Step ---
    const appPathParams = {
      workspacePath: params.workspacePath,
      projectPath: params.projectPath,
      scheme: params.scheme,
      configuration: params.configuration,
      platform: XcodePlatform.iOSSimulator,
      simulatorName: params.simulatorName,
      simulatorId: params.simulatorId,
      useLatestOS: params.useLatestOS,
    };
    const appPathResponse = await _handleGetAppPathLogic(appPathParams);

    if (appPathResponse.isError || !appPathResponse.content?.[0]?.text) {
      return createTextResponse(
        `Build succeeded, but failed to get app path: ${appPathResponse.content[0]?.text ?? 'Unknown error'}`,
        true,
      );
    }

    const responseText = appPathResponse.content?.[0]?.text as string;
    const appPathMatch = responseText ? responseText.match(
      /✅ App bundle path.*?:\s*(.*?)(?:\n|$)/
    ) : null;
    if (!appPathMatch || !appPathMatch[1]) {
      return createTextResponse(
        `Build succeeded, but could not parse app path from settings output: ${appPathResponse.content[0].text}`,
        true,
      );
    }
    const appBundlePath = appPathMatch[1].trim();
    log('info', `App bundle path for run: ${appBundlePath}`);

    // --- Find/Boot Simulator Step ---
    let simulatorUuid = params.simulatorId;
    if (!simulatorUuid) {
      try {
        const simulatorsOutput = execSync('xcrun simctl list devices available --json').toString();
        const simulatorsJson = JSON.parse(simulatorsOutput);
        let foundSimulator = null;

        for (const runtime in simulatorsJson.devices) {
          const devices = simulatorsJson.devices[runtime];
          for (const device of devices) {
            if (params.simulatorName) {
               // Prioritize exact match if name is given
              if (device.name === params.simulatorName && device.isAvailable) {
                foundSimulator = device;
                break;
              }
            } else if (device.name.includes('iPhone') && device.isAvailable) {
              // Fallback to an available iPhone if no name/id provided (less likely now)
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
            `Build succeeded, but could not find an available simulator named '${params.simulatorName || 'any iPhone'}'. Use list_simulators({}) to check available devices.`,
            true,
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return createTextResponse(`Build succeeded, but error finding simulator: ${errorMessage}`, true);
      }
    }

    // Ensure simulator is booted
    try {
      const simulatorStateOutput = execSync(
        `xcrun simctl list devices | grep "${simulatorUuid}"`, // Quote UUID just in case
      ).toString();
      const isBooted = simulatorStateOutput.includes('(Booted)');

      if (!isBooted) {
        log('info', `Booting simulator ${simulatorUuid}`);
        execSync(`xcrun simctl boot "${simulatorUuid}"`);
      } else {
        log('info', `Simulator ${simulatorUuid} is already booted`);
      }
    } catch (error) {
        // Check if the error is just "No devices matching search", which might mean the ID was invalid
        if (error instanceof Error && error.message.includes('No devices matching search')) {
             return createTextResponse(`Build succeeded, but simulator with ID '${simulatorUuid}' not found. Use list_simulators({}) to verify.`, true);
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        return createTextResponse(`Build succeeded, but error checking/booting simulator: ${errorMessage}`, true);
    }


    // --- Install App Step ---
    try {
      execSync(`xcrun simctl install "${simulatorUuid}" "${appBundlePath}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createTextResponse(`Build succeeded, but error installing app on simulator: ${errorMessage}`, true);
    }

    // --- Get Bundle ID Step ---
    let bundleId;
    try {
      // Use PlistBuddy as a more reliable alternative to `defaults read`
      bundleId = execSync(
        `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${appBundlePath}/Info.plist"`,
      )
        .toString()
        .trim();
      if (!bundleId) throw new Error('PlistBuddy returned empty bundle ID');
      log('info', `Bundle ID for run: ${bundleId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createTextResponse(
        `Build and install succeeded, but error getting bundle ID: ${errorMessage}`,
        true,
      );
    }

    // --- Launch App Step ---
    try {
      execSync(`xcrun simctl launch "${simulatorUuid}" "${bundleId}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createTextResponse(
        `Build, install, and bundle ID retrieval succeeded, but error launching app on simulator: ${errorMessage}`,
        true,
      );
    }

    // --- Open Simulator UI Step (Best Effort) ---
    try {
      execSync('open -a Simulator');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('warning', `Warning: Could not open Simulator app: ${errorMessage}`);
      // Don't fail the whole operation for this
    }

    // --- Success ---
    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ Successfully built, installed, and launched app on iOS Simulator:
- App: ${appBundlePath}
- Bundle ID: ${bundleId}
- Simulator: ${simulatorUuid}

The app should now be running in the iOS Simulator.`,
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

// macOS Build
export function registerMacOSBuildWorkspaceTool(server: McpServer): void {
  server.tool(
    'macos_build_workspace',
    "Builds a macOS app using xcodebuild from a workspace. IMPORTANT: Requires workspacePath and scheme. Example: macos_build_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to build (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleMacOSBuildLogic(params),
  );
}

export function registerMacOSBuildProjectTool(server: McpServer): void {
  server.tool(
    'macos_build_project',
    "Builds a macOS app using xcodebuild from a project file. IMPORTANT: Requires projectPath and scheme. Example: macos_build_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to build (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleMacOSBuildLogic(params),
  );
}

// iOS Simulator Build by Name
export function registerIOSSimulatorBuildByNameWorkspaceTool(server: McpServer): void {
  server.tool(
    'ios_simulator_build_by_name_workspace',
    "Builds an iOS app from a workspace for a specific simulator by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: ios_simulator_build_by_name_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to build (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      simulatorName: z
        .string()
        .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
      useLatestOS: z
        .boolean()
        .default(true)
        .describe('Whether to use the latest OS version for the named simulator'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSSimulatorBuildLogic(params),
  );
}

export function registerIOSSimulatorBuildByNameProjectTool(server: McpServer): void {
  server.tool(
    'ios_simulator_build_by_name_project',
    "Builds an iOS app from a project file for a specific simulator by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: ios_simulator_build_by_name_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to build (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      simulatorName: z
        .string()
        .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
      useLatestOS: z
        .boolean()
        .default(true)
        .describe('Whether to use the latest OS version for the named simulator'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSSimulatorBuildLogic(params),
  );
}

// iOS Simulator Build by ID
export function registerIOSSimulatorBuildByIdWorkspaceTool(server: McpServer): void {
  server.tool(
    'ios_simulator_build_by_id_workspace',
    "Builds an iOS app from a workspace for a specific simulator by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: ios_simulator_build_by_id_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to build (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      simulatorId: z
        .string()
        .describe('UUID of the simulator to use (obtained from list_simulators) (Required)'),
      useLatestOS: z
        .boolean()
        .default(true) // Note: OS setting might be ignored when ID is specified, but kept for consistency
        .describe('Whether to target the latest OS (potentially ignored when ID is used)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSSimulatorBuildLogic(params),
  );
}

export function registerIOSSimulatorBuildByIdProjectTool(server: McpServer): void {
  server.tool(
    'ios_simulator_build_by_id_project',
    "Builds an iOS app from a project file for a specific simulator by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: ios_simulator_build_by_id_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to build (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      simulatorId: z
        .string()
        .describe('UUID of the simulator to use (obtained from list_simulators) (Required)'),
      useLatestOS: z
        .boolean()
        .default(true) // Note: OS setting might be ignored when ID is specified
        .describe('Whether to target the latest OS (potentially ignored when ID is used)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSSimulatorBuildLogic(params),
  );
}

// iOS Device Build
export function registerIOSDeviceBuildWorkspaceTool(server: McpServer): void {
  server.tool(
    'ios_device_build_workspace',
    "Builds an iOS app from a workspace for a physical device. IMPORTANT: Requires workspacePath and scheme. Example: ios_device_build_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to build (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSDeviceBuildLogic(params),
  );
}

export function registerIOSDeviceBuildProjectTool(server: McpServer): void {
  server.tool(
    'ios_device_build_project',
    "Builds an iOS app from a project file for a physical device. IMPORTANT: Requires projectPath and scheme. Example: ios_device_build_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to build (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSDeviceBuildLogic(params),
  );
}

// Get App Path by Name (Simulator)
export function registerGetAppPathByNameWorkspaceTool(server: McpServer): void {
  server.tool(
    'get_app_path_by_name_workspace',
    "Gets the app bundle path from build settings for a simulator platform using a workspace and simulator name. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorName. Example: get_app_path_by_name_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to get app path for (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      platform: z
        .enum([
          XcodePlatform.iOSSimulator,
          XcodePlatform.watchOSSimulator,
          XcodePlatform.tvOSSimulator,
          XcodePlatform.visionOSSimulator,
        ])
        .default(XcodePlatform.iOSSimulator)
        .describe('The target simulator platform (Required)'),
      simulatorName: z
        .string()
        .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
    },
    // Pass useLatestOS=true implicitly to the handler
    (params) => _handleGetAppPathLogic({ ...params, useLatestOS: true }),
  );
}

export function registerGetAppPathByNameProjectTool(server: McpServer): void {
  server.tool(
    'get_app_path_by_name_project',
    "Gets the app bundle path from build settings for a simulator platform using a project file and simulator name. IMPORTANT: Requires projectPath, scheme, platform, and simulatorName. Example: get_app_path_by_name_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorName: 'iPhone 16' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to get app path for (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      platform: z
        .enum([
          XcodePlatform.iOSSimulator,
          XcodePlatform.watchOSSimulator,
          XcodePlatform.tvOSSimulator,
          XcodePlatform.visionOSSimulator,
        ])
        .default(XcodePlatform.iOSSimulator)
        .describe('The target simulator platform (Required)'),
      simulatorName: z
        .string()
        .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
    },
    (params) => _handleGetAppPathLogic({ ...params, useLatestOS: true }),
  );
}

// Get App Path by ID (Simulator)
export function registerGetAppPathByIdWorkspaceTool(server: McpServer): void {
  server.tool(
    'get_app_path_by_id_workspace',
    "Gets the app bundle path from build settings for a simulator platform using a workspace and simulator UUID. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorId. Example: get_app_path_by_id_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to get app path for (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      platform: z
        .enum([
          XcodePlatform.iOSSimulator,
          XcodePlatform.watchOSSimulator,
          XcodePlatform.tvOSSimulator,
          XcodePlatform.visionOSSimulator,
        ])
        .default(XcodePlatform.iOSSimulator)
        .describe('The target simulator platform (Required)'),
      simulatorId: z
        .string()
        .describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
    },
    // Pass useLatestOS=false implicitly as ID specifies the simulator exactly
    (params) => _handleGetAppPathLogic({ ...params, useLatestOS: false }),
  );
}

export function registerGetAppPathByIdProjectTool(server: McpServer): void {
  server.tool(
    'get_app_path_by_id_project',
    "Gets the app bundle path from build settings for a simulator platform using a project file and simulator UUID. IMPORTANT: Requires projectPath, scheme, platform, and simulatorId. Example: get_app_path_by_id_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'iOS Simulator', simulatorId: 'SIMULATOR_UUID' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to get app path for (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      platform: z
        .enum([
          XcodePlatform.iOSSimulator,
          XcodePlatform.watchOSSimulator,
          XcodePlatform.tvOSSimulator,
          XcodePlatform.visionOSSimulator,
        ])
        .default(XcodePlatform.iOSSimulator)
        .describe('The target simulator platform (Required)'),
      simulatorId: z
        .string()
        .describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
    },
    (params) => _handleGetAppPathLogic({ ...params, useLatestOS: false }),
  );
}

// Get App Path for Device (Non-Simulator)
export function registerGetAppPathForDeviceWorkspaceTool(server: McpServer): void {
  server.tool(
    'get_app_path_for_device_workspace',
    "Gets the app bundle path from build settings for a device platform (macOS, iOS, etc.) using a workspace. IMPORTANT: Requires workspacePath, scheme, and platform. Example: get_app_path_for_device_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', platform: 'macOS' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to get app path for (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      platform: z
        .enum([
          XcodePlatform.macOS,
          XcodePlatform.iOS,
          XcodePlatform.watchOS,
          XcodePlatform.tvOS,
          XcodePlatform.visionOS,
        ])
        .describe('The target device platform (Required)'),
    },
    (params) => _handleGetAppPathLogic({ ...params, useLatestOS: true }), // useLatestOS doesn't really apply but kept for consistency
  );
}

export function registerGetAppPathForDeviceProjectTool(server: McpServer): void {
  server.tool(
    'get_app_path_for_device_project',
    "Gets the app bundle path from build settings for a device platform (macOS, iOS, etc.) using a project file. IMPORTANT: Requires projectPath, scheme, and platform. Example: get_app_path_for_device_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', platform: 'macOS' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to get app path for (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      platform: z
        .enum([
          XcodePlatform.macOS,
          XcodePlatform.iOS,
          XcodePlatform.watchOS,
          XcodePlatform.tvOS,
          XcodePlatform.visionOS,
        ])
        .describe('The target device platform (Required)'),
    },
    (params) => _handleGetAppPathLogic({ ...params, useLatestOS: true }),
  );
}

// Show Build Settings
export function registerShowBuildSettingsWorkspaceTool(server: McpServer): void {
  server.tool(
    'show_build_settings_workspace',
    "Shows build settings from a workspace using xcodebuild. IMPORTANT: Requires workspacePath and scheme. Example: show_build_settings_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to show build settings for (Required)'),
    },
    (params) => _handleShowBuildSettingsLogic(params),
  );
}

export function registerShowBuildSettingsProjectTool(server: McpServer): void {
  server.tool(
    'show_build_settings_project',
    "Shows build settings from a project file using xcodebuild. IMPORTANT: Requires projectPath and scheme. Example: show_build_settings_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to show build settings for (Required)'),
    },
    (params) => _handleShowBuildSettingsLogic(params),
  );
}

// List Schemes
export function registerListSchemesWorkspaceTool(server: McpServer): void {
  server.tool(
    'list_schemes_workspace',
    "Lists available schemes in the workspace. IMPORTANT: Requires workspacePath. Example: list_schemes_workspace({ workspacePath: '/path/to/MyProject.xcworkspace' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    },
    (params) => _handleListSchemesLogic(params),
  );
}

export function registerListSchemesProjectTool(server: McpServer): void {
  server.tool(
    'list_schemes_project',
    "Lists available schemes in the project file. IMPORTANT: Requires projectPath. Example: list_schemes_project({ projectPath: '/path/to/MyProject.xcodeproj' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    },
    (params) => _handleListSchemesLogic(params),
  );
}

// macOS Build and Run
export function registerMacOSBuildAndRunWorkspaceTool(server: McpServer): void {
  server.tool(
    'macos_build_and_run_workspace',
    "Builds and runs a macOS app from a workspace in one step. IMPORTANT: Requires workspacePath and scheme. Example: macos_build_and_run_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to build and run (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleMacOSBuildAndRunLogic(params),
  );
}

export function registerMacOSBuildAndRunProjectTool(server: McpServer): void {
  server.tool(
    'macos_build_and_run_project',
    "Builds and runs a macOS app from a project file in one step. IMPORTANT: Requires projectPath and scheme. Example: macos_build_and_run_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to build and run (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleMacOSBuildAndRunLogic(params),
  );
}

// iOS Simulator Build and Run by Name
export function registerIOSSimulatorBuildAndRunByNameWorkspaceTool(server: McpServer): void {
  server.tool(
    'ios_simulator_build_and_run_by_name_workspace',
    "Builds and runs an iOS app from a workspace on a simulator specified by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: ios_simulator_build_and_run_by_name_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to build and run (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      simulatorName: z
        .string()
        .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
      useLatestOS: z
        .boolean()
        .default(true)
        .describe('Whether to use the latest OS version for the named simulator'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSSimulatorBuildAndRunLogic(params),
  );
}

export function registerIOSSimulatorBuildAndRunByNameProjectTool(server: McpServer): void {
  server.tool(
    'ios_simulator_build_and_run_by_name_project',
    "Builds and runs an iOS app from a project file on a simulator specified by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: ios_simulator_build_and_run_by_name_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to build and run (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      simulatorName: z
        .string()
        .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)"),
      useLatestOS: z
        .boolean()
        .default(true)
        .describe('Whether to use the latest OS version for the named simulator'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSSimulatorBuildAndRunLogic(params),
  );
}

// iOS Simulator Build and Run by ID
export function registerIOSSimulatorBuildAndRunByIdWorkspaceTool(server: McpServer): void {
  server.tool(
    'ios_simulator_build_and_run_by_id_workspace',
    "Builds and runs an iOS app from a workspace on a simulator specified by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: ios_simulator_build_and_run_by_id_workspace({ workspacePath: '/path/to/workspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
      scheme: z.string().describe('The scheme to build and run (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      simulatorId: z
        .string()
        .describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
      useLatestOS: z
        .boolean()
        .default(true) // Note: OS setting might be ignored when ID is specified
        .describe('Whether to target the latest OS (potentially ignored when ID is used)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSSimulatorBuildAndRunLogic(params),
  );
}

export function registerIOSSimulatorBuildAndRunByIdProjectTool(server: McpServer): void {
  server.tool(
    'ios_simulator_build_and_run_by_id_project',
    "Builds and runs an iOS app from a project file on a simulator specified by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: ios_simulator_build_and_run_by_id_project({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
      scheme: z.string().describe('The scheme to build and run (Required)'),
      configuration: z
        .string()
        .default('Debug')
        .describe('Build configuration (Debug, Release, etc.)'),
      simulatorId: z
        .string()
        .describe('UUID of the simulator to use (obtained from listSimulators) (Required)'),
      useLatestOS: z
        .boolean()
        .default(true) // Note: OS setting might be ignored when ID is specified
        .describe('Whether to target the latest OS (potentially ignored when ID is used)'),
      derivedDataPath: z
        .string()
        .optional()
        .describe('Path where build products and other derived data will go'),
      extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    },
    (params) => _handleIOSSimulatorBuildAndRunLogic(params),
  );
}