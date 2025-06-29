/**
 * Apple Device Test Tools - Tools for running tests on Apple physical devices
 *
 * This module provides specialized tools for running tests on Apple applications on physical devices
 * (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild. It supports both
 * workspace and project-based test runs with xcresult parsing for human-readable test summaries.
 *
 * Responsibilities:
 * - Running tests on Apple applications on physical devices from project files and workspaces
 * - Parsing xcresult bundles into human-readable format
 * - Handling test configuration and derived data paths
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { XcodePlatform } from '../../utils/xcode.js';
import { handleTestLogic } from '../test-common/index.js';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  configurationSchema,
  derivedDataPathSchema,
  extraArgsSchema,
  preferXcodebuildSchema,
} from '../common/index.js';

// Device-specific schema
const deviceIdSchema = z.string().describe('UDID of the device (obtained from list_devices)');

// --- Public Tool Definitions ---

// Extracted exports for test_device_ws tool
export const testDeviceWsToolName = 'test_device_ws';

export const testDeviceWsToolDescription =
  'Runs tests for an Apple workspace on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild test and parses xcresult output. IMPORTANT: Requires workspacePath, scheme, and deviceId.';

export const testDeviceWsToolSchema = {
  workspacePath: workspacePathSchema,
  scheme: schemeSchema,
  deviceId: deviceIdSchema,
  configuration: configurationSchema,
  derivedDataPath: derivedDataPathSchema,
  extraArgs: extraArgsSchema,
  preferXcodebuild: preferXcodebuildSchema,
  platform: z
    .enum(['iOS', 'watchOS', 'tvOS', 'visionOS'])
    .optional()
    .describe('Target platform (defaults to iOS)'),
};

export async function testDeviceWsToolHandler(params: {
  workspacePath: string;
  scheme: string;
  deviceId: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  preferXcodebuild?: boolean;
  platform?: string;
}): Promise<import('@modelcontextprotocol/sdk/types.js').ToolResponse> {
  const platformMap: Record<string, XcodePlatform> = {
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
}

// Extracted exports for test_device_proj tool
export const testDeviceProjToolName = 'test_device_proj';

export const testDeviceProjToolDescription =
  'Runs tests for an Apple project on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild test and parses xcresult output. IMPORTANT: Requires projectPath, scheme, and deviceId.';

export const testDeviceProjToolSchema = {
  projectPath: projectPathSchema,
  scheme: schemeSchema,
  deviceId: deviceIdSchema,
  configuration: configurationSchema,
  derivedDataPath: derivedDataPathSchema,
  extraArgs: extraArgsSchema,
  preferXcodebuild: preferXcodebuildSchema,
  platform: z
    .enum(['iOS', 'watchOS', 'tvOS', 'visionOS'])
    .optional()
    .describe('Target platform (defaults to iOS)'),
};

export async function testDeviceProjToolHandler(params: {
  projectPath: string;
  scheme: string;
  deviceId: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  preferXcodebuild?: boolean;
  platform?: string;
}): Promise<import('@modelcontextprotocol/sdk/types.js').ToolResponse> {
  const platformMap: Record<string, XcodePlatform> = {
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
}

/**
 * Registers the Apple device test workspace tool
 */
export function registerAppleDeviceTestWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    deviceId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
    platform?: string;
  };

  registerTool<Params>(
    server,
    testDeviceWsToolName,
    testDeviceWsToolDescription,
    testDeviceWsToolSchema,
    testDeviceWsToolHandler,
  );
}

/**
 * Registers the Apple device test project tool
 */
export function registerAppleDeviceTestProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    deviceId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
    platform?: string;
  };

  registerTool<Params>(
    server,
    testDeviceProjToolName,
    testDeviceProjToolDescription,
    testDeviceProjToolSchema,
    testDeviceProjToolHandler,
  );
}
