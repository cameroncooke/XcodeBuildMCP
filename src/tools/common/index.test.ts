/**
 * Common Utilities Tests - Comprehensive test coverage for common.ts utility functions
 *
 * This test file provides complete coverage for the common.ts utilities:
 * - registerTool: Helper function to register tools with the MCP server
 * - createTextContent: Helper to create standard text response content
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive functionality testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';
import { registerTool, createTextContent } from '../common/index.js';
import { ToolResponse } from '../../types/common.js';

// Mock logger to prevent real logging during tests
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock MCP server to test registerTool function
const mockMcpServer = {
  tool: vi.fn(),
};

describe('common utilities tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTextContent function', () => {
    it('should create text content with proper structure', () => {
      const text = 'Test message';
      const result = createTextContent(text);

      expect(result).toEqual({
        type: 'text',
        text: 'Test message',
      });
    });

    it('should handle empty string', () => {
      const result = createTextContent('');

      expect(result).toEqual({
        type: 'text',
        text: '',
      });
    });

    it('should handle multi-line text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = createTextContent(text);

      expect(result).toEqual({
        type: 'text',
        text: 'Line 1\nLine 2\nLine 3',
      });
    });

    it('should handle special characters', () => {
      const text = '✅ Success! 🚀 Ready to deploy. (Progress: 100%)';
      const result = createTextContent(text);

      expect(result).toEqual({
        type: 'text',
        text: '✅ Success! 🚀 Ready to deploy. (Progress: 100%)',
      });
    });
  });

  describe('registerTool function', () => {
    it('should register tool with correct parameters', async () => {
      // Define a test schema
      const testSchema = {
        testParam: z.string().describe('Test parameter'),
      };

      // Define a test handler
      const testHandler = async (params: { testParam: string }): Promise<ToolResponse> => {
        return {
          content: [createTextContent(`Test executed with: ${params.testParam}`)],
          isError: false,
        };
      };

      // Register the tool
      registerTool(
        mockMcpServer as any,
        'test_tool',
        'Test tool description',
        testSchema,
        testHandler,
      );

      // Verify the server.tool was called with correct parameters
      expect(mockMcpServer.tool).toHaveBeenCalledWith(
        'test_tool',
        'Test tool description',
        testSchema,
        expect.any(Function),
      );
    });

    it('should create wrapped handler that calls original handler', async () => {
      // Define a test schema
      const testSchema = {
        testParam: z.string().describe('Test parameter'),
      };

      // Define a mock handler to track calls
      const mockHandler = vi.fn().mockResolvedValue({
        content: [createTextContent('Handler called')],
        isError: false,
      });

      // Register the tool
      registerTool(
        mockMcpServer as any,
        'test_tool',
        'Test tool description',
        testSchema,
        mockHandler,
      );

      // Get the wrapped handler that was passed to server.tool
      const wrappedHandler = mockMcpServer.tool.mock.calls[0][3];

      // Call the wrapped handler
      const testParams = { testParam: 'test value' };
      const result = await wrappedHandler(testParams, 'extra');

      // Verify the original handler was called with typed parameters
      expect(mockHandler).toHaveBeenCalledWith(testParams);
      expect(result).toEqual({
        content: [createTextContent('Handler called')],
        isError: false,
      });
    });

    it('should handle complex schema objects', async () => {
      // Define a complex schema
      const complexSchema = {
        workspacePath: z.string().describe('Path to workspace'),
        scheme: z.string().describe('Build scheme'),
        configuration: z.string().optional().describe('Build configuration'),
        extraArgs: z.array(z.string()).optional().describe('Extra arguments'),
      };

      // Define a handler for complex parameters
      const complexHandler = async (params: {
        workspacePath: string;
        scheme: string;
        configuration?: string;
        extraArgs?: string[];
      }): Promise<ToolResponse> => {
        return {
          content: [
            createTextContent(`Complex tool executed: ${params.workspacePath} - ${params.scheme}`),
          ],
          isError: false,
        };
      };

      // Register the tool
      registerTool(
        mockMcpServer as any,
        'complex_tool',
        'Complex tool description',
        complexSchema,
        complexHandler,
      );

      // Verify registration
      expect(mockMcpServer.tool).toHaveBeenCalledWith(
        'complex_tool',
        'Complex tool description',
        complexSchema,
        expect.any(Function),
      );
    });

    it('should handle handler that returns error response', async () => {
      // Define a test schema
      const testSchema = {
        shouldFail: z.boolean().describe('Whether to fail'),
      };

      // Define a handler that can return errors
      const errorHandler = async (params: { shouldFail: boolean }): Promise<ToolResponse> => {
        if (params.shouldFail) {
          return {
            content: [createTextContent('Tool execution failed')],
            isError: true,
          };
        }
        return {
          content: [createTextContent('Tool execution succeeded')],
          isError: false,
        };
      };

      // Register the tool
      registerTool(
        mockMcpServer as any,
        'error_tool',
        'Tool that can fail',
        testSchema,
        errorHandler,
      );

      // Get the wrapped handler
      const wrappedHandler = mockMcpServer.tool.mock.calls[0][3];

      // Test error case
      const errorResult = await wrappedHandler({ shouldFail: true }, 'extra');
      expect(errorResult).toEqual({
        content: [createTextContent('Tool execution failed')],
        isError: true,
      });

      // Test success case
      const successResult = await wrappedHandler({ shouldFail: false }, 'extra');
      expect(successResult).toEqual({
        content: [createTextContent('Tool execution succeeded')],
        isError: false,
      });
    });

    it('should handle handler with different return formats', async () => {
      // Define a test schema
      const testSchema = {
        responseType: z.string().describe('Type of response to return'),
      };

      // Define a handler that returns different response formats
      const variableHandler = async (params: { responseType: string }): Promise<ToolResponse> => {
        switch (params.responseType) {
          case 'single':
            return {
              content: [createTextContent('Single response')],
              isError: false,
            };
          case 'multiple':
            return {
              content: [createTextContent('First message'), createTextContent('Second message')],
              isError: false,
            };
          case 'error':
            return {
              content: [createTextContent('Error occurred')],
              isError: true,
            };
          default:
            return {
              content: [createTextContent('Unknown response type')],
              isError: false,
            };
        }
      };

      // Register the tool
      registerTool(
        mockMcpServer as any,
        'variable_tool',
        'Tool with variable responses',
        testSchema,
        variableHandler,
      );

      // Get the wrapped handler
      const wrappedHandler = mockMcpServer.tool.mock.calls[0][3];

      // Test single response
      const singleResult = await wrappedHandler({ responseType: 'single' }, 'extra');
      expect(singleResult.content).toEqual([createTextContent('Single response')]);
      expect(singleResult.isError).toBe(false);

      // Test multiple response
      const multipleResult = await wrappedHandler({ responseType: 'multiple' }, 'extra');
      expect(multipleResult.content).toEqual([
        createTextContent('First message'),
        createTextContent('Second message'),
      ]);
      expect(multipleResult.isError).toBe(false);

      // Test error response
      const errorResult = await wrappedHandler({ responseType: 'error' }, 'extra');
      expect(errorResult.content).toEqual([createTextContent('Error occurred')]);
      expect(errorResult.isError).toBe(true);
    });
  });

  describe('type assertion handling in registerTool', () => {
    it('should properly handle type assertions for wrapped handler', async () => {
      // Define a strongly typed schema
      interface StronglyTypedParams {
        requiredString: string;
        optionalNumber?: number;
        requiredBoolean: boolean;
      }

      const typedSchema = {
        requiredString: z.string().describe('Required string parameter'),
        optionalNumber: z.number().optional().describe('Optional number parameter'),
        requiredBoolean: z.boolean().describe('Required boolean parameter'),
      };

      // Define a strongly typed handler
      const typedHandler = async (params: StronglyTypedParams): Promise<ToolResponse> => {
        const messages = [`String: ${params.requiredString}`, `Boolean: ${params.requiredBoolean}`];

        if (params.optionalNumber !== undefined) {
          messages.push(`Number: ${params.optionalNumber}`);
        }

        return {
          content: [createTextContent(messages.join(', '))],
          isError: false,
        };
      };

      // Register the tool
      registerTool(
        mockMcpServer as any,
        'typed_tool',
        'Strongly typed tool',
        typedSchema,
        typedHandler,
      );

      // Get the wrapped handler
      const wrappedHandler = mockMcpServer.tool.mock.calls[0][3];

      // Test with all parameters
      const allParamsResult = await wrappedHandler(
        {
          requiredString: 'test',
          optionalNumber: 42,
          requiredBoolean: true,
        },
        'extra',
      );

      expect(allParamsResult.content).toEqual([
        createTextContent('String: test, Boolean: true, Number: 42'),
      ]);
      expect(allParamsResult.isError).toBe(false);

      // Test with only required parameters
      const requiredParamsResult = await wrappedHandler(
        {
          requiredString: 'test2',
          requiredBoolean: false,
        },
        'extra',
      );

      expect(requiredParamsResult.content).toEqual([
        createTextContent('String: test2, Boolean: false'),
      ]);
      expect(requiredParamsResult.isError).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should support tool registration workflow for build tools', async () => {
      // Simulate a build tool registration
      const buildSchema = {
        projectPath: z.string().describe('Path to project'),
        scheme: z.string().describe('Build scheme'),
        configuration: z.string().optional().describe('Build configuration'),
      };

      const buildHandler = async (params: {
        projectPath: string;
        scheme: string;
        configuration?: string;
      }): Promise<ToolResponse> => {
        const config = params.configuration || 'Debug';
        return {
          content: [
            createTextContent(`✅ Build started for scheme ${params.scheme}`),
            createTextContent(`📂 Project: ${params.projectPath}`),
            createTextContent(`⚙️ Configuration: ${config}`),
          ],
          isError: false,
        };
      };

      // Register the build tool
      registerTool(
        mockMcpServer as any,
        'build_project',
        'Build a project with specified scheme',
        buildSchema,
        buildHandler,
      );

      // Verify tool was registered
      expect(mockMcpServer.tool).toHaveBeenCalledWith(
        'build_project',
        'Build a project with specified scheme',
        buildSchema,
        expect.any(Function),
      );

      // Test the wrapped handler
      const wrappedHandler = mockMcpServer.tool.mock.calls[0][3];
      const result = await wrappedHandler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyApp',
          configuration: 'Release',
        },
        'extra',
      );

      expect(result.content).toEqual([
        createTextContent('✅ Build started for scheme MyApp'),
        createTextContent('📂 Project: /path/to/project.xcodeproj'),
        createTextContent('⚙️ Configuration: Release'),
      ]);
      expect(result.isError).toBe(false);
    });

    it('should support tool registration workflow for simulator tools', async () => {
      // Simulate a simulator tool registration
      const simulatorSchema = {
        simulatorId: z.string().describe('Simulator UUID'),
        appBundleId: z.string().describe('App bundle identifier'),
        launchArgs: z.array(z.string()).optional().describe('Launch arguments'),
      };

      const simulatorHandler = async (params: {
        simulatorId: string;
        appBundleId: string;
        launchArgs?: string[];
      }): Promise<ToolResponse> => {
        const args = params.launchArgs || [];
        return {
          content: [
            createTextContent(`🚀 Launching app ${params.appBundleId}`),
            createTextContent(`📱 Simulator: ${params.simulatorId}`),
            createTextContent(`🔧 Arguments: ${args.length > 0 ? args.join(' ') : 'none'}`),
          ],
          isError: false,
        };
      };

      // Register the simulator tool
      registerTool(
        mockMcpServer as any,
        'launch_simulator_app',
        'Launch app on simulator',
        simulatorSchema,
        simulatorHandler,
      );

      // Test the wrapped handler
      const wrappedHandler = mockMcpServer.tool.mock.calls[0][3];
      const result = await wrappedHandler(
        {
          simulatorId: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          appBundleId: 'com.example.MyApp',
          launchArgs: ['--debug', '--verbose'],
        },
        'extra',
      );

      expect(result.content).toEqual([
        createTextContent('🚀 Launching app com.example.MyApp'),
        createTextContent('📱 Simulator: ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV'),
        createTextContent('🔧 Arguments: --debug --verbose'),
      ]);
      expect(result.isError).toBe(false);
    });
  });
});
