/**
 * Diagnostics Plugin: Diagnostic Tool
 * 
 * Provides comprehensive information about the MCP server environment.
 */

import { z } from 'zod';
import { log } from '../../src/utils/logger.js';
import { execSync } from 'child_process';
import { version } from '../../src/version.js';
import { areAxeToolsAvailable } from '../../src/utils/axe-helpers.js';
import {
  isXcodemakeEnabled,
  isXcodemakeAvailable,
  doesMakefileExist,
} from '../../src/utils/xcodemake.js';
import * as os from 'os';
import { loadPlugins } from '../../src/core/plugin-registry.js';

// Constants
const LOG_PREFIX = '[Diagnostic]';

/**
 * Check if a binary is available in the PATH and attempt to get its version
 */
function checkBinaryAvailability(binary) {
  // First check if the binary exists at all
  try {
    execSync(`which ${binary}`, { stdio: 'ignore' });
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
function getXcodeInfo() {
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
function getEnvironmentVariables() {
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
function getSystemInfo() {
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
function getNodeInfo() {
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
async function getPluginSystemInfo() {
  try {
    const plugins = await loadPlugins();

    // Group plugins by directory
    const pluginsByDirectory = {};
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
function getIndividuallyEnabledTools() {
  return Object.keys(process.env)
    .filter((key) => key.startsWith('XCODEBUILDMCP_TOOL_') && process.env[key] === 'true')
    .map((key) => key.replace('XCODEBUILDMCP_TOOL_', ''));
}

/**
 * Run the diagnostic tool and return the results
 */
async function runDiagnosticTool() {
  log('info', `${LOG_PREFIX}: Running diagnostic tool`);

  // Check for required binaries
  const requiredBinaries = ['axe', 'xcodemake', 'mise'];

  const binaryStatus = {};

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

  // Check for axe tools availability
  const axeAvailable = areAxeToolsAvailable();

  // Get plugin system information
  const pluginSystemInfo = await getPluginSystemInfo();

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
  description: 'Provides comprehensive information about the MCP server environment, available dependencies, and configuration status.',
  schema: {
    enabled: z.boolean().optional().describe('Optional: dummy parameter to satisfy MCP protocol'),
  },
  async handler() {
    return runDiagnosticTool();
  },
};