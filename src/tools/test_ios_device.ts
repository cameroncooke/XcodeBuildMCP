/**
 * iOS Device Test Tools - Tools for running tests on iOS physical devices
 *
 * This module provides specialized tools for running tests on iOS applications on physical devices
 * using xcodebuild. It supports both workspace and project-based test runs with xcresult parsing
 * for human-readable test summaries.
 *
 * Responsibilities:
 * - Running tests on iOS applications on physical devices from project files and workspaces
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
  preferXcodebuildSchema,
} from './common.js';

// --- Public Tool Definitions ---

/**
 * Registers the iOS device test workspace tool
 */
export function registerIOSDeviceTestWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
  };

  registerTool<Params>(
    server,
    'test_ios_dev_ws',
    'Runs tests for an iOS workspace on a physical device using xcodebuild test and parses xcresult output.',
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      handleTestLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        preferXcodebuild: params.preferXcodebuild ?? false,
        platform: XcodePlatform.iOS,
      }),
  );
}

/**
 * Registers the iOS device test project tool
 */
export function registerIOSDeviceTestProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
  };

  registerTool<Params>(
    server,
    'test_ios_dev_proj',
    'Runs tests for an iOS project on a physical device using xcodebuild test and parses xcresult output.',
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      preferXcodebuild: preferXcodebuildSchema,
    },
    async (params) =>
      handleTestLogic({
        ...params,
        configuration: params.configuration ?? 'Debug',
        preferXcodebuild: params.preferXcodebuild ?? false,
        platform: XcodePlatform.iOS,
      }),
  );
}
