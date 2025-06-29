/**
 * Log Tools - Functions for capturing and managing iOS simulator logs
 *
 * This module provides tools for capturing and managing logs from iOS simulators.
 * It supports starting and stopping log capture sessions, and retrieving captured logs.
 *
 * Responsibilities:
 * - Starting and stopping log capture sessions
 * - Managing in-memory log sessions
 * - Retrieving captured logs
 */

import { startLogCapture, stopLogCapture } from '../../utils/log_capture.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolResponse } from '../../types/common.js';
import { validateRequiredParam } from '../../utils/validation.js';
import { registerTool, createTextContent } from '../common/index.js';

// Extracted exports for start_sim_log_cap tool
export const startSimLogCapToolName = 'start_sim_log_cap';
export const startSimLogCapToolDescription =
  'Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.';
export const startSimLogCapToolSchema = {
  simulatorUuid: z
    .string()
    .describe('UUID of the simulator to capture logs from (obtained from list_simulators).'),
  bundleId: z.string().describe('Bundle identifier of the app to capture logs for.'),
  captureConsole: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to capture console output (requires app relaunch).'),
};

export async function startSimLogCapToolHandler(params: {
  simulatorUuid: string;
  bundleId: string;
  captureConsole?: boolean;
}): Promise<ToolResponse> {
  const validationResult = validateRequiredParam('simulatorUuid', params.simulatorUuid);
  if (!validationResult.isValid) {
    return validationResult.errorResponse!;
  }

  const { sessionId, error } = await startLogCapture(params);
  if (error) {
    return {
      content: [createTextContent(`Error starting log capture: ${error}`)],
      isError: true,
    };
  }
  return {
    content: [
      createTextContent(
        `Log capture started successfully. Session ID: ${sessionId}.\n\n${params.captureConsole ? 'Note: Your app was relaunched to capture console output.' : 'Note: Only structured logs are being captured.'}\n\nNext Steps:\n1.  Interact with your simulator and app.\n2.  Use 'stop_sim_log_cap' with session ID '${sessionId}' to stop capture and retrieve logs.`,
      ),
    ],
  };
}

/**
 * Registers the tool to start capturing logs from an iOS simulator.
 *
 * @param server The MCP Server instance.
 */
export function registerStartSimulatorLogCaptureTool(server: McpServer): void {
  registerTool(
    server,
    startSimLogCapToolName,
    startSimLogCapToolDescription,
    startSimLogCapToolSchema,
    startSimLogCapToolHandler,
  );
}

// Extracted exports for stop_sim_log_cap tool
export const stopSimLogCapToolName = 'stop_sim_log_cap';
export const stopSimLogCapToolDescription =
  'Stops an active simulator log capture session and returns the captured logs.';
export const stopSimLogCapToolSchema = {
  logSessionId: z.string().describe('The session ID returned by start_sim_log_cap.'),
};

export async function stopSimLogCapToolHandler(params: {
  logSessionId: string;
}): Promise<ToolResponse> {
  const validationResult = validateRequiredParam('logSessionId', params.logSessionId);
  if (!validationResult.isValid) {
    return validationResult.errorResponse!;
  }
  const { logContent, error } = await stopLogCapture(params.logSessionId);
  if (error) {
    return {
      content: [
        createTextContent(`Error stopping log capture session ${params.logSessionId}: ${error}`),
      ],
      isError: true,
    };
  }
  return {
    content: [
      createTextContent(
        `Log capture session ${params.logSessionId} stopped successfully. Log content follows:\n\n${logContent}`,
      ),
    ],
  };
}

/**
 * Registers the tool to stop log capture and retrieve the content in one operation.
 *
 * @param server The MCP Server instance.
 */
export function registerStopAndGetSimulatorLogTool(server: McpServer): void {
  registerTool(
    server,
    stopSimLogCapToolName,
    stopSimLogCapToolDescription,
    stopSimLogCapToolSchema,
    stopSimLogCapToolHandler,
  );
}
