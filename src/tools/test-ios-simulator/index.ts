/**
 * Simulator Test Tools - Tools for running tests on applications in Apple simulators
 *
 * This module provides specialized tools for running tests on applications in Apple simulators
 * (iOS, watchOS, tvOS, visionOS) using xcodebuild. It supports both workspace and project-based
 * test runs with simulator targeting by name or UUID, and includes xcresult parsing for
 * human-readable test summaries.
 *
 * Responsibilities:
 * - Running tests on applications in Apple simulators from project files and workspaces
 * - Supporting simulator targeting by name or UUID
 * - Parsing xcresult bundles into human-readable format
 * - Handling test configuration and derived data paths
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { XcodePlatform } from '../../utils/xcode.js';
import { handleTestLogic } from '../test-common/index.js';
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
  preferXcodebuildSchema,
} from '../common/index.js';

// --- Public Tool Definitions ---

// Exported components for test_sim_name_ws
export const testSimNameWsName = 'test_sim_name_ws';
export const testSimNameWsDescription =
  'Runs tests for a workspace on a simulator by name using xcodebuild test and parses xcresult output.';
export const testSimNameWsSchema = {
  workspacePath: workspacePathSchema,
  scheme: schemeSchema,
  simulatorName: simulatorNameSchema,
  configuration: configurationSchema,
  derivedDataPath: derivedDataPathSchema,
  extraArgs: extraArgsSchema,
  useLatestOS: useLatestOSSchema,
  preferXcodebuild: preferXcodebuildSchema,
};
export const testSimNameWsHandler = async (params: {
  workspacePath: string;
  scheme: string;
  simulatorName: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  useLatestOS?: boolean;
  preferXcodebuild?: boolean;
}) =>
  handleTestLogic({
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? false,
    preferXcodebuild: params.preferXcodebuild ?? false,
    platform: XcodePlatform.iOSSimulator,
  });

/**
 * Registers the iOS simulator test workspace tool (by name)
 */
export function registerSimulatorTestByNameWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    simulatorName: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
    preferXcodebuild?: boolean;
  };

  registerTool<Params>(
    server,
    testSimNameWsName,
    testSimNameWsDescription,
    testSimNameWsSchema,
    testSimNameWsHandler,
  );
}

// Exported components for test_sim_name_proj
export const testSimNameProjName = 'test_sim_name_proj';
export const testSimNameProjDescription =
  'Runs tests for a project on a simulator by name using xcodebuild test and parses xcresult output.';
export const testSimNameProjSchema = {
  projectPath: projectPathSchema,
  scheme: schemeSchema,
  simulatorName: simulatorNameSchema,
  configuration: configurationSchema,
  derivedDataPath: derivedDataPathSchema,
  extraArgs: extraArgsSchema,
  useLatestOS: useLatestOSSchema,
  preferXcodebuild: preferXcodebuildSchema,
};
export const testSimNameProjHandler = async (params: {
  projectPath: string;
  scheme: string;
  simulatorName: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  useLatestOS?: boolean;
  preferXcodebuild?: boolean;
}) =>
  handleTestLogic({
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? false,
    preferXcodebuild: params.preferXcodebuild ?? false,
    platform: XcodePlatform.iOSSimulator,
  });

/**
 * Registers the iOS simulator test project tool (by name)
 */
export function registerSimulatorTestByNameProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    simulatorName: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
    preferXcodebuild?: boolean;
  };

  registerTool<Params>(
    server,
    testSimNameProjName,
    testSimNameProjDescription,
    testSimNameProjSchema,
    testSimNameProjHandler,
  );
}

// Exported components for test_sim_id_ws
export const testSimIdWsName = 'test_sim_id_ws';
export const testSimIdWsDescription =
  'Runs tests for a workspace on a simulator by UUID using xcodebuild test and parses xcresult output.';
export const testSimIdWsSchema = {
  workspacePath: workspacePathSchema,
  scheme: schemeSchema,
  simulatorId: simulatorIdSchema,
  configuration: configurationSchema,
  derivedDataPath: derivedDataPathSchema,
  extraArgs: extraArgsSchema,
  useLatestOS: useLatestOSSchema,
  preferXcodebuild: preferXcodebuildSchema,
};
export const testSimIdWsHandler = async (params: {
  workspacePath: string;
  scheme: string;
  simulatorId: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  useLatestOS?: boolean;
  preferXcodebuild?: boolean;
}) =>
  handleTestLogic({
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? false,
    preferXcodebuild: params.preferXcodebuild ?? false,
    platform: XcodePlatform.iOSSimulator,
  });

/**
 * Registers the iOS simulator test workspace tool (by ID)
 */
export function registerSimulatorTestByIdWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    simulatorId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
    preferXcodebuild?: boolean;
  };

  registerTool<Params>(
    server,
    testSimIdWsName,
    testSimIdWsDescription,
    testSimIdWsSchema,
    testSimIdWsHandler,
  );
}

// Exported components for test_sim_id_proj
export const testSimIdProjName = 'test_sim_id_proj';
export const testSimIdProjDescription =
  'Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output.';
export const testSimIdProjSchema = {
  projectPath: projectPathSchema,
  scheme: schemeSchema,
  simulatorId: simulatorIdSchema,
  configuration: configurationSchema,
  derivedDataPath: derivedDataPathSchema,
  extraArgs: extraArgsSchema,
  useLatestOS: useLatestOSSchema,
  preferXcodebuild: preferXcodebuildSchema,
};
export const testSimIdProjHandler = async (params: {
  projectPath: string;
  scheme: string;
  simulatorId: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  useLatestOS?: boolean;
  preferXcodebuild?: boolean;
}) =>
  handleTestLogic({
    ...params,
    configuration: params.configuration ?? 'Debug',
    useLatestOS: params.useLatestOS ?? false,
    preferXcodebuild: params.preferXcodebuild ?? false,
    platform: XcodePlatform.iOSSimulator,
  });

/**
 * Registers the iOS simulator test project tool (by ID)
 */
export function registerSimulatorTestByIdProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    simulatorId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
    preferXcodebuild?: boolean;
  };

  registerTool<Params>(
    server,
    testSimIdProjName,
    testSimIdProjDescription,
    testSimIdProjSchema,
    testSimIdProjHandler,
  );
}
