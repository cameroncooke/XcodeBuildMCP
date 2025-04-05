/**
 * Progress Service - Manages progress updates for long-running operations
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolProgressUpdate } from '../types/common.js';
import { log } from './logger.js';

// Active operations map to track current operations
const activeOperations = new Map<string, ToolProgressUpdate>();

let mcpServer: McpServer | null = null;

/**
 * Initialize the progress service with an MCP server instance
 * @param server MCP server instance
 */
export function initProgressService(server: McpServer): void {
  mcpServer = server;
  log('info', 'Progress service initialized');
}

/**
 * Send a progress update to the client
 * @param update Progress update object
 */
export function sendProgressUpdate(update: ToolProgressUpdate): void {
  if (!mcpServer) {
    log('warning', 'Progress update sent before server initialization');
    return;
  }
  
  try {
    // Store or update the active operation
    if (update.status === 'running') {
      activeOperations.set(update.operationId, update);
    } else {
      // Remove completed/failed operations
      activeOperations.delete(update.operationId);
    }
    
    // Log progress updates for now, in the future when MCP fully supports progress events
    // we could extend this to use the appropriate API
    // For now, we're logging detailed progress information
    const progressMessage = `Operation [${update.operationId}]: ${update.status.toUpperCase()} - ${update.message} (${update.progress || 0}%)`;
    
    // Console error is used because MCP communication happens on stdout
    console.error(progressMessage);
    
    // Log at appropriate level based on status
    const level = update.status === 'failed' ? 'error' : 'info';
    log(level, `Progress update [${update.operationId}]: ${update.message} (${update.progress || 0}%)`);
    
  } catch (error) {
    log('error', `Failed to send progress update: ${error}`);
  }
}

/**
 * Create a progress callback function for a specific operation
 * @param operationName Name of the operation for logging
 * @returns Progress callback function
 */
export function createProgressCallback(operationName: string): (update: ToolProgressUpdate) => void {
  return (update: ToolProgressUpdate) => {
    sendProgressUpdate({
      ...update,
      message: `${operationName}: ${update.message}`
    });
  };
}

/**
 * Get the list of all currently active operations
 * @returns Array of active operations
 */
export function getActiveOperations(): ToolProgressUpdate[] {
  return Array.from(activeOperations.values());
}
