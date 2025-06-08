/**
 * Prompts Module - MCP Prompts for Xcode Workflows
 *
 * This module provides prompt templates for common Xcode development workflows.
 * Prompts help users and AI assistants with structured approaches to common
 * development tasks and troubleshooting scenarios.
 *
 * Available Prompt Categories:
 * - Debugging: Build failures, runtime issues, crash analysis
 * - CI/CD: Continuous integration setup, deployment workflows
 * - Performance: Build optimization, app performance analysis
 * - Testing: Unit testing, UI testing, test automation
 * - Project Setup: New project configuration, dependency management
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../utils/logger.js';
import { registerDebuggingPrompts } from './debugging.js';
import { registerCICDPrompts } from './cicd.js';
import { registerPerformancePrompts } from './performance.js';
import { registerTestingPrompts } from './testing.js';
import { registerProjectSetupPrompts } from './project-setup.js';

/**
 * Register all Xcode workflow prompts with the MCP server
 * @param server The MCP server instance
 */
export function registerPrompts(server: McpServer): void {
  try {
    log('info', 'Registering Xcode workflow prompts...');

    // Register debugging prompts
    registerDebuggingPrompts(server);

    // Register CI/CD prompts
    registerCICDPrompts(server);

    // Register performance prompts
    registerPerformancePrompts(server);

    // Register testing prompts
    registerTestingPrompts(server);

    // Register project setup prompts
    registerProjectSetupPrompts(server);

    log('info', 'Successfully registered all Xcode workflow prompts');
  } catch (error) {
    log('error', `Failed to register prompts: ${error}`);
    throw error;
  }
}
