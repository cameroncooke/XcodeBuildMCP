/**
 * iOS Simulator Test Tools - Tools for running tests on iOS simulators
 *
 * This module provides specialized tools for running unit tests and UI tests on iOS simulators
 * using xcodebuild test. It supports both workspace and project-based testing with simulator 
 * targeting by name or UUID.
 *
 * Responsibilities:
 * - Running tests on iOS simulators from project files and workspaces
 * - Supporting simulator targeting by name or UUID
 * - Handling test configuration and result collection
 * - Supporting test plans, specific test classes, and test methods
 * - Code coverage collection and test result bundle handling
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { log } from '../utils/logger.js';
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
  simulatorNameSchema,
  simulatorIdSchema,
  useLatestOSSchema,
  preferXcodebuildSchema,
} from './common.js';

// Test-specific parameter schemas
const testPlanSchema = z.string().optional().describe('Optional test plan to run');
const testClassSchema = z.string().optional().describe('Optional specific test class to run');
const testMethodSchema = z.string().optional().describe('Optional specific test method to run');
const codeCoverageSchema = z.boolean().optional().describe('Enable code coverage collection (default: false)');
const resultBundlePathSchema = z.string().optional().describe('Custom path for test result bundle (.xcresult)');
const retryOnFailureSchema = z.boolean().optional().describe('Retry failed tests (default: false)');

// --- iOS Simulator Test Tools ---

/**
 * Registers the test_ios_sim_name_ws tool
 */
export function registerIOSSimulatorTestByNameWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    simulatorName: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
    preferXcodebuild?: boolean;
    testPlan?: string;
    testClass?: string;
    testMethod?: string;
    codeCoverage?: boolean;
    resultBundlePath?: string;
    retryOnFailure?: boolean;
  };

  registerTool<Params>(
    server,
    'test_ios_sim_name_ws',
    "Runs tests on an iOS simulator from a workspace, targeting simulator by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. Example: test_ios_sim_name_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
      preferXcodebuild: preferXcodebuildSchema,
      testPlan: testPlanSchema,
      testClass: testClassSchema,
      testMethod: testMethodSchema,
      codeCoverage: codeCoverageSchema,
      resultBundlePath: resultBundlePathSchema,
      retryOnFailure: retryOnFailureSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
      if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

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

      return executeXcodeBuildCommand(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          extraArgs: testExtraArgs,
        },
        {
          platform: XcodePlatform.iOSSimulator,
          simulatorName: params.simulatorName,
          useLatestOS: params.useLatestOS ?? true,
          logPrefix: 'iOS Simulator Test',
        },
        params.preferXcodebuild ?? false,
        'test',
      );
    },
  );
}

/**
 * Registers the test_ios_sim_name_proj tool
 */
export function registerIOSSimulatorTestByNameProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    simulatorName: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
    preferXcodebuild?: boolean;
    testPlan?: string;
    testClass?: string;
    testMethod?: string;
    codeCoverage?: boolean;
    resultBundlePath?: string;
    retryOnFailure?: boolean;
  };

  registerTool<Params>(
    server,
    'test_ios_sim_name_proj',
    "Runs tests on an iOS simulator from a project file, targeting simulator by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: test_ios_sim_name_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorName: simulatorNameSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
      preferXcodebuild: preferXcodebuildSchema,
      testPlan: testPlanSchema,
      testClass: testClassSchema,
      testMethod: testMethodSchema,
      codeCoverage: codeCoverageSchema,
      resultBundlePath: resultBundlePathSchema,
      retryOnFailure: retryOnFailureSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorNameValidation = validateRequiredParam('simulatorName', params.simulatorName);
      if (!simulatorNameValidation.isValid) return simulatorNameValidation.errorResponse!;

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

      return executeXcodeBuildCommand(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          extraArgs: testExtraArgs,
        },
        {
          platform: XcodePlatform.iOSSimulator,
          simulatorName: params.simulatorName,
          useLatestOS: params.useLatestOS ?? true,
          logPrefix: 'iOS Simulator Test',
        },
        params.preferXcodebuild ?? false,
        'test',
      );
    },
  );
}

