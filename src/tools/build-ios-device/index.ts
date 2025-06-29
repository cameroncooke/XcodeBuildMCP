/**
 * Device Build Tools - Tools for building applications for physical Apple devices
 *
 * This module provides specialized tools for building applications targeting physical
 * Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild.
 * It supports both workspace and project-based builds.
 *
 * Responsibilities:
 * - Building applications for physical Apple devices from project files
 * - Building applications for physical Apple devices from workspaces
 * - Handling build configuration and derived data paths
 * - Providing platform-specific destination parameters
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { XcodePlatform } from '../../utils/xcode.js';
import { validateRequiredParam } from '../../utils/validation.js';
import { executeXcodeBuildCommand } from '../../utils/build-utils.js';
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
  preferXcodebuildSchema,
} from '../common/index.js';

// --- Extracted Exports for build_dev_ws ---
export const buildDevWsName = 'build_dev_ws';
export const buildDevWsDescription =
  "Builds an app from a workspace for a physical Apple device. IMPORTANT: Requires workspacePath and scheme. Example: build_dev_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })";
export const buildDevWsSchema = {
  workspacePath: workspacePathSchema,
  scheme: schemeSchema,
  configuration: configurationSchema,
  derivedDataPath: derivedDataPathSchema,
  extraArgs: extraArgsSchema,
  preferXcodebuild: preferXcodebuildSchema,
};
export const buildDevWsHandler = async (params: BaseWorkspaceParams) => {
  const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
  if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  return executeXcodeBuildCommand(
    {
      ...params,
      configuration: params.configuration ?? 'Debug', // Default config
    },
    {
      platform: XcodePlatform.iOS,
      logPrefix: 'iOS Device Build',
    },
    params.preferXcodebuild,
    'build',
  );
};

// --- Extracted Exports for build_dev_proj ---
export const buildDevProjName = 'build_dev_proj';
export const buildDevProjDescription =
  "Builds an app from a project file for a physical Apple device. IMPORTANT: Requires projectPath and scheme. Example: build_dev_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })";
export const buildDevProjSchema = {
  projectPath: projectPathSchema,
  scheme: schemeSchema,
  configuration: configurationSchema,
  derivedDataPath: derivedDataPathSchema,
  extraArgs: extraArgsSchema,
  preferXcodebuild: preferXcodebuildSchema,
};
export const buildDevProjHandler = async (params: BaseProjectParams) => {
  const projectValidation = validateRequiredParam('projectPath', params.projectPath);
  if (!projectValidation.isValid) return projectValidation.errorResponse!;

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

  return executeXcodeBuildCommand(
    {
      ...params,
      configuration: params.configuration ?? 'Debug', // Default config
    },
    {
      platform: XcodePlatform.iOS,
      logPrefix: 'iOS Device Build',
    },
    params.preferXcodebuild,
    'build',
  );
};

// --- Tool Registration Functions ---

/**
 * Registers the build_dev_ws tool.
 */
export function registerDeviceBuildWorkspaceTool(server: McpServer): void {
  type Params = BaseWorkspaceParams;
  registerTool<Params>(
    server,
    buildDevWsName,
    buildDevWsDescription,
    buildDevWsSchema,
    buildDevWsHandler,
  );
}

/**
 * Registers the build_dev_proj tool.
 */
export function registerDeviceBuildProjectTool(server: McpServer): void {
  type Params = BaseProjectParams;
  registerTool<Params>(
    server,
    buildDevProjName,
    buildDevProjDescription,
    buildDevProjSchema,
    buildDevProjHandler,
  );
}

// Register both device build tools
export function registerDeviceBuildTools(server: McpServer): void {
  registerDeviceBuildWorkspaceTool(server);
  registerDeviceBuildProjectTool(server);
}
