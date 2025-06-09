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
import { XcodePlatform } from '../utils/xcode.js';
import { handleTestLogic } from './test_common.js';
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
} from './common.js';

// --- Public Tool Definitions ---

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
    'test_sim_name_ws',
    'Runs tests for a workspace on a simulator by name using xcodebuild test and parses xcresult output.',
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      handleTestLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? false,
        preferXcodebuild: params.preferXcodebuild ?? false,
        platform: XcodePlatform.iOSSimulator,
      }),
  );
}

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
    'test_sim_name_proj',
    'Runs tests for a project on a simulator by name using xcodebuild test and parses xcresult output.',
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      handleTestLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? false,
        preferXcodebuild: params.preferXcodebuild ?? false,
        platform: XcodePlatform.iOSSimulator,
      }),
  );
}

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
    'test_sim_id_ws',
    'Runs tests for a workspace on a simulator by UUID using xcodebuild test and parses xcresult output.',
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      handleTestLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? false,
        preferXcodebuild: params.preferXcodebuild ?? false,
        platform: XcodePlatform.iOSSimulator,
      }),
  );
}

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
    'test_sim_id_proj',
    'Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output.',
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      handleTestLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        useLatestOS: params.useLatestOS ?? false,
        preferXcodebuild: params.preferXcodebuild ?? false,
        platform: XcodePlatform.iOSSimulator,
      }),
  );
}
