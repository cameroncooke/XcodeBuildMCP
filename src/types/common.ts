/**
 * Common type definitions used across the server
 *
 * This module provides core type definitions and interfaces used throughout the codebase.
 * It establishes a consistent type system for platform identification, tool responses,
 * and other shared concepts.
 *
 * Responsibilities:
 * - Defining the XcodePlatform enum for platform identification
 * - Establishing the ToolResponse interface for standardized tool outputs
 * - Providing ToolResponseContent types for different response formats
 * - Supporting error handling with standardized error response types
 */

/**
 * Enum representing Xcode build platforms.
 */
export enum XcodePlatform {
  macOS = 'macOS',
  iOS = 'iOS',
  iOSSimulator = 'iOS Simulator',
  watchOS = 'watchOS',
  watchOSSimulator = 'watchOS Simulator',
  tvOS = 'tvOS',
  tvOSSimulator = 'tvOS Simulator',
  visionOS = 'visionOS',
  visionOSSimulator = 'visionOS Simulator',
}

/**
 * ToolResponse - Standard response format for tools
 * Compatible with MCP CallToolResult interface from the SDK
 */
export interface ToolResponse {
  content: ToolResponseContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
  [key: string]: unknown; // Index signature to match CallToolResult
}

/**
 * Contents that can be included in a tool response
 */
export type ToolResponseContent =
  | {
      type: 'text';
      text: string;
      [key: string]: unknown; // Index signature to match ContentItem
    }
  | {
      type: 'image';
      data: string; // Base64-encoded image data (without URI scheme prefix)
      mimeType: string; // e.g., 'image/png', 'image/jpeg'
      [key: string]: unknown; // Index signature to match ContentItem
    };

/**
 * ValidationResult - Result of parameter validation operations
 */
export interface ValidationResult {
  isValid: boolean;
  errorResponse?: ToolResponse;
  warningResponse?: ToolResponse;
}

/**
 * CommandResponse - Generic result of command execution
 */
export interface CommandResponse {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Interface for shared build parameters
 */
export interface SharedBuildParams {
  workspacePath?: string;
  projectPath?: string;
  scheme: string;
  configuration: string;
  derivedDataPath?: string;
  extraArgs?: string[];
}

/**
 * Interface for platform-specific build options
 */
export interface PlatformBuildOptions {
  platform: XcodePlatform;
  simulatorName?: string;
  simulatorId?: string;
  deviceId?: string;
  useLatestOS?: boolean;
  arch?: string;
  logPrefix: string;
}
