/**
 * Tool Groups Configuration
 *
 * This file defines the groups of tools and provides utilities to determine
 * which tools should be enabled based on environment variables.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from './logger.js';

// Tool group definitions
export enum ToolGroup {
  // Workflow-based groups
  // Project/target discovery and analysis
  PROJECT_DISCOVERY = 'XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY',

  // iOS Simulator development workflow
  IOS_SIMULATOR_WORKFLOW = 'XCODEBUILDMCP_GROUP_IOS_SIMULATOR_WORKFLOW',

  // iOS Device development workflow
  IOS_DEVICE_WORKFLOW = 'XCODEBUILDMCP_GROUP_IOS_DEVICE_WORKFLOW',

  // macOS application development workflow
  MACOS_WORKFLOW = 'XCODEBUILDMCP_GROUP_MACOS_WORKFLOW',

  // Swift Package Manager workflow
  SWIFT_PACKAGE_WORKFLOW = 'XCODEBUILDMCP_GROUP_SWIFT_PACKAGE_WORKFLOW',

  // Simulator device management
  SIMULATOR_MANAGEMENT = 'XCODEBUILDMCP_GROUP_SIMULATOR_MANAGEMENT',

  // Physical device management
  DEVICE_MANAGEMENT = 'XCODEBUILDMCP_GROUP_DEVICE_MANAGEMENT',

  // Application deployment tools
  APP_DEPLOYMENT = 'XCODEBUILDMCP_GROUP_APP_DEPLOYMENT',

  // Logging and diagnostics
  DIAGNOSTICS = 'XCODEBUILDMCP_GROUP_DIAGNOSTICS',

  // UI testing and automation
  UI_TESTING = 'XCODEBUILDMCP_GROUP_UI_TESTING',

  // Testing tools (unit tests, UI tests)
  TESTING = 'XCODEBUILDMCP_GROUP_TESTING',
}

// Map tool registration functions to their respective groups and individual env var names
export interface ToolRegistration {
  register: (server: McpServer) => void;
  groups: ToolGroup[];
  envVar: string;
}

// Check if selective tool registration is enabled by checking if any tool or group env vars are set
export function isSelectiveToolsEnabled(): boolean {
  // Check if any tool-specific environment variables are set
  const hasToolEnvVars = Object.keys(process.env).some(
    (key) => key.startsWith('XCODEBUILDMCP_TOOL_') && process.env[key] === 'true',
  );

  // Check if any group-specific environment variables are set
  const hasGroupEnvVars = Object.keys(process.env).some(
    (key) => key.startsWith('XCODEBUILDMCP_GROUP_') && process.env[key] === 'true',
  );

  const isEnabled = hasToolEnvVars || hasGroupEnvVars;
  return isEnabled;
}

// Check if a specific tool should be enabled
export function isToolEnabled(toolEnvVar: string): boolean {
  // If selective tools mode is not enabled, all tools are enabled by default
  if (!isSelectiveToolsEnabled()) {
    return true;
  }

  const isEnabled = process.env[toolEnvVar] === 'true';
  return isEnabled;
}

// Check if a tool group should be enabled
export function isGroupEnabled(group: ToolGroup): boolean {
  // If selective tools mode is not enabled, all groups are enabled by default
  if (!isSelectiveToolsEnabled()) {
    return true;
  }

  // In selective mode, group must be explicitly enabled
  const isEnabled = process.env[group] === 'true';
  return isEnabled;
}

// Check if a tool should be registered based on its groups and individual env var
export function shouldRegisterTool(toolReg: ToolRegistration): boolean {
  // If selective tools mode is not enabled, register all tools
  if (!isSelectiveToolsEnabled()) {
    return true;
  }

  // Check if the tool is enabled individually
  if (isToolEnabled(toolReg.envVar)) {
    return true;
  }

  // Check if any of the tool's groups are enabled
  const enabledByGroup = toolReg.groups.some((group) => isGroupEnabled(group));
  return enabledByGroup;
}

// List all enabled tool groups (for debugging purposes)
export function listEnabledGroups(): string[] {
  if (!isSelectiveToolsEnabled()) {
    return Object.values(ToolGroup);
  }

  return Object.values(ToolGroup).filter((group) => isGroupEnabled(group as ToolGroup));
}

// Helper to register a tool if it's enabled
export function registerIfEnabled(server: McpServer, toolReg: ToolRegistration): void {
  const shouldRegister = shouldRegisterTool(toolReg);

  if (shouldRegister) {
    if (process.env.XCODEBUILDMCP_DEBUG === 'true') {
      log('debug', `Registering tool: ${toolReg.envVar}`);
    }
    toolReg.register(server);
  } else {
    if (process.env.XCODEBUILDMCP_DEBUG === 'true') {
      log('debug', `Skipping tool: ${toolReg.envVar} (not enabled)`);
    }
  }
}
