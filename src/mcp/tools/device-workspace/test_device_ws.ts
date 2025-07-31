import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { XcodePlatform } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { handleTestLogic } from '../../../utils/test-common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

// Define schema as ZodObject
const testDeviceWsSchema = z.object({
  workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
  scheme: z.string().describe('The scheme to use (Required)'),
  deviceId: z.string().describe('UDID of the device (obtained from list_devices)'),
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
  platform: z
    .enum(['iOS', 'watchOS', 'tvOS', 'visionOS'])
    .optional()
    .describe('Target platform (defaults to iOS)'),
});

// Use z.infer for type safety
type TestDeviceWsParams = z.infer<typeof testDeviceWsSchema>;

export async function test_device_wsLogic(
  params: TestDeviceWsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  const platformMap = {
    iOS: XcodePlatform.iOS,
    watchOS: XcodePlatform.watchOS,
    tvOS: XcodePlatform.tvOS,
    visionOS: XcodePlatform.visionOS,
  };

  return handleTestLogic(
    {
      ...params,
      configuration: params.configuration ?? 'Debug',
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: platformMap[params.platform ?? 'iOS'],
      deviceId: params.deviceId,
    },
    executor,
  );
}

export default {
  name: 'test_device_ws',
  description:
    'Runs tests for an Apple workspace on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild test and parses xcresult output. IMPORTANT: Requires workspacePath, scheme, and deviceId.',
  schema: testDeviceWsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(testDeviceWsSchema, test_device_wsLogic, getDefaultCommandExecutor),
};
