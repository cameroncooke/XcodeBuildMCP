import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from './list_schems_ws.js';

// Mock the dependencies
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
}));

// Import mocked modules for use in tests
import { executeCommand } from '../../src/utils/command.js';
import { validateRequiredParam, createTextResponse } from '../../src/utils/validation.js';

describe('list_schems_ws plugin', () => {
  const mockExecuteCommand = executeCommand as any;
  const mockValidateRequiredParam = validateRequiredParam as any;
  const mockCreateTextResponse = createTextResponse as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default validation mocks
    mockValidateRequiredParam.mockReturnValue({ isValid: true });
    
    // Setup default command execution mock with schemes output
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: `Information about workspace "MyWorkspace":
    Schemes:
        MyWorkspace
        MyWorkspaceTests
        SharedFramework`,
    });
  });

  describe('plugin structure', () => {
    it('should have the correct name', () => {
      expect(plugin.name).toBe('list_schems_ws');
    });

    it('should have a description', () => {
      expect(plugin.description).toBeTruthy();
      expect(typeof plugin.description).toBe('string');
      expect(plugin.description).toContain('Lists available schemes in the workspace');
    });

    it('should have a schema with required fields', () => {
      expect(plugin.schema).toBeDefined();
      expect(plugin.schema.shape.workspacePath).toBeDefined();
    });

    it('should have a handler function', () => {
      expect(plugin.handler).toBeDefined();
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('handler functionality', () => {
    const validParams = {
      workspacePath: '/path/to/MyWorkspace.xcworkspace',
    };

    it('should validate workspacePath parameter', async () => {
      await plugin.handler(validParams);
      
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('workspacePath', validParams.workspacePath);
    });

    it('should return error if workspacePath validation fails', async () => {
      try {
        await plugin.handler({});
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error.name).toBe('ZodError');
        expect(error.issues[0].path).toEqual(['workspacePath']);
        expect(error.issues[0].message).toBe('Required');
      }
    });

    it('should execute xcodebuild command with correct parameters', async () => {
      await plugin.handler(validParams);
      
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcodebuild', '-list', '-workspace', validParams.workspacePath],
        'List Schemes'
      );
    });

    it('should return success response when command succeeds', async () => {
      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(3);
      expect(result.content[0].text).toContain('Available schemes');
      expect(result.content[1].text).toContain('MyWorkspace');
      expect(result.content[1].text).toContain('MyWorkspaceTests');
      expect(result.content[1].text).toContain('SharedFramework');
      expect(result.content[2].text).toContain('Next Steps');
    });

    it('should return error response when command fails', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Workspace not found',
      });
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Failed to list schemes: Workspace not found' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Failed to list schemes: Workspace not found',
        true
      );
    });

    it('should handle thrown errors gracefully', async () => {
      const error = new Error('Unexpected error');
      mockExecuteCommand.mockRejectedValue(error);
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error listing schemes: Unexpected error' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error listing schemes: Unexpected error',
        true
      );
    });

    it('should handle string errors', async () => {
      mockExecuteCommand.mockRejectedValue('String error');
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error listing schemes: String error' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error listing schemes: String error',
        true
      );
    });
  });

  describe('scheme parsing', () => {
    const validParams = {
      workspacePath: '/path/to/MyWorkspace.xcworkspace',
    };

    it('should handle output with no schemes found', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Information about workspace "MyWorkspace":\n    Projects:\n        MyProject.xcodeproj',
      });
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'No schemes found in the output' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'No schemes found in the output',
        true
      );
    });

    it('should parse schemes correctly from xcodebuild output', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about workspace "TestWorkspace":
    Schemes:
        TestScheme1
        TestScheme2
        TestScheme3`,
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[1].text).toBe('TestScheme1\nTestScheme2\nTestScheme3');
    });

    it('should generate next steps with the first scheme for workspace', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about workspace "TestWorkspace":
    Schemes:
        FirstScheme
        SecondScheme`,
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[2].text).toContain('Next Steps:');
      expect(result.content[2].text).toContain('FirstScheme');
      expect(result.content[2].text).toContain('macos_build_workspace');
      expect(result.content[2].text).toContain('ios_simulator_build_by_name_workspace');
      expect(result.content[2].text).toContain('show_build_set_ws');
      expect(result.content[2].text).toContain('workspacePath');
    });

    it('should handle schemes with extra whitespace', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about workspace "TestWorkspace":
    Schemes:
        
        SchemeWithSpaces   
        
        AnotherScheme
        `,
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[1].text).toBe('SchemeWithSpaces\nAnotherScheme');
    });
  });

  describe('edge cases', () => {
    const validParams = {
      workspacePath: '/path/to/MyWorkspace.xcworkspace',
    };

    it('should handle empty output from xcodebuild', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
      });
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'No schemes found in the output' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'No schemes found in the output',
        true
      );
    });

    it('should handle null output from xcodebuild', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: null,
      });
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error listing schemes: Cannot read properties of null (reading \'match\')' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error listing schemes: Cannot read properties of null (reading \'match\')',
        true
      );
    });

    it('should handle workspaces with no schemes defined', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about workspace "MinimalWorkspace":
    Projects:
        MinimalProject.xcodeproj

    Schemes:

`,
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[1].text).toBe('');
      expect(result.content[2].text).toBe(''); // No next steps when no schemes
    });

    it('should handle multiline schemes section properly', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about workspace "ComplexWorkspace":
    Projects:
        ProjectA.xcodeproj
        ProjectB.xcodeproj

    Schemes:
        SchemeA
        SchemeB
        SchemeC

    Build Configurations:
        Debug
        Release`,
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[1].text).toBe('SchemeA\nSchemeB\nSchemeC');
    });
  });

  describe('workspace vs project differentiation', () => {
    it('should generate workspace-specific next steps', async () => {
      const validParams = {
        workspacePath: '/path/to/MyWorkspace.xcworkspace',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about workspace "TestWorkspace":
    Schemes:
        MainScheme`,
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[2].text).toContain('macos_build_workspace');
      expect(result.content[2].text).toContain('ios_simulator_build_by_name_workspace');
      expect(result.content[2].text).toContain('show_build_set_ws');
      expect(result.content[2].text).toContain('workspacePath');
      expect(result.content[2].text).not.toContain('projectPath');
      expect(result.content[2].text).not.toContain('macos_build_project');
    });
  });
});