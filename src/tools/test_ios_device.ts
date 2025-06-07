/**
 * iOS Device Test Tools - Tools for running tests on physical iOS devices
 *
 * This module provides specialized tools for running unit tests and UI tests on physical iOS devices
 * using xcodebuild test. It supports both workspace and project-based testing.
 *
 * Responsibilities:
 * - Running tests on connected iOS devices from project files and workspaces
 * - Handling test configuration and result collection
 * - Supporting test plans, specific test classes, and test methods
 * - Code coverage collection and test result bundle handling
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
const deviceIdSchema = z.string().optional().describe('Optional specific device ID to target (if multiple devices connected)');

// --- iOS Device Test Tools ---

/**
 * Registers the test_ios_dev_ws tool
 */
export function registerIOSDeviceTestWorkspaceTool(server: McpServer): void {
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
    deviceId?: string;
  };

  registerTool<Params>(
    server,
    'test_ios_dev_ws',
    "Runs tests on a physical iOS device from a workspace. IMPORTANT: Requires workspacePath and scheme. Device must be connected and trusted. Example: test_ios_dev_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
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
      deviceId: deviceIdSchema,
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

      // Add device-specific destination if deviceId provided
      if (params.deviceId) {
        testExtraArgs.push('-destination', `platform=iOS,id=${params.deviceId}`);
      }

      return executeXcodeBuildCommand(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          extraArgs: testExtraArgs,
        },
        {
          platform: XcodePlatform.iOS,
          logPrefix: 'iOS Device Test',
        },
        params.preferXcodebuild ?? false,
        'test',
      );
    },
  );
}

/**
 * Registers the test_ios_dev_proj tool
 */
export function registerIOSDeviceTestProjectTool(server: McpServer): void {
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
    deviceId?: string;
  };

  registerTool<Params>(
    server,
    'test_ios_dev_proj',
    "Runs tests on a physical iOS device from a project file. IMPORTANT: Requires projectPath and scheme. Device must be connected and trusted. Example: test_ios_dev_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
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
      deviceId: deviceIdSchema,
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

      // Add device-specific destination if deviceId provided
      if (params.deviceId) {
        testExtraArgs.push('-destination', `platform=iOS,id=${params.deviceId}`);
      }

      return executeXcodeBuildCommand(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          extraArgs: testExtraArgs,
        },
        {
          platform: XcodePlatform.iOS,
          logPrefix: 'iOS Device Test',
        },
        params.preferXcodebuild ?? false,
        'test',
      );
    },
  );
}

// Register all iOS device test tools
export function registerIOSDeviceTestTools(server: McpServer): void {
  registerIOSDeviceTestWorkspaceTool(server);
  registerIOSDeviceTestProjectTool(server);
}