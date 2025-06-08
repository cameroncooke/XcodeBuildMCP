/**
 * Project Setup Prompts - Xcode Project Configuration and Setup
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { log } from '../utils/logger.js';

export function registerProjectSetupPrompts(server: McpServer): void {
  server.prompt(
    'setup-new-project',
    'Guide through new Xcode project setup and configuration',
    {
      project_type: z
        .enum(['ios', 'macos', 'watchos', 'tvos', 'multiplatform'])
        .describe('Type of project to create'),
      app_category: z.string().optional().describe('App category or purpose'),
      team_size: z.string().optional().describe('Development team size'),
      requirements: z.string().optional().describe('Specific project requirements'),
    },
    async (args) => {
      const { project_type, app_category, team_size, requirements } = args;

      let prompt = `# New Xcode Project Setup Guide

## Project Configuration
**Project Type:** ${project_type}`;

      if (app_category) prompt += `\n**App Category:** ${app_category}`;
      if (team_size) prompt += `\n**Team Size:** ${team_size}`;
      if (requirements) prompt += `\n**Requirements:** ${requirements}`;

      prompt += `

## Setup Request
Provide comprehensive project setup guidance:

1. **Project Structure and Organization**
   - Recommend optimal project structure
   - Set up target and scheme organization
   - Configure build configurations
   - Establish folder and file organization

2. **Development Environment Setup**
   - Configure Xcode project settings
   - Set up code signing and provisioning
   - Configure build settings and deployment targets
   - Establish development team workflows

3. **Dependency Management**
   - Choose appropriate dependency manager (SPM, CocoaPods, Carthage)
   - Set up package management configuration
   - Recommend essential dependencies
   - Configure dependency update strategies

4. **Code Quality and Standards**
   - Set up SwiftLint and code formatting
   - Configure static analysis tools
   - Establish coding standards and guidelines
   - Set up pre-commit hooks and automation

5. **Testing and CI/CD Foundation**
   - Set up testing targets and frameworks
   - Configure basic CI/CD pipeline
   - Establish deployment workflows
   - Set up monitoring and analytics

Provide step-by-step implementation with best practices.`;

      return {
        messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
      };
    },
  );

  server.prompt(
    'migrate-legacy-project',
    'Guide through legacy Xcode project modernization',
    {
      current_setup: z.string().describe('Current project setup and configuration'),
      target_improvements: z
        .string()
        .optional()
        .describe('Desired improvements or modernization goals'),
      constraints: z.string().optional().describe('Migration constraints or limitations'),
    },
    async (args) => {
      const { current_setup, target_improvements, constraints } = args;

      let prompt = `# Legacy Xcode Project Modernization

## Current State
**Current Setup:** ${current_setup}`;

      if (target_improvements) prompt += `\n**Target Improvements:** ${target_improvements}`;
      if (constraints) prompt += `\n**Constraints:** ${constraints}`;

      prompt += `

## Modernization Request
Provide systematic project modernization guidance:

1. **Assessment and Planning**
   - Analyze current project state and technical debt
   - Identify modernization priorities and opportunities
   - Create migration roadmap with phases
   - Assess risks and mitigation strategies

2. **Build System Modernization**
   - Upgrade to modern Xcode build settings
   - Migrate to Swift Package Manager if applicable
   - Update deployment targets and SDK versions
   - Modernize build configurations and schemes

3. **Code and Architecture Updates**
   - Migrate to modern Swift language features
   - Update deprecated APIs and frameworks
   - Improve project structure and organization
   - Implement modern architectural patterns

4. **Tooling and Workflow Improvements**
   - Set up modern development tools and linting
   - Implement automated testing and CI/CD
   - Establish code review and quality processes
   - Configure monitoring and analytics

5. **Risk Management and Validation**
   - Create comprehensive testing strategy for migration
   - Set up rollback procedures and safety nets
   - Establish validation criteria and success metrics
   - Plan gradual migration approach

Focus on practical, incremental improvements with minimal disruption.`;

      return {
        messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
      };
    },
  );

  log('info', 'Registered project setup prompts: setup-new-project, migrate-legacy-project');
}
