/**
 * CI/CD Prompts - Continuous Integration and Deployment Workflows
 *
 * This module provides prompt templates for setting up and troubleshooting
 * CI/CD pipelines for Xcode projects, including GitHub Actions, Xcode Cloud,
 * and other automation platforms.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { log } from '../utils/logger.js';

/**
 * Register CI/CD-related prompts
 */
export function registerCICDPrompts(server: McpServer): void {
  // GitHub Actions setup prompt
  server.prompt(
    'setup-github-actions',
    'Set up GitHub Actions CI/CD pipeline for Xcode projects',
    {
      project_type: z.enum(['ios', 'macos', 'multiplatform']).describe('Type of Xcode project'),
      deployment_target: z.string().optional().describe('Minimum iOS/macOS deployment target'),
      testing_requirements: z
        .string()
        .optional()
        .describe('Testing requirements (unit tests, UI tests, etc.)'),
      distribution_method: z
        .enum(['app-store', 'enterprise', 'adhoc', 'development'])
        .optional()
        .describe('App distribution method'),
      additional_requirements: z
        .string()
        .optional()
        .describe('Additional CI/CD requirements or constraints'),
    },
    async (args) => {
      const {
        project_type,
        deployment_target,
        testing_requirements,
        distribution_method,
        additional_requirements,
      } = args;

      let prompt = `# GitHub Actions CI/CD Setup for Xcode Project

## Project Configuration
**Project Type:** ${project_type}`;

      if (deployment_target) {
        prompt += `\n**Deployment Target:** ${deployment_target}`;
      }

      if (testing_requirements) {
        prompt += `\n**Testing Requirements:** ${testing_requirements}`;
      }

      if (distribution_method) {
        prompt += `\n**Distribution Method:** ${distribution_method}`;
      }

      if (additional_requirements) {
        prompt += `\n**Additional Requirements:** ${additional_requirements}`;
      }

      prompt += `

## Setup Request
Please provide a comprehensive GitHub Actions CI/CD setup:

1. **Workflow Configuration**
   - Create a complete .github/workflows/ci.yml file
   - Include appropriate triggers (push, pull request, release)
   - Configure matrix builds for multiple Xcode versions if needed
   - Set up proper job dependencies and parallelization

2. **Build Pipeline**
   - Configure Xcode version selection and setup
   - Set up code signing and provisioning profiles
   - Include build steps for all relevant schemes and targets
   - Configure build artifacts and caching strategies

3. **Testing Integration**
   - Set up unit test execution with proper reporting
   - Configure UI test runs with simulator management
   - Include code coverage collection and reporting
   - Set up test result parsing and failure notifications

4. **Code Quality Checks**
   - Integrate SwiftLint or other code quality tools
   - Set up static analysis and security scanning
   - Configure dependency vulnerability checking
   - Include code formatting verification

5. **Deployment Automation**
   - Set up automated app store deployment (if applicable)
   - Configure TestFlight distribution
   - Include release notes generation
   - Set up notification systems for deployment status

6. **Security and Secrets Management**
   - Provide guidance on storing certificates and provisioning profiles
   - Recommend secure handling of API keys and tokens
   - Include best practices for secrets rotation
   - Configure proper access controls and permissions

## Context
- This is for a production Xcode project requiring reliable CI/CD
- The team needs automated testing, building, and deployment
- Consider scalability, maintainability, and security best practices
- Provide both basic and advanced configuration options`;

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

  // Xcode Cloud setup prompt
  server.prompt(
    'setup-xcode-cloud',
    'Configure Xcode Cloud for automated building and testing',
    {
      project_name: z.string().describe('Name of the Xcode project'),
      team_size: z.string().optional().describe('Development team size'),
      workflow_requirements: z.string().optional().describe('Specific workflow requirements'),
      integration_needs: z.string().optional().describe('Third-party integrations needed'),
    },
    async (args) => {
      const { project_name, team_size, workflow_requirements, integration_needs } = args;

      let prompt = `# Xcode Cloud Configuration Guide

## Project Information
**Project Name:** ${project_name}`;

      if (team_size) {
        prompt += `\n**Team Size:** ${team_size}`;
      }

      if (workflow_requirements) {
        prompt += `\n**Workflow Requirements:** ${workflow_requirements}`;
      }

      if (integration_needs) {
        prompt += `\n**Integration Needs:** ${integration_needs}`;
      }

      prompt += `

## Configuration Request
Please provide comprehensive Xcode Cloud setup guidance:

1. **Initial Setup and Prerequisites**
   - Guide through Xcode Cloud enrollment and setup
   - Explain App Store Connect configuration requirements
   - Cover team and role management setup
   - Detail repository connection and access configuration

2. **Workflow Design**
   - Design optimal workflows for this project type and team size
   - Configure appropriate triggers and conditions
   - Set up branch-based workflow strategies
   - Include environment and variable management

3. **Build Configuration**
   - Configure build environments and Xcode versions
   - Set up scheme and target selection
   - Include dependency management and caching
   - Configure build artifact handling

4. **Testing Strategy**
   - Set up comprehensive testing workflows
   - Configure parallel test execution
   - Include device and simulator testing strategies
   - Set up test reporting and failure analysis

5. **Integration and Notifications**
   - Configure Slack, email, or webhook notifications
   - Set up integration with project management tools
   - Include status reporting and dashboard setup
   - Configure custom post-build actions

6. **Cost Optimization**
   - Provide strategies to optimize build minutes usage
   - Recommend efficient workflow patterns
   - Suggest caching and incremental build strategies
   - Include monitoring and usage analysis guidance

## Context
- This is for a professional development team using Xcode Cloud
- The team needs reliable, efficient automated workflows
- Consider both development and production deployment needs
- Focus on Apple ecosystem integration and best practices`;

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

  // CI/CD troubleshooting prompt
  server.prompt(
    'troubleshoot-cicd',
    'Diagnose and fix CI/CD pipeline issues for Xcode projects',
    {
      platform: z
        .enum(['github-actions', 'xcode-cloud', 'jenkins', 'gitlab-ci', 'other'])
        .describe('CI/CD platform being used'),
      error_description: z.string().describe('Description of the CI/CD issue or failure'),
      build_logs: z.string().optional().describe('Relevant build logs or error messages'),
      recent_changes: z
        .string()
        .optional()
        .describe('Recent changes to project or CI configuration'),
    },
    async (args) => {
      const { platform, error_description, build_logs, recent_changes } = args;

      let prompt = `# CI/CD Pipeline Troubleshooting

## Issue Information
**Platform:** ${platform}
**Issue Description:** ${error_description}`;

      if (build_logs) {
        prompt += `\n**Build Logs:**\n\`\`\`\n${build_logs}\n\`\`\``;
      }

      if (recent_changes) {
        prompt += `\n**Recent Changes:** ${recent_changes}`;
      }

      prompt += `

## Troubleshooting Request
Please provide systematic troubleshooting guidance:

1. **Issue Analysis**
   - Identify the root cause of the CI/CD failure
   - Categorize the issue type (build, test, deployment, configuration)
   - Explain common scenarios that lead to this type of failure
   - Assess the impact and urgency of the issue

2. **Immediate Diagnostics**
   - Provide specific diagnostic steps for this platform
   - Suggest log analysis techniques and tools
   - Recommend configuration verification steps
   - Include environment and dependency checks

3. **Step-by-Step Resolution**
   - Provide detailed resolution instructions
   - Include platform-specific configuration fixes
   - Suggest code or project configuration changes
   - Recommend testing and validation procedures

4. **Prevention Strategies**
   - Identify practices to prevent similar issues
   - Recommend monitoring and alerting improvements
   - Suggest configuration management best practices
   - Include regular maintenance and health check procedures

5. **Optimization Opportunities**
   - Identify potential performance improvements
   - Suggest workflow optimization strategies
   - Recommend resource usage optimizations
   - Include scalability and reliability enhancements

6. **Recovery and Rollback**
   - Provide guidance for emergency recovery procedures
   - Include rollback strategies for failed deployments
   - Suggest backup and restore procedures
   - Recommend incident response protocols

## Context
- This is a production CI/CD pipeline requiring immediate attention
- The team needs both quick fixes and long-term stability improvements
- Consider the specific platform's capabilities and limitations
- Focus on actionable solutions with clear implementation steps`;

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
    'Registered CI/CD prompts: setup-github-actions, setup-xcode-cloud, troubleshoot-cicd',
  );
}
