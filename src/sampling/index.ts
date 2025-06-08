/**
 * Sampling Module - MCP Sampling for Autonomous Xcode Operations
 *
 * This module provides sampling capabilities that allow the server to initiate
 * autonomous behaviors and recursive LLM interactions for intelligent Xcode
 * operations like automated debugging, build optimization, and error analysis.
 *
 * Note: Sampling is an advanced MCP feature that requires explicit client support
 * and user consent. It should be used judiciously for high-value autonomous tasks.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../utils/logger.js';
import { registerAutonomousDebugging } from './autonomous.js';

/**
 * Register sampling capabilities with the MCP server
 * @param server The MCP server instance
 */
export function registerSampling(server: McpServer): void {
  try {
    log('info', 'Registering Xcode sampling capabilities...');

    // Register autonomous debugging capabilities
    registerAutonomousDebugging(server);

    log('info', 'Successfully registered Xcode sampling capabilities');
  } catch (error) {
    log('error', `Failed to register sampling capabilities: ${error}`);
    throw error;
  }
}
