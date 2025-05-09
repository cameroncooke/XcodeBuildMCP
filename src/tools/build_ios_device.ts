/**
 * iOS Device Build Tools - Tools for building iOS applications for physical devices
 *
 * This module provides specialized tools for building iOS applications targeting physical
 * devices using xcodebuild. It supports both workspace and project-based builds.
 *
 * Responsibilities:
 * - Building iOS applications for physical devices from project files
 * - Building iOS applications for physical devices from workspaces
 * - Handling build configuration and derived data paths
 * - Providing platform-specific destination parameters
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { XcodePlatform } from '../utils/xcode.js';
import { validateRequiredParam } from '../utils/validation.js';
import { executeXcodeBuild } from '../utils/build-utils.js';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  configurationSchema,
  derivedDataPathSchema,
  extraArgsSchema,
  BaseWorkspaceParams,
  BaseProjectParams,
} from './common.js';

// --- Parameter Type Definitions (Specific to iOS Device Build) ---
// None needed currently, using base types

// --- Tool Registration Functions ---

/**
 * Registers the build_ios_dev_ws tool.
 */
export function registerIOSDeviceBuildWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams;
  registerTool<Params>(
    server,
    'build_ios_dev_ws',
    "Builds an iOS app from a workspace for a physical device. IMPORTANT: Requires workspacePath and scheme. Example: build_ios_dev_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
    },
    async (params: Params) => {
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return executeXcodeBuild(
        {
          ...params,
          configuration: params.configuration ?? 'Debug', // Default config
        },
        {
          platform: XcodePlatform.iOS,
          logPrefix: 'iOS Device Build',
        },
        'build',
      );
    },
  );
}

/**
 * Registers the build_ios_dev_proj tool.
 */
export function registerIOSDeviceBuildProjectTool(server: McpServer): void {
  type Params = BaseProjectParams;
  registerTool<Params>(
    server,
    'build_ios_dev_proj',
    "Builds an iOS app from a project file for a physical device. IMPORTANT: Requires projectPath and scheme. Example: build_ios_dev_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
    },
    async (params: Params) => {
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      return executeXcodeBuild(
        {
          ...params,
          configuration: params.configuration ?? 'Debug', // Default config
        },
        {
          platform: XcodePlatform.iOS,
          logPrefix: 'iOS Device Build',
        },
        'build',
      );
    },
  );
}

// Register both iOS device build tools
export function registerIOSDeviceBuildTools(server: McpServer): void {
  registerIOSDeviceBuildWorkspaceTool(server);
  registerIOSDeviceBuildProjectTool(server);
}
