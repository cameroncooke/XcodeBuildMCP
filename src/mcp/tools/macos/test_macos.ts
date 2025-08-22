/**
 * macOS Shared Plugin: Test macOS (Unified)
 *
 * Runs tests for a macOS project or workspace using xcodebuild test and parses xcresult output.
 * Accepts mutually exclusive `projectPath` or `workspacePath`.
 */

import { z } from 'zod';
import { join } from 'path';
import { ToolResponse, XcodePlatform } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { executeXcodeBuildCommand } from '../../../utils/build/index.ts';
import { createTextResponse } from '../../../utils/responses/index.ts';
import { normalizeTestRunnerEnv } from '../../../utils/environment.ts';
import type {
  CommandExecutor,
  FileSystemExecutor,
  CommandExecOptions,
} from '../../../utils/execution/index.ts';
import {
  getDefaultCommandExecutor,
  getDefaultFileSystemExecutor,
} from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';

// Unified schema: XOR between projectPath and workspacePath
const baseSchemaObject = z.object({
  projectPath: z.string().optional().describe('Path to the .xcodeproj file'),
  workspacePath: z.string().optional().describe('Path to the .xcworkspace file'),
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
  testRunnerEnv: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Environment variables to pass to the test runner (TEST_RUNNER_ prefix added automatically)',
    ),
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const testMacosSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });

export type TestMacosParams = z.infer<typeof testMacosSchema>;

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

/**
 * Parse xcresult bundle using xcrun xcresulttool
 */
async function parseXcresultBundle(
  resultBundlePath: string,
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<string> {
  try {
    const result = await executor(
      ['xcrun', 'xcresulttool', 'get', 'test-results', 'summary', '--path', resultBundlePath],
      'Parse xcresult bundle',
      true,
    );

    if (!result.success) {
      throw new Error(result.error ?? 'Failed to parse xcresult bundle');
    }

    // Parse JSON response and format as human-readable
    let summary: unknown;
    try {
      summary = JSON.parse(result.output || '{}');
    } catch (parseError) {
      throw new Error(`Failed to parse JSON output: ${parseError}`);
    }

    if (typeof summary !== 'object' || summary === null) {
      throw new Error('Invalid JSON output: expected object');
    }

    return formatTestSummary(summary as Record<string, unknown>);
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
    const firstDeviceConfig: unknown = summary.devicesAndConfigurations[0];
    if (
      typeof firstDeviceConfig === 'object' &&
      firstDeviceConfig !== null &&
      'device' in firstDeviceConfig
    ) {
      const device: unknown = (firstDeviceConfig as Record<string, unknown>).device;
      if (typeof device === 'object' && device !== null) {
        const deviceRecord = device as Record<string, unknown>;
        const deviceName =
          'deviceName' in deviceRecord && typeof deviceRecord.deviceName === 'string'
            ? deviceRecord.deviceName
            : 'Unknown';
        const platform =
          'platform' in deviceRecord && typeof deviceRecord.platform === 'string'
            ? deviceRecord.platform
            : 'Unknown';
        const osVersion =
          'osVersion' in deviceRecord && typeof deviceRecord.osVersion === 'string'
            ? deviceRecord.osVersion
            : 'Unknown';

        lines.push(`Device: ${deviceName} (${platform} ${osVersion})`);
        lines.push('');
      }
    }
  }

  if (
    summary.testFailures &&
    Array.isArray(summary.testFailures) &&
    summary.testFailures.length > 0
  ) {
    lines.push('Test Failures:');
    summary.testFailures.forEach((failure: unknown, index: number) => {
      if (typeof failure === 'object' && failure !== null) {
        const failureRecord = failure as Record<string, unknown>;
        const testName =
          'testName' in failureRecord && typeof failureRecord.testName === 'string'
            ? failureRecord.testName
            : 'Unknown Test';
        const targetName =
          'targetName' in failureRecord && typeof failureRecord.targetName === 'string'
            ? failureRecord.targetName
            : 'Unknown Target';

        lines.push(`  ${index + 1}. ${testName} (${targetName})`);

        if ('failureText' in failureRecord && typeof failureRecord.failureText === 'string') {
          lines.push(`     ${failureRecord.failureText}`);
        }
      }
    });
    lines.push('');
  }

  if (summary.topInsights && Array.isArray(summary.topInsights) && summary.topInsights.length > 0) {
    lines.push('Insights:');
    summary.topInsights.forEach((insight: unknown, index: number) => {
      if (typeof insight === 'object' && insight !== null) {
        const insightRecord = insight as Record<string, unknown>;
        const impact =
          'impact' in insightRecord && typeof insightRecord.impact === 'string'
            ? insightRecord.impact
            : 'Unknown';
        const text =
          'text' in insightRecord && typeof insightRecord.text === 'string'
            ? insightRecord.text
            : 'No description';

        lines.push(`  ${index + 1}. [${impact}] ${text}`);
      }
    });
  }

  return lines.join('\n');
}

/**
 * Business logic for testing a macOS project or workspace.
 * Exported for direct testing and reuse.
 */
export async function testMacosLogic(
  params: TestMacosParams,
  executor: CommandExecutor = getDefaultCommandExecutor(),
  fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
): Promise<ToolResponse> {
  log('info', `Starting test run for scheme ${params.scheme} on platform macOS (internal)`);

  try {
    // Create temporary directory for xcresult bundle
    const tempDir = await fileSystemExecutor.mkdtemp(
      join(fileSystemExecutor.tmpdir(), 'xcodebuild-test-'),
    );
    const resultBundlePath = join(tempDir, 'TestResults.xcresult');

    // Add resultBundlePath to extraArgs
    const extraArgs = [...(params.extraArgs ?? []), `-resultBundlePath`, resultBundlePath];

    // Prepare execution options with TEST_RUNNER_ environment variables
    const execOpts: CommandExecOptions | undefined = params.testRunnerEnv
      ? { env: normalizeTestRunnerEnv(params.testRunnerEnv) }
      : undefined;

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
        platform: XcodePlatform.macOS,
        logPrefix: 'Test Run',
      },
      params.preferXcodebuild ?? false,
      'test',
      executor,
      execOpts,
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
      await fileSystemExecutor.rm(tempDir, { recursive: true, force: true });

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
        await fileSystemExecutor.rm(tempDir, { recursive: true, force: true });
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
  name: 'test_macos',
  description:
    'Runs tests for a macOS project or workspace using xcodebuild test and parses xcresult output. Provide exactly one of projectPath or workspacePath. IMPORTANT: Requires scheme. Example: test_macos({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme" })',
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: createTypedTool<TestMacosParams>(
    testMacosSchema as z.ZodType<TestMacosParams>,
    (params: TestMacosParams) => {
      return testMacosLogic(params, getDefaultCommandExecutor(), getDefaultFileSystemExecutor());
    },
    getDefaultCommandExecutor,
  ),
};
