/**
 * Common types and utilities shared across build tool modules
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolResponse } from '../types/common.js';

/**
 * Enum representing Xcode build platforms.
 */
export enum XcodePlatform {
  macOS = 'macOS',
  iOS = 'iOS',
  watchOS = 'watchOS',
  tvOS = 'tvOS',
  visionOS = 'visionOS',
  iOSSimulator = 'iOS Simulator',
  watchOSSimulator = 'watchOS Simulator',
  tvOSSimulator = 'tvOS Simulator',
  visionOSSimulator = 'visionOS Simulator',
}

/**
 * Common parameter schemas used across multiple tools
 */
export const workspacePathSchema = z.string().describe('Path to the .xcworkspace file (Required)');
export const projectPathSchema = z.string().describe('Path to the .xcodeproj file (Required)');
export const schemeSchema = z.string().describe('The scheme to use (Required)');
export const configurationSchema = z.string().optional().describe('Build configuration (Debug, Release, etc.)');
export const derivedDataPathSchema = z.string().optional().describe('Path where build products and other derived data will go');
export const extraArgsSchema = z.array(z.string()).optional().describe('Additional xcodebuild arguments');
export const simulatorNameSchema = z.string().describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)");
export const simulatorIdSchema = z.string().describe('UUID of the simulator to use (obtained from listSimulators) (Required)');
export const useLatestOSSchema = z.boolean().optional().describe('Whether to use the latest OS version for the named simulator');
export const appPathSchema = z.string().describe('Path to the .app bundle (full path to the .app directory)');
export const bundleIdSchema = z.string().describe("Bundle identifier of the app (e.g., 'com.example.MyApp')");
export const dummySchema = z.boolean().optional().describe('This is a dummy parameter. You must still provide an empty object {}.');
export const launchArgsSchema = z.array(z.string()).optional().describe('Additional arguments to pass to the app');

export const platformDeviceSchema = z.enum([
  XcodePlatform.macOS,
  XcodePlatform.iOS,
  XcodePlatform.watchOS,
  XcodePlatform.tvOS,
  XcodePlatform.visionOS
]).describe('The target device platform (Required)');

export const platformSimulatorSchema = z.enum([
  XcodePlatform.iOSSimulator,
  XcodePlatform.watchOSSimulator,
  XcodePlatform.tvOSSimulator,
  XcodePlatform.visionOSSimulator
]).describe('The target simulator platform (Required)');

/**
 * Base parameters for workspace tools
 */
export type BaseWorkspaceParams = {
  workspacePath: string;
  scheme: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
};

/**
 * Base parameters for project tools
 */
export type BaseProjectParams = {
  projectPath: string;
  scheme: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
};

/**
 * Base parameters for simulator tools with name
 */
export type BaseSimulatorNameParams = {
  simulatorName: string;
  useLatestOS?: boolean;
};

/**
 * Base parameters for simulator tools with ID
 */
export type BaseSimulatorIdParams = {
  simulatorId: string;
  useLatestOS?: boolean; // May be ignored by xcodebuild when ID is provided
};

/**
 * Specific Parameter Types for App Path
 */
export type BaseAppPathDeviceParams = {
  platform: typeof platformDeviceSchema._def.values[number];
}

export type BaseAppPathSimulatorNameParams = BaseSimulatorNameParams & {
  platform: typeof platformSimulatorSchema._def.values[number];
}

export type BaseAppPathSimulatorIdParams = BaseSimulatorIdParams & {
  platform: typeof platformSimulatorSchema._def.values[number];
}

/**
 * Helper function to register a tool with the MCP server
 */
export function registerTool<T extends object>(
  server: McpServer,
  name: string,
  description: string,
  schema: Record<string, z.ZodType>,
  handler: (params: T) => Promise<ToolResponse>
): void {
  // Create a wrapper handler that matches the signature expected by server.tool
  const wrappedHandler = (args: Record<string, any>, extra: any): Promise<ToolResponse> => {
    // Assert the type *before* calling the original handler
    // This confines the type assertion to one place
    const typedParams = args as T; 
    return handler(typedParams);
  };
  
  server.tool(name, description, schema, wrappedHandler);
}
