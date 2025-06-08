/**
 * Resources Module - MCP Resources for Xcode Project Context
 *
 * This module provides resources that expose Xcode project context and metadata
 * to MCP clients. Resources allow clients to access project information, build
 * configurations, and other contextual data without executing tools.
 *
 * Resource URI Schemes:
 * - xcode://project/info - Project metadata and configuration
 * - xcode://project/schemes - Available build schemes
 * - xcode://project/targets - Project targets information
 * - xcode://build/settings/{scheme} - Build settings for a specific scheme
 * - xcode://build/logs/latest - Latest build logs
 * - xcode://simulator/devices - Available simulator devices
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../utils/logger.js';
import { registerProjectResources } from './project.js';
import { registerBuildResources } from './build.js';
import { registerSimulatorResources } from './simulator.js';

/**
 * Register all Xcode-related resources with the MCP server
 * @param server The MCP server instance
 */
export function registerResources(server: McpServer): void {
  try {
    log('info', 'Registering Xcode resources...');
    
    // Register project-related resources
    registerProjectResources(server);
    
    // Register build-related resources
    registerBuildResources(server);
    
    // Register simulator-related resources
    registerSimulatorResources(server);
    
    log('info', 'Successfully registered all Xcode resources');
  } catch (error) {
    log('error', `Failed to register resources: ${error}`);
    throw error;
  }
}

