/**
 * iOS Simulator Build Tools - Tools for building and running iOS applications in simulators
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
  derivedDataPathSchema,
  extraArgsSchema,
  simulatorNameSchema,
  simulatorIdSchema,
  useLatestOSSchema,
} from './common.js';

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
  const warningMessages: { type: 'text'; text: string }[] = [];
  const warningRegex = /\[warning\]: (.*)/g;
  log('info', `Starting iOS Simulator build for scheme ${params.scheme} (internal)`);

  try {
    const command = ['xcodebuild'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    } // No else needed, one path is guaranteed by callers

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);

    // Construct destination string based on simulator parameters
    let destinationString: string;
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
      // This should never happen due to validation in the public functions
      return createTextResponse('Either simulatorId or simulatorName must be provided', true);
    }

    command.push('-destination', destinationString);

    if (params.derivedDataPath) {
      command.push('-derivedDataPath', params.derivedDataPath);
    }

    if (params.extraArgs) {
      command.push(...params.extraArgs);
    }

    command.push('build');

    const result = await executeXcodeCommand(command, 'iOS Simulator Build');

    let match;
    while ((match = warningRegex.exec(result.output)) !== null) {
      warningMessages.push({ type: 'text', text: `⚠️ Warning: ${match[1]}` });
    }

    if (!result.success) {
      log('error', `iOS simulator build failed: ${result.error}`);
      const errorResponse = createTextResponse(
        `❌ iOS simulator build failed. Error: ${result.error}`,
        true
      );
      if (warningMessages.length > 0 && errorResponse.content) {
        errorResponse.content.unshift(...warningMessages);
      }
      return errorResponse;
    }

    log('info', '✅ iOS simulator build succeeded.');
    const target = params.simulatorId
      ? `simulator UUID ${params.simulatorId}`
      : `simulator name '${params.simulatorName}'`;

    const successResponse: ToolResponse = {
      content: [
        ...warningMessages,
        { type: 'text', text: `✅ iOS simulator build succeeded for scheme ${params.scheme} targeting ${target}.`},
        { type: 'text', text: `Next Steps:\n1. Get App Path: Use get_app_path_by_${params.simulatorId ? 'id' : 'name'}_...\n2. Install App: Use install_app_in_simulator\n3. Launch App: Use launch_app_in_simulator`}
      ]
    };
    return successResponse;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during iOS Simulator build: ${errorMessage}`);
    return createTextResponse(`Error during iOS Simulator build: ${errorMessage}`, true);
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
  const warningMessages: { type: 'text'; text: string }[] = [];
  const warningRegex = /\[warning\]: (.*)/g;
  try {
    // First, build the app
    const buildResult = await _handleIOSSimulatorBuildLogic(params);
    
    if (buildResult.isError) {
      return buildResult; // Return the build error
    }

    // Get the app path using show build settings
    const command = ['xcodebuild'];
    
    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }
    
    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration);
    
    // Construct destination string based on simulator parameters
    let destinationString: string;
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
      // This should never happen due to validation in the public functions
      return createTextResponse('Either simulatorId or simulatorName must be provided', true);
    }
    
    command.push('-destination', destinationString);
    command.push('-showBuildSettings');
    
    const result = await executeXcodeCommand(command, 'Get App Path');

    let match;
    while ((match = warningRegex.exec(result.output)) !== null) {
      warningMessages.push({ type: 'text', text: `⚠️ Warning: ${match[1]}` });
    }

    // Unlike pure build, build & run success means the app launched
    if (!result.success) {
      log('error', `iOS simulator build & run failed: ${result.error}`);
      const errorResponse = createTextResponse(
        `❌ iOS simulator build & run failed. Error: ${result.error}`,
        true
      );
      if (warningMessages.length > 0 && errorResponse.content) {
        errorResponse.content.unshift(...warningMessages);
      }
      return errorResponse;
    }

    log('info', '✅ iOS simulator build & run succeeded.');
    const target = params.simulatorId
      ? `simulator UUID ${params.simulatorId}`
      : `simulator name '${params.simulatorName}'`;

    const successResponse: ToolResponse = {
      content: [
        ...warningMessages,
        { type: 'text', text: `✅ iOS simulator build and run succeeded for scheme ${params.scheme} targeting ${target}. Check the simulator. `},
        // No explicit next steps needed as app should be running
      ]
    };
    return successResponse;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during iOS Simulator build and run: ${errorMessage}`);
    return createTextResponse(`Error during iOS Simulator build and run: ${errorMessage}`, true);
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
