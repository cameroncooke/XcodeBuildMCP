/**
 * Diagnostics Plugin: Diagnostic Tool
 *
 * Provides comprehensive information about the MCP server environment.
 */

import { z } from 'zod';
import { log } from '../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../utils/index.js';
import { version } from '../../utils/index.js';
import { areAxeToolsAvailable } from '../../utils/index.js';
import { isXcodemakeEnabled, isXcodemakeAvailable, doesMakefileExist } from '../../utils/index.js';
import * as os from 'os';
import { loadPlugins } from '../../utils/index.js';
import { ToolResponse } from '../../types/common.js';

// Mock system interface for dependency injection
interface MockSystem {
  executor: CommandExecutor;
  platform: () => string;
  release: () => string;
  arch: () => string;
  cpus: () => Array<{ model: string }>;
  totalmem: () => number;
  hostname: () => string;
  userInfo: () => { username: string };
  homedir: () => string;
  tmpdir: () => string;
}

// Mock utilities interface for dependency injection
interface MockUtilities {
  areAxeToolsAvailable: () => boolean;
  isXcodemakeEnabled: () => boolean;
  isXcodemakeAvailable: () => Promise<boolean>;
  doesMakefileExist: (path: string) => boolean;
  loadPlugins: () => Promise<Map<string, unknown>>;
}

// Constants
const LOG_PREFIX = '[Diagnostic]';

/**
 * Check if a binary is available in the PATH and attempt to get its version
 */
