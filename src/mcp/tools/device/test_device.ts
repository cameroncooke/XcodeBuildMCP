/**
 * Device Shared Plugin: Test Device (Unified)
 *
 * Runs tests for an Apple project or workspace on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro)
 * using xcodebuild test and parses xcresult output. Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { join } from 'path';
import { ToolResponse, XcodePlatform } from '../../../types/common.js';
import { log } from '../../../utils/index.js';
import { executeXcodeBuildCommand } from '../../../utils/index.js';
import { createTextResponse } from '../../../utils/index.js';
import {
  CommandExecutor,
  getDefaultCommandExecutor,
  FileSystemExecutor,
  getDefaultFileSystemExecutor,
} from '../../../utils/command.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.js';

// Unified schema: XOR between projectPath and workspacePath
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
  scheme: z.string().describe('The scheme to test'),
  deviceId: z.string().describe('UDID of the device (obtained from list_devices)'),
  configuration: z.string().optional().describe('Build configuration (Debug, Release)'),
  derivedDataPath: z.string().optional().describe('Path to derived data directory'),
  extraArgs: z.array(z.string()).optional().describe('Additional arguments to pass to xcodebuild'),
  preferXcodebuild: z.boolean().optional().describe('Prefer xcodebuild over faster alternatives'),
  platform: z
    .enum(['iOS', 'watchOS', 'tvOS', 'visionOS'])
    .optional()
    .describe('Target platform (defaults to iOS)'),
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const testDeviceSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

export type TestDeviceParams = z.infer<typeof testDeviceSchema>;

/**
 * Type definition for test summary structure from xcresulttool
 * (JavaScript implementation - no actual interface, this is just documentation)
 */

/**
 * Parse xcresult bundle using xcrun xcresulttool
 */
async function parseXcresultBundle(
  resultBundlePath: string,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<string> {
  try {
    // Use injected executor for testing
    const result = await executor(
      ['xcrun', 'xcresulttool', 'get', 'test-results', 'summary', '--path', resultBundlePath],
      'Parse xcresult bundle',
    );
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to execute xcresulttool');
    }
    if (!result.output || result.output.trim().length === 0) {
      throw new Error('xcresulttool returned no output');
    }

    // Parse JSON response and format as human-readable
    const summaryData = JSON.parse(result.output) as Record<string, unknown>;
    return formatTestSummary(summaryData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error parsing xcresult bundle: ${errorMessage}`);
    throw error;
  }
}

/**
 * Format test summary JSON into human-readable text
 */
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
    const device = deviceConfig.device as Record<string, unknown> | undefined;
    if (device) {
      lines.push(
        `Device: ${device.deviceName ?? 'Unknown'} (${device.platform ?? 'Unknown'} ${device.osVersion ?? 'Unknown'})`,
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
    summary.testFailures.forEach((failureItem, index) => {
      const failure = failureItem as Record<string, unknown>;
      lines.push(
        `  ${index + 1}. ${failure.testName ?? 'Unknown Test'} (${failure.targetName ?? 'Unknown Target'})`,
      );
      if (failure.failureText) {
        lines.push(`     ${failure.failureText}`);
      }
    });
    lines.push('');
  }

  if (summary.topInsights && Array.isArray(summary.topInsights) && summary.topInsights.length > 0) {
    lines.push('Insights:');
    summary.topInsights.forEach((insightItem, index) => {
      const insight = insightItem as Record<string, unknown>;
      lines.push(
        `  ${index + 1}. [${insight.impact ?? 'Unknown'}] ${insight.text ?? 'No description'}`,
      );
    });
  }

  return lines.join('\n');
}

/**
 * Business logic for running tests with platform-specific handling.
 * Exported for direct testing and reuse.
 */
export async function testDeviceLogic(
  params: TestDeviceParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
  fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
): Promise<ToolResponse> {
  log(
    'info',
    `Starting test run for scheme ${params.scheme} on platform ${params.platform ?? 'iOS'} (internal)`,
  );

  let tempDir: string | undefined;
  const cleanup = async (): Promise<void> => {
    if (!tempDir) return;
    try {
      await fileSystemExecutor.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      log('warn', `Failed to clean up temporary directory: ${cleanupError}`);
    }
  };

  try {
    // Create temporary directory for xcresult bundle
    tempDir = await fileSystemExecutor.mkdtemp(
      join(fileSystemExecutor.tmpdir(), 'xcodebuild-test-'),
    );
    const resultBundlePath = join(tempDir, 'TestResults.xcresult');

    // Add resultBundlePath to extraArgs
    const extraArgs = [...(params.extraArgs ?? []), `-resultBundlePath`, resultBundlePath];

    // Run the test command
    const testResult = await executeXcodeBuildCommand(
      {
        projectPath: params.projectPath,
        workspacePath: params.workspacePath,
        scheme: params.scheme,
        configuration: params.configuration ?? 'Debug',
        derivedDataPath: params.derivedDataPath,
        extraArgs,
      },
      {
        platform: (params.platform as XcodePlatform) || XcodePlatform.iOS,
        simulatorName: undefined,
        simulatorId: undefined,
        deviceId: params.deviceId,
        useLatestOS: false,
        logPrefix: 'Test Run',
      },
      params.preferXcodebuild,
      'test',
      executor,
    );

    // Parse xcresult bundle if it exists, regardless of whether tests passed or failed
    // Test failures are expected and should not prevent xcresult parsing
    try {
      log('info', `Attempting to parse xcresult bundle at: ${resultBundlePath}`);

      // Check if the file exists
      try {
        await fileSystemExecutor.stat(resultBundlePath);
        log('info', `xcresult bundle exists at: ${resultBundlePath}`);
      } catch {
        log('warn', `xcresult bundle does not exist at: ${resultBundlePath}`);
        throw new Error(`xcresult bundle not found at ${resultBundlePath}`);
      }

      const testSummary = await parseXcresultBundle(resultBundlePath, executor);
      log('info', 'Successfully parsed xcresult bundle');

      // Clean up temporary directory
      await cleanup();

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

      await cleanup();

      return testResult;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during test run: ${errorMessage}`);
    return createTextResponse(`Error during test run: ${errorMessage}`, true);
  } finally {
    await cleanup();
  }
}

export default {
  name: 'test_device',
  description:
    'Runs tests for an Apple project or workspace on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild test and parses xcresult output. Provide exactly one of projectPath or workspacePath. IMPORTANT: Requires scheme and deviceId. Example: test_device({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme", deviceId: "device-uuid" })',
  schema: baseSchemaObject.shape,
  handler: createTypedTool<TestDeviceParams>(
    testDeviceSchema as z.ZodType<TestDeviceParams>,
    (params: TestDeviceParams, executor: CommandExecutor) => {
      return testDeviceLogic(
        {
          ...params,
          platform: params.platform ?? 'iOS',
        },
        executor,
        getDefaultFileSystemExecutor(),
      );
    },
    getDefaultCommandExecutor,
  ),
};