/**
 * Registers the test_ios_sim_id_ws tool
 */
export function registerIOSSimulatorTestByIdWorkspaceTool(server: McpServer): void {
  type Params = {
    workspacePath: string;
    scheme: string;
    simulatorId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
    preferXcodebuild?: boolean;
    testPlan?: string;
    testClass?: string;
    testMethod?: string;
    codeCoverage?: boolean;
    resultBundlePath?: string;
    retryOnFailure?: boolean;
  };

  registerTool<Params>(
    server,
    'test_ios_sim_id_ws',
    "Runs tests on an iOS simulator from a workspace, targeting simulator by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. Example: test_ios_sim_id_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      workspacePath: workspacePathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
      preferXcodebuild: preferXcodebuildSchema,
      testPlan: testPlanSchema,
      testClass: testClassSchema,
      testMethod: testMethodSchema,
      codeCoverage: codeCoverageSchema,
      resultBundlePath: resultBundlePathSchema,
      retryOnFailure: retryOnFailureSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
      if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
      if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

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

      return executeXcodeBuildCommand(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          extraArgs: testExtraArgs,
        },
        {
          platform: XcodePlatform.iOSSimulator,
          simulatorId: params.simulatorId,
          useLatestOS: params.useLatestOS ?? true,
          logPrefix: 'iOS Simulator Test',
        },
        params.preferXcodebuild ?? false,
        'test',
      );
    },
  );
}

/**
 * Registers the test_ios_sim_id_proj tool
 */
export function registerIOSSimulatorTestByIdProjectTool(server: McpServer): void {
  type Params = {
    projectPath: string;
    scheme: string;
    simulatorId: string;
    configuration?: string;
    derivedDataPath?: string;
    extraArgs?: string[];
    useLatestOS?: boolean;
    preferXcodebuild?: boolean;
    testPlan?: string;
    testClass?: string;
    testMethod?: string;
    codeCoverage?: boolean;
    resultBundlePath?: string;
    retryOnFailure?: boolean;
  };

  registerTool<Params>(
    server,
    'test_ios_sim_id_proj',
    "Runs tests on an iOS simulator from a project file, targeting simulator by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: test_ios_sim_id_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
    {
      projectPath: projectPathSchema,
      scheme: schemeSchema,
      simulatorId: simulatorIdSchema,
      configuration: configurationSchema,
      derivedDataPath: derivedDataPathSchema,
      extraArgs: extraArgsSchema,
      useLatestOS: useLatestOSSchema,
      preferXcodebuild: preferXcodebuildSchema,
      testPlan: testPlanSchema,
      testClass: testClassSchema,
      testMethod: testMethodSchema,
      codeCoverage: codeCoverageSchema,
      resultBundlePath: resultBundlePathSchema,
      retryOnFailure: retryOnFailureSchema,
    },
    async (params: Params) => {
      // Validate required parameters
      const projectValidation = validateRequiredParam('projectPath', params.projectPath);
      if (!projectValidation.isValid) return projectValidation.errorResponse!;

      const schemeValidation = validateRequiredParam('scheme', params.scheme);
      if (!schemeValidation.isValid) return schemeValidation.errorResponse!;

      const simulatorIdValidation = validateRequiredParam('simulatorId', params.simulatorId);
      if (!simulatorIdValidation.isValid) return simulatorIdValidation.errorResponse!;

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

      return executeXcodeBuildCommand(
        {
          ...params,
          configuration: params.configuration ?? 'Debug',
          extraArgs: testExtraArgs,
        },
        {
          platform: XcodePlatform.iOSSimulator,
          simulatorId: params.simulatorId,
          useLatestOS: params.useLatestOS ?? true,
          logPrefix: 'iOS Simulator Test',
        },
        params.preferXcodebuild ?? false,
        'test',
      );
    },
  );
}

// Register all iOS simulator test tools
export function registerIOSSimulatorTestTools(server: McpServer): void {
  registerIOSSimulatorTestByNameWorkspaceTool(server);
  registerIOSSimulatorTestByNameProjectTool(server);
  registerIOSSimulatorTestByIdWorkspaceTool(server);
  registerIOSSimulatorTestByIdProjectTool(server);
}