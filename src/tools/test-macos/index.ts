/**
 * macOS Test Tools - Tools for running tests on macOS applications
 *
 * This module provides specialized tools for running tests on macOS applications using xcodebuild.
 * It supports both workspace and project-based test runs with xcresult parsing for human-readable
 * test summaries.
 *
 * Responsibilities:
 * - Running tests on macOS applications from project files and workspaces
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
  preferXcodebuildSchema,
} from '../common/index.js';

// --- Public Tool Definitions ---

/**
 * Registers the macOS test workspace tool
 */
export function registerMacOSTestWorkspaceTool(server: McpServer): void {
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
    'test_macos_ws',
    'Runs tests for a macOS workspace using xcodebuild test and parses xcresult output.',
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
        platform: XcodePlatform.macOS,
      }),
  );
}

/**
 * Registers the macOS test project tool
 */
export function registerMacOSTestProjectTool(server: McpServer): void {
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
    'test_macos_proj',
    'Runs tests for a macOS project using xcodebuild test and parses xcresult output.',
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
        platform: XcodePlatform.macOS,
      }),
  );
}
