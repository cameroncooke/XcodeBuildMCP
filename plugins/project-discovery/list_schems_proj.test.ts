import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from './list_schems_proj.js';

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

describe('list_schems_proj plugin', () => {
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
      output: `Information about project "MyProject":
    Targets:
        MyProject
        MyProjectTests

    Build Configurations:
        Debug
        Release

    If no build configuration is specified and -scheme is not passed then "Release" is used.

    Schemes:
        MyProject
        MyProjectTests`,
    });
  });

  describe('plugin structure', () => {
    it('should have the correct name', () => {
      expect(plugin.name).toBe('list_schems_proj');
    });

    it('should have a description', () => {
      expect(plugin.description).toBeTruthy();
      expect(typeof plugin.description).toBe('string');
      expect(plugin.description).toContain('Lists available schemes in the project file');
    });

    it('should have a schema with required fields', () => {
      expect(plugin.schema).toBeDefined();
      expect(plugin.schema.shape.projectPath).toBeDefined();
    });

    it('should have a handler function', () => {
      expect(plugin.handler).toBeDefined();
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('handler functionality', () => {
    const validParams = {
      projectPath: '/path/to/MyProject.xcodeproj',
    };

    it('should validate projectPath parameter', async () => {
      await plugin.handler(validParams);
      
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('projectPath', validParams.projectPath);
    });

    it('should return error if projectPath validation fails', async () => {
      try {
        await plugin.handler({});
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error.name).toBe('ZodError');
        expect(error.issues[0].path).toEqual(['projectPath']);
        expect(error.issues[0].message).toBe('Required');
      }
    });

    it('should execute xcodebuild command with correct parameters', async () => {
      await plugin.handler(validParams);
      
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcodebuild', '-list', '-project', validParams.projectPath],
        'List Schemes'
      );
    });

    it('should return success response when command succeeds', async () => {
      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(3);
      expect(result.content[0].text).toContain('Available schemes');
      expect(result.content[1].text).toContain('MyProject');
      expect(result.content[1].text).toContain('MyProjectTests');
      expect(result.content[2].text).toContain('Next Steps');
    });

    it('should return error response when command fails', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Project not found',
      });
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Failed to list schemes: Project not found' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Failed to list schemes: Project not found',
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
      projectPath: '/path/to/MyProject.xcodeproj',
    };

    it('should handle output with no schemes found', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Information about project "MyProject":\n    Targets:\n        MyProject',
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
        output: `Information about project "TestProject":
    Schemes:
        TestScheme1
        TestScheme2
        TestScheme3`,
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[1].text).toBe('TestScheme1\nTestScheme2\nTestScheme3');
    });

    it('should generate next steps with the first scheme', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about project "TestProject":
    Schemes:
        FirstScheme
        SecondScheme`,
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[2].text).toContain('Next Steps:');
      expect(result.content[2].text).toContain('FirstScheme');
      expect(result.content[2].text).toContain('macos_build_project');
      expect(result.content[2].text).toContain('ios_simulator_build_by_name_project');
      expect(result.content[2].text).toContain('show_build_set_proj');
    });

    it('should handle schemes with extra whitespace', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about project "TestProject":
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
      projectPath: '/path/to/MyProject.xcodeproj',
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

    it('should handle projects with no schemes defined', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about project "MinimalProject":
    Targets:
        MinimalProject

    Build Configurations:
        Debug
        Release

    Schemes:

`,
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content[1].text).toBe('');
      expect(result.content[2].text).toBe(''); // No next steps when no schemes
    });
  });
});