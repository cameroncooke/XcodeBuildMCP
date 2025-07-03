import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from './show_build_set_proj.js';

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

describe('show_build_set_proj plugin', () => {
  const mockExecuteCommand = executeCommand as any;
  const mockValidateRequiredParam = validateRequiredParam as any;
  const mockCreateTextResponse = createTextResponse as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default validation mocks
    mockValidateRequiredParam.mockReturnValue({ isValid: true });
    
    // Setup default command execution mock
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Build settings output',
    });
  });

  describe('plugin structure', () => {
    it('should have the correct name', () => {
      expect(plugin.name).toBe('show_build_set_proj');
    });

    it('should have a description', () => {
      expect(plugin.description).toBeTruthy();
      expect(typeof plugin.description).toBe('string');
      expect(plugin.description).toContain('Shows build settings from a project file');
    });

    it('should have a schema with required fields', () => {
      expect(plugin.schema).toBeDefined();
      expect(plugin.schema.shape.projectPath).toBeDefined();
      expect(plugin.schema.shape.scheme).toBeDefined();
    });

    it('should have a handler function', () => {
      expect(plugin.handler).toBeDefined();
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('handler functionality', () => {
    const validParams = {
      projectPath: '/path/to/MyProject.xcodeproj',
      scheme: 'MyScheme',
    };

    it('should validate projectPath parameter', async () => {
      await plugin.handler(validParams);
      
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('projectPath', validParams.projectPath);
    });

    it('should validate scheme parameter', async () => {
      await plugin.handler(validParams);
      
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('scheme', validParams.scheme);
    });

    it('should return error if projectPath validation fails', async () => {
      try {
        await plugin.handler({ scheme: 'MyScheme' });
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error.name).toBe('ZodError');
        expect(error.issues[0].path).toEqual(['projectPath']);
        expect(error.issues[0].message).toBe('Required');
      }
    });

    it('should return error if scheme validation fails', async () => {
      try {
        await plugin.handler({ projectPath: '/path/to/project.xcodeproj' });
        expect.fail('Should have thrown ZodError');
      } catch (error) {
        expect(error.name).toBe('ZodError');
        expect(error.issues[0].path).toEqual(['scheme']);
        expect(error.issues[0].message).toBe('Required');
      }
    });

    it('should execute xcodebuild command with correct parameters', async () => {
      await plugin.handler(validParams);
      
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcodebuild', '-showBuildSettings', '-project', validParams.projectPath, '-scheme', validParams.scheme],
        'Show Build Settings'
      );
    });

    it('should return success response when command succeeds', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Build Configuration: Debug\nACTIVE_ARCH = arm64',
      });

      const result = await plugin.handler(validParams);
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('Build settings for scheme MyScheme');
      expect(result.content[1].text).toContain('Build Configuration: Debug');
    });

    it('should return error response when command fails', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Project not found',
      });
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Failed to show build settings: Project not found' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Failed to show build settings: Project not found',
        true
      );
    });

    it('should handle thrown errors gracefully', async () => {
      const error = new Error('Unexpected error');
      mockExecuteCommand.mockRejectedValue(error);
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error showing build settings: Unexpected error' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error showing build settings: Unexpected error',
        true
      );
    });

    it('should handle string errors', async () => {
      mockExecuteCommand.mockRejectedValue('String error');
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error showing build settings: String error' }],
        isError: true,
      });

      const result = await plugin.handler(validParams);
      
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error showing build settings: String error',
        true
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty output from xcodebuild', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
      });

      const result = await plugin.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });
      
      expect(result.isError).toBe(false);
      expect(result.content[1].text).toBe('Build settings retrieved successfully.');
    });

    it('should handle null output from xcodebuild', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: null,
      });

      const result = await plugin.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });
      
      expect(result.isError).toBe(false);
      expect(result.content[1].text).toBe('Build settings retrieved successfully.');
    });
  });
});