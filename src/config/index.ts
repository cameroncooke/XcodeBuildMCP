/**
 * Configuration Module - MCP Server Capability Configuration
 *
 * This module provides configuration management for MCP server capabilities,
 * allowing users to enable or disable specific features based on their needs
 * and client support.
 */

import { ServerCapabilitiesConfig } from '../server/server.js';
import { log } from '../utils/logger.js';

/**
 * Environment variable names for capability configuration
 */
const CONFIG_ENV_VARS = {
  TOOLS: 'XCODEBUILDMCP_ENABLE_TOOLS',
  RESOURCES: 'XCODEBUILDMCP_ENABLE_RESOURCES',
  PROMPTS: 'XCODEBUILDMCP_ENABLE_PROMPTS',
  SAMPLING: 'XCODEBUILDMCP_ENABLE_SAMPLING',
} as const;

/**
 * Parse boolean value from environment variable
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Load server capabilities configuration from environment variables
 * @returns Server capabilities configuration
 */
export function loadCapabilitiesConfig(): ServerCapabilitiesConfig {
  const config: ServerCapabilitiesConfig = {
    tools: parseBooleanEnv(process.env[CONFIG_ENV_VARS.TOOLS], true),
    resources: parseBooleanEnv(process.env[CONFIG_ENV_VARS.RESOURCES], true),
    prompts: parseBooleanEnv(process.env[CONFIG_ENV_VARS.PROMPTS], true),
    sampling: parseBooleanEnv(process.env[CONFIG_ENV_VARS.SAMPLING], false),
  };

  log('info', `Loaded capabilities configuration: ${JSON.stringify(config)}`);
  return config;
}

/**
 * Get configuration help text for users
 */
export function getConfigurationHelp(): string {
  return `
XcodeBuildMCP Capability Configuration:

Environment Variables:
  ${CONFIG_ENV_VARS.TOOLS}=true|false     Enable/disable tool capabilities (default: true)
  ${CONFIG_ENV_VARS.RESOURCES}=true|false  Enable/disable resource capabilities (default: true)
  ${CONFIG_ENV_VARS.PROMPTS}=true|false    Enable/disable prompt capabilities (default: true)
  ${CONFIG_ENV_VARS.SAMPLING}=true|false   Enable/disable sampling capabilities (default: false)

Examples:
  # Enable all capabilities
  export ${CONFIG_ENV_VARS.TOOLS}=true
  export ${CONFIG_ENV_VARS.RESOURCES}=true
  export ${CONFIG_ENV_VARS.PROMPTS}=true
  export ${CONFIG_ENV_VARS.SAMPLING}=true

  # Tools-only mode (maximum compatibility)
  export ${CONFIG_ENV_VARS.TOOLS}=true
  export ${CONFIG_ENV_VARS.RESOURCES}=false
  export ${CONFIG_ENV_VARS.PROMPTS}=false
  export ${CONFIG_ENV_VARS.SAMPLING}=false

Note: Sampling capabilities require client support and explicit user consent.
Most MCP clients currently only support tools, so other capabilities may not be available.
`;
}

