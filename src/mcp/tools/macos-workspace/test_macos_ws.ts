/**
 * macOS Workspace Plugin: Test macOS Workspace
 *
 * Runs tests for a macOS workspace using xcodebuild test and parses xcresult output.
 */

import { z } from 'zod';
import {
  log,
  CommandExecutor,
  getDefaultCommandExecutor,
  executeXcodeBuildCommand,
  createTextResponse,
} from '../../../utils/index.js';
import { promisify } from 'util';
import { exec } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';

type TestMacosWsParams = {
  workspacePath: string;
  scheme: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  preferXcodebuild?: boolean;
};

/**
 * Type definition for test summary structure from xcresulttool
 * @typedef {Object} TestSummary
 * @property {string} [title]
 * @property {string} [result]
 * @property {number} [totalTestCount]
 * @property {number} [passedTests]
 * @property {number} [failedTests]
 * @property {number} [skippedTests]
 * @property {number} [expectedFailures]
 * @property {string} [environmentDescription]
 * @property {Array<Object>} [devicesAndConfigurations]
 * @property {Array<Object>} [testFailures]
 * @property {Array<Object>} [topInsights]
 */

// Parse xcresult bundle using xcrun xcresulttool
async function parseXcresultBundle(
  resultBundlePath: string,
  utilDeps?: {
    promisify: <T extends (...args: unknown[]) => unknown>(
      fn: T,
    ) => T extends (...args: infer Args) => infer Return
      ? (...args: Args) => Promise<Return>
      : never;
  },
): Promise<string> {
  try {
    const promisifyFn = utilDeps?.promisify ?? promisify;
    const execAsync = (promisifyFn as typeof promisify)(exec);
    const { stdout } = await execAsync(
      `xcrun xcresulttool get test-results summary --path "${resultBundlePath}"`,
      {},
    );

    // Parse JSON response and format as human-readable
    let summary: Record<string, unknown>;
    try {
      summary = JSON.parse(stdout as unknown as string) as Record<string, unknown>;
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response: ${parseError}`);
    }
    return formatTestSummary(summary);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error parsing xcresult bundle: ${errorMessage}`);
    throw error;
  }
}

// Format test summary JSON into human-readable text
function formatTestSummary(summary: Record<string, unknown>): string {
  const lines = [];

  lines.push(`Test Summary: ${summary.title ?? 'Unknown'}`);
  lines.push(`Overall Result: ${summary.result ?? 'Unknown'}`);
  lines.push('');

  lines.push('Test Counts:');
  lines.push(`  Total: ${summary.totalTestCount ?? 0}`);
  lines.push(`  Passed: ${summary.passedTests ?? 0}`);
  lines.push(`  Failed: ${summary.failedTests ?? 0}`);
  lines.push(`  Skipped: ${summary.skippedTests ?? 0}`);
  lines.push(`  Expected Failures: ${summary.expectedFailures ?? 0}`);
  lines.push('');

  if (summary.environmentDescription) {
    lines.push(`Environment: ${summary.environmentDescription}`);
    lines.push('');
  }

  if (
    summary.devicesAndConfigurations &&
    Array.isArray(summary.devicesAndConfigurations) &&
    summary.devicesAndConfigurations.length > 0
  ) {
    const deviceConfig = summary.devicesAndConfigurations[0] as Record<string, unknown>;
    const device = deviceConfig?.device as Record<string, unknown> | undefined;
    if (device && typeof device === 'object') {
      const deviceName = typeof device.deviceName === 'string' ? device.deviceName : 'Unknown';
      const platform = typeof device.platform === 'string' ? device.platform : 'Unknown';
      const osVersion = typeof device.osVersion === 'string' ? device.osVersion : 'Unknown';
      lines.push(`Device: ${deviceName} (${platform} ${osVersion})`);
      lines.push('');
    }
  }

  if (
    summary.testFailures &&
    Array.isArray(summary.testFailures) &&
    summary.testFailures.length > 0
  ) {
    lines.push('Test Failures:');
    summary.testFailures.forEach((failure, index) => {
      const failureObj = failure as Record<string, unknown>;
      const testName =
        typeof failureObj.testName === 'string' ? failureObj.testName : 'Unknown Test';
      const targetName =
        typeof failureObj.targetName === 'string' ? failureObj.targetName : 'Unknown Target';
      lines.push(`  ${index + 1}. ${testName} (${targetName})`);

      const failureText = failureObj.failureText;
      if (typeof failureText === 'string') {
        lines.push(`     ${failureText}`);
      }
    });
    lines.push('');
  }

  if (summary.topInsights && Array.isArray(summary.topInsights) && summary.topInsights.length > 0) {
    lines.push('Insights:');
    summary.topInsights.forEach((insight, index) => {
      const insightObj = insight as Record<string, unknown>;
      const impact = typeof insightObj.impact === 'string' ? insightObj.impact : 'Unknown';
      const text = typeof insightObj.text === 'string' ? insightObj.text : 'No description';
      lines.push(`  ${index + 1}. [${impact}] ${text}`);
    });
  }

  return lines.join('\n');
}

