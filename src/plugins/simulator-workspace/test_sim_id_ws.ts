import { z } from 'zod';
import { promisify } from 'util';
import { exec } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ToolResponse } from '../../types/common.js';
import { log } from '../../utils/index.js';
import { executeXcodeBuildCommand } from '../../utils/index.js';
import { createTextResponse } from '../../utils/index.js';

// Schema definitions
const workspacePathSchema = z.string().describe('Path to the .xcworkspace file (Required)');
const schemeSchema = z.string().describe('The scheme to use (Required)');
const configurationSchema = z
  .string()
  .optional()
  .describe('Build configuration (Debug, Release, etc.)');
const derivedDataPathSchema = z
  .string()
  .optional()
  .describe('Path where build products and other derived data will go');
const extraArgsSchema = z.array(z.string()).optional().describe('Additional xcodebuild arguments');
const simulatorIdSchema = z
  .string()
  .describe('UUID of the simulator to use (obtained from listSimulators) (Required)');
const useLatestOSSchema = z
  .boolean()
  .optional()
  .describe('Whether to use the latest OS version for the named simulator');
const preferXcodebuildSchema = z
  .boolean()
  .optional()
  .describe(
    'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
  );

// XcodePlatform enum
const XcodePlatform = {
  iOS: 'iOS',
  macOS: 'macOS',
  watchOS: 'watchOS',
  tvOS: 'tvOS',
  visionOS: 'visionOS',
  iOSSimulator: 'iOS Simulator',
  watchOSSimulator: 'watchOS Simulator',
  tvOSSimulator: 'tvOS Simulator',
  visionOSSimulator: 'visionOS Simulator',
};

// Test summary parsing functions
async function parseXcresultBundle(resultBundlePath: string): Promise<string> {
  try {
    const execAsync = promisify(exec);
    const { stdout } = await execAsync(
      `xcrun xcresulttool get test-results summary --path "${resultBundlePath}"`,
    );

    // Parse JSON response and format as human-readable
    const summary = JSON.parse(stdout);
    return formatTestSummary(summary);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error parsing xcresult bundle: ${errorMessage}`);
    throw error;
  }
}

function formatTestSummary(summary: any): string {
  const lines = [];

  lines.push(`Test Summary: ${summary.title || 'Unknown'}`);
  lines.push(`Overall Result: ${summary.result || 'Unknown'}`);
  lines.push('');

  lines.push('Test Counts:');
  lines.push(`  Total: ${summary.totalTestCount || 0}`);
  lines.push(`  Passed: ${summary.passedTests || 0}`);
  lines.push(`  Failed: ${summary.failedTests || 0}`);
  lines.push(`  Skipped: ${summary.skippedTests || 0}`);
  lines.push(`  Expected Failures: ${summary.expectedFailures || 0}`);
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
    const device = summary.devicesAndConfigurations[0].device;
    if (device) {
      lines.push(
        `Device: ${device.deviceName || 'Unknown'} (${device.platform || 'Unknown'} ${device.osVersion || 'Unknown'})`,
      );
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
      lines.push(
        `  ${index + 1}. ${failure.testName || 'Unknown Test'} (${failure.targetName || 'Unknown Target'})`,
      );
      if (failure.failureText) {
        lines.push(`     ${failure.failureText}`);
      }
    });
    lines.push('');
  }

  if (summary.topInsights && Array.isArray(summary.topInsights) && summary.topInsights.length > 0) {
    lines.push('Insights:');
    summary.topInsights.forEach((insight, index) => {
      lines.push(
        `  ${index + 1}. [${insight.impact || 'Unknown'}] ${insight.text || 'No description'}`,
      );
    });
  }

  return lines.join('\n');
}

async function handleTestLogic(params: any): Promise<ToolResponse> {
  log(
    'info',
    `Starting test run for scheme ${params.scheme} on platform ${params.platform} (internal)`,
  );

  try {
    // Create temporary directory for xcresult bundle
    const tempDir = await mkdtemp(join(tmpdir(), 'xcodebuild-test-'));
    const resultBundlePath = join(tempDir, 'TestResults.xcresult');

    // Add resultBundlePath to extraArgs
    const extraArgs = [...(params.extraArgs || []), `-resultBundlePath`, resultBundlePath];

    // Run the test command
    const testResult = await executeXcodeBuildCommand(
      {
        ...params,
        extraArgs,
      },
      {
        platform: params.platform,
        simulatorName: params.simulatorName,
        simulatorId: params.simulatorId,
        deviceId: params.deviceId,
        useLatestOS: params.useLatestOS,
        logPrefix: 'Test Run',
      },
      params.preferXcodebuild,
      'test',
    );

    // Parse xcresult bundle if it exists, regardless of whether tests passed or failed
    // Test failures are expected and should not prevent xcresult parsing
    try {
      log('info', `Attempting to parse xcresult bundle at: ${resultBundlePath}`);

      // Check if the file exists
      try {
        const { stat } = await import('fs/promises');
        await stat(resultBundlePath);
        log('info', `xcresult bundle exists at: ${resultBundlePath}`);
      } catch {
        log('warn', `xcresult bundle does not exist at: ${resultBundlePath}`);
        throw new Error(`xcresult bundle not found at ${resultBundlePath}`);
      }

      const testSummary = await parseXcresultBundle(resultBundlePath);
      log('info', 'Successfully parsed xcresult bundle');

      // Clean up temporary directory
      await rm(tempDir, { recursive: true, force: true });

      // Return combined result - preserve isError from testResult (test failures should be marked as errors)
      return {
        content: [
          ...(testResult.content || []),
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
        await rm(tempDir, { recursive: true, force: true });
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
  name: 'test_sim_id_ws',
  description:
    'Runs tests for a workspace on a simulator by UUID using xcodebuild test and parses xcresult output.',
  schema: {
    workspacePath: workspacePathSchema,
    scheme: schemeSchema,
    simulatorId: simulatorIdSchema,
    configuration: configurationSchema,
    derivedDataPath: derivedDataPathSchema,
    extraArgs: extraArgsSchema,
    useLatestOS: useLatestOSSchema,
    preferXcodebuild: preferXcodebuildSchema,
  },
  async handler(args: any): Promise<ToolResponse> {
    const params = args;
    return handleTestLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      useLatestOS: params.useLatestOS ?? false,
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.iOSSimulator,
    });
  },
};
