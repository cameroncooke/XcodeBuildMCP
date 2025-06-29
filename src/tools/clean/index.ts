/**
 * Clean Tool - Uses xcodebuild's native clean action to clean build products
 *
 * This module provides tools for cleaning build products from Xcode projects and workspaces
 * using xcodebuild's native 'clean' action. Cleaning is important for ensuring fresh builds
 * and resolving certain build issues.
 *
 * Responsibilities:
 * - Cleaning build products from project files
 * - Cleaning build products from workspaces
 * - Supporting configuration-specific cleaning
 * - Handling derived data path specification
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../../utils/logger.js';
import { XcodePlatform } from '../../utils/xcode.js';
import { ToolResponse } from '../../types/common.js';
import { executeXcodeBuildCommand } from '../../utils/build-utils.js';
import { validateRequiredParam } from '../../utils/validation.js';

/**
 * Schema for clean workspace tool parameters
 */
export const CleanWorkspaceSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  scheme: z.string().optional().describe('Optional: The scheme to clean'),
  configuration: z
    .string()
    .optional()
    .describe('Optional: Build configuration to clean (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Optional: Path where derived data might be located'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
});

/**
 * Schema for clean project tool parameters
 */
export const CleanProjectSchema = z.object({
  projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
  scheme: z.string().optional().describe('Optional: The scheme to clean'),
  configuration: z
    .string()
    .optional()
    .describe('Optional: Build configuration to clean (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Optional: Path where derived data might be located'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
});

/**
 * Internal logic for cleaning build products.
 */
async function _handleCleanLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme?: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
}): Promise<ToolResponse> {
  log('info', 'Starting xcodebuild clean request (internal)');

  // For clean operations, we need to provide a default platform and configuration
  return executeXcodeBuildCommand(
    {
      ...params,
      scheme: params.scheme || '', // Empty string if not provided
      configuration: params.configuration || 'Debug', // Default to Debug if not provided
    },
    {
      platform: XcodePlatform.macOS, // Default to macOS, but this doesn't matter much for clean
      logPrefix: 'Clean',
    },
    false,
    'clean', // Specify 'clean' as the build action
  );
}

/**
 * Cleans build products for a workspace
 */
export async function cleanWorkspace(
  params: z.infer<typeof CleanWorkspaceSchema>,
): Promise<ToolResponse> {
  const validated = CleanWorkspaceSchema.parse(params);

  const workspacePathValidation = validateRequiredParam('workspacePath', validated.workspacePath);
  if (!workspacePathValidation.isValid) {
    return workspacePathValidation.errorResponse!;
  }

  return _handleCleanLogic(validated);
}

/**
 * Cleans build products for a project
 */
export async function cleanProject(
  params: z.infer<typeof CleanProjectSchema>,
): Promise<ToolResponse> {
  const validated = CleanProjectSchema.parse(params);

  const projectPathValidation = validateRequiredParam('projectPath', validated.projectPath);
  if (!projectPathValidation.isValid) {
    return projectPathValidation.errorResponse!;
  }

  return _handleCleanLogic(validated);
}

// --- Tool Components for clean_ws ---
export const cleanWsToolName = 'clean_ws';
export const cleanWsToolDescription =
  "Cleans build products for a specific workspace using xcodebuild. IMPORTANT: Requires workspacePath. Scheme/Configuration are optional. Example: clean_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })";
export const cleanWsToolSchema = CleanWorkspaceSchema.shape;
export async function cleanWsToolHandler(
  params: z.infer<typeof CleanWorkspaceSchema>,
): Promise<ToolResponse> {
  return cleanWorkspace(params);
}

// --- Tool Components for clean_proj ---
export const cleanProjToolName = 'clean_proj';
export const cleanProjToolDescription =
  "Cleans build products for a specific project file using xcodebuild. IMPORTANT: Requires projectPath. Scheme/Configuration are optional. Example: clean_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })";
export const cleanProjToolSchema = CleanProjectSchema.shape;
export async function cleanProjToolHandler(
  params: z.infer<typeof CleanProjectSchema>,
): Promise<ToolResponse> {
  return cleanProject(params);
}

// --- Public Tool Definitions ---

export function registerCleanWorkspaceTool(server: McpServer): void {
  server.tool(cleanWsToolName, cleanWsToolDescription, cleanWsToolSchema, cleanWsToolHandler);
}

export function registerCleanProjectTool(server: McpServer): void {
  server.tool(
    cleanProjToolName,
    cleanProjToolDescription,
    cleanProjToolSchema,
    cleanProjToolHandler,
  );
}
