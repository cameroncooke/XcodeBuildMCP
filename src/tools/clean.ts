/**
 * Clean Tool - Uses xcodebuild's native clean action to clean build products
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../utils/logger.js';
import { executeXcodeCommand, addXcodeParameters, XcodeParams } from '../utils/xcode.js';
import { ToolResponse, ToolResponseContent } from '../types/common.js';

// --- Private Helper Function ---

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
  const warningMessages: ToolResponseContent[] = [];
  // Initial path check removed, assume one path is present or none (for implicit)

  log('info', 'Starting xcodebuild clean request (internal)');

  try {
    const command = ['xcodebuild', 'clean'];
    // Use XcodeParams type for clarity when calling addXcodeParameters
    const xcodeParams: XcodeParams = { ...params };
    addXcodeParameters(command, xcodeParams, 'Cleaning');

    const result = await executeXcodeCommand(command, 'Clean');

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Clean operation failed: ${String(result.error)}`,
          },
        ],
        isError: true, // Mark as error
      };
    }

    // Construct success message, including context if provided
    let successMessage = '✅ Clean operation successful.';
    if (params.scheme) successMessage += ` For scheme '${params.scheme}'.`;
    if (params.configuration) successMessage += ` Configuration '${params.configuration}'.`;
    if (params.workspacePath) successMessage += ` In workspace '${params.workspacePath}'.`;
    else if (params.projectPath) successMessage += ` In project '${params.projectPath}'.`;
    else successMessage += ' In current directory project/workspace.'; // If neither provided

     successMessage += `\nOutput:\n${String(result.output)}`; // Include output


    const responseContent: ToolResponseContent[] = [
      ...warningMessages, // Keep potential warnings from addXcodeParameters if any arise later
      {
        type: 'text',
        text: successMessage,
      },
    ];

    return {
      content: responseContent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during clean operation: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Clean operation failed: ${errorMessage}`,
        },
      ],
      isError: true, // Mark as error
    };
  }
}

// --- Public Tool Definitions ---

export function registerCleanWorkspaceTool(server: McpServer): void {
  server.tool(
    'clean_workspace',
    "Cleans build products for a specific workspace using xcodebuild. IMPORTANT: Requires workspacePath. Scheme/Configuration are optional. Example: clean_workspace({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    {
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
    },
    (params) => _handleCleanLogic(params),
  );
}

export function registerCleanProjectTool(server: McpServer): void {
  server.tool(
    'clean_project',
    "Cleans build products for a specific project file using xcodebuild. IMPORTANT: Requires projectPath. Scheme/Configuration are optional. Example: clean_project({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    {
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
    },
    (params) => _handleCleanLogic(params),
  );
}
