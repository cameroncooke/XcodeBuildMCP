/**
 * Debugging Prompts - Xcode Build and Runtime Issue Resolution
 *
 * This module provides prompt templates for debugging common Xcode issues,
 * including build failures, runtime crashes, and development environment problems.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { log } from '../utils/logger.js';

/**
 * Register debugging-related prompts
 */
export function registerDebuggingPrompts(server: McpServer): void {
  // Build failure analysis prompt
  server.prompt(
    'debug-build-failure',
    'Analyze and troubleshoot Xcode build failures',
    {
      error_message: z.string().describe('The build error message or log excerpt'),
      scheme: z.string().optional().describe('The build scheme that failed (optional)'),
      target: z.string().optional().describe('The specific target that failed (optional)'),
      recent_changes: z
        .string()
        .optional()
        .describe('Recent code or configuration changes (optional)'),
    },
    async (args) => {
      const { error_message, scheme, target, recent_changes } = args;

      let prompt = `# Xcode Build Failure Analysis

## Error Information
**Error Message:** ${error_message}`;

      if (scheme) {
        prompt += `\n**Scheme:** ${scheme}`;
      }

      if (target) {
        prompt += `\n**Target:** ${target}`;
      }

      if (recent_changes) {
        prompt += `\n**Recent Changes:** ${recent_changes}`;
      }

      prompt += `

## Analysis Request
Please analyze this Xcode build failure and provide:

1. **Root Cause Analysis**
   - Identify the most likely cause of the build failure
   - Explain why this error typically occurs
   - Consider common scenarios that lead to this issue

2. **Step-by-Step Resolution**
   - Provide specific, actionable steps to resolve the issue
   - Include relevant Xcode settings or configuration changes
   - Suggest command-line alternatives where applicable

3. **Prevention Strategies**
   - Recommend practices to avoid this issue in the future
   - Suggest build configuration improvements
   - Identify potential code patterns to avoid

4. **Additional Investigation**
   - If the error is unclear, suggest specific information to gather
   - Recommend diagnostic commands or tools to run
   - Identify related log files or settings to check

## Context
- This is an Xcode project build failure
- The developer needs practical, actionable guidance
- Consider both Xcode GUI and command-line solutions
- Focus on the most common and effective solutions first`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    },
  );

  // Runtime crash analysis prompt
  server.prompt(
    'debug-runtime-crash',
    'Analyze and troubleshoot iOS/macOS app runtime crashes',
    {
      crash_log: z.string().describe('The crash log or stack trace'),
      app_version: z.string().optional().describe('App version where crash occurred'),
      ios_version: z.string().optional().describe('iOS/macOS version where crash occurred'),
      reproduction_steps: z.string().optional().describe('Steps to reproduce the crash'),
      device_info: z.string().optional().describe('Device model and specifications'),
    },
    async (args) => {
      const { crash_log, app_version, ios_version, reproduction_steps, device_info } = args;

      let prompt = `# iOS/macOS App Crash Analysis

## Crash Information
**Crash Log/Stack Trace:**
\`\`\`
${crash_log}
\`\`\``;

      if (app_version) {
        prompt += `\n**App Version:** ${app_version}`;
      }

      if (ios_version) {
        prompt += `\n**OS Version:** ${ios_version}`;
      }

      if (device_info) {
        prompt += `\n**Device:** ${device_info}`;
      }

      if (reproduction_steps) {
        prompt += `\n**Reproduction Steps:**\n${reproduction_steps}`;
      }

      prompt += `

## Analysis Request
Please analyze this crash and provide:

1. **Crash Analysis**
   - Identify the crash type (EXC_BAD_ACCESS, SIGABRT, etc.)
   - Locate the exact line/method where the crash occurred
   - Explain what the crash indicates about the underlying issue

2. **Root Cause Investigation**
   - Analyze the stack trace to identify the problematic code path
   - Look for common patterns (memory issues, nil pointer access, etc.)
   - Consider threading issues, memory management, or API misuse

3. **Debugging Strategy**
   - Suggest specific debugging techniques for this crash type
   - Recommend Xcode debugging tools (Instruments, Address Sanitizer, etc.)
   - Provide breakpoint strategies and logging approaches

4. **Code Review Recommendations**
   - Identify code patterns that likely caused this crash
   - Suggest defensive programming practices
   - Recommend code review focus areas

5. **Testing and Validation**
   - Suggest test cases to verify the fix
   - Recommend stress testing or edge case scenarios
   - Propose monitoring strategies to catch similar issues

## Context
- This is a production or development crash that needs resolution
- The developer needs both immediate fixes and long-term prevention strategies
- Consider memory management, threading, and API usage patterns
- Focus on actionable debugging steps and code improvements`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    },
  );

  // Simulator issues prompt
  server.prompt(
    'debug-simulator-issues',
    'Troubleshoot iOS Simulator problems and configuration issues',
    {
      issue_description: z.string().describe('Description of the simulator issue'),
      simulator_version: z.string().optional().describe('iOS Simulator version'),
      xcode_version: z.string().optional().describe('Xcode version'),
      error_messages: z
        .string()
        .optional()
        .describe('Any error messages from simulator or console'),
    },
    async (args) => {
      const { issue_description, simulator_version, xcode_version, error_messages } = args;

      let prompt = `# iOS Simulator Troubleshooting

## Issue Description
${issue_description}`;

      if (simulator_version) {
        prompt += `\n**Simulator Version:** ${simulator_version}`;
      }

      if (xcode_version) {
        prompt += `\n**Xcode Version:** ${xcode_version}`;
      }

      if (error_messages) {
        prompt += `\n**Error Messages:**\n\`\`\`\n${error_messages}\n\`\`\``;
      }

      prompt += `

## Troubleshooting Request
Please provide comprehensive troubleshooting guidance:

1. **Immediate Diagnostics**
   - Identify the most likely cause of this simulator issue
   - Suggest quick diagnostic steps to confirm the problem
   - Recommend initial troubleshooting commands

2. **Resolution Steps**
   - Provide step-by-step resolution instructions
   - Include both Xcode GUI and command-line approaches
   - Suggest simulator reset or reinstall procedures if needed

3. **Common Simulator Issues**
   - Address typical simulator problems (boot failures, app installation issues, etc.)
   - Provide solutions for simulator performance problems
   - Cover device-specific issues and compatibility problems

4. **Environment Verification**
   - Suggest checks for Xcode and simulator installation integrity
   - Recommend verification of system requirements and permissions
   - Provide guidance on simulator storage and resource management

5. **Prevention and Maintenance**
   - Recommend regular simulator maintenance practices
   - Suggest monitoring and diagnostic tools
   - Provide guidance on simulator configuration best practices

## Context
- This is an iOS Simulator issue affecting development workflow
- The developer needs practical solutions to restore simulator functionality
- Consider both immediate fixes and long-term simulator health
- Focus on the most effective and commonly successful solutions`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    },
  );

  log(
    'info',
    'Registered debugging prompts: debug-build-failure, debug-runtime-crash, debug-simulator-issues',
  );
}
