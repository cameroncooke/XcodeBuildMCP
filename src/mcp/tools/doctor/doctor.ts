/**
 * Doctor Plugin: Doctor Tool
 *
 * Provides comprehensive information about the MCP server environment.
 */

import { z } from 'zod';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { version } from '../../../utils/version/index.ts';
import { ToolResponse } from '../../../types/common.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { type DoctorDependencies, createDoctorDependencies } from './lib/doctor.deps.ts';

// Constants
const LOG_PREFIX = '[Doctor]';

// Define schema as ZodObject
const doctorSchema = z.object({
  enabled: z.boolean().optional().describe('Optional: dummy parameter to satisfy MCP protocol'),
});

// Use z.infer for type safety
type DoctorParams = z.infer<typeof doctorSchema>;

/**
 * Run the doctor tool and return the results
 */
export async function runDoctor(
  params: DoctorParams,
  deps: DoctorDependencies,
  showAsciiLogo = false,
): Promise<ToolResponse> {
  const prevSilence = process.env.XCODEBUILDMCP_SILENCE_LOGS;
  process.env.XCODEBUILDMCP_SILENCE_LOGS = 'true';
  log('info', `${LOG_PREFIX}: Running doctor tool`);

  const requiredBinaries = ['axe', 'xcodemake', 'mise'];
  const binaryStatus: Record<string, { available: boolean; version?: string }> = {};
  for (const binary of requiredBinaries) {
    binaryStatus[binary] = await deps.binaryChecker.checkBinaryAvailability(binary);
  }

  const xcodeInfo = await deps.xcode.getXcodeInfo();
  const envVars = deps.env.getEnvironmentVariables();
  const systemInfo = deps.env.getSystemInfo();
  const nodeInfo = deps.env.getNodeInfo();
  const axeAvailable = deps.features.areAxeToolsAvailable();
  const pluginSystemInfo = await deps.plugins.getPluginSystemInfo();
  const runtimeInfo = await deps.runtime.getRuntimeToolInfo();
  const xcodemakeEnabled = deps.features.isXcodemakeEnabled();
  const xcodemakeAvailable = await deps.features.isXcodemakeAvailable();
  const makefileExists = deps.features.doesMakefileExist('./');

  const doctorInfo = {
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
  } as const;

  // Custom ASCII banner (multiline)
  const asciiLogo = `
██╗  ██╗ ██████╗ ██████╗ ██████╗ ███████╗██████╗ ██╗   ██╗██╗██╗     ██████╗ ███╗   ███╗ ██████╗██████╗
╚██╗██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗██║   ██║██║██║     ██╔══██╗████╗ ████║██╔════╝██╔══██╗
 ╚███╔╝ ██║     ██║   ██║██║  ██║█████╗  ██████╔╝██║   ██║██║██║     ██║  ██║██╔████╔██║██║     ██████╔╝
 ██╔██╗ ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗██║   ██║██║██║     ██║  ██║██║╚██╔╝██║██║     ██╔═══╝
██╔╝ ██╗╚██████╗╚██████╔╝██████╔╝███████╗██████╔╝╚██████╔╝██║███████╗██████╔╝██║ ╚═╝ ██║╚██████╗██║
╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ ╚═╝     ╚═╝ ╚═════╝╚═╝

██████╗  ██████╗  ██████╗████████╗ ██████╗ ██████╗
██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗
██║  ██║██║   ██║██║        ██║   ██║   ██║██████╔╝
██║  ██║██║   ██║██║        ██║   ██║   ██║██╔══██╗
██████╔╝╚██████╔╝╚██████╗   ██║   ╚██████╔╝██║  ██║
╚═════╝  ╚═════╝  ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
`;

  const RESET = '\x1b[0m';
  // 256-color: orangey-pink foreground and lighter shade for outlines
  const FOREGROUND = '\x1b[38;5;209m';
  const SHADOW = '\x1b[38;5;217m';

  function colorizeAsciiArt(ascii: string): string {
    const lines = ascii.split('\n');
    const coloredLines: string[] = [];
    const shadowChars = new Set([
      '╔',
      '╗',
      '╝',
      '╚',
      '═',
      '║',
      '╦',
      '╩',
      '╠',
      '╣',
      '╬',
      '┌',
      '┐',
      '└',
      '┘',
      '│',
      '─',
    ]);
    for (const line of lines) {
      let colored = '';
      for (const ch of line) {
        if (ch === '█') {
          colored += `${FOREGROUND}${ch}${RESET}`;
        } else if (shadowChars.has(ch)) {
          colored += `${SHADOW}${ch}${RESET}`;
        } else {
          colored += ch;
        }
      }
      coloredLines.push(colored + RESET);
    }
    return coloredLines.join('\n');
  }

  const outputLines = [];

  // Only show ASCII logo when explicitly requested (CLI usage)
  if (showAsciiLogo) {
    outputLines.push(colorizeAsciiArt(asciiLogo));
  }

  outputLines.push(
    'XcodeBuildMCP Doctor',
    `\nGenerated: ${doctorInfo.timestamp}`,
    `Server Version: ${doctorInfo.serverVersion}`,
  );

  const formattedOutput = [
    ...outputLines,

    `\n## System Information`,
    ...Object.entries(doctorInfo.system).map(([key, value]) => `- ${key}: ${value}`),

    `\n## Node.js Information`,
    ...Object.entries(doctorInfo.node).map(([key, value]) => `- ${key}: ${value}`),

    `\n## Xcode Information`,
    ...('error' in doctorInfo.xcode
      ? [`- Error: ${doctorInfo.xcode.error}`]
      : Object.entries(doctorInfo.xcode).map(([key, value]) => `- ${key}: ${value}`)),

    `\n## Dependencies`,
    ...Object.entries(doctorInfo.dependencies).map(
      ([binary, status]) =>
        `- ${binary}: ${status.available ? `✅ ${status.version ?? 'Available'}` : '❌ Not found'}`,
    ),

    `\n## Environment Variables`,
    ...Object.entries(doctorInfo.environmentVariables)
      .filter(([key]) => key !== 'PATH' && key !== 'PYTHONPATH') // These are too long, handle separately
      .map(([key, value]) => `- ${key}: ${value ?? '(not set)'}`),

    `\n### PATH`,
    `\`\`\``,
    `${doctorInfo.environmentVariables.PATH ?? '(not set)'}`.split(':').join('\n'),
    `\`\`\``,

    `\n## Feature Status`,
    `\n### UI Automation (axe)`,
    `- Available: ${doctorInfo.features.axe.available ? '✅ Yes' : '❌ No'}`,
    `- UI Automation Supported: ${doctorInfo.features.axe.uiAutomationSupported ? '✅ Yes' : '❌ No'}`,

    `\n### Incremental Builds`,
    `- Enabled: ${doctorInfo.features.xcodemake.enabled ? '✅ Yes' : '❌ No'}`,
    `- Available: ${doctorInfo.features.xcodemake.available ? '✅ Yes' : '❌ No'}`,
    `- Makefile exists: ${doctorInfo.features.xcodemake.makefileExists ? '✅ Yes' : '❌ No'}`,

    `\n### Mise Integration`,
    `- Running under mise: ${doctorInfo.features.mise.running_under_mise ? '✅ Yes' : '❌ No'}`,
    `- Mise available: ${doctorInfo.features.mise.available ? '✅ Yes' : '❌ No'}`,

    `\n### Available Tools`,
    `- Total Plugins: ${'totalPlugins' in doctorInfo.pluginSystem ? doctorInfo.pluginSystem.totalPlugins : 0}`,
    `- Plugin Directories: ${'pluginDirectories' in doctorInfo.pluginSystem ? doctorInfo.pluginSystem.pluginDirectories : 0}`,
    ...('pluginsByDirectory' in doctorInfo.pluginSystem &&
    doctorInfo.pluginSystem.pluginDirectories > 0
      ? Object.entries(doctorInfo.pluginSystem.pluginsByDirectory).map(
          ([dir, tools]) => `- ${dir}: ${Array.isArray(tools) ? tools.length : 0} tools`,
        )
      : ['- Plugin directory grouping unavailable in this build']),

    `\n### Runtime Tool Registration`,
    `- Mode: ${runtimeInfo.mode}`,
    `- Enabled Workflows: ${runtimeInfo.enabledWorkflows.length}`,
    `- Registered Tools: ${runtimeInfo.totalRegistered}`,
    ...(runtimeInfo.mode === 'static' ? [`- Note: ${runtimeInfo.note}`] : []),
    ...(runtimeInfo.enabledWorkflows.length > 0
      ? [`- Workflows: ${runtimeInfo.enabledWorkflows.join(', ')}`]
      : []),

    `\n## Tool Availability Summary`,
    `- Build Tools: ${!('error' in doctorInfo.xcode) ? '\u2705 Available' : '\u274c Not available'}`,
    `- UI Automation Tools: ${doctorInfo.features.axe.uiAutomationSupported ? '\u2705 Available' : '\u274c Not available'}`,
    `- Incremental Build Support: ${doctorInfo.features.xcodemake.available && doctorInfo.features.xcodemake.enabled ? '\u2705 Available & Enabled' : doctorInfo.features.xcodemake.available ? '\u2705 Available but Disabled' : '\u274c Not available'}`,

    `\n## Sentry`,
    `- Sentry enabled: ${doctorInfo.environmentVariables.SENTRY_DISABLED !== 'true' ? '✅ Yes' : '❌ No'}`,

    `\n## Troubleshooting Tips`,
    `- If UI automation tools are not available, install axe: \`brew tap cameroncooke/axe && brew install axe\``,
    `- If incremental build support is not available, you can download the tool from https://github.com/cameroncooke/xcodemake. Make sure it's executable and available in your PATH`,
    `- To enable xcodemake, set environment variable: \`export INCREMENTAL_BUILDS_ENABLED=1\``,
    `- For mise integration, follow instructions in the README.md file`,
  ].join('\n');

  const result: ToolResponse = {
    content: [
      {
        type: 'text',
        text: formattedOutput,
      },
    ],
  };
  // Restore previous silence flag
  if (prevSilence === undefined) {
    delete process.env.XCODEBUILDMCP_SILENCE_LOGS;
  } else {
    process.env.XCODEBUILDMCP_SILENCE_LOGS = prevSilence;
  }
  return result;
}

export async function doctorLogic(
  params: DoctorParams,
  executor: CommandExecutor,
  showAsciiLogo = false,
): Promise<ToolResponse> {
  const deps = createDoctorDependencies(executor);
  return runDoctor(params, deps, showAsciiLogo);
}

// MCP wrapper that ensures ASCII logo is never shown for MCP server calls
async function doctorMcpHandler(
  params: DoctorParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  return doctorLogic(params, executor, false); // Always false for MCP
}

export default {
  name: 'doctor',
  description:
    'Provides comprehensive information about the MCP server environment, available dependencies, and configuration status.',
  schema: doctorSchema.shape, // MCP SDK compatibility
  annotations: {
    title: 'Doctor',
    readOnlyHint: true,
  },
  handler: createTypedTool(doctorSchema, doctorMcpHandler, getDefaultCommandExecutor),
};

export type { DoctorDependencies } from './lib/doctor.deps.ts';
