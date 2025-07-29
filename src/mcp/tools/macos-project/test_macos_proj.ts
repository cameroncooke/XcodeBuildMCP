/**
 * macOS Workspace Plugin: Test macOS Project
 *
 * Runs tests for a macOS project using xcodebuild test and parses xcresult output.
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

interface TestMacosProjParams {
  projectPath: string;
  scheme: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  preferXcodebuild?: boolean;
}

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

// Format test summary JSON into human-readable text
function formatTestSummary(summary: Record<string, unknown>): string {
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

/**
 * Business logic for testing a macOS project
 * Extracted for better separation of concerns and testability
 */
export async function test_macos_projLogic(
  params: TestMacosProjParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', `Starting test run for scheme ${params.scheme} on platform macOS (internal)`);

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
        configuration: params.configuration ?? 'Debug',
        extraArgs,
      },
      {
        platform: XcodePlatform.macOS,
        logPrefix: 'Test Run',
      },
      params.preferXcodebuild ?? false,
      'test',
      executor,
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
  name: 'test_macos_proj',
  description: 'Runs tests for a macOS project using xcodebuild test and parses xcresult output.',
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file'),
    scheme: z.string().describe('The scheme to use'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    preferXcodebuild: z
      .boolean()
      .optional()
      .describe('If true, prefers xcodebuild over the experimental incremental build system'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return test_macos_projLogic(
      args as unknown as TestMacosProjParams,
      getDefaultCommandExecutor(),
    );
  },
};
