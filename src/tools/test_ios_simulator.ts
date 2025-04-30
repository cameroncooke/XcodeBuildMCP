/**
 * iOS Simulator Test Tools - Tools for running tests on iOS applications in simulators
 *
 * This module provides specialized tools for running tests on iOS applications in simulators
 * using xcodebuild test. It supports both workspace and project-based testing with simulator targeting
 * by name or UUID, and includes test failure parsing.
 *
 * Responsibilities:
 * - Running tests on iOS applications in simulators from project files and workspaces
 * - Supporting simulator targeting by name or UUID
 * - Parsing and summarizing test failure results
 * - Handling test configuration and derived data paths
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { XcodePlatform } from '../utils/xcode.js';
import { executeXcodeBuild } from '../utils/build-utils.js';
import { log } from '../utils/logger.js';
import { ToolResponse, ToolResponseContent } from '../types/common.js';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  configurationSchema,
  derivedDataPathSchema,
  extraArgsSchema,
  simulatorNameSchema,
  simulatorIdSchema,
  useLatestOSSchema,
} from './common.js';

// --- internal logic ---
async function _handleIOSSimulatorTestLogic(params: {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  simulatorName?: string;
  simulatorId?: string;
  useLatestOS: boolean;
  derivedDataPath?: string;
  extraArgs?: string[];
}): Promise<ToolResponse> {
  log('info', `Starting iOS Simulator tests for scheme ${params.scheme} (internal)`);

  const buildResult = await executeXcodeBuild(
    {
      ...params,
    },
    {
      platform: XcodePlatform.iOSSimulator,
      simulatorName: params.simulatorName,
      simulatorId: params.simulatorId,
      useLatestOS: params.useLatestOS,
      logPrefix: 'iOS Simulator Test',
    },
    'test',
  );

  if (buildResult.isError) return buildResult;

  // --- Parse failures ---
  const raw = buildResult.rawOutput ?? '';
  const failures = raw
    .split('\n')
    .filter((l) => /Test Case .* failed/.test(l))
    .map((l) => {
      const m = l.match(/Test Case '(.*)' failed \((.*)\)/)!;
      return { testCase: m[1], reason: m[2] };
    });

  const summary = failures.length ? `❌ ${failures.length} test(s) failed` : '✅ All tests passed';

  const content: ToolResponseContent[] = [{ type: 'text', text: summary }];

  // Add failures as formatted text if any exist
  if (failures.length > 0) {
    content.push({
      type: 'text',
      text: `Test failures:\n${failures.map((f) => `- ${f.testCase}: ${f.reason}`).join('\n')}`,
    });
  }

  return { content };
}

/**
 * Register all iOS Simulator test tools with the MCP server
 */
export function registerIOSSimulatorTestTools(server: McpServer): void {
  // Common default values
  const defaults = {
    configuration: 'Debug',
    useLatestOS: true,
  };

  // 1) workspace + name
  registerTool(
    server,
    'ios_simulator_test_by_name_workspace',
    'Run tests for an iOS app on a simulator specified by name using a workspace',
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    (params: any) =>
      _handleIOSSimulatorTestLogic({
        ...params,
        configuration: params.configuration || defaults.configuration,
        useLatestOS: params.useLatestOS ?? defaults.useLatestOS,
      }),
  );

  // 2) project + name
  registerTool(
    server,
    'ios_simulator_test_by_name_project',
    'Run tests for an iOS app on a simulator specified by name using a project file',
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    (params: any) =>
      _handleIOSSimulatorTestLogic({
        ...params,
        configuration: params.configuration || defaults.configuration,
        useLatestOS: params.useLatestOS ?? defaults.useLatestOS,
      }),
  );

  // 3) workspace + id
  registerTool(
    server,
    'ios_simulator_test_by_id_workspace',
    'Run tests for an iOS app on a simulator specified by ID using a workspace',
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    (params: any) =>
      _handleIOSSimulatorTestLogic({
        ...params,
        configuration: params.configuration || defaults.configuration,
        useLatestOS: params.useLatestOS ?? defaults.useLatestOS,
      }),
  );

  // 4) project + id
  registerTool(
    server,
    'ios_simulator_test_by_id_project',
    'Run tests for an iOS app on a simulator specified by ID using a project file',
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
    },
    (params: any) =>
      _handleIOSSimulatorTestLogic({
        ...params,
        configuration: params.configuration || defaults.configuration,
        useLatestOS: params.useLatestOS ?? defaults.useLatestOS,
      }),
  );
}
