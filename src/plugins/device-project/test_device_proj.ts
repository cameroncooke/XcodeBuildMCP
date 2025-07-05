/**
 * Device Project Plugin: Test Device Project
 *
 * Runs tests for an Apple project on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro)
 * using xcodebuild test and parses xcresult output. IMPORTANT: Requires projectPath, scheme, and deviceId.
 */

import { z } from 'zod';
import { promisify } from 'util';
import { exec } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { log } from '../../utils/index.js';
import { executeXcodeBuildCommand } from '../../utils/index.js';
import { createTextResponse } from '../../utils/index.js';

const XcodePlatform = {
  iOS: 'iOS',
  watchOS: 'watchOS',
  tvOS: 'tvOS',
  visionOS: 'visionOS',
  iOSSimulator: 'iOS Simulator',
  watchOSSimulator: 'watchOS Simulator',
  tvOSSimulator: 'tvOS Simulator',
  visionOSSimulator: 'visionOS Simulator',
  macOS: 'macOS',
};

/**
 * Type definition for test summary structure from xcresulttool
 * (JavaScript implementation - no actual interface, this is just documentation)
 */

/**
 * Parse xcresult bundle using xcrun xcresulttool
 */
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

/**
 * Format test summary JSON into human-readable text
 */
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

/**
 * Internal logic for running tests with platform-specific handling
 */
async function handleTestLogic(
  params: any,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
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
  name: 'test_device_proj',
  description:
    'Runs tests for an Apple project on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild test and parses xcresult output. IMPORTANT: Requires projectPath, scheme, and deviceId.',
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file'),
    scheme: z.string().describe('The scheme to test'),
    deviceId: z.string().describe('UDID of the device (obtained from list_devices)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release)'),
    derivedDataPath: z.string().optional().describe('Path to derived data directory'),
    extraArgs: z
      .array(z.string())
      .optional()
      .describe('Additional arguments to pass to xcodebuild'),
    preferXcodebuild: z.boolean().optional().describe('Prefer xcodebuild over faster alternatives'),
    platform: z
      .enum(['iOS', 'watchOS', 'tvOS', 'visionOS'])
      .optional()
      .describe('Target platform (defaults to iOS)'),
  },
  async handler(
    args: any,
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const params = args;
    const platformMap = {
      iOS: XcodePlatform.iOS,
      watchOS: XcodePlatform.watchOS,
      tvOS: XcodePlatform.tvOS,
      visionOS: XcodePlatform.visionOS,
    };

    return handleTestLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: platformMap[params.platform ?? 'iOS'],
      deviceId: params.deviceId,
    });
  },
};