async function checkBinaryAvailability(
  binary: string,
  mockSystem?: MockSystem,
): Promise<{ available: boolean; version?: string }> {
  const commandExecutor = mockSystem?.executor;

  // Fallback executor for when no mock is provided
  const fallbackExecutor = async (
    _command: string[],
    _logPrefix?: string,
  ): Promise<{ success: boolean; output: string; error: string }> => ({
    success: false,
    output: '',
    error: 'Binary not found',
  });

  // First check if the binary exists at all
  try {
    const whichResult = await (commandExecutor || fallbackExecutor)(
      ['which', binary],
      'Check Binary Availability',
    );
    if (!whichResult.success) {
      return { available: false };
    }
  } catch {
    // Binary not found in PATH
    return { available: false };
  }

  // Binary exists, now try to get version info if possible
  let version;

  // Define version commands for specific binaries
  const versionCommands = {
    axe: 'axe --version',
    mise: 'mise --version',
  };

  // Try to get version using binary-specific commands
  if (binary in versionCommands) {
    try {
      const versionResult = await (commandExecutor || fallbackExecutor)(
        versionCommands[binary].split(' '),
        'Get Binary Version',
      );
      if (versionResult.success && versionResult.output) {
        const output = versionResult.output.trim();
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
async function getXcodeInfo(
  mockSystem?: MockSystem,
): Promise<
  { version: string; path: string; selectedXcode: string; xcrunVersion: string } | { error: string }
> {
  const commandExecutor = mockSystem?.executor;

  // Fallback executor for when no mock is provided
  const fallbackExecutor = async (
    _command: string[],
    _logPrefix?: string,
  ): Promise<{ success: boolean; output: string; error: string }> => ({
    success: false,
    output: '',
    error: 'Xcode tool not found',
  });

  try {
    // Get Xcode version info
    const xcodebuildResult = await (commandExecutor || fallbackExecutor)(
      ['xcodebuild', '-version'],
      'Get Xcode Version',
    );
    if (!xcodebuildResult.success) {
      throw new Error('xcodebuild command failed');
    }
    const version = xcodebuildResult.output.trim().split('\n').slice(0, 2).join(' - ');

    // Get Xcode selection info
    const pathResult = await (commandExecutor || fallbackExecutor)(
      ['xcode-select', '-p'],
      'Get Xcode Path',
    );
    if (!pathResult.success) {
      throw new Error('xcode-select command failed');
    }
    const path = pathResult.output.trim();

    const selectedXcodeResult = await (commandExecutor || fallbackExecutor)(
      ['xcrun', '--find', 'xcodebuild'],
      'Find Xcodebuild',
    );
    if (!selectedXcodeResult.success) {
      throw new Error('xcrun --find command failed');
    }
    const selectedXcode = selectedXcodeResult.output.trim();

    // Get xcrun version info
    const xcrunVersionResult = await (commandExecutor || fallbackExecutor)(
      ['xcrun', '--version'],
      'Get Xcrun Version',
    );
    if (!xcrunVersionResult.success) {
      throw new Error('xcrun --version command failed');
    }
    const xcrunVersion = xcrunVersionResult.output.trim();

    return { version, path, selectedXcode, xcrunVersion };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get information about the environment variables
 */
function getEnvironmentVariables(): Record<string, string | undefined> {
  const relevantVars = [
    'XCODEBUILDMCP_DEBUG',
    'INCREMENTAL_BUILDS_ENABLED',
    'PATH',
    'DEVELOPER_DIR',
    'HOME',
    'USER',
    'TMPDIR',
    'NODE_ENV',
    'SENTRY_DISABLED',
  ];

  const envVars = {};

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
function getSystemInfo(mockSystem?: MockSystem): {
  platform: string;
  release: string;
  arch: string;
  cpus: string;
  memory: string;
  hostname: string;
  username: string;
  homedir: string;
  tmpdir: string;
} {
  const platformFn = mockSystem?.platform || os.platform;
  const releaseFn = mockSystem?.release || os.release;
  const archFn = mockSystem?.arch || os.arch;
  const cpusFn = mockSystem?.cpus || os.cpus;
  const totalmemFn = mockSystem?.totalmem || os.totalmem;
  const hostnameFn = mockSystem?.hostname || os.hostname;
  const userInfoFn = mockSystem?.userInfo || os.userInfo;
  const homedirFn = mockSystem?.homedir || os.homedir;
  const tmpdirFn = mockSystem?.tmpdir || os.tmpdir;

  return {
    platform: platformFn(),
    release: releaseFn(),
    arch: archFn(),
    cpus: `${cpusFn().length} x ${cpusFn()[0]?.model || 'Unknown'}`,
    memory: `${Math.round(totalmemFn() / (1024 * 1024 * 1024))} GB`,
    hostname: hostnameFn(),
    username: userInfoFn().username,
    homedir: homedirFn(),
    tmpdir: tmpdirFn(),
  };
}

/**
 * Get Node.js information
 */
function getNodeInfo(): {
  version: string;
  execPath: string;
  pid: string;
  ppid: string;
  platform: string;
  arch: string;
  cwd: string;
  argv: string;
} {
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
 * Get information about loaded plugins and their directories
 */
async function getPluginSystemInfo(mockUtilities?: MockUtilities): Promise<
  | {
      totalPlugins: number;
      pluginDirectories: number;
      pluginsByDirectory: Record<string, string[]>;
      systemMode: string;
    }
  | { error: string; systemMode: string }
> {
  const loadPluginsFn = mockUtilities?.loadPlugins ?? loadPlugins;

  try {
    const plugins = await loadPluginsFn();

    // Group plugins by directory
    const pluginsByDirectory: Record<string, string[]> = {};
    let totalPlugins = 0;

    for (const plugin of plugins.values()) {
      totalPlugins++;
      const pluginPath = plugin.pluginPath || 'unknown';
      const directory = pluginPath.split('/').slice(-2, -1)[0] || 'unknown';

      if (!pluginsByDirectory[directory]) {
        pluginsByDirectory[directory] = [];
      }
      pluginsByDirectory[directory].push(plugin.name);
    }

    return {
      totalPlugins,
      pluginDirectories: Object.keys(pluginsByDirectory).length,
      pluginsByDirectory,
      systemMode: 'plugin-based',
    };
  } catch (error) {
    return {
      error: `Failed to load plugins: ${error instanceof Error ? error.message : 'Unknown error'}`,
      systemMode: 'error',
    };
  }
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
 */
export async function diagnosticLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
  mockUtilities?: MockUtilities,
): Promise<ToolResponse> {
  // Create mock system that uses the provided executor
  const mockSystem: MockSystem = {
    executor,
    platform: os.platform,
    release: os.release,
    arch: os.arch,
    cpus: os.cpus,
    totalmem: os.totalmem,
    hostname: os.hostname,
    userInfo: os.userInfo,
    homedir: os.homedir,
    tmpdir: os.tmpdir,
  };
  log('info', `${LOG_PREFIX}: Running diagnostic tool`);

  // Check for required binaries
  const requiredBinaries = ['axe', 'xcodemake', 'mise'];

  const binaryStatus: Record<string, { available: boolean; version?: string }> = {};

  for (const binary of requiredBinaries) {
    binaryStatus[binary] = await checkBinaryAvailability(binary, mockSystem);
  }

  // Get Xcode information
  const xcodeInfo = await getXcodeInfo(mockSystem);

  // Get environment variables
  const envVars = getEnvironmentVariables();

  // Get system information
  const systemInfo = getSystemInfo(mockSystem);

  // Get Node.js information
  const nodeInfo = getNodeInfo();

  // Check for axe tools availability
  const axeAvailable = mockUtilities?.areAxeToolsAvailable?.() ?? areAxeToolsAvailable();

  // Get plugin system information
  const pluginSystemInfo = await getPluginSystemInfo(mockUtilities);

  // Get individually enabled tools
  const individuallyEnabledTools = getIndividuallyEnabledTools();

  // Check for xcodemake configuration
  const xcodemakeEnabled = mockUtilities?.isXcodemakeEnabled?.() ?? isXcodemakeEnabled();
  const xcodemakeAvailable = await (mockUtilities?.isXcodemakeAvailable?.() ??
    isXcodemakeAvailable());
  const makefileExists = mockUtilities?.doesMakefileExist?.('./') ?? doesMakefileExist('./');

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
      axe: {
        available: axeAvailable,
        uiAutomationSupported: axeAvailable,
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
    pluginSystem: pluginSystemInfo,
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
    `\n### UI Automation (axe)`,
    `- Available: ${diagnosticInfo.features.axe.available ? '✅ Yes' : '❌ No'}`,
    `- UI Automation Supported: ${diagnosticInfo.features.axe.uiAutomationSupported ? '✅ Yes' : '❌ No'}`,

    `\n### Incremental Builds`,
    `- Enabled: ${diagnosticInfo.features.xcodemake.enabled ? '✅ Yes' : '❌ No'}`,
    `- Available: ${diagnosticInfo.features.xcodemake.available ? '✅ Yes' : '❌ No'}`,
    `- Makefile exists: ${diagnosticInfo.features.xcodemake.makefileExists ? '✅ Yes' : '❌ No'}`,

    `\n### Mise Integration`,
    `- Running under mise: ${diagnosticInfo.features.mise.running_under_mise ? '✅ Yes' : '❌ No'}`,
    `- Mise available: ${diagnosticInfo.features.mise.available ? '✅ Yes' : '❌ No'}`,

    `\n### Available Tools`,
    `- Total Plugins: ${diagnosticInfo.pluginSystem.totalPlugins || 0}`,
    `- Plugin Directories: ${diagnosticInfo.pluginSystem.pluginDirectories || 0}`,
    ...(diagnosticInfo.pluginSystem.pluginsByDirectory
      ? Object.entries(diagnosticInfo.pluginSystem.pluginsByDirectory).map(
          ([dir, tools]) => `- ${dir}: ${Array.isArray(tools) ? tools.length : 0} tools`,
        )
      : ['- No plugin directory information available']),

    `\n## Tool Availability Summary`,
    `- Build Tools: ${!('error' in diagnosticInfo.xcode) ? '\u2705 Available' : '\u274c Not available'}`,
    `- UI Automation Tools: ${diagnosticInfo.features.axe.uiAutomationSupported ? '\u2705 Available' : '\u274c Not available'}`,
    `- Incremental Build Support: ${diagnosticInfo.features.xcodemake.available && diagnosticInfo.features.xcodemake.enabled ? '\u2705 Available & Enabled' : diagnosticInfo.features.xcodemake.available ? '\u2705 Available but Disabled' : '\u274c Not available'}`,

    `\n## Sentry`,
    `- Sentry enabled: ${diagnosticInfo.environmentVariables.SENTRY_DISABLED !== 'true' ? '✅ Yes' : '❌ No'}`,

    `\n## Troubleshooting Tips`,
    `- If UI automation tools are not available, install axe: \`brew tap cameroncooke/axe && brew install axe\``,
    `- If incremental build support is not available, you can download the tool from https://github.com/cameroncooke/xcodemake. Make sure it's executable and available in your PATH`,
    `- To enable xcodemake, set environment variable: \`export INCREMENTAL_BUILDS_ENABLED=1\``,
    `- For mise integration, follow instructions in the README.md file`,
    `- Use the 'discover_tools' tool to find relevant tools for your task`,
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

export default {
  name: 'diagnostic',
  description:
    'Provides comprehensive information about the MCP server environment, available dependencies, and configuration status.',
  schema: {
    enabled: z.boolean().optional().describe('Optional: dummy parameter to satisfy MCP protocol'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return diagnosticLogic(args, getDefaultCommandExecutor());
  },
};
