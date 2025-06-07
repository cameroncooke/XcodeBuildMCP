/**
 * Common types and utilities shared across build tool modules
 *
 * This module provides shared parameter schemas, types, and utility functions used by
 * multiple tool modules. Centralizing these definitions ensures consistency across
 * the codebase and simplifies maintenance.
 *
 * Responsibilities:
 * - Defining common parameter schemas with descriptive documentation
 * - Providing base parameter interfaces for workspace and project operations
 * - Implementing shared tool registration utilities
 * - Standardizing response formatting across tools
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolResponse, ToolResponseContent, XcodePlatform } from '../types/common.js';

/**
 * Common parameter schemas used across multiple tools
 */
export const workspacePathSchema = z.string().describe('Path to the .xcworkspace file (Required)');
export const projectPathSchema = z.string().describe('Path to the .xcodeproj file (Required)');
export const schemeSchema = z.string().describe('The scheme to use (Required)');
export const configurationSchema = z
  .string()
  .optional()
  .describe('Build configuration (Debug, Release, etc.)');
export const derivedDataPathSchema = z
  .string()
  .optional()
  .describe('Path where build products and other derived data will go');
export const extraArgsSchema = z
  .array(z.string())
  .optional()
  .describe('Additional xcodebuild arguments');
export const simulatorNameSchema = z
  .string()
  .describe("Name of the simulator to use (e.g., 'iPhone 16') (Required)");
export const simulatorIdSchema = z
  .string()
  .describe('UUID of the simulator to use (obtained from listSimulators) (Required)');
export const useLatestOSSchema = z
  .boolean()
  .optional()
  .describe('Whether to use the latest OS version for the named simulator');
export const appPathSchema = z
  .string()
  .describe('Path to the .app bundle (full path to the .app directory)');
export const bundleIdSchema = z
  .string()
  .describe("Bundle identifier of the app (e.g., 'com.example.MyApp')");
export const launchArgsSchema = z
  .array(z.string())
  .optional()
  .describe('Additional arguments to pass to the app');
export const preferXcodebuildSchema = z
  .boolean()
  .optional()
  .describe(
    'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
  );

export const platformDeviceSchema = z
  .enum([
    XcodePlatform.macOS,
    XcodePlatform.iOS,
    XcodePlatform.watchOS,
    XcodePlatform.tvOS,
    XcodePlatform.visionOS,
  ])
  .describe('The target device platform (Required)');

export const platformSimulatorSchema = z
  .enum([
    XcodePlatform.iOSSimulator,
    XcodePlatform.watchOSSimulator,
    XcodePlatform.tvOSSimulator,
    XcodePlatform.visionOSSimulator,
  ])
  .describe('The target simulator platform (Required)');

/**
 * Swift Package Manager specific schemas
 */
export const swiftConfigurationSchema = z
  .enum(['debug', 'release'])
  .optional()
  .describe("Build configuration: 'debug' (default) or 'release'");

export const swiftArchitecturesSchema = z
  .enum(['arm64', 'x86_64'])
  .array()
  .optional()
  .describe('Architectures to build for (e.g. arm64, x86_64)');

export const parseAsLibrarySchema = z
  .boolean()
  .optional()
  .describe('Add -parse-as-library flag for @main support (default: false)');

/**
 * Base parameters for workspace tools
 */
export type BaseWorkspaceParams = {
  workspacePath: string;
  scheme: string;
  configuration?: string;
  derivedDataPath?: string;
  extraArgs?: string[];
  preferXcodebuild?: boolean;
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
  preferXcodebuild?: boolean;
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
  platform: (typeof platformDeviceSchema._def.values)[number];
};

export type BaseAppPathSimulatorNameParams = BaseSimulatorNameParams & {
  platform: (typeof platformSimulatorSchema._def.values)[number];
};

export type BaseAppPathSimulatorIdParams = BaseSimulatorIdParams & {
  platform: (typeof platformSimulatorSchema._def.values)[number];
};

/**
 * Helper function to register a tool with the MCP server
 */
export function registerTool<T extends object>(
  server: McpServer,
  name: string,
  description: string,
  schema: Record<string, z.ZodType>,
  handler: (params: T) => Promise<ToolResponse>,
): void {
  // Create a wrapper handler that matches the signature expected by server.tool
  const wrappedHandler = (
    args: Record<string, unknown>,
    _extra: unknown,
  ): Promise<ToolResponse> => {
    // Assert the type *before* calling the original handler
    // This confines the type assertion to one place
    const typedParams = args as T;
    return handler(typedParams);
  };

  server.tool(name, description, schema, wrappedHandler);
}

/**
 * Helper to create a standard text response content.
 */
export function createTextContent(text: string): ToolResponseContent {
  return { type: 'text', text };
}
