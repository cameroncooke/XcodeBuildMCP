/**
 * Doctor Plugin: Doctor Tool
 *
 * Provides comprehensive information about the MCP server environment.
 */

import * as z from 'zod';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { version } from '../../../utils/version/index.ts';
import { ToolResponse } from '../../../types/common.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getConfig } from '../../../utils/config-store.ts';
import { detectXcodeRuntime } from '../../../utils/xcode-process.ts';
import { type DoctorDependencies, createDoctorDependencies } from './lib/doctor.deps.ts';
import { getServer } from '../../../server/server-state.ts';
import { getXcodeToolsBridgeManager } from '../../../integrations/xcode-tools-bridge/index.ts';

// Constants
const LOG_PREFIX = '[Doctor]';

// Define schema as ZodObject
const doctorSchema = z.object({
  enabled: z.boolean().optional(),
});

// Use z.infer for type safety
type DoctorParams = z.infer<typeof doctorSchema>;

async function checkLldbDapAvailability(executor: CommandExecutor): Promise<boolean> {
  try {
    const result = await executor(['xcrun', '--find', 'lldb-dap'], 'Check lldb-dap');
    return result.success && result.output.trim().length > 0;
  } catch {
    return false;
  }
}

type XcodeToolsBridgeDoctorInfo =
  | {
      available: true;
      workflowEnabled: boolean;
      bridgePath: string | null;
      xcodeRunning: boolean | null;
      connected: boolean;
      bridgePid: number | null;
      proxiedToolCount: number;
      lastError: string | null;
    }
  | { available: false; reason: string };

async function getXcodeToolsBridgeDoctorInfo(
  executor: CommandExecutor,
): Promise<XcodeToolsBridgeDoctorInfo> {
  try {
    const server = getServer();
    if (server) {
      const manager = getXcodeToolsBridgeManager(server);
      if (manager) {
        const status = await manager.getStatus();
        return {
          available: true,
          workflowEnabled: status.workflowEnabled,
          bridgePath: status.bridgePath,
          xcodeRunning: status.xcodeRunning,
          connected: status.connected,
          bridgePid: status.bridgePid,
          proxiedToolCount: status.proxiedToolCount,
          lastError: status.lastError,
        };
      }
    }

    const config = getConfig();
    const bridgePathResult = await executor(['xcrun', '--find', 'mcpbridge'], 'Check mcpbridge');
    const bridgePath = bridgePathResult.success ? bridgePathResult.output.trim() : '';
    return {
      available: true,
      workflowEnabled: config.enabledWorkflows.includes('xcode-ide'),
      bridgePath: bridgePath.length > 0 ? bridgePath : null,
      xcodeRunning: null,
      connected: false,
      bridgePid: null,
      proxiedToolCount: 0,
      lastError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { available: false, reason: message };
  }
}

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
  const xcodeRuntime = await detectXcodeRuntime(deps.commandExecutor);
  const axeAvailable = deps.features.areAxeToolsAvailable();
  const pluginSystemInfo = await deps.plugins.getPluginSystemInfo();
  const runtimeInfo = await deps.runtime.getRuntimeToolInfo();
  const runtimeRegistration = runtimeInfo ?? {
    enabledWorkflows: [],
    registeredToolCount: 0,
  };
  const runtimeNote = runtimeInfo ? null : 'Runtime registry unavailable.';
  const xcodemakeEnabled = deps.features.isXcodemakeEnabled();
  const xcodemakeAvailable = await deps.features.isXcodemakeAvailable();
  const makefileExists = deps.features.doesMakefileExist('./');
  const lldbDapAvailable = await checkLldbDapAvailability(deps.commandExecutor);
  const selectedDebuggerBackend = getConfig().debuggerBackend;
  const dapSelected = selectedDebuggerBackend === 'dap';
  const xcodeToolsBridge = await getXcodeToolsBridgeDoctorInfo(deps.commandExecutor);

  const doctorInfo = {
    serverVersion: version,
    timestamp: new Date().toISOString(),
    system: systemInfo,
    node: nodeInfo,
    processTree: xcodeRuntime.processTree,
    processTreeError: xcodeRuntime.error,
    runningUnderXcode: xcodeRuntime.runningUnderXcode,
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
      debugger: {
        dap: {
          available: lldbDapAvailable,
          selected: selectedDebuggerBackend,
        },
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

    `\n## Process Tree`,
    `- Running under Xcode: ${doctorInfo.runningUnderXcode ? '✅ Yes' : '❌ No'}`,
    ...(doctorInfo.processTree.length > 0
      ? doctorInfo.processTree.map(
          (entry) =>
            `- ${entry.pid} (ppid ${entry.ppid}): ${entry.name}${
              entry.command ? ` — ${entry.command}` : ''
            }`,
        )
      : ['- (unavailable)']),
    ...(doctorInfo.processTreeError ? [`- Error: ${doctorInfo.processTreeError}`] : []),

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

    `\n### Debugger Backend (DAP)`,
    `- lldb-dap available: ${doctorInfo.features.debugger.dap.available ? '✅ Yes' : '❌ No'}`,
    `- Selected backend: ${doctorInfo.features.debugger.dap.selected}`,
    ...(dapSelected && !lldbDapAvailable
      ? [
          `- Warning: DAP backend selected but lldb-dap not available. Set XCODEBUILDMCP_DEBUGGER_BACKEND=lldb-cli to use the CLI backend.`,
        ]
      : []),

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
    `- Enabled Workflows: ${runtimeRegistration.enabledWorkflows.length}`,
    `- Registered Tools: ${runtimeRegistration.registeredToolCount}`,
    ...(runtimeNote ? [`- Note: ${runtimeNote}`] : []),
    ...(runtimeRegistration.enabledWorkflows.length > 0
      ? [`- Workflows: ${runtimeRegistration.enabledWorkflows.join(', ')}`]
      : []),

    `\n### Xcode IDE Bridge (mcpbridge)`,
    ...(xcodeToolsBridge.available
      ? [
          `- Workflow enabled: ${xcodeToolsBridge.workflowEnabled ? '✅ Yes' : '❌ No'}`,
          `- mcpbridge path: ${xcodeToolsBridge.bridgePath ?? '(not found)'}`,
          `- Xcode running: ${xcodeToolsBridge.xcodeRunning ?? '(unknown)'}`,
          `- Connected: ${xcodeToolsBridge.connected ? '✅ Yes' : '❌ No'}`,
          `- Bridge PID: ${xcodeToolsBridge.bridgePid ?? '(none)'}`,
          `- Proxied tools: ${xcodeToolsBridge.proxiedToolCount}`,
          `- Last error: ${xcodeToolsBridge.lastError ?? '(none)'}`,
          `- Note: Bridge debug tools (status/sync/disconnect) are only registered when debug: true`,
        ]
      : [`- Unavailable: ${xcodeToolsBridge.reason}`]),

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
  description: 'MCP environment info.',
  schema: doctorSchema.shape, // MCP SDK compatibility
  annotations: {
    title: 'Doctor',
    readOnlyHint: true,
  },
  handler: createTypedTool(doctorSchema, doctorMcpHandler, getDefaultCommandExecutor),
};

export type { DoctorDependencies } from './lib/doctor.deps.ts';
