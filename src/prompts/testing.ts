/**
 * Testing Prompts - Xcode Testing Strategy and Implementation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { log } from '../utils/logger.js';

export function registerTestingPrompts(server: McpServer): void {
  server.prompt(
    'setup-testing-strategy',
    'Design comprehensive testing strategy for Xcode projects',
    {
      project_type: z.enum(['ios', 'macos', 'multiplatform']).describe('Type of project'),
      app_complexity: z.string().optional().describe('App complexity and features'),
      testing_goals: z.string().optional().describe('Testing objectives and requirements')
    },
    async (args) => {
      const { project_type, app_complexity, testing_goals } = args;
      
      let prompt = `# Comprehensive Testing Strategy Design

## Project Information
**Project Type:** ${project_type}`;

      if (app_complexity) prompt += `\n**App Complexity:** ${app_complexity}`;
      if (testing_goals) prompt += `\n**Testing Goals:** ${testing_goals}`;

      prompt += `

## Strategy Request
Design a comprehensive testing strategy including:

1. **Testing Pyramid Structure**
   - Unit testing strategy and coverage goals
   - Integration testing approach
   - UI testing scope and automation
   - End-to-end testing requirements

2. **Test Implementation Plan**
   - XCTest framework utilization
   - Testing target organization
   - Mock and stub strategies
   - Test data management

3. **Automation and CI Integration**
   - Automated test execution setup
   - Test reporting and metrics
   - Continuous testing workflows
   - Performance and load testing

4. **Quality Assurance Process**
   - Code review testing requirements
   - Test maintenance strategies
   - Testing documentation standards
   - Team testing responsibilities

Provide actionable implementation guidance with specific examples.`;

      return {
        messages: [{ role: 'user', content: { type: 'text', text: prompt } }]
      };
    }
  );

  server.prompt(
    'debug-test-failures',
    'Diagnose and fix failing Xcode tests',
    {
      test_failure_description: z.string().describe('Description of test failures'),
      test_logs: z.string().optional().describe('Test failure logs or output'),
      test_type: z.enum(['unit', 'integration', 'ui', 'performance']).optional().describe('Type of failing tests')
    },
    async (args) => {
      const { test_failure_description, test_logs, test_type } = args;
      
      let prompt = `# Test Failure Diagnosis and Resolution

## Failure Information
**Description:** ${test_failure_description}`;

      if (test_type) prompt += `\n**Test Type:** ${test_type}`;
      if (test_logs) prompt += `\n**Test Logs:**\n\`\`\`\n${test_logs}\n\`\`\``;

      prompt += `

## Diagnosis Request
Provide systematic test failure resolution:

1. **Failure Analysis**
   - Identify the root cause of test failures
   - Categorize failure types and patterns
   - Assess test reliability and flakiness

2. **Resolution Strategy**
   - Provide step-by-step fix instructions
   - Address timing and synchronization issues
   - Fix test environment and setup problems

3. **Test Improvement**
   - Enhance test reliability and maintainability
   - Improve test isolation and independence
   - Optimize test performance and execution time

4. **Prevention Measures**
   - Implement practices to prevent similar failures
   - Set up better test monitoring and reporting
   - Establish test quality standards

Focus on both immediate fixes and long-term test health improvements.`;

      return {
        messages: [{ role: 'user', content: { type: 'text', text: prompt } }]
      };
    }
  );

  log('info', 'Registered testing prompts: setup-testing-strategy, debug-test-failures');
}

