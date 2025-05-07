/**
 * Diagnostic Tool - Provides comprehensive information about the MCP server environment
 *
 * This module provides a diagnostic tool that reports on the server environment,
 * available dependencies, and configuration status. It's only registered when
 * the XCODEBUILDMCP_DEBUG environment variable is set.
 *
 * Responsibilities:
 * - Reporting on Node.js and system environment
 * - Checking for required dependencies (xcodebuild, idb, etc.)
 * - Reporting on environment variables that affect server behavior
 * - Providing detailed information for debugging and troubleshooting
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolResponse } from '../types/common.js';
import { log } from '../utils/logger.js';
import { execSync } from 'child_process';
import { version } from '../version.js';
import { areIdbToolsAvailable } from '../utils/idb-setup.js';
import { isXcodemakeEnabled, isXcodemakeAvailable, doesMakefileExist } from '../utils/xcodemake.js';
import * as os from 'os';
import { ToolGroup, isSelectiveToolsEnabled, listEnabledGroups } from '../utils/tool-groups.js';

// Constants
const LOG_PREFIX = '[Diagnostic]';

/**
 * Check if a binary is available in the PATH and attempt to get its version
 * @param binary The binary name to check
 * @returns Object with availability status and optional version string
 */
export function checkBinaryAvailability(binary: string): { available: boolean; version?: string } {
  // First check if the binary exists at all
  try {
    execSync(`which ${binary}`, { stdio: 'ignore' });
  } catch {
    // Binary not found in PATH
    return { available: false };
  }

  // Binary exists, now try to get version info if possible
  let version: string | undefined;

  // Define version commands for specific binaries
  const versionCommands: Record<string, string> = {
    idb_companion: 'idb_companion --version',
    python3: 'python3 --version',
    python: 'python --version',
    pip3: 'pip3 --version',
    pip: 'pip --version',
    mise: 'mise --version',
  };

  // Try to get version using binary-specific commands
  if (binary in versionCommands) {
    try {
      const output = execSync(versionCommands[binary], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (output) {
        // For xcodebuild, include both version and build info
        if (binary === 'xcodebuild') {
          const lines = output.split('\n').slice(0, 2);
          version = lines.join(' - ');
        } else {
          version = output;
        }
      }
    } catch {
      // Command failed, continue to generic attempts
    }
  }

  // We only care about the specific binaries we've defined
  return {
    available: true,
    version: version || 'Available (version info not available)',
  };
}

/**
 * Get information about the Xcode installation
 */
export function getXcodeInfo():
  | { version: string; path: string; selectedXcode: string; xcrunVersion: string }
  | { error: string } {
  try {
    // Get Xcode version info
    const xcodebuildOutput = execSync('xcodebuild -version', { encoding: 'utf8' }).trim();
    const version = xcodebuildOutput.split('\n').slice(0, 2).join(' - ');

    // Get Xcode selection info
    const path = execSync('xcode-select -p', { encoding: 'utf8' }).trim();
    const selectedXcode = execSync('xcrun --find xcodebuild', { encoding: 'utf8' }).trim();

    // Get xcrun version info
    const xcrunVersion = execSync('xcrun --version', { encoding: 'utf8' }).trim();

    return { version, path, selectedXcode, xcrunVersion };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get information about the environment variables
 */
export function getEnvironmentVariables(): Record<string, string | undefined> {
  const relevantVars = [
    'XCODEBUILDMCP_DEBUG',
    'INCREMENTAL_BUILDS_ENABLED',
    'XCODEBUILDMCP_RUNNING_UNDER_MISE',
    'PATH',
    'DEVELOPER_DIR',
    'HOME',
    'USER',
    'TMPDIR',
    'PYTHONPATH',
    'NODE_ENV',
    'SENTRY_DISABLED',
  ];

  const envVars: Record<string, string | undefined> = {};

  // Add standard environment variables
  for (const varName of relevantVars) {
    envVars[varName] = process.env[varName];
  }

  // Add all tool and group environment variables for debugging
  Object.keys(process.env).forEach((key) => {
    if (
      key.startsWith('XCODEBUILDMCP_TOOL_') ||
      key.startsWith('XCODEBUILDMCP_GROUP_') ||
      key.startsWith('XCODEBUILDMCP_')
    ) {
      envVars[key] = process.env[key];
    }
  });

  return envVars;
}

/**
 * Get system information
 */
function getSystemInfo(): Record<string, string> {
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpus: `${os.cpus().length} x ${os.cpus()[0]?.model || 'Unknown'}`,
    memory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
    hostname: os.hostname(),
    username: os.userInfo().username,
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
  };
}

/**
 * Get Node.js information
 */
function getNodeInfo(): Record<string, string> {
  return {
    version: process.version,
    execPath: process.execPath,
    pid: process.pid.toString(),
    ppid: process.ppid.toString(),
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    argv: process.argv.join(' '),
  };
}

/**
 * Get information about tool groups and their status
 */
export function getToolGroupsInfo(): Record<string, unknown> {
  const selectiveMode = isSelectiveToolsEnabled();
  const enabledGroups = listEnabledGroups();

  const toolGroups: Record<string, { enabled: boolean; envVar: string }> = {};

  // Add information about each tool group
  for (const group of Object.values(ToolGroup)) {
    const isEnabled = process.env[group] === 'true';
    toolGroups[group] = {
      enabled: isEnabled,
      envVar: group,
    };
  }

  return {
    selectiveMode,
    enabledGroups,
    groups: toolGroups,
  };
}

/**
 * Get a list of individually enabled tools via environment variables
 */
function getIndividuallyEnabledTools(): string[] {
  return Object.keys(process.env)
    .filter((key) => key.startsWith('XCODEBUILDMCP_TOOL_') && process.env[key] === 'true')
    .map((key) => key.replace('XCODEBUILDMCP_TOOL_', ''));
}

/**
 * Run the diagnostic tool and return the results
 * @returns Promise resolving to ToolResponse with diagnostic information
 */
export async function runDiagnosticTool(): Promise<ToolResponse> {
  log('info', `${LOG_PREFIX}: Running diagnostic tool`);

  // Check for required binaries
  const requiredBinaries = ['idb', 'idb_companion', 'python3', 'pip3', 'xcodemake', 'mise'];

  const binaryStatus: Record<string, { available: boolean; version?: string }> = {};

  for (const binary of requiredBinaries) {
    binaryStatus[binary] = checkBinaryAvailability(binary);
  }

  // Get Xcode information
  const xcodeInfo = getXcodeInfo();

  // Get environment variables
  const envVars = getEnvironmentVariables();

  // Get system information
  const systemInfo = getSystemInfo();

  // Get Node.js information
  const nodeInfo = getNodeInfo();

  // Check for idb tools availability
  const idbAvailable = areIdbToolsAvailable();

  // Get tool groups information
  const toolGroupsInfo = getToolGroupsInfo();

  // Get individually enabled tools
  const individuallyEnabledTools = getIndividuallyEnabledTools();

  // Check for xcodemake configuration
  const xcodemakeEnabled = isXcodemakeEnabled();
  const xcodemakeAvailable = await isXcodemakeAvailable();
  const makefileExists = doesMakefileExist('./');

  // Compile the diagnostic information
  const diagnosticInfo = {
    serverVersion: version,
    timestamp: new Date().toISOString(),
    system: systemInfo,
    node: nodeInfo,
    xcode: xcodeInfo,
    dependencies: binaryStatus,
    environmentVariables: envVars,
    features: {
      idb: {
        available: idbAvailable,
        uiAutomationSupported:
          idbAvailable && binaryStatus['idb'].available && binaryStatus['idb_companion'].available,
      },
      xcodemake: {
        enabled: xcodemakeEnabled,
        available: xcodemakeAvailable,
        makefileExists: makefileExists,
      },
      mise: {
        running_under_mise: Boolean(process.env.XCODEBUILDMCP_RUNNING_UNDER_MISE),
        available: binaryStatus['mise'].available,
      },
    },
    toolGroups: toolGroupsInfo as {
      selectiveMode: boolean;
      enabledGroups: string[];
      groups: Record<string, { enabled: boolean; envVar: string }>;
    },
    individuallyEnabledTools,
  };

  // Format the diagnostic information as a nicely formatted text response
  const formattedOutput = [
    `# XcodeBuildMCP Diagnostic Report`,
    `\nGenerated: ${diagnosticInfo.timestamp}`,
    `Server Version: ${diagnosticInfo.serverVersion}`,

    `\n## System Information`,
    ...Object.entries(diagnosticInfo.system).map(([key, value]) => `- ${key}: ${value}`),

    `\n## Node.js Information`,
    ...Object.entries(diagnosticInfo.node).map(([key, value]) => `- ${key}: ${value}`),

    `\n## Xcode Information`,
    ...('error' in diagnosticInfo.xcode
      ? [`- Error: ${diagnosticInfo.xcode.error}`]
      : Object.entries(diagnosticInfo.xcode).map(([key, value]) => `- ${key}: ${value}`)),

    `\n## Dependencies`,
    ...Object.entries(diagnosticInfo.dependencies).map(
      ([binary, status]) =>
        `- ${binary}: ${status.available ? `✅ ${status.version || 'Available'}` : '❌ Not found'}`,
    ),

    `\n## Environment Variables`,
    ...Object.entries(diagnosticInfo.environmentVariables)
      .filter(([key]) => key !== 'PATH' && key !== 'PYTHONPATH') // These are too long, handle separately
      .map(([key, value]) => `- ${key}: ${value || '(not set)'}`),

    `\n### PATH`,
    `\`\`\``,
    `${diagnosticInfo.environmentVariables.PATH || '(not set)'}`.split(':').join('\n'),
    `\`\`\``,

    `\n## Feature Status`,
    `\n### UI Automation (idb)`,
    `- Available: ${diagnosticInfo.features.idb.available ? '✅ Yes' : '❌ No'}`,
    `- UI Automation Supported: ${diagnosticInfo.features.idb.uiAutomationSupported ? '✅ Yes' : '❌ No'}`,

    `\n### Incremental Builds`,
    `- Enabled: ${diagnosticInfo.features.xcodemake.enabled ? '✅ Yes' : '❌ No'}`,
    `- Available: ${diagnosticInfo.features.xcodemake.available ? '✅ Yes' : '❌ No'}`,
    `- Makefile exists: ${diagnosticInfo.features.xcodemake.makefileExists ? '✅ Yes' : '❌ No'}`,

    `\n### Mise Integration`,
    `- Running under mise: ${diagnosticInfo.features.mise.running_under_mise ? '✅ Yes' : '❌ No'}`,
    `- Mise available: ${diagnosticInfo.features.mise.available ? '✅ Yes' : '❌ No'}`,

    `\n### Tool Groups Status`,
    ...(diagnosticInfo.toolGroups.selectiveMode
      ? Object.entries(diagnosticInfo.toolGroups.groups).map(([group, info]) => {
          // Extract the group name without the prefix for display purposes
          const displayName = group.replace('XCODEBUILDMCP_GROUP_', '');
          return `- ${displayName}: ${info.enabled ? '✅ Enabled' : '❌ Disabled'} (Set with ${info.envVar}=true)`;
        })
      : ['- All tool groups are enabled (selective mode is disabled).']),

    `\n### Individually Enabled Tools`,
    ...(diagnosticInfo.toolGroups.selectiveMode
      ? diagnosticInfo.individuallyEnabledTools.length > 0
        ? diagnosticInfo.individuallyEnabledTools.map(
            (tool) => `- ${tool}: ✅ Enabled (via XCODEBUILDMCP_TOOL_${tool}=true)`,
          )
        : ['- No tools are individually enabled via environment variables.']
      : ['- All tools are enabled (selective mode is disabled).']),

    `\n## Tool Availability Summary`,
    `- Build Tools: ${!('error' in diagnosticInfo.xcode) ? '\u2705 Available' : '\u274c Not available'}`,
    `- UI Automation Tools: ${diagnosticInfo.features.idb.uiAutomationSupported ? '\u2705 Available' : '\u274c Not available'}`,
    `- Incremental Build Support: ${diagnosticInfo.features.xcodemake.available && diagnosticInfo.features.xcodemake.enabled ? '\u2705 Available & Enabled' : diagnosticInfo.features.xcodemake.available ? '\u2705 Available but Disabled' : '\u274c Not available'}`,

    `\n## Sentry`,
    `- Sentry enabled: ${diagnosticInfo.environmentVariables.SENTRY_DISABLED !== 'true' ? '✅ Yes' : '❌ No'}`,

    `\n## Troubleshooting Tips`,
    `- If UI automation tools are not available, install idb: \`pipx install fb-idb\``,
    `- If incremental build support is not available, you can download the tool from https://github.com/cameroncooke/xcodemake. Make sure it's executable and available in your PATH`,
    `- To enable xcodemake, set environment variable: \`export INCREMENTAL_BUILDS_ENABLED=1\``,
    `- For mise integration, follow instructions in the README.md file`,
    `- To enable specific tool groups, set the appropriate environment variables (e.g., \`export XCODEBUILDMCP_GROUP_DISCOVERY=true\`)`,
    `- If you're having issues with environment variables, make sure to use the correct prefix:`,
    `  - Use \`XCODEBUILDMCP_GROUP_NAME=true\` to enable a tool group`,
    `  - Use \`XCODEBUILDMCP_TOOL_NAME=true\` to enable an individual tool`,
    `  - Common mistake: Using \`XCODEBUILDMCP_BUILD_IOS_SIM=true\` instead of \`XCODEBUILDMCP_GROUP_BUILD_IOS_SIM=true\``,
  ].join('\n');

  return {
    content: [
      {
        type: 'text',
        text: formattedOutput,
      },
    ],
  };
}

/**
 * Registers the diagnostic tool with the dispatcher.
 * This tool is only registered when the XCODEBUILDMCP_DEBUG environment variable is set.
 * @param server The McpServer instance.
 */
export function registerDiagnosticTool(server: McpServer): void {
  server.tool(
    'diagnostic',
    'Provides comprehensive information about the MCP server environment, available dependencies, and configuration status.',
    {
      enabled: z.boolean().optional().describe('Optional: dummy parameter to satisfy MCP protocol'),
    },
    async (): Promise<ToolResponse> => {
      return runDiagnosticTool();
    },
  );
}