// Internal logic for running tests with platform-specific handling
export async function test_macos_wsLogic(
  params: TestMacosWsParams,
  executor: CommandExecutor,
  tempDirDeps?: {
    mkdtemp: (prefix: string) => Promise<string>;
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => Promise<void>;
    join: (...paths: string[]) => string;
    tmpdir: () => string;
  },
  utilDeps?: {
    promisify: <T extends (...args: unknown[]) => unknown>(
      fn: T,
    ) => T extends (...args: infer Args) => infer Return
      ? (...args: Args) => Promise<Return>
      : never;
  },
  fileSystemDeps?: {
    stat: (path: string) => Promise<{ isDirectory: () => boolean }>;
  },
): Promise<ToolResponse> {
  const paramsRecord = params as Record<string, unknown>;
  // Process parameters with defaults
  const processedParams = {
    ...paramsRecord,
    configuration: params.configuration ?? 'Debug',
    preferXcodebuild: params.preferXcodebuild ?? false,
    platform: XcodePlatform.macOS,
    workspacePath: params.workspacePath,
    scheme: params.scheme,
    derivedDataPath: params.derivedDataPath,
    extraArgs: params.extraArgs,
  };

  log(
    'info',
    `Starting test run for scheme ${processedParams.scheme} on platform ${processedParams.platform} (internal)`,
  );

  try {
    // Create temporary directory for xcresult bundle
    const mkdtempFn = tempDirDeps?.mkdtemp ?? mkdtemp;
    const joinFn = tempDirDeps?.join ?? join;
    const tmpdirFn = tempDirDeps?.tmpdir ?? tmpdir;

    const tempDir = await mkdtempFn(joinFn(tmpdirFn(), 'xcodebuild-test-'));
    const resultBundlePath = joinFn(tempDir, 'TestResults.xcresult');

    // Add resultBundlePath to extraArgs
    const extraArgs = [...(processedParams.extraArgs ?? []), `-resultBundlePath`, resultBundlePath];

    // Run the test command
    const testResult = await executeXcodeBuildCommand(
      {
        workspacePath: processedParams.workspacePath,
        scheme: processedParams.scheme,
        configuration: processedParams.configuration,
        derivedDataPath: processedParams.derivedDataPath,
        extraArgs,
      },
      {
        platform: XcodePlatform.macOS,
        logPrefix: 'Test Run',
      },
      processedParams.preferXcodebuild,
      'test',
      executor,
    );

    // Parse xcresult bundle if it exists, regardless of whether tests passed or failed
    // Test failures are expected and should not prevent xcresult parsing
    try {
      log('info', `Attempting to parse xcresult bundle at: ${resultBundlePath}`);

      // Check if the file exists
      try {
        const statFn = fileSystemDeps?.stat ?? (await import('fs/promises')).stat;
        await statFn(resultBundlePath);
        log('info', `xcresult bundle exists at: ${resultBundlePath}`);
      } catch {
        log('warn', `xcresult bundle does not exist at: ${resultBundlePath}`);
        throw new Error(`xcresult bundle not found at ${resultBundlePath}`);
      }

      const testSummary = await parseXcresultBundle(resultBundlePath, utilDeps);
      log('info', 'Successfully parsed xcresult bundle');

      // Clean up temporary directory
      const rmFn = tempDirDeps?.rm ?? rm;
      await rmFn(tempDir, { recursive: true, force: true });

      // Return combined result - preserve isError from testResult (test failures should be marked as errors)
      return {
        content: [
          ...(testResult.content ?? []),
          {
            type: 'text',
            text: '\nTest Results Summary:\n' + testSummary,
          },
        ],
        isError: testResult.isError,
      };
    } catch (parseError) {
      // If parsing fails, return original test result
      log('warn', `Failed to parse xcresult bundle: ${parseError}`);

      // Clean up temporary directory even if parsing fails
      try {
        const rmFn = tempDirDeps?.rm ?? rm;
        await rmFn(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        log('warn', `Failed to clean up temporary directory: ${cleanupError}`);
      }

      return testResult;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during test run: ${errorMessage}`);
    return createTextResponse(`Error during test run: ${errorMessage}`, true);
  }
}

export default {
  name: 'test_macos_ws',
  description: 'Runs tests for a macOS workspace using xcodebuild test and parses xcresult output.',
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    preferXcodebuild: z
      .boolean()
      .optional()
      .describe(
        'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
      ),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return test_macos_wsLogic(args as TestMacosWsParams, getDefaultCommandExecutor());
  },
};
