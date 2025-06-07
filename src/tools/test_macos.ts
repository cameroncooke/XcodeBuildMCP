/**
 * macOS Test Tools - Tools for running tests on macOS
 *
 * This module provides specialized tools for running unit tests and UI tests on macOS
 * using xcodebuild test. It supports both workspace and project-based testing.
 *
 * Responsibilities:
 * - Running tests on macOS from project files and workspaces
 * - Handling test configuration and result collection
 * - Supporting test plans, specific test classes, and test methods
 * - Code coverage collection and test result bundle handling
 * - Supporting different macOS architectures (Intel/Apple Silicon)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { XcodePlatform } from '../utils/xcode.js';
import { validateRequiredParam } from '../utils/validation.js';
import { executeXcodeBuildCommand } from '../utils/build-utils.js';
import {
  registerTool,
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  configurationSchema,
  derivedDataPathSchema,
  extraArgsSchema,
  preferXcodebuildSchema,
} from './common.js';

// Test-specific parameter schemas
const testPlanSchema = z.string().optional().describe('Optional test plan to run');
const testClassSchema = z.string().optional().describe('Optional specific test class to run');
const testMethodSchema = z.string().optional().describe('Optional specific test method to run');
const codeCoverageSchema = z.boolean().optional().describe('Enable code coverage collection (default: false)');
const resultBundlePathSchema = z.string().optional().describe('Custom path for test result bundle (.xcresult)');
const retryOnFailureSchema = z.boolean().optional().describe('Retry failed tests (default: false)');
const archSchema = z.enum(['arm64', 'x86_64']).optional().describe('Architecture to test for (arm64 or x86_64). For macOS only.');

// --- macOS Test Tools ---

/**
 * Registers the test_mac_ws tool
 */
export function registerMacOSTestWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
    testPlan?: string;
    testClass?: string;
    testMethod?: string;
    codeCoverage?: boolean;
    resultBundlePath?: string;
    retryOnFailure?: boolean;
    arch?: 'arm64' | 'x86_64';
  };

  registerTool<Params>(
    server,
    'test_mac_ws',
    "Runs tests on macOS from a workspace. IMPORTANT: Requires workspacePath and scheme. Example: test_mac_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      preferXcodebuild: preferXcodebuildSchema,
      testPlan: testPlanSchema,
      testClass: testClassSchema,
      testMethod: testMethodSchema,
      codeCoverage: codeCoverageSchema,
      resultBundlePath: resultBundlePathSchema,
      retryOnFailure: retryOnFailureSchema,
      arch: archSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      // Build extra args for test-specific options
      const testExtraArgs = [...(params.extraArgs || [])];
      
      if (params.testPlan) {
        testExtraArgs.push('-testPlan', params.testPlan);
      }
      
      if (params.testClass) {
        testExtraArgs.push('-only-testing', params.testClass);
      }
      
      if (params.testMethod) {
        testExtraArgs.push('-only-testing', params.testMethod);
      }
      
      if (params.codeCoverage) {
        testExtraArgs.push('-enableCodeCoverage', 'YES');
      }
      
      if (params.resultBundlePath) {
        testExtraArgs.push('-resultBundlePath', params.resultBundlePath);
      }
      
      if (params.retryOnFailure) {
        testExtraArgs.push('-retry-tests-on-failure');
      }

      // Add architecture-specific destination if arch provided
      if (params.arch) {
        testExtraArgs.push('-destination', `platform=macOS,arch=${params.arch}`);
      }

      return executeXcodeBuildCommand(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          extraArgs: testExtraArgs,
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'macOS Test',
        },
        params.preferXcodebuild ?? false,
        'test',
      );
    },
  );
}

/**
 * Registers the test_mac_proj tool
 */
export function registerMacOSTestProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    preferXcodebuild?: boolean;
    testPlan?: string;
    testClass?: string;
    testMethod?: string;
    codeCoverage?: boolean;
    resultBundlePath?: string;
    retryOnFailure?: boolean;
    arch?: 'arm64' | 'x86_64';
  };

  registerTool<Params>(
    server,
    'test_mac_proj',
    "Runs tests on macOS from a project file. IMPORTANT: Requires projectPath and scheme. Example: test_mac_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      preferXcodebuild: preferXcodebuildSchema,
      testPlan: testPlanSchema,
      testClass: testClassSchema,
      testMethod: testMethodSchema,
      codeCoverage: codeCoverageSchema,
      resultBundlePath: resultBundlePathSchema,
      retryOnFailure: retryOnFailureSchema,
      arch: archSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      // Build extra args for test-specific options
      const testExtraArgs = [...(params.extraArgs || [])];
      
      if (params.testPlan) {
        testExtraArgs.push('-testPlan', params.testPlan);
      }
      
      if (params.testClass) {
        testExtraArgs.push('-only-testing', params.testClass);
      }
      
      if (params.testMethod) {
        testExtraArgs.push('-only-testing', params.testMethod);
      }
      
      if (params.codeCoverage) {
        testExtraArgs.push('-enableCodeCoverage', 'YES');
      }
      
      if (params.resultBundlePath) {
        testExtraArgs.push('-resultBundlePath', params.resultBundlePath);
      }
      
      if (params.retryOnFailure) {
        testExtraArgs.push('-retry-tests-on-failure');
      }

      // Add architecture-specific destination if arch provided
      if (params.arch) {
        testExtraArgs.push('-destination', `platform=macOS,arch=${params.arch}`);
      }

      return executeXcodeBuildCommand(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          extraArgs: testExtraArgs,
        },
        {
          platform: XcodePlatform.macOS,
          logPrefix: 'macOS Test',
        },
        params.preferXcodebuild ?? false,
        'test',
      );
    },
  );
}

// Register all macOS test tools
export function registerMacOSTestTools(server: McpServer): void {
  registerMacOSTestWorkspaceTool(server);
  registerMacOSTestProjectTool(server);
}